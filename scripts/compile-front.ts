/**
 * Compiles the held-ground history: public/data/front.json (RECONSTRUCTED).
 *
 * Runs after compile-data, on the compiled runtime dataset, and simulates the
 * campaign on a coarse grid in steps of STEP frames:
 *
 *   influence  v = Σ empire − Σ allied   (src/map/field/sources.ts)
 *   capture    owner-held ground of a belligerent goes to the other side when
 *              its net influence exceeds the home baseline BASE
 *   hold       captured ground STAYS captured after the army moves on, until
 *              the owner side's net influence there exceeds HOLD (recapture)
 *   collapse   captured ground no longer connected to any formation of its
 *              side (destroyed, withdrawn, underground) returns to the owner
 *   settlement ground in a territory that leaves the war returns to the owner
 *
 * Every cell that changes in a step gets a flip time from a breadth-first
 * distance through the changed cells, starting at the gaining side's existing
 * ground: t = t_step + d / SPEED. Advances therefore spread from the front,
 * pockets shrink from the rim inward and landings grow outward — the
 * behaviour measured in the reference videos (docs/research/).
 *
 * Deterministic: the same dataset gives a byte-identical file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assembleDataset, PART_FILES, type DatasetParts } from '../src/data/loader';
import { fieldSources, sideOf, type Source } from '../src/map/field/sources';
import { HOLDER_ALLIED, HOLDER_EMPIRE, HOLDER_OWNER, toBase64, type FrontEpisode, type FrontEpisodeKind, type FrontFile } from '../src/map/field/front';
import { forceSnapshotAt, territoryControlAt } from '../src/simulation/resolver';
import type { FrameState } from '../src/types/dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data');
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), 'utf8')) as T;

export const GRID_W = 352;
export const GRID_H = 272;
const STEP = 3;
const BASE = 18;
const HOLD = 6;
const SPEED = 1; // cells per frame
const LEAD = 3; // frames
const CLAMP = 24; // frames
const SEED_RADIUS = 3; // cells around a formation that anchor its held ground
const MIN_EPISODE_CELLS = 4;

interface FrontRules { gates: { territoryId: string; side: 'empire' | 'allied'; fromEvent: string; basis: string }[] }
const rules = JSON.parse(readFileSync(join(HERE, '..', 'data-source', 'campaign', 'front-rules.json'), 'utf8')) as FrontRules;

const t0 = Date.now();
const parts = Object.fromEntries(Object.entries(PART_FILES).map(([k, f]) => [k, read(f)])) as unknown as Omit<DatasetParts, 'checkpoints'>;
const data = assembleDataset({ ...parts, checkpoints: parts.keyframeIndex.files.flatMap((f) => read<FrameState | FrameState[]>(f)) });
const N = data.manifest.clock.frameCount;
const W = GRID_W;
const H = GRID_H;
const n = W * H;

/* -- territory raster (point in polygon, even-odd over all rings) ------ */

const owner = new Int8Array(n).fill(-1);
data.territories.forEach((t, ti) => {
  for (const poly of t.geometry.coordinates) {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const [x, y] of poly[0]) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const gx0 = Math.max(0, Math.floor(minX * W));
    const gx1 = Math.min(W - 1, Math.ceil(maxX * W));
    const gy0 = Math.max(0, Math.floor(minY * H));
    const gy1 = Math.min(H - 1, Math.ceil(maxY * H));
    for (let gy = gy0; gy <= gy1; gy += 1) {
      const py = (gy + 0.5) / H;
      for (let gx = gx0; gx <= gx1; gx += 1) {
        const px = (gx + 0.5) / W;
        let inside = false;
        for (const ring of poly) {
          for (let a = 0, b = ring.length - 1; a < ring.length; b = a, a += 1) {
            const [xa, ya] = ring[a];
            const [xb, yb] = ring[b];
            if ((ya > py) !== (yb > py) && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside;
          }
        }
        if (inside && owner[gy * W + gx] < 0) owner[gy * W + gx] = ti;
      }
    }
  }
});

/* -- canon gates -------------------------------------------------------- */

