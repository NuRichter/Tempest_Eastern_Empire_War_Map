/**
 * Held ground over time — RECONSTRUCTED — after the reference war maps
 * (docs/research/REFERENCE_ANIMATION_DNA.md).
 *
 * The compiler (scripts/compile-front.ts) records, for every cell of a coarse
 * grid over the atlas, the moments its holder changes. This module turns that
 * history into the picture for any continuous time T:
 *
 *   E(T), A(T)  signed time fields: > 0 where the Empire / the allies hold the
 *               cell; the magnitude is the time (frames) to the nearest change
 *               of that holding. Losses are advanced by the lead L, so the
 *               loser recedes first (the pale band of refs 1 and 3).
 *   P(T), Q(T)  the pale band, as two linear fields for the flip nearest in
 *               time t*: P = T − (t* − L) and Q = t* − T. The band is where both
 *               are positive; each interpolates linearly, so both band edges
 *               are smooth.
 *
 * Because the fields are times, interpolating them between cells and taking
 * the zero contour gives a boundary that moves continuously with T — the front
 * is the isochrone t_flip = T. The same T always gives the same picture, so
 * playing, scrubbing and scrubbing backwards agree. Pure: no DOM.
 */

export const HOLDER_OWNER = 0;
export const HOLDER_EMPIRE = 1;
export const HOLDER_ALLIED = 2;

export type FrontEpisodeKind = 'ADVANCE' | 'RETREAT' | 'RECAPTURE' | 'COLLAPSE' | 'SETTLEMENT';

export interface FrontEpisode {
  id: string;
  kind: FrontEpisodeKind;
  /** The side that gains ground in this episode (the owner side for a collapse or settlement). */
  gainer: 'empire' | 'allied';
  /** The side that loses ground. */
  loser: 'empire' | 'allied';
  startFrame: number;
  endFrame: number;
  /** Frame by which half of the episode's cells have flipped. */
  midFrame: number;
  cells: number;
  territoryIds: string[];
  theatreId: string | null;
  forceIds: string[];
  /** The latest event at or before the episode starts. */
  eventId: string | null;
  centroid: [number, number];
}

export interface FrontFile {
  version: 1;
  grid: { w: number; h: number };
  stepFrames: number;
  leadFrames: number;
  speedCellsPerFrame: number;
  clampFrames: number;
  territoryIds: string[];
  /** base64 Int8Array: territory index of each cell, -1 for sea or unassigned land. */
  owner: string;
  /** base64 Uint8Array: number of flips of each cell (CSR row lengths into times/holders). */
  counts: string;
  /** base64 Float32Array: flip times in frames, ascending per cell. */
  times: string;
  /** base64 Uint8Array: holder after each flip. */
  holders: string;
  episodes: FrontEpisode[];
  provenance: 'RECONSTRUCTED';
  basis: string;
}

export interface Front {
  w: number;
  h: number;
  lead: number;
  clamp: number;
  owner: Int8Array;
  offsets: Uint32Array;
  times: Float32Array;
  holders: Uint8Array;
  territoryIds: string[];
  episodes: FrontEpisode[];
  /** Cells that ever change hands; the rest are constant and skipped. */
  active: Uint32Array;
}

export interface FrontFields {
  E: Float32Array;
  A: Float32Array;
  P: Float32Array;
  Q: Float32Array;
  /** Holder at T per cell. */
  hold: Uint8Array;
  /** Loser of the flip nearest in time (colour of the pale band). */
  paleOf: Uint8Array;
  /** Winner of that flip (the colour the transition belt blends towards). */
  paleTo: Uint8Array;
}

function bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64(view: ArrayBufferView): string {
  const u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function decodeFront(file: FrontFile): Front {
  const n = file.grid.w * file.grid.h;
  const owner = new Int8Array(bytes(file.owner).buffer);
  const counts = bytes(file.counts);
  const offsets = new Uint32Array(n + 1);
  for (let i = 0; i < n; i += 1) offsets[i + 1] = offsets[i] + counts[i];
  const times = new Float32Array(bytes(file.times).buffer);
  const holders = bytes(file.holders);
  if (owner.length !== n || counts.length !== n || times.length !== holders.length || offsets[n] !== times.length) {
    throw new Error('front.json: arrays do not match the grid.');
  }
  const act: number[] = [];
  for (let i = 0; i < n; i += 1) if (offsets[i + 1] > offsets[i]) act.push(i);
  return {
    w: file.grid.w, h: file.grid.h, lead: file.leadFrames, clamp: file.clampFrames,
    owner, offsets, times, holders, territoryIds: file.territoryIds, episodes: file.episodes,
    active: Uint32Array.from(act),
  };
}

export function createFields(front: Front): FrontFields {
  const n = front.w * front.h;
  return { E: new Float32Array(n), A: new Float32Array(n), P: new Float32Array(n), Q: new Float32Array(n), hold: new Uint8Array(n), paleOf: new Uint8Array(n), paleTo: new Uint8Array(n) };
}

/**
 * Signed distance in time from T to a set of half-open intervals [a, b):
 * positive inside (to the nearer end), negative outside (to the nearest interval).
 */
function signedTime(T: number, a: number[], b: number[], k: number, clamp: number): number {
  let inside = -Infinity;
  let outside = Infinity;
  for (let i = 0; i < k; i += 1) {
    if (T >= a[i] && T < b[i]) inside = Math.max(inside, Math.min(T - a[i], b[i] - T));
    else outside = Math.min(outside, T < a[i] ? a[i] - T : T - b[i]);
  }
  const v = inside > -Infinity ? inside : -outside;
  return Math.max(-clamp, Math.min(clamp, v));
}

const ia: number[] = [];
const ib: number[] = [];

/** Evaluates the held-ground fields at time T into `out` (reused between calls). */
export function evaluateFront(front: Front, T: number, out: FrontFields): FrontFields {
  const { E, A, P, Q, hold, paleOf, paleTo } = out;
  const C = front.clamp;
  const L = front.lead;
  E.fill(-C);
  A.fill(-C);
  P.fill(-C);
  Q.fill(-C);
  hold.fill(HOLDER_OWNER);
  paleOf.fill(HOLDER_OWNER);
  paleTo.fill(HOLDER_OWNER);
  const { offsets, times, holders } = front;
  for (let q = 0; q < front.active.length; q += 1) {
    const i = front.active[q];
    const o0 = offsets[i];
    const o1 = offsets[i + 1];
    // Holder at T.
    let h = HOLDER_OWNER;
    for (let k = o0; k < o1 && times[k] <= T; k += 1) h = holders[k];
    hold[i] = h;
    // Membership intervals for each side; a loss is advanced by the lead.
    for (const side of [HOLDER_EMPIRE, HOLDER_ALLIED]) {
      let k2 = 0;
      let prev = HOLDER_OWNER;
      let start = -1;
      for (let k = o0; k < o1; k += 1) {
        const next = holders[k];
        if (prev !== side && next === side) start = times[k];
        else if (prev === side && next !== side && start >= 0) {
          const end = times[k] - L;
          if (end > start) {
            ia[k2] = start;
            ib[k2] = end;
            k2 += 1;
          }
          start = -1;
        }
        prev = next;
      }
      if (start >= 0) {
        ia[k2] = start;
        ib[k2] = Infinity;
        k2 += 1;
      }
      const v = k2 ? signedTime(T, ia, ib, k2, C) : -C;
      if (side === HOLDER_EMPIRE) E[i] = v;
      else A[i] = v;
    }
    // Pale band: [t* − L, t*) for the flip t* nearest in time; colour = its loser.
    let best = Infinity;
    let tStar = NaN;
    let prevH = HOLDER_OWNER;
    for (let k = o0; k < o1; k += 1) {
      const d = Math.abs(T - times[k]);
      if (d < best) {
        best = d;
        tStar = times[k];
        paleOf[i] = prevH;
        paleTo[i] = holders[k];
      }
      prevH = holders[k];
    }
    if (Number.isFinite(tStar)) {
      P[i] = Math.max(-C, Math.min(C, T - (tStar - L)));
      Q[i] = Math.max(-C, Math.min(C, tStar - T));
    }
  }
  return out;
}

/** Bilinear sample of a coarse field at simulation coordinates (x, y in 0..1). */
export function sampleField(front: Front, f: Float32Array, x: number, y: number): number {
  const gx = Math.min(front.w - 1.0001, Math.max(0, x * front.w - 0.5));
  const gy = Math.min(front.h - 1.0001, Math.max(0, y * front.h - 0.5));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = gx - x0;
  const ty = gy - y0;
  const i = y0 * front.w + x0;
  const a = f[i];
  const b = f[i + 1];
  const c = f[i + front.w];
  const d = f[i + front.w + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

/**
 * Front seams: the zero contour of E and of A on land (marching squares on the
 * coarse grid, which is exactly the bilinear contour). Segments in simulation
 * coordinates, x0, y0, x1, y1 repeated.
 */
export function frontSeams(front: Front, fields: FrontFields): Float32Array {
  const { w, h, owner } = front;
  const segs: number[] = [];
  for (const f of [fields.E, fields.A]) {
    for (let y = 0; y < h - 1; y += 1) {
      for (let x = 0; x < w - 1; x += 1) {
        const i = y * w + x;
        const a = f[i];
        const b = f[i + 1];
        const c = f[i + w + 1];
        const d = f[i + w];
        const code = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
        if (code === 0 || code === 15) continue;
        if (owner[i] < 0 || owner[i + 1] < 0 || owner[i + w] < 0 || owner[i + w + 1] < 0) continue;
        const lerp = (p: number, q: number) => (Math.abs(p - q) < 1e-6 ? 0.5 : p / (p - q));
        const top: [number, number] = [x + lerp(a, b), y];
        const right: [number, number] = [x + 1, y + lerp(b, c)];
        const bottom: [number, number] = [x + lerp(d, c), y + 1];
        const left: [number, number] = [x, y + lerp(a, d)];
        const pairs: [number, number][][] = [];
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
        for (const [p, q] of pairs) segs.push((p[0] + 0.5) / w, (p[1] + 0.5) / h, (q[0] + 0.5) / w, (q[1] + 0.5) / h);
      }
    }
  }
  return new Float32Array(segs);
}

/** Share of each territory held by the other side at T (coarse cells). */
export function heldShare(front: Front, fields: FrontFields): Record<string, { empire: number; allied: number }> {
  const total = new Map<number, number>();
  const emp = new Map<number, number>();
  const all = new Map<number, number>();
  for (let i = 0; i < front.owner.length; i += 1) {
    const t = front.owner[i];
    if (t < 0) continue;
    total.set(t, (total.get(t) ?? 0) + 1);
    if (fields.E[i] > 0) emp.set(t, (emp.get(t) ?? 0) + 1);
    else if (fields.A[i] > 0) all.set(t, (all.get(t) ?? 0) + 1);
  }
  const out: Record<string, { empire: number; allied: number }> = {};
  for (const [t, n] of total) {
    const e = (emp.get(t) ?? 0) / n;
    const a = (all.get(t) ?? 0) / n;
    if (e > 0 || a > 0) out[front.territoryIds[t]] = { empire: e, allied: a };
  }
  return out;
}

/** Number of cells held by a side at T, optionally inside one territory. */
export function heldCells(fields: FrontFields, front: Front, side: number, territoryIndex = -1): number {
  const f = side === HOLDER_EMPIRE ? fields.E : fields.A;
  let n = 0;
  for (let i = 0; i < f.length; i += 1) if (f[i] > 0 && (territoryIndex < 0 || front.owner[i] === territoryIndex)) n += 1;
  return n;
}
