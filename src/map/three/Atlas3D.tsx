'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import type { Dataset } from '@/data/loader';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { CANVAS_H, CANVAS_W, computeField, loadFront, paintField } from '@/map/field/occupation';
import { fieldSources } from '@/map/field/sources';
import { cluster, gatherAction, Spring, useDirector, type Shot } from '@/map/cinematic/director';
import type { Front } from '@/map/field/front';
import { forceSnapshotAt, territoryControlAt } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion } from '@/state/preferences';

/**
 * The atlas in three dimensions (three.js).
 *
 *   terrain     a relief mesh (public/maps/3d/height.png, STYLISED: the novels give
 *               no elevations) wearing the super-resolved painted map
 *   war         territory colours, held ground and glowing fronts painted onto the
 *               terrain from the same data as the 2D map, every frame of the clock
 *   armies      lit pillars in faction colours, height by strength, numbers above
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
  const im = await loadImage('/maps/3d/height.png');
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

interface ForceObj { group: THREE.Group; pillar: THREE.Mesh; label: THREE.Sprite | null; labelText: string; x: number; z: number }

export function Atlas3D({ auto }: { auto: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  useEffect(() => {
    const el = host.current;
    const data = useSimulation.getState().data as Dataset | null;
    if (!el || !data) return;
    let disposed = false;
    const reduce = prefersReducedMotion();

    /* -- renderer, scene, camera ------------------------------------ */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
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
    const overlay = document.createElement('canvas');
    overlay.width = 2048;
    overlay.height = Math.round(2048 * (2035 / 2641));
    const ovTex = new THREE.CanvasTexture(overlay);
    ovTex.colorSpace = THREE.SRGBColorSpace;
    ovTex.anisotropy = 8;
    const fieldCanvas = document.createElement('canvas');
    fieldCanvas.width = CANVAS_W;
    fieldCanvas.height = CANVAS_H;
    let terrain: THREE.Mesh | null = null;
    let warSkin: THREE.Mesh | null = null;

    const forces = new Map<string, ForceObj>();
    const battleFx: { group: THREE.Group; ring: THREE.Mesh; sparks: THREE.Points; light: THREE.PointLight; id: string }[] = [];
    const portal = { group: new THREE.Group(), ring: null as THREE.Mesh | null, light: null as THREE.PointLight | null };

    void Promise.all([loadRelief(), loadFront(), new THREE.TextureLoader().loadAsync('/maps/3d/myth-4k.jpg')]).then(([r, f, tex]) => {
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
      warSkin = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true, toneMapped: false }));
      warSkin.renderOrder = 2;
      scene.add(warSkin);
      buildCities();
      lastPaint = -1; // the held ground has arrived: repaint even if the clock stands still
    });

    function paintOverlay(T: number): void {
      const g = overlay.getContext('2d')!;
      const W = overlay.width, H = overlay.height;
      g.clearRect(0, 0, W, H);
      // Territories by their role at this moment.
      for (const t of data!.territories) {
        const seg = territoryControlAt(t, T).segment;
        if (seg.role === 'UNINVOLVED') continue;
        g.fillStyle = FACTION_COLOR[factionKey(seg.controller)];
        g.globalAlpha = seg.role === 'BELLIGERENT' ? 0.34 : 0.2;
        g.beginPath();
        for (const poly of t.geometry.coordinates) for (const ring of poly) ring.forEach(([x, y], k) => (k ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
        g.fill('evenodd');
        g.globalAlpha = 0.7;
        g.strokeStyle = 'rgba(30,20,10,0.55)';
        g.lineWidth = 2;
        g.stroke();
      }
      g.globalAlpha = 1;
      if (front) {
        const field = computeField(front, T);
        paintField(fieldCanvas, data!, field, { empire: FACTION_COLOR.empire, allied: FACTION_COLOR.tempest }, 0.82);
        g.drawImage(fieldCanvas, 0, 0, W, H);
        // Fronts: a hot white core with a glow, which the bloom pass lifts.
        const s = field.seams;
        g.lineCap = 'round';
        for (const [width, color, blur] of [[9, 'rgba(255,214,150,0.35)', 18], [3.2, 'rgba(255,255,255,0.95)', 6]] as const) {
          g.strokeStyle = color;
          g.lineWidth = width;
          g.shadowColor = 'rgba(255,200,120,0.9)';
          g.shadowBlur = blur;
          g.beginPath();
          for (let k = 0; k < s.length; k += 4) { g.moveTo(s[k] * W, s[k + 1] * H); g.lineTo(s[k + 2] * W, s[k + 3] * H); }
          g.stroke();
        }
        g.shadowBlur = 0;
      }
      ovTex.needsUpdate = true;
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

    /* -- armies -------------------------------------------------------- */
    const pillarGeo = new THREE.CylinderGeometry(0.13, 0.2, 1, 14);
    pillarGeo.translate(0, 0.5, 0);
    const baseGeo = new THREE.RingGeometry(0.25, 0.42, 32);
    baseGeo.rotateX(-Math.PI / 2);
    function syncForces(T: number): void {
      const seen = new Set<string>();
      for (const s of fieldSources(data!, T)) {
        seen.add(s.forceId);
        const snap = forceSnapshotAt(data!, s.forceId, T);
        const strength = typeof snap?.strength === 'number' ? snap.strength : 2000;
        const color = new THREE.Color(s.side === 'empire' ? FACTION_COLOR.empire : FACTION_COLOR.tempest);
        let o = forces.get(s.forceId);
        if (!o) {
          const group = new THREE.Group();
          const pillar = new THREE.Mesh(pillarGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.4 }));
          pillar.castShadow = true;
          const base = new THREE.Mesh(baseGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
          group.add(pillar, base);
          scene.add(group);
          const [x, z] = toWorld(s.x, s.y);
          o = { group, pillar, label: null, labelText: '', x, z };
          forces.set(s.forceId, o);
        }
        const [x, z] = toWorld(s.x, s.y);
        o.x = x;
        o.z = z;
        const tall = 0.45 + Math.log10(Math.max(10, strength)) * 0.38;
        o.pillar.scale.set(1, tall, 1);
        const text = strength >= 3000 ? strength.toLocaleString('en-GB') : '';
        if (text !== o.labelText) {
          if (o.label) { o.group.remove(o.label); o.label.material.map?.dispose(); o.label.material.dispose(); }
          o.label = text ? textSprite(text, '#ffffff', 56, 700) : null;
          o.label?.scale.multiplyScalar(0.7);
          if (o.label) o.group.add(o.label);
          o.labelText = text;
        }
        if (o.label) o.label.position.set(0, tall + 0.45, 0);
      }
      for (const [id, o] of forces) {
        if (seen.has(id)) continue;
        scene.remove(o.group);
        forces.delete(id);
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
      if (Math.abs(T - lastSync) > 0.05) { lastSync = T; syncForces(T); }
      for (const o of forces.values()) {
        const nx = THREE.MathUtils.damp(o.group.position.x, o.x, 6, dt);
        const nz = THREE.MathUtils.damp(o.group.position.z, o.z, 6, dt);
        const sx = nx / WX + 0.5, sy = nz / WZ + 0.5;
        o.group.position.set(nx, sampleHeight(relief, sx, sy), nz);
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
        const tau = plan.shot === 'BATTLE' ? 1.4 : 2.0;
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
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose(); x.dispose(); });
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="absolute inset-0 z-[15] bg-[#0b1419]" aria-label="3D atlas" role="img" />;
}

/** Default export for next/dynamic. */
export default Atlas3D;
