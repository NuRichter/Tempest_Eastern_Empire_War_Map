/**
 * Terrain-aware routing for the compiler.
 *
 * The war theatre (geography.source.json bounds) is rasterised once into a
 * cost grid on the relief grid's own lattice (0.002 atlas units, about 5 km):
 *
 *   water (sea from public/maps/coast.json, traced lakes)  impassable
 *   Kanaat massif outside its named passes                 impassable
 *   pass corridors, roads                                  cheap
 *   deep forest, forest, open ground                       by class
 *   + relief above the plain                               slope penalty
 *   river cells                                            crossing penalty, except at a ford or bridge
 *
 * A ground route is the cheapest 8-connected path through that grid (A*,
 * corner-cutting forbidden next to barriers), simplified without leaving
 * passable ground. An air route is the straight line. Everything is
 * deterministic: the same sources give the same routes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { distanceKm, polylineKm, type XY } from '../../src/lib/world';

export type TerrainClass = 'road' | 'open' | 'forest' | 'deepForest' | 'pass' | 'mountain' | 'water' | 'river' | 'ford';
export type RouteMode = 'GROUND' | 'AIR' | 'TACTICAL';

interface Ring { id: string; ring: [number, number][] }
interface Line { id: string; line: [number, number][]; halfWidth?: number }
export interface GeographySource {
  bounds: { x0: number; y0: number; x1: number; y1: number };
  mountains: (Ring & { name: string; grade: string; basis: string })[];
  passes: (Line & { name: string; grade: string; basis: string })[];
  lakes: (Ring & { name: string; grade: string; basis: string })[];
  rivers: (Line & { name: string; grade: string; basis: string })[];
  crossings: { id: string; name: string; x: number; y: number; kind: 'FORD' | 'BRIDGE'; grade: string; basis: string }[];
  forests: (Ring & { name: string; grade: string; kind: 'forest' | 'deepForest'; basis: string })[];
  roads: (Line & { name: string; grade: string; role: string; basis: string })[];
}
export interface WorldSource {
  terrain: {
    relief: { plainLevel: number; slopeCostPer1000: number; seaLevel: number; peakMetres: number };
    classes: Record<string, { cost: number | null; label: string }>;
  };
  speeds: { units: Record<string, { kmPerDay: number; maxKmPerDay: number; basis: string; provenance: string }> };
}

export interface CompiledRoute {
  id: string;
  mode: RouteMode;
  points: [number, number][];
  lengthKm: number;
  straightKm: number;
  /** Kilometres travelled over each terrain class. */
  terrainKm: Partial<Record<TerrainClass | 'air', number>>;
  crossings: string[];
  passes: string[];
  roads: string[];
  /** Highest relief on the route, in synthetic metres. */
  maxElevationM: number;
  /** Elevation profile: [km along the route, synthetic metres], about every 10 km. */
  profile: [number, number][];
  /** Set when the route could not be found on the grid and was drawn straight. */
  exception: string | null;
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function pointInRing(x: number, y: number, ring: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  // Measured in kilometres so corridors are isotropic on the ground.
  const k = { x: 2641, y: 2035 };
  const dx = (bx - ax) * k.x;
  const dy = (by - ay) * k.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? (((px - ax) * k.x) * dx + ((py - ay) * k.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot((px - ax) * k.x - t * dx, (py - ay) * k.y - t * dy) / 2641;
}

function distToLine(x: number, y: number, line: readonly (readonly [number, number])[]): number {
  let d = Infinity;
  for (let i = 1; i < line.length; i += 1) d = Math.min(d, distToSegment(x, y, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]));
  return d;
}

/* ------------------------------------------------------------------ */
/* The grid                                                            */
/* ------------------------------------------------------------------ */

export class TerrainGrid {
  readonly x0: number;
  readonly y0: number;
  readonly step: number;
  readonly cols: number;
  readonly rows: number;
  readonly relief: Uint16Array;
  readonly cls: TerrainClass[];
  readonly cost: Float64Array; // per-km cost of standing in a cell; Infinity = impassable
  readonly featureAt: (string | null)[]; // pass, road, ford, river id owning the cell
  private readonly world: WorldSource;
  private readonly geo: GeographySource;

  constructor(root: string, src: string) {
    this.geo = JSON.parse(readFileSync(join(src, 'geography.source.json'), 'utf8')) as GeographySource;
    this.world = JSON.parse(readFileSync(join(src, 'world.source.json'), 'utf8')) as WorldSource;
    const grid = JSON.parse(readFileSync(join(src, 'relief.grid.source.json'), 'utf8')) as { x0: number; y0: number; step: number; cols: number; rows: number; data: string };
    this.x0 = grid.x0;
    this.y0 = grid.y0;
    this.step = grid.step;
    this.cols = grid.cols;
    this.rows = grid.rows;
    const bytes = Buffer.from(grid.data, 'base64');
    this.relief = new Uint16Array(this.cols * this.rows);
    for (let i = 0; i < this.relief.length; i += 1) this.relief[i] = bytes.readUInt16LE(i * 2);

    const land = this.rasteriseLand(join(root, 'public', 'maps', 'coast.json'));
    const n = this.cols * this.rows;
    this.cls = new Array<TerrainClass>(n);
    this.cost = new Float64Array(n);
    this.featureAt = new Array<string | null>(n).fill(null);
    const C = this.world.terrain.classes;
    const R = this.world.terrain.relief;
    const cell = this.step;
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const i = r * this.cols + c;
        const x = this.x0 + c * cell;
        const y = this.y0 + r * cell;
        let k: TerrainClass = 'open';
        let feature: string | null = null;
        if (!land[i] || this.geo.lakes.some((l) => pointInRing(x, y, l.ring))) k = 'water';
        else {
          const forest = this.geo.forests.find((f) => f.kind === 'deepForest' && pointInRing(x, y, f.ring))
            ?? this.geo.forests.find((f) => f.kind === 'forest' && pointInRing(x, y, f.ring));
          if (forest) k = forest.kind;
          const massif = this.geo.mountains.find((m) => pointInRing(x, y, m.ring));
          if (massif) k = 'mountain';
          const pass = this.geo.passes.find((p) => distToLine(x, y, p.line) <= (p.halfWidth ?? 0.005));
          if (pass) {
            k = 'pass';
            feature = pass.id;
          }
          const road = this.geo.roads.find((rd) => distToLine(x, y, rd.line) <= cell * 1.1);
          if (road) {
            k = k === 'mountain' || k === 'pass' ? 'pass' : 'road';
            feature = road.id;
          }
          const river = this.geo.rivers.find((rv) => distToLine(x, y, rv.line) <= cell * 0.75);
          if (river) {
            const ford = this.geo.crossings.find((f) => Math.hypot((f.x - x) * 2641, (f.y - y) * 2035) / 2641 <= cell * 1.6);
            k = ford ? 'ford' : 'river';
            feature = ford ? ford.id : river.id;
          }
        }
        this.cls[i] = k;
        this.featureAt[i] = feature;
        const rel = this.relief[i];
        let base: number;
        if (k === 'water') base = Infinity;
        else if (k === 'mountain') base = Infinity; // the massif is crossed only through its named passes
        else if (k === 'river') base = C.riverCrossing.cost ?? Infinity;
        else base = C[k]?.cost ?? 1;
        if (Number.isFinite(base) && k !== 'road' && k !== 'pass' && k !== 'ford') base += Math.max(0, rel - R.plainLevel) / 1000 * R.slopeCostPer1000;
        this.cost[i] = base;
      }
    }
  }

  /** Scanline rasterisation of the land polygons (lakes inside them are holes). */
  private rasteriseLand(path: string): Uint8Array {
    const coast = JSON.parse(readFileSync(path, 'utf8')) as { polygons: [number, number][][][] };
    const out = new Uint8Array(this.cols * this.rows);
    const edges: [number, number, number, number][] = [];
    for (const poly of coast.polygons) for (const ring of poly) for (let i = 1; i < ring.length; i += 1) edges.push([ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1]]);
    for (let r = 0; r < this.rows; r += 1) {
      const y = this.y0 + r * this.step;
      const xs: number[] = [];
      for (const [ax, ay, bx, by] of edges) if (ay > y !== by > y) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - this.x0) / this.step));
        const c1 = Math.min(this.cols - 1, Math.floor((xs[k + 1] - this.x0) / this.step));
        for (let c = c0; c <= c1; c += 1) out[r * this.cols + c] = 1;
      }
    }
    return out;
  }

  inBounds(x: number, y: number): boolean {
    return x >= this.x0 && y >= this.y0 && x <= this.x0 + (this.cols - 1) * this.step && y <= this.y0 + (this.rows - 1) * this.step;
  }

  index(x: number, y: number): number {
    const c = Math.min(this.cols - 1, Math.max(0, Math.round((x - this.x0) / this.step)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.round((y - this.y0) / this.step)));
    return r * this.cols + c;
  }

  classAt(x: number, y: number): TerrainClass {
    return this.inBounds(x, y) ? this.cls[this.index(x, y)] : 'open';
  }

  passableAt(x: number, y: number): boolean {
    return !this.inBounds(x, y) || Number.isFinite(this.cost[this.index(x, y)]);
  }

  /** Synthetic metres from the stylised relief. */
  elevationM(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    const R = this.world.terrain.relief;
    const v = this.relief[this.index(x, y)];
    return Math.max(0, Math.round(((v - R.seaLevel) / (62538 - R.seaLevel)) * R.peakMetres));
  }

  private xy(i: number): [number, number] {
    return [this.x0 + (i % this.cols) * this.step, this.y0 + Math.floor(i / this.cols) * this.step];
  }

  /** Nearest passable cell to a point (endpoints such as a gate on a massif edge). */
  private snap(x: number, y: number): number {
    const i = this.index(x, y);
    if (Number.isFinite(this.cost[i])) return i;
    const c0 = i % this.cols;
    const r0 = Math.floor(i / this.cols);
    for (let rad = 1; rad < 12; rad += 1) {
      let best = -1;
      let bestD = Infinity;
      for (let dr = -rad; dr <= rad; dr += 1) {
        for (let dc = -rad; dc <= rad; dc += 1) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) continue;
          const j = r * this.cols + c;
          if (!Number.isFinite(this.cost[j])) continue;
          const d = dr * dr + dc * dc;
          if (d < bestD || (d === bestD && j < best)) {
            bestD = d;
            best = j;
          }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  /** Cheapest path between two points, as grid cell indices. Null when none exists. */
  private astar(start: number, goal: number): number[] | null {
    const n = this.cols * this.rows;
    const g = new Float64Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    // Binary heap of [f, index], ties broken by index for determinism.
    const heapF: number[] = [];
    const heapI: number[] = [];
    const push = (f: number, i: number) => {
      heapF.push(f);
      heapI.push(i);
      let k = heapF.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heapF[p] < heapF[k] || (heapF[p] === heapF[k] && heapI[p] <= heapI[k])) break;
        [heapF[p], heapF[k]] = [heapF[k], heapF[p]];
        [heapI[p], heapI[k]] = [heapI[k], heapI[p]];
        k = p;
      }
    };
    const pop = (): number => {
      const top = heapI[0];
      const lf = heapF.pop()!;
      const li = heapI.pop()!;
      if (heapF.length) {
        heapF[0] = lf;
        heapI[0] = li;
        let k = 0;
        for (;;) {
          const a = 2 * k + 1;
          const b = a + 1;
          let m = k;
          if (a < heapF.length && (heapF[a] < heapF[m] || (heapF[a] === heapF[m] && heapI[a] < heapI[m]))) m = a;
          if (b < heapF.length && (heapF[b] < heapF[m] || (heapF[b] === heapF[m] && heapI[b] < heapI[m]))) m = b;
          if (m === k) break;
          [heapF[m], heapF[k]] = [heapF[k], heapF[m]];
          [heapI[m], heapI[k]] = [heapI[k], heapI[m]];
          k = m;
        }
      }
      return top;
    };
    const [gx, gy] = this.xy(goal);
    const minCost = Math.min(...Object.values(this.world.terrain.classes).map((c) => c.cost ?? Infinity));
    const h = (i: number) => {
      const [x, y] = this.xy(i);
      return distanceKm(x, y, gx, gy) * minCost;
    };
    g[start] = 0;
    push(h(start), start);
    const stepKm = [distanceKm(0, 0, this.step, 0), distanceKm(0, 0, 0, this.step), distanceKm(0, 0, this.step, this.step)];
    while (heapF.length) {
      const cur = pop();
      if (closed[cur]) continue;
      if (cur === goal) break;
      closed[cur] = 1;
      const c = cur % this.cols;
      const r = Math.floor(cur / this.cols);
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (!dr && !dc) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= this.rows || cc >= this.cols) continue;
          const j = rr * this.cols + cc;
          if (closed[j] || !Number.isFinite(this.cost[j])) continue;
          if (dr && dc) {
            // No slipping diagonally between two barrier or river cells.
            const a = r * this.cols + cc;
            const b = rr * this.cols + c;
            if (!Number.isFinite(this.cost[a]) || !Number.isFinite(this.cost[b])) continue;
            if (this.cls[a] === 'river' || this.cls[b] === 'river') continue;
          }
          const km = dr && dc ? stepKm[2] : dr ? stepKm[1] : stepKm[0];
          const ng = g[cur] + km * (this.cost[cur] + this.cost[j]) / 2;
          if (ng < g[j]) {
            g[j] = ng;
            came[j] = cur;
            push(ng + h(j), j);
          }
        }
      }
    }
    if (!Number.isFinite(g[goal])) return null;
    const path: number[] = [];
    for (let i = goal; i !== -1; i = came[i]) path.push(i);
    return path.reverse();
  }

  /** Every grid cell a straight segment passes through stays passable. */
  segmentClear(a: XY, b: XY): boolean {
    const km = distanceKm(a[0], a[1], b[0], b[1]);
    const n = Math.max(2, Math.ceil(km / 2));
    let prevRiver: string | null = null;
    for (let k = 0; k <= n; k += 1) {
      const x = a[0] + ((b[0] - a[0]) * k) / n;
      const y = a[1] + ((b[1] - a[1]) * k) / n;
      if (!this.passableAt(x, y)) return false;
      // A simplified line may only cross a river where the raw path forded it.
      const cl = this.classAt(x, y);
      if (cl === 'river') return false;
      prevRiver = cl === 'ford' ? 'ford' : prevRiver;
    }
    return true;
  }

  /** Douglas-Peucker that never cuts across a barrier. */
  private simplify(pts: [number, number][], tol: number): [number, number][] {
    if (pts.length <= 2) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = 1;
    keep[pts.length - 1] = 1;
    const stack: [number, number][] = [[0, pts.length - 1]];
    while (stack.length) {
      const [s, e] = stack.pop()!;
      let best = -1;
      let bestD = 0;
      for (let i = s + 1; i < e; i += 1) {
        const d = distToSegment(pts[i][0], pts[i][1], pts[s][0], pts[s][1], pts[e][0], pts[e][1]);
        if (d > bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0 && (bestD > tol || !this.segmentClear(pts[s], pts[e]))) {
        keep[best] = 1;
        stack.push([s, best], [best, e]);
      }
    }
    return pts.filter((_, i) => keep[i]);
  }

  /** Smooth the stair-stepping of an 8-connected path with a short moving average, keeping endpoints. */
  private smooth(pts: [number, number][]): [number, number][] {
    if (pts.length < 5) return pts;
    const out: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i += 1) {
      const a = pts[Math.max(0, i - 2)];
      const b = pts[Math.min(pts.length - 1, i + 2)];
      const p: [number, number] = [(a[0] + pts[i][0] * 2 + b[0]) / 4, (a[1] + pts[i][1] * 2 + b[1]) / 4];
      out.push(this.passableAt(p[0], p[1]) && this.classAt(p[0], p[1]) !== 'river' ? p : pts[i]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  /** Route from a to b, through the waypoints in order. */
  route(id: string, mode: RouteMode, stops: XY[]): CompiledRoute {
    const straightKm = polylineKm(stops);
    if (mode !== 'GROUND' || stops.some((p) => !this.inBounds(p[0], p[1]))) {
      const exception = mode === 'GROUND' ? 'An endpoint lies outside the traced theatre; drawn as a straight line.' : null;
      return this.describe(id, mode, stops.map((p) => [round(p[0]), round(p[1])]), straightKm, exception);
    }
    const all: [number, number][] = [];
    let exception: string | null = null;
    for (let k = 1; k < stops.length; k += 1) {
      const a = this.snap(stops[k - 1][0], stops[k - 1][1]);
      const b = this.snap(stops[k][0], stops[k][1]);
      const cells = a >= 0 && b >= 0 ? this.astar(a, b) : null;
      if (!cells) {
        exception = `No passable ground path between waypoints ${k - 1} and ${k}; that leg is drawn straight.`;
        if (!all.length) all.push([stops[k - 1][0], stops[k - 1][1]]);
        all.push([stops[k][0], stops[k][1]]);
        continue;
      }
      const raw: [number, number][] = cells.map((i) => this.xy(i));
      raw[0] = [stops[k - 1][0], stops[k - 1][1]];
      raw[raw.length - 1] = [stops[k][0], stops[k][1]];
      const simple = this.simplify(this.smooth(raw), 0.0009);
      all.push(...(all.length ? simple.slice(1) : simple));
    }
    const pts = all.map(([x, y]) => [round(x), round(y)] as [number, number]);
    return this.describe(id, mode, pts, straightKm, exception);
  }

  private describe(id: string, mode: RouteMode, points: [number, number][], straightKm: number, exception: string | null): CompiledRoute {
    const terrainKm: CompiledRoute['terrainKm'] = {};
    const crossings = new Set<string>();
    const passes = new Set<string>();
    const roads = new Set<string>();
    const profile: [number, number][] = [];
    let maxM = 0;
    let along = 0;
    let nextSample = 0;
    for (let i = 1; i < points.length; i += 1) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      const km = distanceKm(ax, ay, bx, by);
      const n = Math.max(1, Math.ceil(km / 1.5));
      for (let k = 0; k < n; k += 1) {
        const t = (k + 0.5) / n;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        const part = km / n;
        const cls: TerrainClass | 'air' = mode === 'AIR' ? 'air' : this.classAt(x, y);
        terrainKm[cls] = (terrainKm[cls] ?? 0) + part;
        if (mode !== 'AIR' && this.inBounds(x, y)) {
          const f = this.featureAt[this.index(x, y)];
          if (f) {
            if (this.geo.crossings.some((c) => c.id === f)) crossings.add(f);
            else if (this.geo.passes.some((p) => p.id === f)) passes.add(f);
            else if (this.geo.roads.some((r) => r.id === f)) {
              roads.add(f);
              const inMassif = this.geo.mountains.some((m) => pointInRing(x, y, m.ring));
              if (inMassif) {
                const p = this.geo.passes.find((q) => distToLine(x, y, q.line) <= (q.halfWidth ?? 0.005) * 1.5);
                if (p) passes.add(p.id);
              }
            }
          }
        }
        const m = this.elevationM(x, y);
        maxM = Math.max(maxM, m);
        if (along + part * (k + 1) >= nextSample) {
          profile.push([Math.round(along + part * (k + 0.5)), m]);
          nextSample += 10;
        }
      }
      along += km;
    }
    for (const k of Object.keys(terrainKm) as (keyof typeof terrainKm)[]) terrainKm[k] = Math.round((terrainKm[k] ?? 0) * 10) / 10;
    return {
      id, mode, points,
      lengthKm: Math.round(along * 10) / 10,
      straightKm: Math.round(straightKm * 10) / 10,
      terrainKm,
      crossings: [...crossings].sort(),
      passes: [...passes].sort(),
      roads: [...roads].sort(),
      maxElevationM: maxM,
      profile,
      exception,
    };
  }

  /** The geography as drawn: features with their grade and basis, for the runtime layer. */
  features() {
    return {
      mountains: this.geo.mountains,
      passes: this.geo.passes,
      lakes: this.geo.lakes,
      rivers: this.geo.rivers,
      crossings: this.geo.crossings,
      forests: this.geo.forests,
      roads: this.geo.roads,
    };
  }
}

function round(n: number): number {
  return Math.round(n * 100000) / 100000;
}