/** gateFrame[territory][side]: first frame at which that side may take ground there. */
const gateFrame: Record<number, number>[] = data.territories.map(() => ({}));
for (const g of rules.gates) {
  const ti = data.territories.findIndex((t) => t.id === g.territoryId);
  const ev = data.eventById.get(g.fromEvent);
  if (ti < 0 || !ev) throw new Error(`front-rules: unknown territory ${g.territoryId} or event ${g.fromEvent}.`);
  gateFrame[ti][g.side === 'empire' ? HOLDER_EMPIRE : HOLDER_ALLIED] = ev.frame;
}
const gateOpen = (ti: number, side: number, frame: number) => frame >= (gateFrame[ti][side] ?? -Infinity);

/* -- simulation ------------------------------------------------------- */

const hold = new Uint8Array(n);
const vCap = new Float32Array(n);
/** The formation that took each held cell (index into data.forces), -1 if none. */
const capturer = new Int16Array(n).fill(-1);
const best = new Float32Array(n);
const bestForce = new Int16Array(n).fill(-1);
const forceIndex = new Map(data.forces.map((f, i) => [f.id, i]));
const DEAD = /DESTROY|ANNIHILAT|CAPTURED|PRISONER|RESURRECTED/i;
const flips: { t: number; h: number }[][] = Array.from({ length: n }, () => []);
const v = new Float32Array(n);
const next = new Uint8Array(n);
const cause = new Uint8Array(n); // 1 capture, 2 recapture, 3 collapse, 4 settlement
const dist = new Float32Array(n);
const seedMark = new Uint8Array(n);
const keep = new Uint8Array(n);
const queue = new Int32Array(n);

interface Comp { step: number; frame: number; from: number; to: number; kind: FrontEpisodeKind; cells: number[]; times: number[] }
const comps: Comp[] = [];

function ownerSides(frame: number): (number | null)[] {
  return data.territories.map((t) => {
    const seg = territoryControlAt(t, frame).segment;
    if (seg.role === 'UNINVOLVED' || seg.role === 'ARMISTICE' || seg.status === 'UNKNOWN') return null;
    const s = sideOf(seg.controller);
    return s === 'empire' ? HOLDER_EMPIRE : s === 'allied' ? HOLDER_ALLIED : null;
  });
}

/** Territory index under a formation, or -1 at sea / off the traced land. */
function territoryAt(x: number, y: number): number {
  const gx = Math.min(W - 1, Math.max(0, Math.floor(x * W)));
  const gy = Math.min(H - 1, Math.max(0, Math.floor(y * H)));
  return owner[gy * W + gx];
}

/**
 * v: all formations (used to hold and retake ground). vCap: a formation counts
 * only inside the territory it stands in — an army takes the ground it is on,
 * not the far side of a border it has not crossed.
 */
function influence(src: Source[]): void {
  v.fill(0);
  vCap.fill(0);
  best.fill(0);
  bestForce.fill(-1);
  for (const s of src) {
    const home = territoryAt(s.x, s.y);
    const cx = s.x * W;
    const cy = s.y * H;
    const rr = s.r * W;
    const x0 = Math.max(0, Math.floor(cx - rr));
    const x1 = Math.min(W - 1, Math.ceil(cx + rr));
    const y0 = Math.max(0, Math.floor(cy - rr));
    const y1 = Math.min(H - 1, Math.ceil(cy + rr));
    const sign = s.side === 'empire' ? 1 : -1;
    for (let y = y0; y <= y1; y += 1) {
      const dy = (y + 0.5 - cy) / rr;
      for (let x = x0; x <= x1; x += 1) {
        const dx = (x + 0.5 - cx) / rr;
        const t = dx * dx + dy * dy;
        if (t >= 1) continue;
        const k = sign * s.w * (1 - t) * (1 - t);
        const c = y * W + x;
        v[c] += k;
        if (home >= 0 && owner[c] === home) {
          vCap[c] += k;
          if (Math.abs(k) > best[c]) { best[c] = Math.abs(k); bestForce[c] = forceIndex.get(s.forceId) ?? -1; }
        }
      }
    }
  }
}

/**
 * Removes captured areas of `side` that hold none of that side's formations in
 * the same territory: a pocket is supplied by its own army, not by a separate
 * front across a border.
 */
