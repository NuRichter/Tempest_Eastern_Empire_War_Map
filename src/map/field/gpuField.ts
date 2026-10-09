/**
 * Held ground on the GPU.
 *
 * The CPU version (paintField in occupation.ts) painted 1.2 million pixels
 * per frame and uploaded a 4.9 MB canvas: about 70% of the main thread during
 * the film. Here the per-cell time fields (E, A, P, Q: 352 x 272 floats) go to
 * the GPU as one small float texture when T changes, the land mask goes once,
 * and a fragment shader does the painting for every screen pixel in parallel:
 * the same bilinear field, the same isochrone front, the same transition belt
 * and the same land clip as paintField, with 4-sample anti-aliasing instead of
 * the canvas blur. Crisp at any zoom, at full frame rate.
 *
 * Drawn as a MapLibre custom layer. Positions go through MapLibre's own
 * `projectTile`, so the layer follows the flat map and the globe alike.
 * Needs WebGL2: `isSupported` lets the caller fall back to the canvas path.
 */
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from 'maplibre-gl';

import type { Front, FrontFields } from './front';
import { packField } from './pack';

/** Simulation (0..1) to Web Mercator (0..1): linear, see src/lib/coords.ts. */
const LNG_SPAN = 260;
const ATLAS_RATIO = 2035 / 2641;
const MERC_HALF = (LNG_SPAN / 360) * ATLAS_RATIO * 0.5;
const MERC = { x0: (180 - LNG_SPAN / 2) / 360, xs: LNG_SPAN / 360, y0: 0.5 - MERC_HALF, ys: MERC_HALF * 2 };

/** The painting rule, shared with the 3D view (three.js ShaderMaterial). */
export const FIELD_GLSL = /* glsl */ `
uniform highp sampler2D u_fields;  // RGBA32F: E, A, P, Q per cell (smoothed)
uniform highp sampler2D u_pale;    // RGBA8: R = loser of the nearest flip, G = its winner (0 owner, 1 empire, 2 allied)
uniform highp sampler2D u_mask;    // R8: land of the traced territories
uniform vec2 u_grid;
uniform vec2 u_maskSize;
uniform vec3 u_empire;
uniform vec3 u_allied;
uniform float u_alpha;
uniform float u_gradient;          // 1 = gradient belt, 0 = pale belt

// The time fields at s, bilinear (as the CPU contour): x = E, y = A, z = P, w = Q.
vec4 sampleFields(vec2 s) {
  vec2 g = clamp(s * u_grid - 0.5, vec2(0.0), u_grid - 1.0001);
  ivec2 i0 = ivec2(floor(g));
  vec2 t = g - vec2(i0);
  return mix(
    mix(texelFetch(u_fields, i0, 0), texelFetch(u_fields, i0 + ivec2(1, 0), 0), t.x),
    mix(texelFetch(u_fields, i0 + ivec2(0, 1), 0), texelFetch(u_fields, i0 + ivec2(1, 1), 0), t.x),
    t.y);
}

float landAt(vec2 s) {
  if (s.x < 0.0 || s.y < 0.0 || s.x >= 1.0 || s.y >= 1.0) return 0.0;
  return step(0.5, texelFetch(u_mask, ivec2(floor(s * u_maskSize)), 0).r);
}

// Premultiplied colour of the held ground at simulation point s.
vec4 heldGround(vec2 s) {
  if (s.x < 0.0 || s.y < 0.0 || s.x >= 1.0 || s.y >= 1.0) return vec4(0.0);
  if (texelFetch(u_mask, ivec2(floor(s * u_maskSize)), 0).r < 0.5) return vec4(0.0);
  vec2 g = clamp(s * u_grid - 0.5, vec2(0.0), u_grid - 1.0001);
  ivec2 i0 = ivec2(floor(g));
  vec2 t = g - vec2(i0);
  vec4 f = mix(
    mix(texelFetch(u_fields, i0, 0), texelFetch(u_fields, i0 + ivec2(1, 0), 0), t.x),
    mix(texelFetch(u_fields, i0 + ivec2(0, 1), 0), texelFetch(u_fields, i0 + ivec2(1, 1), 0), t.x),
    t.y);
  if (f.x > 0.0) return vec4(u_empire * u_alpha, u_alpha);
  if (f.y > 0.0) return vec4(u_allied * u_alpha, u_alpha);
  if (f.z > 0.0 && f.w > 0.0) {
    // The transition belt: from the loser's pale tone to the winner's colour.
    ivec2 c = i0 + ivec2(t.x < 0.5 ? 0 : 1, t.y < 0.5 ? 0 : 1);
    vec2 pl = texelFetch(u_pale, c, 0).rg * 255.0;
    int from = int(pl.x + 0.5);
    int to = int(pl.y + 0.5);
    vec3 white = vec3(1.0);
    vec3 pale = from == 1 ? mix(u_empire, white, 0.62) : from == 2 ? mix(u_allied, white, 0.62) : white;
    float paleA = from == 0 ? u_alpha * 0.62 : u_alpha;
    vec3 goal = to == 1 ? u_empire : to == 2 ? u_allied : pale;
    float goalA = to == 0 ? 0.0 : u_alpha;
    float k = u_gradient > 0.5 ? (1.0 - clamp(f.w / (f.z + f.w), 0.0, 1.0)) * 0.85 : 0.0;
    vec3 col = mix(pale, goal, k);
    float a = mix(paleA, goalA, k);
    return vec4(col * a, a);
  }
  return vec4(0.0);
}

uniform float u_samples;           // 4 on a GPU, 1 on a software renderer

// Four rotated-grid samples per pixel: the edge is anti-aliased, nothing else is blurred.
vec4 heldGroundAA(vec2 s) {
  vec2 dx = dFdx(s);
  vec2 dy = dFdy(s);
  if (u_samples < 2.0) return heldGround(s);
  return 0.25 * (
    heldGround(s + dx * -0.125 + dy * -0.375) +
    heldGround(s + dx * 0.375 + dy * -0.125) +
    heldGround(s + dx * 0.125 + dy * 0.375) +
    heldGround(s + dx * -0.375 + dy * 0.125));
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
${FIELD_GLSL}
in vec2 v_sim;
out vec4 fragColor;
void main() { fragColor = heldGroundAA(v_sim); }
`;

