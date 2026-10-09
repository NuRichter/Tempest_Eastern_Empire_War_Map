/**
 * Main-thread side of the field worker. Ask for a time with `request(T)`;
 * results arrive through `onResult` a frame later. Only one evaluation is in
 * flight: while the worker is busy, newer requests replace the waiting one,
 * so a fast clock never builds a queue. Without Worker support, it computes
 * on the main thread instead (same results).
 */
import { computeFieldInto, createFields, type FieldResult } from './compute';
import type { Front, FrontFields } from './front';

export class FieldWorker {
  private worker: Worker | null = null;
  private busy = false;
  private waiting: number | null = null;
  private recycle: FieldResult | null = null;
  private latest: FieldResult | null = null;
  private previous: FieldResult | null = null;
  private fallback: { fields: FrontFields; tmp: Float32Array } | null = null;
  /** True once the worker has answered: the field is evaluated off the main thread. */
  workerAnswered = false;

  constructor(private front: Front, private onResult: (r: FieldResult) => void) {
    try {
      this.worker = new Worker(new URL('./field.worker.ts', import.meta.url), { type: 'module', name: 'held-ground' });
      this.worker.onmessage = (e: MessageEvent) => this.receive(e.data);
      this.worker.onerror = () => this.useFallback();
      this.worker.postMessage({ type: 'init', front });
    } catch {
      this.useFallback();
    }
  }

  private useFallback() {
    this.worker?.terminate();
    this.worker = null;
    this.busy = false;
    this.fallback = { fields: createFields(this.front), tmp: new Float32Array(this.front.w * this.front.h) };
  }

  request(T: number): void {
    if (!this.worker) {
      if (!this.fallback) this.useFallback();
      this.onResult(computeFieldInto(this.front, T, this.fallback!.fields, this.fallback!.tmp));
      return;
    }
    if (this.busy) {
      this.waiting = T;
      return;
    }
    this.busy = true;
    const old = this.recycle;
    this.recycle = null;
    const f = old?.fields;
    const p = old?.packed;
    const transfer: ArrayBuffer[] = [];
    if (f) for (const a of [f.E, f.A, f.P, f.Q, f.hold, f.paleOf, f.paleTo]) transfer.push(a.buffer as ArrayBuffer);
    if (p) transfer.push(p.fields.buffer as ArrayBuffer, p.pale.buffer as ArrayBuffer);
    this.worker.postMessage({ type: 'eval', T, recycle: f, recyclePacked: p }, transfer);
  }

  private receive(m: { type: 'result'; T: number; fields: FrontFields; seams: Float32Array; occupiedShare: Record<string, number>; packed: { fields: Float32Array; pale: Uint8Array } }) {
    this.busy = false;
    this.workerAnswered = true;
    // Two results stay alive (the shown one, and the one a GPU upload may still be reading);
    // the one before them goes back to the worker.
    if (this.previous) this.recycle = this.previous;
    this.previous = this.latest;
    this.latest = { front: this.front, fields: m.fields, T: m.T, seams: m.seams, occupiedShare: m.occupiedShare, packed: m.packed };
    this.onResult(this.latest);
    if (this.waiting !== null) {
      const T = this.waiting;
      this.waiting = null;
      this.request(T);
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