function connectivity(side: number, src: Source[]): void {
  seedMark.fill(0);
  keep.fill(0);
  for (const s of src) {
    if ((s.side === 'empire' ? HOLDER_EMPIRE : HOLDER_ALLIED) !== side) continue;
    const cx = Math.floor(s.x * W);
    const cy = Math.floor(s.y * H);
    for (let dy = -SEED_RADIUS; dy <= SEED_RADIUS; dy += 1) {
      for (let dx = -SEED_RADIUS; dx <= SEED_RADIUS; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < W && y < H && owner[y * W + x] === territoryAt(s.x, s.y)) seedMark[y * W + x] = 1;
      }
    }
  }
  let qh = 0;
  let qt = 0;
  for (let i = 0; i < n; i += 1) if (next[i] === side && seedMark[i]) { keep[i] = 1; queue[qt++] = i; }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % W;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j >= 0 && j < n && !keep[j] && next[j] === side && owner[j] === owner[i]) { keep[j] = 1; queue[qt++] = j; }
    }
  }
  for (let i = 0; i < n; i += 1) {
    if (next[i] === side && !keep[i]) {
      next[i] = HOLDER_OWNER;
      cause[i] = 3;
    }
  }
}

/** Whether the formation that took a cell has since been destroyed (not merely gone underground or airborne). */
let deadNow = new Set<number>();
const capturerDead = (i: number) => capturer[i] >= 0 && deadNow.has(capturer[i]);

