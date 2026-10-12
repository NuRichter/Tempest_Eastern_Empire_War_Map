'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import type { Dataset } from '@/data/loader';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { landMask, loadFront } from '@/map/field/occupation';
import { getField, onField } from '@/map/field/fieldStore';
import { createWarSkin, type WarSkin } from '@/map/three/warSkin';
import { activeFocus, cluster, gatherAction, Spring, useDirector, type Shot } from '@/map/cinematic/director';
import type { Front } from '@/map/field/front';
import { forcePositionAt, forceSnapshotAt, inConvoyAt, markerStrengthAt } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion, usePreferences } from '@/state/preferences';
import { replacesParent } from '@/lib/hierarchy';
import { unitClass } from '@/lib/units';
import { eventVisible, factionVisible, forceHidden } from '@/map/overlay/context';
import { formatStrength } from '@/map/overlay/layers/forces';
import { createForceToken, createStandee, createStrategicModel, disposeTokenCaches, setDestroyed, tokenRadius, type ForceToken, type Standee } from '@/map/three/tokens';
import type { Force, ForceSnapshot } from '@/types/dataset';
import { pixelRatioFor, samplesFor, useQuality, type QualityLevel } from '@/perf/quality';

/**
 * The atlas in three dimensions (three.js).
 *
 *   terrain     a relief mesh (public/maps/3d/height.png, STYLISED: the novels give
 *               no elevations) wearing the super-resolved painted map
 *   war         territory colours, held ground and glowing fronts painted onto the
 *               terrain from the same data as the 2D map, every frame of the clock
 *   armies      3D tokens matching the 2D markers (faction shape, unit symbol, strength above);
 *               air formations hover; moving ones show their heading
 *   points      the 2D strategic points as small models (halt flag, gatehouse, …)
 *   characters  2.5D standees: the photocards of the people in the current events,
 *               upright cards on stands that always face the camera
 *   battles     pulsing rings, sparks and firelight while a battle is live
 *   cities      extruded capitals with crowns, the Labyrinth as a violet portal
 *   sky         sun and moon follow the simulation clock: the long night is night
 *   camera      free orbit, or (auto) the cinematic director's shots in 3D
 */

const WX = 100;
const WZ = (100 * 2035) / 2641;
const HS = 10; // vertical exaggeration
const SEA_ENC = 0.08;
const toWorld = (x: number, y: number): [number, number] => [(x - 0.5) * WX, (y - 0.5) * WZ];

interface Relief { w: number; h: number; v: Float32Array }

