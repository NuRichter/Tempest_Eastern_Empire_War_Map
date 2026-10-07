/**
 * Held ground and fronts on the map — RECONSTRUCTED.
 *
 * The history is precomputed (scripts/compile-front.ts → public/data/front.json)
 * and evaluated here for the continuous clock time T (src/map/field/front.ts).
 * What the reference war maps do, and this module reproduces
 * (docs/research/REFERENCE_ANIMATION_DNA.md):
 *
 *   - ground changes hands by a moving boundary, not a fade: each pixel is
 *     either held or not, and the boundary is the isochrone t_flip = T;
 *   - the loser recedes first and a pale band (the loser's colour, lightened)
 *     shows the ground about to change hands;
 *   - the same T always gives the same picture, forwards or backwards.
 *
 * Coastlines stay crisp: only land pixels of the traced territories are painted.
 */

import type { Dataset } from '@/data/loader';
import {
  createFields,
  decodeFront,
  evaluateFront,
  frontSeams,
  heldShare,
  HOLDER_ALLIED,
  HOLDER_OWNER,
  HOLDER_EMPIRE,
  type Front,
  type FrontFields,
  type FrontFile,
} from '@/map/field/front';

/** Paint canvas: a fixed pixel budget spread over the visible window of the map. */
export const CANVAS_W = 1280;
export const CANVAS_H = 960;
/** Land mask resolution: the Base Map pixels, so coastlines match it. */
const MASK_W = 2641;
const MASK_H = 2035;

/** A window of the map in simulation coordinates (0..1). */
export interface FieldWindow { x0: number; y0: number; x1: number; y1: number }
export const FULL_WINDOW: FieldWindow = { x0: 0, y0: 0, x1: 1, y1: 1 };

export interface FieldResult {
  front: Front;
  fields: FrontFields;
  T: number;
  /** Front segments in simulation coordinates: x0,y0,x1,y1 repeated. */
  seams: Float32Array;
  /** Share of each territory held by the other side, 0..1, for the Situation panel. */
  occupiedShare: Record<string, number>;
}

let frontPromise: Promise<Front | null> | null = null;

/** Loads the held-ground history once. A missing or invalid file hides the layer. */
export function loadFront(): Promise<Front | null> {
  if (!frontPromise) {
    frontPromise = fetch('/data/front.json')
      .then((r) => (r.ok ? (r.json() as Promise<FrontFile>) : null))
      .then((f) => (f ? decodeFront(f) : null))
      .catch(() => null);
  }
  return frontPromise;
}

let ownerGrid: Int8Array | null = null;
let ownerData: Dataset | null = null;

/**
 * Land mask at the Base Map resolution: territory index per map pixel
 * (-1 = sea). Each territory is drawn alone and read back only inside its own
 * bounding box; a pixel is taken at half coverage, so neighbours never blend.
 */
function ensureOwnerGrid(data: Dataset): Int8Array {
  if (ownerGrid && ownerData === data) return ownerGrid;
  const canvas = document.createElement('canvas');
  canvas.width = MASK_W;
  canvas.height = MASK_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ownerGrid = new Int8Array(MASK_W * MASK_H).fill(-1);
  data.territories.forEach((t, i) => {
    let minX = MASK_W;
    let minY = MASK_H;
    let maxX = 0;
    let maxY = 0;
    ctx.clearRect(0, 0, MASK_W, MASK_H);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (const poly of t.geometry.coordinates) {
      poly[0].forEach(([x, y], k) => {
        const px = x * MASK_W;
        const py = y * MASK_H;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
    }
    ctx.fill();
    const bx = Math.max(0, Math.floor(minX));
    const by = Math.max(0, Math.floor(minY));
    const bw = Math.min(MASK_W, Math.ceil(maxX) + 1) - bx;
    const bh = Math.min(MASK_H, Math.ceil(maxY) + 1) - by;
    if (bw <= 0 || bh <= 0) return;
    const alpha = ctx.getImageData(bx, by, bw, bh).data;
    for (let y = 0; y < bh; y += 1) {
      for (let x = 0; x < bw; x += 1) {
        const c = (by + y) * MASK_W + bx + x;
        if (alpha[(y * bw + x) * 4 + 3] >= 128 && ownerGrid![c] < 0) ownerGrid![c] = i;
      }
    }
  });
  ownerData = data;
  return ownerGrid;
}

let fieldsCache: FrontFields | null = null;
let tmp: Float32Array | null = null;

/**
 * A 3×3 box filter over a time field (rendering only; the data and the tests
 * use exact values). It rounds the cell-sized steps out of the contour so the
 * front reads as a smooth line, as in the reference maps.
 */
function smooth(front: Front, f: Float32Array): void {
  const { w, h } = front;
  if (!tmp || tmp.length !== f.length) tmp = new Float32Array(f.length);
  tmp.set(f);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      f[i] = (tmp[i - w - 1] + tmp[i - w] + tmp[i - w + 1] + tmp[i - 1] + tmp[i] + tmp[i + 1] + tmp[i + w - 1] + tmp[i + w] + tmp[i + w + 1]) / 9;
    }
  }
}