/** Binary min-heap of (cell, distance), ties broken by cell index for determinism. */
class MinHeap {
  private c: number[] = [];
  private d: number[] = [];
  get size(): number { return this.c.length; }
  private less(a: number, b: number): boolean { return this.d[a] < this.d[b] || (this.d[a] === this.d[b] && this.c[a] < this.c[b]); }
  private swap(a: number, b: number): void {
    [this.c[a], this.c[b]] = [this.c[b], this.c[a]];
    [this.d[a], this.d[b]] = [this.d[b], this.d[a]];
  }
  push(cell: number, dist: number): void {
    this.c.push(cell);
    this.d.push(dist);
    let i = this.c.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.c[0], this.d[0]];
    const lc = this.c.pop()!;
    const ld = this.d.pop()!;
    if (this.c.length) {
      this.c[0] = lc;
      this.d[0] = ld;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.c.length && this.less(l, m)) m = l;
        if (r < this.c.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

let lastSig = '';
let steps = 0;
let simulated = 0;
for (let f = 0; f < N; f += STEP) {
  steps += 1;
  const src = fieldSources(data, f);
  const os = ownerSides(f);
  deadNow = new Set<number>();
  data.forces.forEach((force, fi) => {
    const snap = forceSnapshotAt(data, force.id, f);
    // Destroyed, or reduced to nothing (a strength of 0 whatever the status wording).
    if (snap && (DEAD.test(snap.status) || snap.strength === 0)) deadNow.add(fi);
  });
  const sig = src.map((s) => `${s.forceId}:${s.x.toFixed(5)},${s.y.toFixed(5)},${s.w.toFixed(3)}`).join('|') + '#' + os.join(',') + '#' + [...deadNow].join(',') + '#' + data.territories.map((_, ti) => [HOLDER_EMPIRE, HOLDER_ALLIED].map((sd) => (gateOpen(ti, sd, f) ? 1 : 0)).join('')).join('');
  if (sig === lastSig) continue;
  lastSig = sig;
  simulated += 1;
  influence(src);

  cause.fill(0);
  for (let i = 0; i < n; i += 1) {
    const t = owner[i];
    let h = hold[i];
    if (t < 0) { next[i] = HOLDER_OWNER; continue; }
    const o = os[t];
    if (o === null) {
      if (h !== HOLDER_OWNER) { h = HOLDER_OWNER; cause[i] = 4; }
    } else if (h === HOLDER_OWNER) {
      if (o === HOLDER_ALLIED && vCap[i] > BASE && gateOpen(t, HOLDER_EMPIRE, f)) { h = HOLDER_EMPIRE; cause[i] = 1; }
      else if (o === HOLDER_EMPIRE && -vCap[i] > BASE && gateOpen(t, HOLDER_ALLIED, f)) { h = HOLDER_ALLIED; cause[i] = 1; }
    } else if (h === HOLDER_EMPIRE) {
      if (o !== HOLDER_ALLIED) { h = HOLDER_OWNER; cause[i] = 4; }
      else if (-v[i] > HOLD) { h = HOLDER_OWNER; cause[i] = 2; }
      else if (capturerDead(i) && v[i] < HOLD) { h = HOLDER_OWNER; cause[i] = 3; }
    } else if (h === HOLDER_ALLIED) {
      if (o !== HOLDER_EMPIRE) { h = HOLDER_OWNER; cause[i] = 4; }
      else if (v[i] > HOLD) { h = HOLDER_OWNER; cause[i] = 2; }
      else if (capturerDead(i) && -v[i] < HOLD) { h = HOLDER_OWNER; cause[i] = 3; }
    }
    if (h !== hold[i] && h !== HOLDER_OWNER) capturer[i] = bestForce[i];
    else if (h === HOLDER_OWNER) capturer[i] = -1;
    next[i] = h;
  }
  connectivity(HOLDER_EMPIRE, src);
  connectivity(HOLDER_ALLIED, src);

  // Flip timing: distance through the changed cells from the gaining side's ground.
  const tStart = Math.max(0, f - STEP);
  for (const to of [HOLDER_OWNER, HOLDER_EMPIRE, HOLDER_ALLIED]) {
    dist.fill(-1);
    let qt = 0;
    let any = false;
    const heap = new MinHeap();
    for (let i = 0; i < n; i += 1) {
      if (next[i] !== to || hold[i] === to) continue;
      any = true;
      const x = i % W;
      // Seeds: changed cells touching ground the gaining side already held.
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < n && owner[j] >= 0 && hold[j] === to && next[j] === to) { dist[i] = 1; heap.push(i, 1); qt += 1; break; }
      }
    }
    if (!any) continue;
    // A landing touches nothing it held: seed at its formations instead.
    if (qt === 0 && to !== HOLDER_OWNER) {
      for (const s of src) {
        if ((s.side === 'empire' ? HOLDER_EMPIRE : HOLDER_ALLIED) !== to) continue;
        const i = Math.floor(s.y * H) * W + Math.floor(s.x * W);
        if (i >= 0 && i < n && next[i] === to && hold[i] !== to && dist[i] < 0) { dist[i] = 1; heap.push(i, 1); qt += 1; }
      }
    }
    // Distance through the changed cells with 8 neighbours (1, √2): a rounded,
    // nearly Euclidean front instead of the diamonds of a 4-neighbour count.
    const settled = new Set<number>();
    const bfs = () => {
      while (heap.size) {
        const [i, d] = heap.pop();
        if (settled.has(i) || d > dist[i] + 1e-6) continue;
        settled.add(i);
        const x = i % W;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            if ((x === 0 && dx < 0) || (x === W - 1 && dx > 0)) continue;
            const j = i + dy * W + dx;
            if (j < 0 || j >= n || next[j] !== to || hold[j] === to) continue;
            const nd = d + (dx && dy ? Math.SQRT2 : 1);
            if (dist[j] < 0 || nd < dist[j] - 1e-6) { dist[j] = nd; heap.push(j, nd); }
          }
        }
      }
    };
    bfs();
    // Changed areas the gaining side's ground does not touch (a landing, or a
    // blob ahead of the old front) grow outward from the cell nearest one of
    // its formations, or from their own centre.
    for (;;) {
      let first = -1;
      for (let i = 0; i < n; i += 1) if (next[i] === to && hold[i] !== to && dist[i] < 0) { first = i; break; }
      if (first < 0) break;
      const comp: number[] = [];
      const stack = [first];
      const mark = new Set<number>([first]);
      while (stack.length) {
        const c = stack.pop()!;
        comp.push(c);
        const x = c % W;
        for (const j of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W]) {
          if (j >= 0 && j < n && !mark.has(j) && next[j] === to && hold[j] !== to && dist[j] < 0) { mark.add(j); stack.push(j); }
        }
      }
      let mx = 0;
      let my = 0;
      for (const c of comp) { mx += (c % W) + 0.5; my += Math.floor(c / W) + 0.5; }
      mx /= comp.length;
      my /= comp.length;
      const gain = src.filter((s) => (s.side === 'empire' ? HOLDER_EMPIRE : HOLDER_ALLIED) === to);
      let best = comp[0];
      let bestD = Infinity;
      for (const c of comp) {
        const cx = (c % W) + 0.5;
        const cy = Math.floor(c / W) + 0.5;
        const d = gain.length ? Math.min(...gain.map((s) => Math.hypot(cx - s.x * W, cy - s.y * H))) : Math.hypot(cx - mx, cy - my);
        if (d < bestD) { bestD = d; best = c; }
      }
      dist[best] = 1;
      heap.push(best, 1);
      bfs();
    }
    // Group this step's changes into connected components for the episode record.
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) {
      if (next[i] !== to || hold[i] === to || seen[i]) continue;
      const comp: Comp = { step: steps, frame: f, from: hold[i], to, kind: 'ADVANCE', cells: [], times: [] };
      const stack = [i];
      seen[i] = 1;
      const causes = [0, 0, 0, 0, 0];
      while (stack.length) {
        const c = stack.pop()!;
        const d = dist[c] > 0 ? dist[c] : 1;
        const list = flips[c];
        const prevT = list.length ? list[list.length - 1].t : -Infinity;
        const tf = Math.max(tStart + (d - 0.5) / SPEED, prevT + 0.25);
        list.push({ t: Math.round(tf * 100) / 100, h: to });
        comp.cells.push(c);
        comp.times.push(tf);
        causes[cause[c]] += 1;
        const x = c % W;
        for (const j of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W]) {
          if (j >= 0 && j < n && !seen[j] && next[j] === to && hold[j] !== to && hold[j] === comp.from) { seen[j] = 1; stack.push(j); }
        }
      }
      const top = causes.indexOf(Math.max(...causes));
      comp.kind = top === 1 ? 'ADVANCE' : top === 2 ? 'RECAPTURE' : top === 3 ? 'COLLAPSE' : top === 4 ? 'SETTLEMENT' : 'ADVANCE';
      comps.push(comp);
    }
  }
  hold.set(next);
}