function sampleHeight(r: Relief | null, x: number, y: number): number {
  if (!r) return 1;
  const fx = Math.min(r.w - 1.001, Math.max(0, x * r.w - 0.5));
  const fy = Math.min(r.h - 1.001, Math.max(0, y * r.h - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const i = y0 * r.w + x0;
  const v = r.v[i] * (1 - tx) * (1 - ty) + r.v[i + 1] * tx * (1 - ty) + r.v[i + r.w] * (1 - tx) * ty + r.v[i + r.w + 1] * tx * ty;
  return Math.max(0, (v - SEA_ENC) * HS);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

async function loadRelief(): Promise<Relief> {
  const im = await loadImage('/maps/3d/height-3d.png');
  const c = document.createElement('canvas');
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const v = new Float32Array(c.width * c.height);
  for (let i = 0; i < v.length; i += 1) v[i] = d[i * 4] / 255;
  return { w: c.width, h: c.height, v };
}

function textSprite(text: string, color: string, size = 64, weight = 700): THREE.Sprite {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = `${weight} ${size}px "IBM Plex Sans Condensed", system-ui, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 24;
  c.width = w;
  c.height = size + 24;
  g.font = `${weight} ${size}px "IBM Plex Sans Condensed", system-ui, sans-serif`;
  g.textBaseline = 'middle';
  g.lineWidth = size * 0.16;
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.strokeText(text, 12, c.height / 2);
  g.fillStyle = color;
  g.fillText(text, 12, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sp.scale.set((w / c.height) * 1.2, 1.2, 1);
  sp.renderOrder = 10;
  return sp;
}

function cloudTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  for (let k = 0; k < 18; k += 1) {
    const x = 60 + Math.random() * 136, y = 90 + Math.random() * 76, r = 30 + Math.random() * 50;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const WATER_VERT = `
  varying vec3 vWorld;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FRAG = `
  uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSun; uniform float uSunPower;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    float t = uTime;
    vec3 n = normalize(vec3(
      0.10 * sin(p.x * 0.9 + t * 1.1) + 0.06 * sin(p.x * 2.3 - p.y * 1.7 + t * 1.9) + 0.03 * sin(p.y * 5.1 + t * 2.7),
      1.0,
      0.10 * cos(p.y * 0.8 + t * 0.9) + 0.06 * cos(p.y * 2.1 + p.x * 1.3 - t * 1.6) + 0.03 * cos(p.x * 4.7 - t * 2.3)));
    vec3 view = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    vec3 col = mix(uDeep, uShallow, 0.35 + 0.25 * n.x);
    col = mix(col, uSky, fres * 0.65);
    vec3 h = normalize(view + normalize(uSun));
    col += vec3(1.0, 0.92, 0.75) * pow(max(dot(n, h), 0.0), 180.0) * uSunPower;
    gl_FragColor = vec4(col, 0.9);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const SKY_FRAG = `
  uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
  void main() { float h = clamp(vDir.y * 1.6 + 0.1, 0.0, 1.0); gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.7)), 1.0);
    #include <colorspace_fragment>
  }`;
const SKY_VERT = `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

interface ForceObj { token: ForceToken; key: string; label: THREE.Sprite | null; labelText: string; x: number; z: number; r: number; air: boolean; tether: THREE.Line | null; moving: boolean; heading: { dx: number; dy: number } | null }

/** Forces as the 2D map draws them: visible, recorded, positioned, the most specific tier only. */
function placeForces3D(data: Dataset, T: number): { force: Force; snap: ForceSnapshot; x: number; y: number; moving: boolean; heading: { dx: number; dy: number } | null; air: boolean }[] {
  const { filters, commanderFocus } = useSimulation.getState();
  const iT = Math.floor(T);
  const focus = commanderFocus ? new Set(data.commanderById.get(commanderFocus)?.forceIds ?? []) : null;
  const placed: ReturnType<typeof placeForces3D> = [];
  for (const force of data.forces) {
    if (!factionVisible(filters, force.faction) || forceHidden(data, filters, force.id)) continue;
    if (focus && !focus.has(force.id)) continue;
    const snap = forceSnapshotAt(data, force.id, iT);
    if (!snap) continue;
    if (/DESTROYED|ANNIHILATED/i.test(snap.status) && iT - snap.f > 432) continue;
    const pos = forcePositionAt(data, force.id, T);
    if (!pos) continue;
    if (inConvoyAt(data, force, T)) continue; // drawn inside its host's token
    const place = pos.placeId ? data.placeById.get(pos.placeId) : null;
    placed.push({ force, snap, x: pos.x, y: pos.y, moving: pos.moving, heading: pos.heading, air: unitClass(force) === 'air' || place?.altitude === 'AIR' });
  }
  const drawn = new Set(placed.map((p) => p.force.id));
  return placed.filter((p) => !p.force.childIds.some((c) => drawn.has(c) && replacesParent(data.forceById.get(c)!, p.force, data.forces)));
}

export function Atlas3D({ auto }: { auto: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const autoRef = useRef(auto);
  useLayoutEffect(() => {
    autoRef.current = auto;
  });

  useEffect(() => {
    const el = host.current;
    const data = useSimulation.getState().data as Dataset | null;
    if (!el || !data) return;
    let disposed = false;
    const reduce = prefersReducedMotion();

    /* -- renderer, scene, camera ------------------------------------ */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(pixelRatioFor(useQuality.getState().level));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8fb3c9, 0.0062);
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 900);
    const [cx0, cz0] = toWorld(0.68, 0.47);
    camera.position.set(cx0, 48, cz0 + 52);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx0, 2, cz0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 150;
    controls.maxPolarAngle = 1.42;
    let handsOff = 0;
    controls.addEventListener('start', () => { handsOff = performance.now() + 7000; });

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 0.35, 0.5, 0.88);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* -- light and sky ------------------------------------------------- */
    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x3b3328, 0.75);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -70; sc.right = 70; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0006;
    scene.add(sun, sun.target);
    const skyMat = new THREE.ShaderMaterial({ uniforms: { uTop: { value: new THREE.Color(0x2b5f93) }, uHorizon: { value: new THREE.Color(0xc6dcea) } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
    scene.add(sky);

    /* -- sea ---------------------------------------------------------- */
    const waterMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x14506e) }, uShallow: { value: new THREE.Color(0x3d8fb0) }, uSky: { value: new THREE.Color(0xc6dcea) }, uSun: { value: new THREE.Vector3(1, 1, 0.5) }, uSunPower: { value: 1.6 } },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(WX * 3, WZ * 3, 1, 1), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.02;
    scene.add(water);

    /* -- clouds ------------------------------------------------------- */
    const cloudTex = cloudTexture();
    const clouds: THREE.Sprite[] = [];
    for (let k = 0; k < 10; k += 1) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
      sp.scale.set(16 + Math.random() * 14, 7 + Math.random() * 5, 1);
      sp.position.set((Math.random() - 0.5) * WX * 1.4, 24 + Math.random() * 8, (Math.random() - 0.5) * WZ * 1.4);
      scene.add(sp);
      clouds.push(sp);
    }

    /* -- terrain + war overlay ---------------------------------------- */
    let relief: Relief | null = null;
    let lastPaint = -1;
    let front: Front | null = null;
    let terrain: THREE.Mesh | null = null;
    let warSkin: WarSkin | null = null;
    let unsubField: (() => void) | null = null;

    const forces = new Map<string, ForceObj>();
    const battleFx: { group: THREE.Group; ring: THREE.Mesh; sparks: THREE.Points; light: THREE.PointLight; id: string }[] = [];
    const portal = { group: new THREE.Group(), ring: null as THREE.Mesh | null, light: null as THREE.PointLight | null };

    void Promise.all([loadRelief(), loadFront(), new THREE.TextureLoader().loadAsync(usePreferences.getState().mapStyle === 'myth' ? '/maps/3d/myth-4k.webp' : '/maps/3d/terrain-4k.webp')]).then(([r, f, tex]) => {
      if (disposed) return;
      relief = r;
      front = f;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const geo = new THREE.PlaneGeometry(WX, WZ, 420, Math.round(420 * (WZ / WX)));
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i) / WX + 0.5;
        const y = pos.getZ(i) / WZ + 0.5;
        const fx = Math.min(r.w - 1, Math.max(0, Math.round(x * r.w - 0.5)));
        const fy = Math.min(r.h - 1, Math.max(0, Math.round(y * r.h - 0.5)));
        pos.setY(i, (r.v[fy * r.w + fx] - SEA_ENC) * HS);
      }
      geo.computeVertexNormals();
      terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.02 }));
      terrain.receiveShadow = true;
      terrain.castShadow = true;
      scene.add(terrain);
      // The war layer is a shader fed by the field worker (see warSkin.ts): nothing is painted per frame.
      warSkin = createWarSkin(geo, data!, landMask(data!), 0.82);
      scene.add(warSkin.mesh);
      const feed = () => {
        const field = getField();
        if (warSkin && front) warSkin.setField(front, field ? field.fields : null, field?.packed);
      };
      unsubField = onField(feed);
      feed();
      buildCities();
      buildStrategic();
      lastPaint = -1; // the held ground has arrived: repaint even if the clock stands still
    });

    function paintOverlay(T: number): void {
      warSkin?.updateTerritories(T);
    }

    function buildCities(): void {
      for (const st of data!.settlements) {
        const h = sampleHeight(relief, st.x, st.y);
        if (st.kind === 'labyrinth') {
          const [x, z] = toWorld(st.x, st.y);
          portal.group.position.set(x, h + 0.2, z);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.11, 16, 64), new THREE.MeshStandardMaterial({ color: 0x9d7bff, emissive: 0x7b4dff, emissiveIntensity: 2.4 }));
          ring.rotation.x = Math.PI / 2;
          const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 48), new THREE.MeshBasicMaterial({ color: 0x6f3cff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
          disc.rotation.x = -Math.PI / 2;
          disc.position.y = 0.02;
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8f6bff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
          beam.position.y = 7;
          const light = new THREE.PointLight(0x8a5cff, 30, 14, 2);
          light.position.y = 1.2;
          portal.group.add(ring, disc, beam, light);
          portal.ring = ring;
          portal.light = light;
          scene.add(portal.group);
          continue;
        }
        const shape = new THREE.Shape(st.ring.map(([x, y]) => { const [wx, wz] = toWorld(x, y); return new THREE.Vector2(wx, -wz); }));
        const tall = st.kind === 'capital' ? 0.55 : 0.32;
        const geo = new THREE.ExtrudeGeometry(shape, { depth: tall, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
        geo.rotateX(-Math.PI / 2);
        const city = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: st.kind === 'capital' ? 0xe8dcc0 : 0xcfc8b8, roughness: 0.7, emissive: st.kind === 'capital' ? 0x3a2a08 : 0x000000 }));
        city.position.y = h;
        city.castShadow = true;
        city.receiveShadow = true;
        scene.add(city);
        if (st.kind === 'capital') {
          const crown = textSprite('♛', '#f3c969', 72, 400);
          crown.scale.multiplyScalar(0.55);
          const [x, z] = toWorld(st.x, st.y);
          crown.position.set(x, h + 1.15, z);
          scene.add(crown);
          const name = textSprite(st.name, '#fff6dc', 40, 600);
          name.scale.multiplyScalar(0.5);
          name.position.set(x, h + 0.7, z);
          scene.add(name);
        }
      }
    }

    /* -- armies: 3D tokens matching the 2D markers ------------------------ */
    const tetherMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    function dropForce(id: string, o: ForceObj): void {
      scene.remove(o.token.group);
      if (o.tether) { scene.remove(o.tether); o.tether.geometry.dispose(); }
      if (o.label) { o.label.material.map?.dispose(); o.label.material.dispose(); }
      forces.delete(id);
    }
    function syncForces(T: number): void {
      const seen = new Set<string>();
      const prefs = usePreferences.getState();
      const list = prefs.layers.forces ? placeForces3D(data!, T) : [];
      // Formations sharing one anchor fan out around it, in a fixed order, as in 2D.
      const groups = new Map<string, typeof list>();
      for (const p of list) {
        const k = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
        groups.set(k, [...(groups.get(k) ?? []), p]);
      }
      const sel = useSimulation.getState().selection;
      for (const g of groups.values()) {
        g.sort((p, q) => p.force.id.localeCompare(q.force.id));
        g.forEach((p, i) => {
          const strength = typeof p.snap.strength === 'number' ? p.snap.strength : null;
          const r = tokenRadius(strength);
          const key = `${factionKey(p.force.faction)}|${unitClass(p.force)}`;
          let o = forces.get(p.force.id);
          if (o && o.key !== key) { dropForce(p.force.id, o); o = undefined; }
          if (!o) {
            const token = createForceToken(factionKey(p.force.faction), unitClass(p.force));
            token.group.userData = { kind: 'force', id: p.force.id };
            scene.add(token.group);
            const [x, z] = toWorld(p.x, p.y);
            token.group.position.set(x, sampleHeight(relief, p.x, p.y), z);
            o = { token, key, label: null, labelText: '', x, z, r, air: false, tether: null, moving: false, heading: null };
            forces.set(p.force.id, o);
          }
          seen.add(p.force.id);
          let [x, z] = toWorld(p.x, p.y);
          if (g.length > 1) {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / g.length;
            const spread = Math.max(...g.map((q) => tokenRadius(typeof q.snap.strength === 'number' ? q.snap.strength : null))) * 2.4;
            x += Math.cos(a) * spread;
            z += Math.sin(a) * spread;
          }
          o.x = x;
          o.z = z;
          o.r = r;
          o.air = p.air;
          o.moving = p.moving;
          o.heading = p.heading;
          o.token.group.scale.setScalar(r);
          const destroyed = /DESTROYED|ANNIHILATED/i.test(p.snap.status);
          setDestroyed(o.token, destroyed);
          o.token.halo.visible = sel.kind === 'force' && sel.id === p.force.id;
          if (p.air && !o.tether) {
            o.tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), tetherMat);
            scene.add(o.tether);
          } else if (!p.air && o.tether) { scene.remove(o.tether); o.tether.geometry.dispose(); o.tether = null; }
          const single = p.snap.strength === 1 || /single|special combatant|construct|entity/i.test(`${p.force.unitType} ${p.force.initialStrengthRaw}`);
          const text = prefs.layers.armySizes && !single ? formatStrength(markerStrengthAt(data!, p.force.id, T), p.snap.sizeStatus) : '';
          if (text !== o.labelText) {
            if (o.label) { o.token.group.remove(o.label); o.label.material.map?.dispose(); o.label.material.dispose(); }
            o.label = text ? textSprite(text, destroyed ? '#9aa2a6' : p.snap.sizeStatus === 'EXPLICIT' ? '#ffffff' : '#e8e2d2', 56, 700) : null;
            if (o.label) {
              o.label.scale.multiplyScalar(0.36 / r);
              o.label.position.set(0, 1.55, 0);
              o.token.group.add(o.label);
            }
            o.labelText = text;
          }
        });
      }
      for (const [id, o] of forces) if (!seen.has(id)) dropForce(id, o);
    }

    /* -- strategic points as models -------------------------------------- */
    const strategic: { group: THREE.Group; flag: THREE.Object3D | null }[] = [];
    function buildStrategic(): void {
      for (const pl of data!.places) {
        if (!pl.symbol || pl.x === null || pl.y === null) continue;
        const m = createStrategicModel(pl.symbol);
        const [x, z] = toWorld(pl.x, pl.y);
        m.group.position.set(x, sampleHeight(relief, pl.x, pl.y), z);
        m.group.scale.setScalar(0.55);
        m.group.userData = { kind: 'place', id: pl.id };
        if (pl.symbol === 'halt' || pl.symbol === 'gate') {
          const name = textSprite(pl.name, '#fff6dc', 40, 600);
          name.scale.multiplyScalar(0.42);
          name.position.set(0, 2.4, 0);
          m.group.add(name);
        }
        scene.add(m.group);
        strategic.push(m);
      }
    }

    /* -- 2.5D standees: the people of the current events ----------------- */
    const standees = new Map<string, Standee & { ax: number; ay: number; slot: number; of: number }>();
    let standeeFrame = -1;
    function syncStandees(T: number): void {
      const iT = Math.floor(T);
      if (iT === standeeFrame) return;
      standeeFrame = iT;
      const want = new Map<string, { ax: number; ay: number; slot: number; of: number; name: string; src: string; key: ReturnType<typeof factionKey> }>();
      if (usePreferences.getState().layers.characters) {
        const { filters } = useSimulation.getState();
        const recent = data!.events.filter((e) => e.frame <= iT && iT - e.frame <= 36 && eventVisible(filters, e)).reverse();
        for (const e of recent) {
          const anchor = e.placeId ? data!.placeById.get(e.placeId) ?? data!.nationById.get(e.placeId) : null;
          if (!anchor || anchor.x == null || anchor.y == null) continue;
          const people = e.presentIds.filter((c) => !want.has(c) && data!.characterById.get(c)?.photocard).slice(0, 3);
          people.forEach((cid, i) => {
            const c = data!.characterById.get(cid)!;
            want.set(cid, { ax: anchor.x!, ay: anchor.y!, slot: i, of: people.length, name: c.name, src: c.photocard!.src, key: factionKey(c.faction) });
          });
          if (want.size >= 9) break;
        }
      }
      for (const [id, s] of standees) {
        if (want.has(id)) continue;
        scene.remove(s.group);
        standees.delete(id);
      }
      for (const [id, w] of want) {
        let s = standees.get(id);
        if (!s) {
          s = { ...createStandee(w.src, w.name, w.key), ax: w.ax, ay: w.ay, slot: w.slot, of: w.of };
          s.group.userData = { kind: 'character', id };
          s.group.scale.setScalar(0.001);
          scene.add(s.group);
          standees.set(id, s);
        }
        Object.assign(s, { ax: w.ax, ay: w.ay, slot: w.slot, of: w.of });
      }
    }
    const camRight = new THREE.Vector3();
    function animateStandees(now: number): void {
      camRight.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      for (const s of standees.values()) {
        const [ax, az] = toWorld(s.ax, s.ay);
        const off = (s.slot - (s.of - 1) / 2) * 1.05;
        const x = ax + camRight.x * off;
        const z = az + camRight.z * off - 0.6;
        const age = (now - s.born) / 1000;
        const pop = reduce ? 1 : Math.min(1, age / 0.45);
        const ease = 1 - Math.pow(1 - pop, 3);
        s.group.scale.setScalar(0.001 + ease);
        const bob = reduce ? 0 : Math.sin(now / 900 + s.slot) * 0.04;
        s.group.position.set(x, sampleHeight(relief, (x / WX) + 0.5, (z / WZ) + 0.5) + 0.05 + bob, z);
        // Paper theatre: the card turns about its upright axis to face the camera.
        s.group.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
      }
    }

    /* -- picking: a click on a token, a point or a standee opens its file -- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const targets = [...[...forces.values()].map((o) => o.token.group), ...strategic.map((m) => m.group), ...[...standees.values()].map((s) => s.group)];
      for (const hit of raycaster.intersectObjects(targets, true)) {
        let o: THREE.Object3D | null = hit.object;
        while (o && !o.userData.kind) o = o.parent;
        if (!o) continue;
        const { kind, id } = o.userData as { kind: 'force' | 'place' | 'character'; id: string };
        useSimulation.getState().select({ kind, id });
        break;
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    /* -- routes: the measured ground routes of movements under way -------- */
    // The same geometry the 2D overlay draws and the markers follow, draped on the relief.
    const routeLines = new Map<string, THREE.Line>();
    function syncRoutes(T: number): void {
      const live = new Set<string>();
      for (const m of data!.movements) {
        if (!m.routeId || m.startFrame === null || m.route === 'UNKNOWN') continue;
        const end = m.endFrame ?? m.startFrame;
        if (T < m.startFrame || T > end + 144) continue;
        const r = data!.routeById.get(m.routeId);
        if (!r) continue;
        const key = `${m.id}`;
        live.add(key);
        let line = routeLines.get(key);
        if (!line) {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i < r.points.length; i += 1) {
            const [px, py] = r.points[i];
            const steps = i === 0 ? 1 : 6;
            for (let k = steps === 1 ? 0 : 1; k <= steps - (steps === 1 ? 1 : 0); k += 1) {
              const [qx, qy] = i === 0 ? [px, py] : [r.points[i - 1][0] + ((px - r.points[i - 1][0]) * k) / steps, r.points[i - 1][1] + ((py - r.points[i - 1][1]) * k) / steps];
              const [x, z] = toWorld(qx, qy);
              pts.push(new THREE.Vector3(x, sampleHeight(relief, qx, qy) + (r.mode === 'AIR' ? 3 : 0.12), z));
            }
          }
          const force = data!.forceById.get(m.forceId);
          const color = new THREE.Color(FACTION_COLOR[factionKey(force?.faction ?? null)]);
          line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
          routeLines.set(key, line);
          scene.add(line);
        }
        (line.material as THREE.LineBasicMaterial).opacity = T > end ? Math.max(0.15, 0.85 * (1 - (T - end) / 144)) : 0.85;
      }
      for (const [k, line] of routeLines) {
        if (live.has(k)) continue;
        scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        routeLines.delete(k);
      }
    }

    /* -- battles -------------------------------------------------------- */
    const sparkGeo = new THREE.BufferGeometry();
    const SPARKS = 160;
    const seeds = new Float32Array(SPARKS * 3);
    for (let k = 0; k < SPARKS * 3; k += 1) seeds[k] = Math.random();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    function syncBattles(T: number, now: number): void {
      const live = data!.battles.filter((b) => T >= b.startFrame && T <= b.endFrame && b.endFrame - b.startFrame <= 144 && b.placeId);
      while (battleFx.length < live.length) {
        const group = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 48), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        const sparks = new THREE.Points(sparkGeo.clone(), new THREE.PointsMaterial({ color: 0xffb35c, size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const light = new THREE.PointLight(0xff7a3c, 40, 16, 2);
        light.position.y = 1.5;
        group.add(ring, sparks, light);
        scene.add(group);
        battleFx.push({ group, ring, sparks, light, id: '' });
      }
      battleFx.forEach((fx, k) => {
        const b = live[k];
        fx.group.visible = Boolean(b);
        if (!b) return;
        const p = data!.placeById.get(b.placeId!);
        if (!p || p.x == null || p.y == null) { fx.group.visible = false; return; }
        const [x, z] = toWorld(p.x, p.y);
        fx.group.position.set(x, sampleHeight(relief, p.x, p.y) + 0.1, z);
        const ph = (now / 1000) % 1.6 / 1.6;
        fx.ring.scale.setScalar(1 + ph * 3.2);
        (fx.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - ph);
        fx.light.intensity = 30 + Math.sin(now / 47) * 12 + Math.sin(now / 13) * 6;
        const arr = (fx.sparks.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < SPARKS; i += 1) {
          const life = ((now / 1000) * (0.6 + seeds[i * 3]) + seeds[i * 3 + 1]) % 1;
          const ang = seeds[i * 3 + 2] * Math.PI * 2;
          const rad = life * 2.4;
          arr[i * 3] = Math.cos(ang) * rad;
          arr[i * 3 + 1] = Math.sin(life * Math.PI) * 2.2;
          arr[i * 3 + 2] = Math.sin(ang) * rad;
        }
        fx.sparks.geometry.attributes.position.needsUpdate = true;
      });
    }

    /* -- time of day from the simulation clock ------------------------- */
    const dayTop = new THREE.Color(0x2b5f93), dayHor = new THREE.Color(0xc6dcea), nightTop = new THREE.Color(0x0a1022), nightHor = new THREE.Color(0x2c3a58);
    const duskHor = new THREE.Color(0xe39a62);
    function lightFor(T: number): void {
      const hour = ((T % 144) * 10) / 60;
      const elev = Math.sin(((hour - 6) / 12) * Math.PI); // 1 at noon, -1 at midnight
      const day = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
      const dusk = Math.max(0, 1 - Math.abs(elev) / 0.3) * 0.8;
      const az = ((hour - 6) / 12) * Math.PI;
      sun.position.set(Math.cos(az) * 120, 30 + Math.max(elev, 0.15) * 90, 40);
      sun.target.position.set(0, 0, 0);
      sun.intensity = 0.9 + day * 1.7;
      sun.color.setHex(day > 0.5 ? 0xfff1d6 : 0xb8c8ff);
      hemi.intensity = 0.55 + day * 0.35;
      const top = nightTop.clone().lerp(dayTop, day);
      const hor = nightHor.clone().lerp(dayHor, day).lerp(duskHor, dusk * (1 - day * 0.5));
      skyMat.uniforms.uTop.value.copy(top);
      skyMat.uniforms.uHorizon.value.copy(hor);
      (scene.fog as THREE.FogExp2).color.copy(hor);
      waterMat.uniforms.uSky.value.copy(hor);
      waterMat.uniforms.uSun.value.copy(sun.position).normalize();
      waterMat.uniforms.uSunPower.value = 0.3 + day * 1.4;
      renderer.toneMappingExposure = 0.95 + day * 0.15;
      bloom.strength = 0.28 + (1 - day) * 0.3; // glows carry the night
      for (const c of clouds) (c.material as THREE.SpriteMaterial).opacity = 0.08 + day * 0.16;
    }

    /* -- cinematic camera ----------------------------------------------- */
    const s = { x: new Spring(cx0), z: new Spring(cz0), d: new Spring(70), el: new Spring(0.95), az: new Spring(0) };
    let plan = { x: cx0, z: cz0, d: 70, el: 0.95, shot: 'ESTABLISHING' as Shot, fronts: 0 };
    let lastPlan = 0;
    function planShot(T: number): void {
      // A turning point: a low, close push-in on the place.
      const f = activeFocus();
      if (f) {
        const [fx, fz] = toWorld(f.x, f.y);
        plan = { x: fx, z: fz, d: 15, el: reduce ? 0.9 : 0.42, shot: 'IMPACT', fronts: 0 };
        return;
      }
      const { pts, battleLive, battleEnded } = gatherAction(data!, front?.episodes ?? [], Math.round(T));
      const cl = cluster(pts);
      const main = cl[0];
      if (!main) { plan = { ...plan, d: Math.min(110, plan.d * 1.3), el: 1.0, shot: 'ESTABLISHING', fronts: 0 }; return; }
      const strong = cl.filter((k) => k.w >= main.w * 0.3 && k.w >= 2.5);
      const set = strong.length > 1 ? strong : [main];
      const x0 = Math.min(...set.map((k) => k.x0)), x1 = Math.max(...set.map((k) => k.x1));
      const y0 = Math.min(...set.map((k) => k.y0)), y1 = Math.max(...set.map((k) => k.y1));
      const span = Math.max(x1 - x0, (y1 - y0) * 1.3, strong.length > 1 ? 0.08 : 0.045);
      const [x, z] = toWorld((x0 + x1) / 2, (y0 + y1) / 2);
      let shot: Shot, d: number, el: number;
      if (strong.length > 1) { shot = 'MULTI_FRONT'; d = span * WX * 1.9 + 14; el = 0.95; }
      else if (battleLive && main.kinds.has('battle')) { shot = 'BATTLE'; d = span * WX * 1.4 + 13; el = 0.5; }
      else if (battleEnded && main.kinds.has('battle')) { shot = 'AFTERMATH'; d = span * WX * 1.6 + 12; el = 0.7; }
      else if (main.kinds.has('march') && !main.kinds.has('front')) { shot = 'TRACKING'; d = span * WX * 1.5 + 14; el = 0.6; }
      else { shot = 'CLOSE'; d = span * WX * 1.5 + 14; el = 0.66; }
      plan = { x, z, d: Math.min(120, d), el: reduce ? 0.9 : el, shot, fronts: strong.length };
    }

    /* -- loop ---------------------------------------------------------- */
    let lastPaintAt = 0;
    let lastSync = -1;
    let raf = 0;
    let prev = performance.now();
    const t0 = prev;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.5, (now - prev) / 1000);
      prev = now;
      const st = useSimulation.getState();
      const T = st.clock?.frame ?? st.frame;
      if (Math.abs(T - lastPaint) > 0.4 && (now - lastPaintAt > 110 || lastPaint < 0)) {
        lastPaint = T;
        lastPaintAt = now;
        paintOverlay(T);
        lightFor(T);
      }
      if (Math.abs(T - lastSync) > 0.05) { lastSync = T; syncForces(T); if (relief) syncRoutes(T); }
      const showPoints = usePreferences.getState().layers.strategic;
      for (const m of strategic) {
        m.group.visible = showPoints;
        if (m.flag && !reduce) m.flag.rotation.y = Math.sin(now / 420 + m.group.position.x) * 0.25;
      }
      syncStandees(T);
      animateStandees(now);
      for (const o of forces.values()) {
        const g = o.token.group;
        const nx = THREE.MathUtils.damp(g.position.x, o.x, 6, dt);
        const nz = THREE.MathUtils.damp(g.position.z, o.z, 6, dt);
        const sx = nx / WX + 0.5, sy = nz / WZ + 0.5;
        const ground = sampleHeight(relief, sx, sy);
        const lift = o.air ? 2.4 + (reduce ? 0 : Math.sin(now / 700 + nx) * 0.12) : 0;
        g.position.set(nx, ground + lift, nz);
        if (o.tether) {
          o.tether.position.set(nx, ground, nz);
          o.tether.scale.set(1, lift, 1);
        }
        if (o.token.spin && !reduce) o.token.spin.rotation.y += dt * 9;
        // Heading chevron in front of a moving token, pointing along its route.
        const h = o.heading;
        o.token.heading.visible = o.moving && Boolean(h);
        if (o.moving && h) {
          const ux = h.dx * WX, uz = h.dy * WZ, len = Math.hypot(ux, uz) || 1;
          o.token.heading.position.set((ux / len) * 1.35, 0.2, (uz / len) * 1.35);
          o.token.heading.rotation.y = Math.atan2(ux / len, uz / len);
        }
        if (o.token.halo.visible) o.token.halo.scale.setScalar(1 + Math.sin(now / 260) * 0.06);
      }
      syncBattles(T, now);
      if (portal.ring) {
        portal.ring.rotation.z += dt * 0.8;
        portal.light!.intensity = 26 + Math.sin(now / 400) * 8;
      }
      for (const c of clouds) {
        c.position.x += dt * 0.6;
        if (c.position.x > WX * 0.75) c.position.x = -WX * 0.75;
      }
      waterMat.uniforms.uTime.value = (now - t0) / 1000;

      // Camera: the director's shot when auto and the reader is not driving.
      if (autoRef.current && now > handsOff) {
        if (now - lastPlan > 250) {
          lastPlan = now;
          planShot(T);
          const d = useDirector.getState();
          if (d.shot !== plan.shot || d.fronts !== plan.fronts) useDirector.setState({ shot: plan.shot, fronts: plan.fronts });
        }
        const orbit = reduce ? 0 : ((now - t0) / 1000) * (plan.shot === 'MULTI_FRONT' ? 0.02 : 0.05);
        const tau = plan.shot === 'IMPACT' ? 0.8 : plan.shot === 'BATTLE' ? 1.4 : 2.0;
        const x = s.x.step(plan.x, tau, dt), z = s.z.step(plan.z, tau, dt);
        const d = s.d.step(plan.d, tau * 1.1, dt), el = s.el.step(plan.el, tau * 1.3, dt), az = s.az.step(orbit, 3, dt);
        const ty = relief ? sampleHeight(relief, x / WX + 0.5, z / WZ + 0.5) : 2;
        controls.target.set(x, ty, z);
        camera.position.set(x + Math.sin(az) * Math.cos(el) * d, ty + Math.sin(el) * d, z + Math.cos(az) * Math.cos(el) * d);
        camera.lookAt(controls.target);
      } else {
        s.x.x = controls.target.x; s.z.x = controls.target.z;
        s.d.x = camera.position.distanceTo(controls.target);
        controls.update();
      }
      composer.render();
    };
    raf = requestAnimationFrame(loop);

    // Graphics quality: resolution, bloom and edge samples follow the level.
    const applyQuality = (level: QualityLevel) => {
      const pr = pixelRatioFor(level);
      renderer.setPixelRatio(pr);
      composer.setPixelRatio(pr);
      bloom.enabled = level > 0;
      warSkin?.setSamples(samplesFor(level));
    };
    applyQuality(useQuality.getState().level);
    const unsubQuality = useQuality.subscribe((q) => applyQuality(q.level));
    // The relief wears the chosen map: the painted Myth Map, otherwise the physical terrain.
    const unsubStyle = usePreferences.subscribe((s, prev) => {
      if ((s.mapStyle === 'myth') === (prev.mapStyle === 'myth') || !terrain) return;
      void new THREE.TextureLoader().loadAsync(s.mapStyle === 'myth' ? '/maps/3d/myth-4k.webp' : '/maps/3d/terrain-4k.webp').then((tex) => {
        if (disposed || !terrain) return tex.dispose();
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const mat = terrain.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.map = tex;
        mat.needsUpdate = true;
      });
    });

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    (window as unknown as { __atlas3d?: unknown }).__atlas3d = { camera, controls, scene };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      unsubField?.();
      unsubQuality();
      unsubStyle();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      warSkin?.dispose();
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose(); x.dispose(); });
      });
      disposeTokenCaches();
      tetherMat.dispose();
      composer.dispose();
      renderer.dispose();
      // Hand the GPU context back now instead of at garbage collection:
      // browsers allow only a few live WebGL contexts per page.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete (window as unknown as { __atlas3d?: unknown }).__atlas3d;
    };
  }, []);

  return <div ref={host} className="absolute inset-0 z-15 bg-[#0b1419]" aria-label="3D atlas" role="img" />;
}

/** Default export for next/dynamic. */
export default Atlas3D;