export function computeField(front: Front, T: number): FieldResult {
  if (!fieldsCache || fieldsCache.E.length !== front.w * front.h) fieldsCache = createFields(front);
  const fields = evaluateFront(front, T, fieldsCache);
  smooth(front, fields.E);
  smooth(front, fields.A);
  smooth(front, fields.P);
  smooth(front, fields.Q);
  const share = heldShare(front, fields);
  const occupiedShare: Record<string, number> = {};
  for (const [id, s] of Object.entries(share)) occupiedShare[id] = Math.max(s.empire, s.allied);
  return { front, fields, T, seams: frontSeams(front, fields), occupiedShare };
}

/** Bounding box of the cells that ever change hands, in simulation coordinates. */
let activeBox: { front: Front; x0: number; x1: number; y0: number; y1: number } | null = null;
function activeBounds(front: Front) {
  if (activeBox?.front === front) return activeBox;
  let x0 = front.w;
  let x1 = -1;
  let y0 = front.h;
  let y1 = -1;
  for (const i of front.active) {
    const x = i % front.w;
    const y = Math.floor(i / front.w);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  activeBox = { front, x0: (x0 - 2) / front.w, x1: (x1 + 3) / front.w, y0: (y0 - 2) / front.h, y1: (y1 + 3) / front.h };
  return activeBox;
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const mix = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] =>
  [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as [number, number, number];

let scratch: HTMLCanvasElement | null = null;
let image: ImageData | null = null;
const colI0 = new Int32Array(CANVAS_W);
const colT = new Float32Array(CANVAS_W);
const colM = new Int32Array(CANVAS_W);
const rowI0 = new Int32Array(CANVAS_H);
const rowT = new Float32Array(CANVAS_H);
const rowM = new Int32Array(CANVAS_H);

/**
 * Paints the held ground at the field time over `win` of the map into
 * `canvas` (CANVAS_W x CANVAS_H): about one canvas pixel per screen pixel when
 * the window follows the view, so the front stays crisp at any zoom.
 * Held: the side colour at `alpha`. Pale band: the loser colour lightened
 * (owner land: a white wash). A light blur antialiases the edge only.
 */
export type TransitionBelt = 'gradient' | 'pale';

export function paintField(canvas: HTMLCanvasElement, data: Dataset, field: FieldResult, colors: { empire: string; allied: string }, alpha: number, win: FieldWindow = FULL_WINDOW, belt: TransitionBelt = 'gradient'): void {
  const { front, fields } = field;
  if (canvas.width !== CANVAS_W || canvas.height !== CANVAS_H) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
  }
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = CANVAS_W;
    scratch.height = CANVAS_H;
  }
  const sctx = scratch.getContext('2d', { willReadFrequently: true })!;
  if (!image) image = sctx.createImageData(CANVAS_W, CANVAS_H);
  const owner = ensureOwnerGrid(data);
  const px = image.data;
  px.fill(0);
  const cw = front.w;
  const ch = front.h;
  const sx = (win.x1 - win.x0) / CANVAS_W;
  const sy = (win.y1 - win.y0) / CANVAS_H;
  for (let x = 0; x < CANVAS_W; x += 1) {
    const u = win.x0 + (x + 0.5) * sx;
    const g = Math.min(cw - 1.0001, Math.max(0, u * cw - 0.5));
    colI0[x] = Math.floor(g);
    colT[x] = g - colI0[x];
    colM[x] = u < 0 || u >= 1 ? -1 : Math.floor(u * MASK_W);
  }
  for (let y = 0; y < CANVAS_H; y += 1) {
    const v = win.y0 + (y + 0.5) * sy;
    const g = Math.min(ch - 1.0001, Math.max(0, v * ch - 0.5));
    rowI0[y] = Math.floor(g);
    rowT[y] = g - rowI0[y];
    rowM[y] = v < 0 || v >= 1 ? -1 : Math.floor(v * MASK_H);
  }
  // Only the part of the window where ground ever changes hands is visited.
  const box = activeBounds(front);
  const xa = Math.max(0, Math.floor((box.x0 - win.x0) / sx));
  const xb = Math.min(CANVAS_W - 1, Math.ceil((box.x1 - win.x0) / sx));
  const ya = Math.max(0, Math.floor((box.y0 - win.y0) / sy));
  const yb = Math.min(CANVAS_H - 1, Math.ceil((box.y1 - win.y0) / sy));
  const empire = rgb(colors.empire);
  const allied = rgb(colors.allied);
  const white: [number, number, number] = [255, 255, 255];
  const paleEmpire = mix(empire, white, 0.62);
  const paleAllied = mix(allied, white, 0.62);
  const a = Math.round(alpha * 255);
  const { E, A, P, Q, paleOf, paleTo } = fields;
  const blend: [number, number, number] = [0, 0, 0];
  for (let y = ya; y <= yb; y += 1) {
    const my = rowM[y];
    if (my < 0) continue;
    const gy = rowI0[y];
    const ty = rowT[y];
    const row = gy * cw;
    for (let x = xa; x <= xb; x += 1) {
      const mx = colM[x];
      if (mx < 0 || owner[my * MASK_W + mx] < 0) continue;
      const gx = colI0[x];
      const tx = colT[x];
      const i = row + gx;
      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;
      const e = E[i] * w00 + E[i + 1] * w10 + E[i + cw] * w01 + E[i + cw + 1] * w11;
      let col: [number, number, number] | null = null;
      let al = a;
      if (e > 0) col = empire;
      else {
        const al2 = A[i] * w00 + A[i + 1] * w10 + A[i + cw] * w01 + A[i + cw + 1] * w11;
        if (al2 > 0) col = allied;
        else {
          const pv = P[i] * w00 + P[i + 1] * w10 + P[i + cw] * w01 + P[i + cw + 1] * w11;
          const qv = pv > 0 ? Q[i] * w00 + Q[i + 1] * w10 + Q[i + cw] * w01 + Q[i + cw + 1] * w11 : -1;
          if (pv > 0 && qv > 0) {
            // The transition belt: across the moving band the colour runs from
            // the loser's pale tone (where it has just receded) to the winner's
            // colour (where it is about to arrive), as in reference 4's soft
            // blend and references 1 and 3's pale strip. It moves with the front.
            const c = (ty < 0.5 ? row : row + cw) + (tx < 0.5 ? gx : gx + 1);
            const from = paleOf[c];
            const to = paleTo[c];
            const f = belt === 'gradient' ? Math.min(1, Math.max(0, qv / (pv + qv))) : 0;
            const pale = from === HOLDER_EMPIRE ? paleEmpire : from === HOLDER_ALLIED ? paleAllied : white;
            const paleA = from === HOLDER_OWNER ? a * 0.62 : a;
            const goal = to === HOLDER_EMPIRE ? empire : to === HOLDER_ALLIED ? allied : pale;
            const goalA = to === HOLDER_OWNER ? 0 : a;
            const k = 1 - f; // 0 at the loser's edge, 1 at the winner's edge
            if (belt === 'gradient') {
              const kk = k * 0.85;
              blend[0] = Math.round(pale[0] + (goal[0] - pale[0]) * kk);
              blend[1] = Math.round(pale[1] + (goal[1] - pale[1]) * kk);
              blend[2] = Math.round(pale[2] + (goal[2] - pale[2]) * kk);
              col = blend;
            } else col = pale;
            al = Math.round(belt === 'gradient' ? paleA + (goalA - paleA) * k * 0.85 : paleA);
          }
        }
      }
      if (!col) continue;
      const o = (y * CANVAS_W + x) * 4;
      px[o] = col[0];
      px[o + 1] = col[1];
      px[o + 2] = col[2];
      px[o + 3] = al;
    }
  }
  sctx.putImageData(image, 0, 0);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.filter = 'blur(0.6px)';
  ctx.drawImage(scratch, 0, 0);
  ctx.filter = 'none';
}