/* -- episodes: merge components of one kind that touch within 3 steps --- */

const label = new Int32Array(n).fill(-1);
const labelStep = new Int32Array(n).fill(-1000);
const parent: number[] = [];
const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])));
comps.forEach((c, ci) => {
  parent[ci] = ci;
  const key = `${c.from}>${c.to}:${c.kind}`;
  for (const cell of c.cells) {
    const x = cell % W;
    for (const j of [cell, x > 0 ? cell - 1 : -1, x < W - 1 ? cell + 1 : -1, cell - W, cell + W]) {
      if (j < 0 || j >= n || label[j] < 0 || c.step - labelStep[j] > 3) continue;
      const other = comps[label[j]];
      if (`${other.from}>${other.to}:${other.kind}` !== key) continue;
      const ra = find(ci);
      const rb = find(label[j]);
      if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
  }
  for (const cell of c.cells) { label[cell] = ci; labelStep[cell] = c.step; }
});
const groups = new Map<number, Comp[]>();
comps.forEach((c, ci) => {
  const r = find(ci);
  if (!groups.has(r)) groups.set(r, []);
  groups.get(r)!.push(c);
});

const sideName = (h: number, cells: number[]): 'empire' | 'allied' => {
  if (h === HOLDER_EMPIRE) return 'empire';
  if (h === HOLDER_ALLIED) return 'allied';
  // Owner regaining: the owner of the territory the cells lie in.
  const t = owner[cells[0]];
  const s = sideOf(data.territories[t]?.faction ?? null);
  return s ?? 'allied';
};

const episodes: FrontEpisode[] = [];
for (const list of [...groups.values()].sort((a, b) => a[0].frame - b[0].frame || a[0].cells[0] - b[0].cells[0])) {
  const cells = list.flatMap((c) => c.cells);
  if (cells.length < MIN_EPISODE_CELLS) continue;
  const times = list.flatMap((c) => c.times).sort((a, b) => a - b);
  const first = list[0];
  const gainer = sideName(first.to, cells);
  const loser = sideName(first.from, cells);
  let cx = 0;
  let cy = 0;
  const terr = new Set<string>();
  for (const c of cells) {
    cx += ((c % W) + 0.5) / W;
    cy += (Math.floor(c / W) + 0.5) / H;
    if (owner[c] >= 0) terr.add(data.territories[owner[c]].id);
  }
  cx /= cells.length;
  cy /= cells.length;
  const startFrame = Math.round(times[0] * 100) / 100;
  const src = fieldSources(data, Math.min(N - 1, Math.floor(times[0])));
  const near = (s: Source) => Math.hypot(s.x - cx, s.y - cy) < 0.09;
  const forceIds = src.filter(near).map((s) => s.forceId);
  // Formations that just vanished (destroyed) explain a collapse.
  if (first.kind === 'COLLAPSE') {
    const before = fieldSources(data, Math.max(0, first.frame - STEP * 4)).filter(near);
    for (const s of before) if (!forceIds.includes(s.forceId)) forceIds.push(s.forceId);
  }
  const prior = data.events.filter((e) => e.frame <= Math.ceil(times[0]));
  const placed = prior.filter((e) => {
    const p = e.placeId ? data.placeById.get(e.placeId) : null;
    return p?.x != null && p.y != null && Math.hypot(p.x - cx, p.y - cy) < 0.12;
  });
  const ev = placed[placed.length - 1] ?? prior[prior.length - 1] ?? null;
  episodes.push({
    id: `EP-${String(episodes.length + 1).padStart(3, '0')}`,
    kind: first.kind,
    gainer,
    loser,
    startFrame,
    endFrame: Math.round(times[times.length - 1] * 100) / 100,
    midFrame: Math.round(times[Math.floor(times.length / 2)] * 100) / 100,
    cells: cells.length,
    territoryIds: [...terr].sort(),
    theatreId: ev?.theatreId ?? null,
    forceIds: [...new Set(forceIds)].sort(),
    eventId: ev?.id ?? null,
    centroid: [Math.round(cx * 1e4) / 1e4, Math.round(cy * 1e4) / 1e4],
  });
}

/* -- write ------------------------------------------------------------ */

const offsets = new Uint32Array(n + 1);
const counts = new Uint8Array(n);
let total = 0;
for (let i = 0; i < n; i += 1) {
  if (flips[i].length > 255) throw new Error(`Cell ${i} changes hands more than 255 times.`);
  offsets[i] = total;
  counts[i] = flips[i].length;
  total += flips[i].length;
}
offsets[n] = total;
const times = new Float32Array(total);
const holders = new Uint8Array(total);
let k = 0;
for (let i = 0; i < n; i += 1) for (const fl of flips[i]) { times[k] = fl.t; holders[k] = fl.h; k += 1; }

const file: FrontFile = {
  version: 1,
  grid: { w: W, h: H },
  stepFrames: STEP,
  leadFrames: LEAD,
  speedCellsPerFrame: SPEED,
  clampFrames: CLAMP,
  territoryIds: data.territories.map((t) => t.id),
  owner: toBase64(owner),
  counts: toBase64(counts),
  times: toBase64(times),
  holders: toBase64(holders),
  episodes,
  provenance: 'RECONSTRUCTED',
  basis: 'Held ground synthesised from the recorded positions and strengths of the formations (src/map/field/sources.ts) with memory: ground stays held until retaken, collapses when cut off from its army, and returns to its owner when its territory leaves the war. The novels draw no line of control.',
};
const json = JSON.stringify(file);
writeFileSync(join(DATA, 'front.json'), json + '\n');
const byKind = episodes.reduce<Record<string, number>>((m, e) => ((m[e.kind] = (m[e.kind] ?? 0) + 1), m), {});
console.log(`Front compiled: grid ${W}x${H}, ${steps} steps (${simulated} simulated), ${total} flips in ${offsets.filter((o, i) => i < n && offsets[i + 1] > o).length} cells, ${episodes.length} episodes ${JSON.stringify(byKind)}, ${(json.length / 1024).toFixed(0)} KB, ${Date.now() - t0} ms`);
