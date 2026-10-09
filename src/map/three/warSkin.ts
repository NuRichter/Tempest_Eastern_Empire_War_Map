/**
 * The war layer on the 3D terrain, drawn by a shader.
 *
 * Before: every ~110 ms a 2048 x 1578 canvas was redrawn on the CPU
 * (territories, the held ground pixel by pixel, glowing fronts with canvas
 * shadow blur) and 13 MB uploaded to the GPU: the hitch in the 3D film.
 * Now:
 *   territories   a canvas repainted only when a territory's role changes
 *   held ground   the same shader as the 2D map (FIELD_GLSL), fed by the field
 *                 worker's result (no second evaluation)
 *   fronts        the zero contour of the empire and allied fields, traced in
 *                 the shader at constant screen width; the bloom pass makes
 *                 the hot core glow
 */
import * as THREE from 'three';

import type { Dataset } from '@/data/loader';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { territoryControlAt } from '@/simulation/resolver';
import { FIELD_GLSL } from '@/map/field/gpuField';
import { packField } from '@/map/field/pack';
import type { Front, FrontFields } from '@/map/field/front';

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 v_sim;
void main() {
  v_sim = vec2(uv.x, 1.0 - uv.y);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
precision highp float;
precision highp int;
// GLSL 3: three.js no longer aliases gl_FragColor, and its fog chunk writes to it.
layout(location = 0) out highp vec4 warSkinColor;
#define gl_FragColor warSkinColor
uniform sampler2D u_territories;
uniform float u_hasField;
${FIELD_GLSL}
#include <common>
#include <fog_pars_fragment>
varying vec2 v_sim;

// A line along the zero contour of v, about 'px' screen pixels wide.
float contour(float v, float px) {
  float w = max(fwidth(v), 1e-4) * px;
  return 1.0 - smoothstep(0.0, w, abs(v));
}

void main() {
  vec4 terr = texture2D(u_territories, vec2(v_sim.x, 1.0 - v_sim.y));
  vec3 rgb = terr.rgb;
  float a = terr.a;
  if (u_hasField > 0.5) {
    vec4 held = heldGroundAA(v_sim);                 // premultiplied
    rgb = held.rgb + rgb * a * (1.0 - held.a);
    a = held.a + a * (1.0 - held.a);
    rgb = a > 0.0 ? rgb / a : rgb;                    // back to straight colour for fog
    // Fronts run over land only, never along a coast (as the 2D seams skip cells next to the sea).
    vec2 ex = dFdx(v_sim) * 3.0;
    vec2 ey = dFdy(v_sim) * 3.0;
    float land = landAt(v_sim) * landAt(v_sim + ex) * landAt(v_sim - ex) * landAt(v_sim + ey) * landAt(v_sim - ey);
    if (land > 0.0) {
      vec4 f = sampleFields(v_sim);
      float core = max(contour(f.x, 1.6), contour(f.y, 1.6));
      float glow = max(contour(f.x, 7.0), contour(f.y, 7.0));
      vec3 hot = vec3(1.0, 0.84, 0.59);
      rgb = mix(rgb, hot, glow * 0.45);
      a = max(a, glow * 0.35);
      rgb = mix(rgb, vec3(1.6), core);               // over 1: the bloom pass lifts it
      a = max(a, core * 0.95);
    }
  }
  gl_FragColor = vec4(rgb, a);
  #include <fog_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;               // premultiplied blending
}
`;

export interface WarSkin {
  mesh: THREE.Mesh;
  /** Repaints the territory canvas only when some territory's role changed at T. */
  updateTerritories(T: number): void;
  setField(front: Front, fields: FrontFields | null, packed?: { fields: Float32Array; pale: Uint8Array }): void;
  dispose(): void;
}

const linear = (hex: string) => new THREE.Color(hex);

export function createWarSkin(geo: THREE.BufferGeometry, data: Dataset, mask: { data: Uint8Array; w: number; h: number }, alpha: number): WarSkin {
  // Territories: a canvas, redrawn only on a change of roles.
  const terrCanvas = document.createElement('canvas');
  terrCanvas.width = 2048;
  terrCanvas.height = Math.round(2048 * (2035 / 2641));
  const terrTex = new THREE.CanvasTexture(terrCanvas);
  terrTex.colorSpace = THREE.SRGBColorSpace;
  terrTex.anisotropy = 8;
  let terrKey = '';

  const nearest = <T extends THREE.Texture>(t: T): T => {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.flipY = false;
    return t;
  };
  let fieldsTex: THREE.DataTexture | null = null;
  let paleTex: THREE.DataTexture | null = null;
  const maskTex = nearest(new THREE.DataTexture(mask.data, mask.w, mask.h, THREE.RedFormat, THREE.UnsignedByteType));
  maskTex.unpackAlignment = 1;
  maskTex.needsUpdate = true;

  const empire = linear(FACTION_COLOR.empire);
  const allied = linear(FACTION_COLOR.tempest);
  const uniforms = {
    u_territories: { value: terrTex },
    u_hasField: { value: 0 },
    u_fields: { value: null as THREE.Texture | null },
    u_pale: { value: null as THREE.Texture | null },
    u_mask: { value: maskTex as THREE.Texture },
    u_grid: { value: new THREE.Vector2(1, 1) },
    u_maskSize: { value: new THREE.Vector2(mask.w, mask.h) },
    u_empire: { value: new THREE.Vector3(empire.r, empire.g, empire.b) },
    u_allied: { value: new THREE.Vector3(allied.r, allied.g, allied.b) },
    u_alpha: { value: alpha },
    u_gradient: { value: 1 },
    u_samples: { value: 4 },
    fogDensity: { value: 0.00025 },
    fogNear: { value: 1 },
    fogFar: { value: 2000 },
    fogColor: { value: new THREE.Color(0xffffff) },
  };
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;

  let packed: Float32Array | null = null;
  let pale: Uint8Array | null = null;

  return {
    mesh,
    updateTerritories(T: number) {
      const segs = data.territories.map((t) => territoryControlAt(t, T).segment);
      const key = segs.map((s) => `${s.role}:${s.controller}`).join('|');
      if (key === terrKey) return;
      terrKey = key;
      const g = terrCanvas.getContext('2d')!;
      const W = terrCanvas.width;
      const H = terrCanvas.height;
      g.clearRect(0, 0, W, H);
      data.territories.forEach((t, i) => {
        const seg = segs[i];
        if (seg.role === 'UNINVOLVED') return;
        g.fillStyle = FACTION_COLOR[factionKey(seg.controller)];
        g.globalAlpha = seg.role === 'BELLIGERENT' ? 0.34 : 0.2;
        g.beginPath();
        for (const poly of t.geometry.coordinates) for (const ring of poly) ring.forEach(([x, y], k) => (k ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
        g.fill('evenodd');
        g.globalAlpha = 0.7;
        g.strokeStyle = 'rgba(30,20,10,0.55)';
        g.lineWidth = 2;
        g.stroke();
      });
      g.globalAlpha = 1;
      terrTex.needsUpdate = true;
    },
    setField(front, fields, given) {
      if (!fields) {
        uniforms.u_hasField.value = 0;
        return;
      }
      const n = front.w * front.h;
      if (!packed || packed.length !== n * 4) {
        packed = new Float32Array(n * 4);
        pale = new Uint8Array(n * 4);
        fieldsTex?.dispose();
        paleTex?.dispose();
        fieldsTex = nearest(new THREE.DataTexture(packed, front.w, front.h, THREE.RGBAFormat, THREE.FloatType));
        paleTex = nearest(new THREE.DataTexture(pale, front.w, front.h, THREE.RGBAFormat, THREE.UnsignedByteType));
        uniforms.u_fields.value = fieldsTex;
        uniforms.u_pale.value = paleTex;
        uniforms.u_grid.value.set(front.w, front.h);
      }
      if (given && given.fields.length === n * 4) {
        // Packed by the worker: point the textures at it, no copy.
        fieldsTex!.image.data = given.fields;
        paleTex!.image.data = given.pale;
      } else {
        fieldsTex!.image.data = packed;
        paleTex!.image.data = pale!;
        packField(front, fields, packed, pale!);
      }
      fieldsTex!.needsUpdate = true;
      paleTex!.needsUpdate = true;
      uniforms.u_hasField.value = 1;
    },
    dispose() {
      material.dispose();
      terrTex.dispose();
      maskTex.dispose();
      fieldsTex?.dispose();
      paleTex?.dispose();
    },
  };
}