const vertexSource = (prelude: string, define: string) => `#version 300 es
${prelude}
${define}
in vec2 a_sim;
uniform vec4 u_merc;
uniform vec4 u_box;  // the part of the atlas where ground ever changes hands: x0, y0, width, height
out vec2 v_sim;
void main() {
  vec2 sim = u_box.xy + a_sim * u_box.zw;
  v_sim = sim;
  gl_Position = projectTile(vec2(u_merc.x + sim.x * u_merc.y, u_merc.z + sim.y * u_merc.w));
}
`;

/** A tessellated quad over the atlas, so the globe's curvature is followed. */
function mesh(nx: number, ny: number) {
  const pos = new Float32Array((nx + 1) * (ny + 1) * 2);
  for (let y = 0; y <= ny; y += 1) for (let x = 0; x <= nx; x += 1) pos.set([x / nx, y / ny], (y * (nx + 1) + x) * 2);
  const idx = new Uint16Array(nx * ny * 6);
  let k = 0;
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const a = y * (nx + 1) + x;
      idx.set([a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1], k);
      k += 6;
    }
  }
  return { pos, idx };
}

export interface FieldStyle {
  empire: string;
  allied: string;
  alpha: number;
  belt: 'gradient' | 'pale';
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

export function isGpuFieldSupported(map: MapLibreMap): boolean {
  // Diagnostics: localStorage 'tempest-atlas.debug.field' = 'cpu' forces the canvas path.
  try {
    if (localStorage.getItem('tempest-atlas.debug.field') === 'cpu') return false;
  } catch {
    /* storage blocked */
  }
  const gl = (map as unknown as { painter?: { context?: { gl?: unknown } } }).painter?.context?.gl;
  return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
}

/**
 * The held-ground layer. `setField` hands it the fields for a new T (uploaded
 * on the next frame), `setStyle` the colours, `setMask` the land mask (once).
 */
export class GpuFieldLayer implements CustomLayerInterface {
  readonly id: string;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;
  private gl: WebGL2RenderingContext | null = null;
  private map: MapLibreMap | null = null;
  private programs = new Map<string, { program: WebGLProgram; loc: Record<string, WebGLUniformLocation | null>; vao: WebGLVertexArrayObject }>();
  private buffers: { pos: WebGLBuffer; idx: WebGLBuffer; count: number } | null = null;
  private tex: { fields: WebGLTexture; pale: WebGLTexture; mask: WebGLTexture } | null = null;
  private grid: [number, number] = [1, 1];
  private maskSize: [number, number] = [1, 1];
  private pendingFields: { fields: Float32Array; pale: Uint8Array; w: number; h: number } | null = null;
  private pendingMask: { data: Uint8Array; w: number; h: number } | null = null;
  private hasField = false;
  private hasMask = false;
  private interleaved: Float32Array | null = null;
  private boxFor: Front | null = null;
  private paleBytes: Uint8Array | null = null;
  private box: [number, number, number, number] = [0, 0, 1, 1];
  private samples = 4;
  private style = { empire: [0, 0, 0] as [number, number, number], allied: [0, 0, 0] as [number, number, number], alpha: 0.86, gradient: 1 };
  visible = true;
  private isSuspended = false;
  /** Set when the layer resumes: the caller should send a fresh field (buffers held while suspended may be gone). */
  wantsRefresh = false;
  /** Set while another view covers the map: data still arrives, no redraw is requested. */
  get suspended(): boolean {
    return this.isSuspended;
  }
  set suspended(on: boolean) {
    if (this.isSuspended && !on) this.wantsRefresh = true;
    this.isSuspended = on;
  }

