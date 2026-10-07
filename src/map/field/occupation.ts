/**
 * Synthesised occupation and fronts — RECONSTRUCTED.
 *
 * The novels never draw a front line. The reference documentaries show war as
 * ground changing colour around armies, so the atlas synthesises that picture
 * from what the record does hold: where each formation is and how strong it is.
 *
 *   influence(p) = Σ strength^(1/3) · kernel(distance / reach)
 *   reach        = grows with strength^(1/3), clamped
 *   home ground  = a defender's own territory adds a baseline it must be beaten by
 *
 * A cell of a belligerent's territory is drawn occupied by the other side where
 * that side's influence exceeds the owner's (forces + baseline); the front is
 * the contour where the two balance. Formations in the air or under ground
 * (airships, the labyrinth) hold no ground and are ignored.
 *
 * Deterministic: the same frame always yields the same field. Everything this
 * module draws is labelled RECONSTRUCTED in the legend and the Situation panel.
 */

import type { Dataset } from '@/data/loader';
import { forcePositionAt, forceSnapshotAt, territoryControlAt } from '@/simulation/resolver';
import { factionKey } from '@/lib/palette';

export const GRID_W = 1056;
export const GRID_H = 814; // 2641 x 2035 at two fifths
const ASPECT = GRID_H / GRID_W; // y units are shorter than x units in pixels

type Side = 'empire' | 'allied';

export interface FieldResult {
  /** Per cell: 0 nothing, 1 occupied by the Empire, 2 occupied by the allies, 3 contested (Empire ahead), 4 contested (allies ahead). */
  cls: Uint8Array;
  /** Front segments in simulation coordinates: x0,y0,x1,y1 repeated. */
  seams: Float32Array;
  /** Occupied share of each defender territory, 0..1, for the Situation panel. */
  occupiedShare: Record<string, number>;
  signature: string;
}

interface Source {
  side: Side;
  x: number;
  y: number;
  w: number;
  r: number;
}

let ownerGrid: Int16Array | null = null;
let ownerData: Dataset | null = null;
const territoryCells = new Map<number, number>();

/**
 * Rasterises the traced territories once: cell -> territory index (-1 = sea).
 * Each territory is drawn alone and a cell is taken at half coverage, so the
 * antialiased edge between two neighbours never blends into a third index.
 */
function ensureOwnerGrid(data: Dataset): Int16Array {
  if (ownerGrid && ownerData === data) return ownerGrid;
  const canvas = document.createElement('canvas');
  canvas.width = GRID_W;
  canvas.height = GRID_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ownerGrid = new Int16Array(GRID_W * GRID_H).fill(-1);
  territoryCells.clear();
  data.territories.forEach((t, i) => {
    ctx.clearRect(0, 0, GRID_W, GRID_H);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (const poly of t.geometry.coordinates) {
      poly[0].forEach(([x, y], k) => (k ? ctx.lineTo(x * GRID_W, y * GRID_H) : ctx.moveTo(x * GRID_W, y * GRID_H)));
      ctx.closePath();
    }
    ctx.fill();
    const alpha = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
    for (let c = 0; c < GRID_W * GRID_H; c += 1) {
      if (alpha[c * 4 + 3] >= 128 && ownerGrid![c] < 0) {
        ownerGrid![c] = i;
        territoryCells.set(i, (territoryCells.get(i) ?? 0) + 1);
      }
    }
  });
  ownerData = data;
  return ownerGrid;
}

function sideOf(faction: string | null | undefined): Side | null {
  const k = factionKey(faction);
  if (k === 'empire') return 'empire';
  if (k === 'tempest' || k === 'dwargon' || k === 'neutral') return 'allied';
  return null;
}

