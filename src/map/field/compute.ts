/**
 * The held-ground field for a time T, as pure computation (no DOM): the time
 * fields from front.ts, a light smoothing for rendering, the front seams and
 * each territory's held share. Runs in the field worker (field.worker.ts),
 * and on the main thread only as a fallback.
 */
import { createFields, evaluateFront, frontSeams, heldShare, type Front, type FrontFields } from './front';

export interface FieldResult {
  front: Front;
  fields: FrontFields;
  T: number;
  /** Front segments in simulation coordinates: x0,y0,x1,y1 repeated. */
  seams: Float32Array;
  /** Share of each territory held by the other side, 0..1, for the Situation panel. */
  occupiedShare: Record<string, number>;
  /** The fields already interleaved for the GPU (made by the worker): RGBA32F and RGBA8. */
  packed?: { fields: Float32Array; pale: Uint8Array };
}

/**
 * A 3x3 box filter over a time field (rendering only; the data and the tests
 * use exact values). It rounds the cell-sized steps out of the contour so the
 * front reads as a smooth line, as in the reference maps.
 */
export function smoothField(front: Front, f: Float32Array, tmp: Float32Array): void {
  const { w, h } = front;
  tmp.set(f);
  for (let y = 1; y < h - 1; y += 1) {
    const r = y * w;
    for (let x = 1; x < w - 1; x += 1) {
      const i = r + x;
      f[i] = (tmp[i - w - 1] + tmp[i - w] + tmp[i - w + 1] + tmp[i - 1] + tmp[i] + tmp[i + 1] + tmp[i + w - 1] + tmp[i + w] + tmp[i + w + 1]) / 9;
    }
  }
}

/** Evaluates everything for T into `fields` (reused), with `tmp` as smoothing scratch. */
export function computeFieldInto(front: Front, T: number, fields: FrontFields, tmp: Float32Array): FieldResult {
  evaluateFront(front, T, fields);
  smoothField(front, fields.E, tmp);
  smoothField(front, fields.A, tmp);
  smoothField(front, fields.P, tmp);
  smoothField(front, fields.Q, tmp);
  const share = heldShare(front, fields);
  const occupiedShare: Record<string, number> = {};
  for (const [id, s] of Object.entries(share)) occupiedShare[id] = Math.max(s.empire, s.allied);
  return { front, fields, T, seams: frontSeams(front, fields), occupiedShare };
}

export { createFields };
