/**
 * The simulation clock.
 *
 * One clock, owned by nobody in the React tree. It advances on
 * requestAnimationFrame and publishes a continuous frame position; the renderer
 * reads that position every animation tick, and React is told only when the
 * integer frame changes. This is what keeps 7,200 keyframes at 8x from
 * re-rendering the interface sixty times a second.
 *
 * Determinism: frame position is a pure function of accumulated simulation
 * time, and simulation time advances by the wall-clock delta multiplied by the
 * speed. The same seek followed by the same elapsed time always produces the
 * same frame. Rendering interpolates between keyframes; it never creates one.
 */

export type ClockListener = (frame: number, playing: boolean) => void;

export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

/** Keyframes advanced per second of wall clock at 1x. */
const FRAMES_PER_SECOND_AT_1X = 3;

export interface ClockOptions {
  frameCount: number;
  onIntegerFrame?: (frame: number) => void;
}

export class SimulationClock {
  private readonly frameCount: number;
  private readonly onIntegerFrame?: (frame: number) => void;

  private position = 0;
  private playing = false;
  private speed: Speed = 1;
  private direction: 1 | -1 = 1;
  private lastTick = 0;
  private raf: number | null = null;
  private lastIntegerFrame = -1;
  private readonly listeners = new Set<ClockListener>();

  constructor({ frameCount, onIntegerFrame }: ClockOptions) {
    this.frameCount = frameCount;
    this.onIntegerFrame = onIntegerFrame;
  }

  /** Continuous frame position. The renderer interpolates around this. */
  get frame(): number {
    return this.position;
  }

  get integerFrame(): number {
    return Math.floor(this.position);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get currentSpeed(): Speed {
    return this.speed;
  }

  get isReversed(): boolean {
    return this.direction === -1;
  }

  subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.lastTick = performance.now();
    this.loop();
    this.publish();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.publish();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
    this.publish();
  }

  setDirection(direction: 1 | -1): void {
    this.direction = direction;
    this.publish();
  }

  /** Jump to an exact frame. Playback state is preserved. */
  seek(frame: number): void {
    this.position = Math.min(this.frameCount - 1, Math.max(0, frame));
    this.lastTick = performance.now();
    this.emitInteger();
    this.publish();
  }

  step(frames: number): void {
    this.seek(this.position + frames);
  }

  /** Restarts from frame zero without changing speed. */
  reset(): void {
    this.pause();
    this.seek(0);
  }

  destroy(): void {
    this.pause();
    this.listeners.clear();
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(() => {
      if (!this.playing) return;
      const now = performance.now();
      const deltaSeconds = Math.min(0.25, (now - this.lastTick) / 1000);
      this.lastTick = now;

      const advance = deltaSeconds * FRAMES_PER_SECOND_AT_1X * this.speed * this.direction;
      const next = this.position + advance;

      if (next >= this.frameCount - 1) {
        this.position = this.frameCount - 1;
        this.emitInteger();
        this.publish();
        this.pause();
        return;
      }
      if (next <= 0) {
        this.position = 0;
        this.emitInteger();
        this.publish();
        this.pause();
        return;
      }

      this.position = next;
      this.emitInteger();
      this.loop();
    });
  };

  private emitInteger(): void {
    const current = Math.floor(this.position);
    if (current !== this.lastIntegerFrame) {
      this.lastIntegerFrame = current;
      this.onIntegerFrame?.(current);
    }
  }

  private publish(): void {
    for (const listener of this.listeners) listener(this.position, this.playing);
  }
}