function sources(data: Dataset, frame: number, hidden: Set<string>): Source[] {
  const drawn = new Map<string, Source>();
  for (const force of data.forces) {
    if (hidden.has(force.id)) continue;
    const snap = forceSnapshotAt(data, force.id, Math.floor(frame));
    if (!snap || /DESTROY|ANNIHILAT|CAPTURED|PRISONER|RESURRECTED/i.test(snap.status)) continue;
    const pos = forcePositionAt(data, force.id, frame);
    if (!pos) continue;
    const place = pos.placeId ? data.placeById.get(pos.placeId) : null;
    if (place && (place.altitude === 'AIR' || place.altitude === 'SUBSURFACE')) continue;
    if (/air|airship|flying|fleet/i.test(force.unitType)) continue;
    const side = sideOf(force.faction);
    if (!side) continue;
    const strength = typeof snap.strength === 'number' ? snap.strength : 2000;
    if (strength < 50) continue; // single combatants hold no ground
    const w = Math.cbrt(strength);
    const r = Math.min(0.055, Math.max(0.012, 0.0011 * w));
    drawn.set(force.id, { side, x: pos.x, y: pos.y, w, r });
  }
  // A parent and its subordinates are the same soldiers: keep the most specific.
  for (const force of data.forces) {
    if (drawn.has(force.id) && force.childIds.some((c) => drawn.has(c))) drawn.delete(force.id);
  }
  return [...drawn.values()];
}

let lastResult: FieldResult | null = null;

export function computeField(data: Dataset, frame: number, hiddenForces: Set<string> = new Set()): FieldResult {
  const owner = ensureOwnerGrid(data);
  const src = sources(data, frame, hiddenForces);
  const signature = src.map((s) => `${s.side}${s.x.toFixed(3)},${s.y.toFixed(3)},${Math.round(s.w)}`).sort().join('|') +
    '#' + data.territories.map((t) => territoryControlAt(t, frame).segment.role).join('');
  // Same formations in the same places: the field is the same.
  if (lastResult && lastResult.signature === signature && ownerData === data) return lastResult;

  // Which side owns each territory right now, and whether it is at war.
  const ownerSide: (Side | null)[] = data.territories.map((t) => {
    const seg = territoryControlAt(t, frame).segment;
    if (seg.role === 'UNINVOLVED' || seg.role === 'ARMISTICE' || seg.status === 'UNKNOWN') return null;
    return sideOf(seg.controller);
  });

  const n = GRID_W * GRID_H;
  const diff = new Float32Array(n); // empire influence minus allied influence, with home baselines
  const cls = new Uint8Array(n);
  const empireCells = new Uint32Array(data.territories.length);
  if (src.length) {
    for (const s of src) {
      const cx = s.x * GRID_W;
      const cy = s.y * GRID_H;
      const rr = s.r * GRID_W;
      const x0 = Math.max(0, Math.floor(cx - rr));
      const x1 = Math.min(GRID_W - 1, Math.ceil(cx + rr));
      const y0 = Math.max(0, Math.floor(cy - rr));
      const y1 = Math.min(GRID_H - 1, Math.ceil(cy + rr));
      const sign = s.side === 'empire' ? 1 : -1;
      for (let y = y0; y <= y1; y += 1) {
        const dy = (y + 0.5 - cy) / rr;
        for (let x = x0; x <= x1; x += 1) {
          const dx = (x + 0.5 - cx) / rr;
          const t = dx * dx + dy * dy;
          if (t >= 1) continue;
          const k = (1 - t) * (1 - t);
          diff[y * GRID_W + x] += sign * s.w * k;
        }
      }
    }
  }
  // Home ground: a belligerent's own land must be out-weighed to be occupied.
  const BASE = 18;
  // Contested margin, in influence units, either side of the balance line.
  const MARGIN = 4;
  for (let i = 0; i < n; i += 1) {
    const t = owner[i];
    if (t < 0) continue;
    const os = ownerSide[t];
    if (!os) continue;
    const v = diff[i];
    if (os === 'allied' && v > BASE) {
      cls[i] = v - BASE < MARGIN ? 3 : 1;
      empireCells[t] += 1;
    } else if (os === 'empire' && -v > BASE) {
      cls[i] = -v - BASE < MARGIN ? 4 : 2;
    }
    diff[i] = os === 'allied' ? v - BASE : os === 'empire' ? -v - BASE : -1;
  }

  // Front: marching squares on the occupation margin (diff = 0) inside land.
  const segs: number[] = [];
  const at = (x: number, y: number) => diff[y * GRID_W + x];
  for (let y = 0; y < GRID_H - 1; y += 1) {
    for (let x = 0; x < GRID_W - 1; x += 1) {
      const a = at(x, y);
      const b = at(x + 1, y);
      const c = at(x + 1, y + 1);
      const d = at(x, y + 1);
      const code = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
      if (code === 0 || code === 15) continue;
      // Only where the whole cell is land (no seam along coasts or border gaps).
      if (owner[y * GRID_W + x] < 0 || owner[y * GRID_W + x + 1] < 0 || owner[(y + 1) * GRID_W + x] < 0 || owner[(y + 1) * GRID_W + x + 1] < 0) continue;
      const lerp = (p: number, q: number) => (Math.abs(p - q) < 1e-6 ? 0.5 : p / (p - q));
      const top: [number, number] = [x + lerp(a, b), y];
      const right: [number, number] = [x + 1, y + lerp(b, c)];
      const bottom: [number, number] = [x + lerp(d, c), y + 1];
      const left: [number, number] = [x, y + lerp(a, d)];
      const pairs: [[number, number], [number, number]][] = [];
      switch (code) {
        case 1: case 14: pairs.push([left, bottom]); break;
        case 2: case 13: pairs.push([bottom, right]); break;
        case 3: case 12: pairs.push([left, right]); break;
        case 4: case 11: pairs.push([top, right]); break;
        case 6: case 9: pairs.push([top, bottom]); break;
        case 7: case 8: pairs.push([left, top]); break;
        case 5: pairs.push([left, top], [bottom, right]); break;
        case 10: pairs.push([top, right], [left, bottom]); break;
      }
      for (const [p, q] of pairs) segs.push((p[0] + 0.5) / GRID_W, (p[1] + 0.5) / GRID_H, (q[0] + 0.5) / GRID_W, (q[1] + 0.5) / GRID_H);
    }
  }

  const occupiedShare: Record<string, number> = {};
  data.territories.forEach((t, i) => {
    if (empireCells[i]) occupiedShare[t.id] = empireCells[i] / (territoryCells.get(i) ?? 1);
  });
  void ASPECT;
  lastResult = { cls, seams: new Float32Array(segs), occupiedShare, signature };
  return lastResult;
}

