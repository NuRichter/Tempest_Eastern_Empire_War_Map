/// <reference lib="webworker" />
/**
 * Field worker: evaluates the held ground for a time T off the main thread.
 *
 *   in   { type: 'init', front }                     once
 *        { type: 'eval', T, recycle? }               per change of T
 *   out  { type: 'result', T, fields, seams, occupiedShare }
 *
 * The field arrays travel as transferables (no copy). The main thread hands
 * the previous set back with the next request, so steady playback allocates
 * nothing.
 */
import { computeFieldInto, createFields } from './compute';
import { packField } from './pack';
import type { Front, FrontFields } from './front';

declare const self: DedicatedWorkerGlobalScope;

let front: Front | null = null;
interface Packed { fields: Float32Array; pale: Uint8Array }
const spare: FrontFields[] = [];
const sparePacked: Packed[] = [];
let tmp: Float32Array | null = null;

self.onmessage = (e: MessageEvent) => {
  const m = e.data as { type: 'init'; front: Front } | { type: 'eval'; T: number; recycle?: FrontFields; recyclePacked?: Packed };
  if (m.type === 'init') {
    front = m.front;
    tmp = new Float32Array(front.w * front.h);
    return;
  }
  if (!front || !tmp) return;
  const n = front.w * front.h;
  if (m.recycle && m.recycle.E.length === n) spare.push(m.recycle);
  if (m.recyclePacked && m.recyclePacked.fields.length === n * 4) sparePacked.push(m.recyclePacked);
  const fields = spare.pop() ?? createFields(front);
  const packed = sparePacked.pop() ?? { fields: new Float32Array(n * 4), pale: new Uint8Array(n * 4) };
  const r = computeFieldInto(front, m.T, fields, tmp);
  // Interleaved for the GPU here, so the main thread only uploads.
  packField(front, r.fields, packed.fields, packed.pale);
  const f = r.fields;
  self.postMessage(
    { type: 'result', T: r.T, fields: f, seams: r.seams, occupiedShare: r.occupiedShare, packed },
    [f.E.buffer, f.A.buffer, f.P.buffer, f.Q.buffer, f.hold.buffer, f.paleOf.buffer, f.paleTo.buffer, r.seams.buffer, packed.fields.buffer, packed.pale.buffer],
  );
};
