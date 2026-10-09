import type { Front, FrontFields } from './front';

/** Interleaves the fields for upload: RGBA32F (E, A, P, Q) and RGBA8 (loser, winner of the nearest flip). */
export function packField(front: Front, fields: FrontFields, out: Float32Array, pale: Uint8Array): void {
  const n = front.w * front.h;
  const { E, A, P, Q, paleOf, paleTo } = fields;
  for (let i = 0; i < n; i += 1) {
    const o = i * 4;
    out[o] = E[i];
    out[o + 1] = A[i];
    out[o + 2] = P[i];
    out[o + 3] = Q[i];
    pale[o] = paleOf[i];
    pale[o + 1] = paleTo[i];
  }
}