/**
 * Paints the occupation classes into a canvas the size of the grid. The
 * contested margin fades the holder's colour out rather than adding a third
 * hue, and a light blur softens the cell edges, so the held ground reads as a
 * continuous area with the white front on its edge, as in the reference films.
 */
let scratch: HTMLCanvasElement | null = null;
export function paintField(canvas: HTMLCanvasElement, field: FieldResult, colors: { empire: string; allied: string; contested: string }, alpha: number): void {
  if (canvas.width !== GRID_W) {
    canvas.width = GRID_W;
    canvas.height = GRID_H;
  }
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = GRID_W;
    scratch.height = GRID_H;
  }
  // CPU-backed contexts: the blur and the texture upload stay off the GPU
  // process, which matters most on software GL.
  const sctx = scratch.getContext('2d', { willReadFrequently: true })!;
  const img = sctx.createImageData(GRID_W, GRID_H);
  const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const empire = rgb(colors.empire);
  const allied = rgb(colors.allied);
  const a = Math.round(alpha * 255);
  for (let i = 0; i < field.cls.length; i += 1) {
    const c = field.cls[i];
    if (!c) continue;
    const col = c === 2 || c === 4 ? allied : empire;
    img.data[i * 4] = col[0];
    img.data[i * 4 + 1] = col[1];
    img.data[i * 4 + 2] = col[2];
    img.data[i * 4 + 3] = c >= 3 ? Math.round(a * 0.5) : a;
  }
  sctx.putImageData(img, 0, 0);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, GRID_W, GRID_H);
  ctx.filter = 'blur(1.2px)';
  ctx.drawImage(scratch, 0, 0);
  ctx.filter = 'none';
}