  constructor(id: string) {
    this.id = id;
  }

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error('GpuFieldLayer needs WebGL2');
    this.gl = gl;
    this.map = map;
    const m = mesh(96, 74);
    const pos = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
    const idx = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    this.buffers = { pos, idx, count: m.idx.length };
    const make = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.tex = { fields: make(), pale: make(), mask: make() };
    // A software renderer runs the shader on the CPU: one sample per pixel there.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) this.samples = 1;
  }

  setStyle(s: FieldStyle): void {
    this.style = { empire: hex(s.empire), allied: hex(s.allied), alpha: s.alpha, gradient: s.belt === 'gradient' ? 1 : 0 };
    this.map?.triggerRepaint();
  }

  setMask(land: Uint8Array, w: number, h: number): void {
    this.pendingMask = { data: land, w, h };
    this.map?.triggerRepaint();
  }

  setField(front: Front, fields: FrontFields, packed?: { fields: Float32Array; pale: Uint8Array }): void {
    const n = front.w * front.h;
    if (this.boxFor !== front) {
      // Only cells that ever change hands are drawn (plus a margin for the bilinear edge).
      let x0 = front.w, x1 = -1, y0 = front.h, y1 = -1;
      for (const i of front.active) {
        const x = i % front.w, y = Math.floor(i / front.w);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const bx0 = Math.max(0, (x0 - 2) / front.w), by0 = Math.max(0, (y0 - 2) / front.h);
      const bx1 = Math.min(1, (x1 + 3) / front.w), by1 = Math.min(1, (y1 + 3) / front.h);
      this.box = x1 >= 0 ? [bx0, by0, bx1 - bx0, by1 - by0] : [0, 0, 0, 0];
      this.boxFor = front;
    }
    if (!this.interleaved || this.interleaved.length !== n * 4) this.interleaved = new Float32Array(n * 4);
    if (!this.paleBytes || this.paleBytes.length !== n * 4) this.paleBytes = new Uint8Array(n * 4);
    let out = this.interleaved;
    let pale = this.paleBytes;
    // Packed by the worker: upload as is. Otherwise (fallback path) pack here.
    if (packed && packed.fields.length === n * 4) {
      out = packed.fields;
      pale = packed.pale;
    } else packField(front, fields, out, pale);
    this.pendingFields = { fields: out, pale, w: front.w, h: front.h };
    if (!this.suspended) this.map?.triggerRepaint();
  }

  private upload(gl: WebGL2RenderingContext): void {
    if (!this.tex) return;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (this.pendingMask) {
      const { data, w, h } = this.pendingMask;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.mask);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, data);
      this.maskSize = [w, h];
      this.pendingMask = null;
      this.hasMask = true;
    }
    // A buffer handed back to the worker meanwhile is detached (length 0): skip it, a fresh one follows.
    if (this.pendingFields && this.pendingFields.fields.length !== this.pendingFields.w * this.pendingFields.h * 4) this.pendingFields = null;
    if (this.pendingFields) {
      const { fields, pale, w, h } = this.pendingFields;
      const resize = this.grid[0] !== w || this.grid[1] !== h || !this.hasField;
      gl.bindTexture(gl.TEXTURE_2D, this.tex.fields);
      if (resize) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, fields);
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.FLOAT, fields);
      gl.bindTexture(gl.TEXTURE_2D, this.tex.pale);
      if (resize) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pale);
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pale);
      this.grid = [w, h];
      this.pendingFields = null;
      this.hasField = true;
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  }

  private program(gl: WebGL2RenderingContext, shaderData: CustomRenderMethodInput['shaderData']) {
    const cached = this.programs.get(shaderData.variantName);
    if (cached) return cached;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`held ground shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource(shaderData.vertexShaderPrelude, shaderData.define)));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.bindAttribLocation(program, 0, 'a_sim');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`held ground program: ${gl.getProgramInfoLog(program)}`);
    const names = ['u_box', 'u_samples', 'u_merc', 'u_fields', 'u_pale', 'u_mask', 'u_grid', 'u_maskSize', 'u_empire', 'u_allied', 'u_alpha', 'u_gradient', 'u_projection_matrix', 'u_projection_fallback_matrix', 'u_projection_tile_mercator_coords', 'u_projection_clipping_plane', 'u_projection_transition'];
    const loc = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers!.pos);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers!.idx);
    gl.bindVertexArray(null);
    const entry = { program, loc, vao };
    this.programs.set(shaderData.variantName, entry);
    return entry;
  }

  render(glAny: WebGLRenderingContext | WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    const gl = glAny as WebGL2RenderingContext;
    if (!this.visible || !this.tex || !this.buffers) return;
    this.upload(gl);
    if (!this.hasField || !this.hasMask) return;
    const { program, loc, vao } = this.program(gl, options.shaderData);
    const d = options.defaultProjectionData;
    gl.useProgram(program);
    gl.uniformMatrix4fv(loc.u_projection_matrix, false, d.mainMatrix as Float32List);
    gl.uniformMatrix4fv(loc.u_projection_fallback_matrix, false, d.fallbackMatrix as Float32List);
    gl.uniform4f(loc.u_projection_tile_mercator_coords, ...d.tileMercatorCoords);
    gl.uniform4f(loc.u_projection_clipping_plane, ...d.clippingPlane);
    gl.uniform1f(loc.u_projection_transition, d.projectionTransition);
    gl.uniform4f(loc.u_merc, MERC.x0, MERC.xs, MERC.y0, MERC.ys);
    gl.uniform4f(loc.u_box, ...this.box);
    gl.uniform1f(loc.u_samples, this.samples);
    gl.uniform2f(loc.u_grid, this.grid[0], this.grid[1]);
    gl.uniform2f(loc.u_maskSize, this.maskSize[0], this.maskSize[1]);
    gl.uniform3f(loc.u_empire, ...this.style.empire);
    gl.uniform3f(loc.u_allied, ...this.style.allied);
    gl.uniform1f(loc.u_alpha, this.style.alpha);
    gl.uniform1f(loc.u_gradient, this.style.gradient);
    const bind = (unit: number, t: WebGLTexture, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(loc[name], unit);
    };
    bind(0, this.tex.fields, 'u_fields');
    bind(1, this.tex.pale, 'u_pale');
    bind(2, this.tex.mask, 'u_mask');
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, this.buffers.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
  }

  onRemove(_map: MapLibreMap, glAny: WebGLRenderingContext | WebGL2RenderingContext): void {
    const gl = glAny as WebGL2RenderingContext;
    for (const p of this.programs.values()) {
      gl.deleteProgram(p.program);
      gl.deleteVertexArray(p.vao);
    }
    this.programs.clear();
    if (this.buffers) {
      gl.deleteBuffer(this.buffers.pos);
      gl.deleteBuffer(this.buffers.idx);
    }
    if (this.tex) for (const t of Object.values(this.tex)) gl.deleteTexture(t);
    this.tex = null;
    this.buffers = null;
    this.gl = null;
    this.map = null;
  }
}
