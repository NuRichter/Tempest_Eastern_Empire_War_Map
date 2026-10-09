/**
 * Background music. Two worlds: a calm atlas score while exploring, and an
 * orchestral film score in cinematic mode that turns to battle music while a
 * battle is fought. Free-licensed fantasy music (see MUSIC_CREDITS), not
 * official Tensura music.
 *
 * Kept light: one shared player, nothing downloads until music actually plays
 * (preload none), and it pauses while the tab is hidden.
 */

export type Scene = 'atlas' | 'cinematic' | 'battle';

export interface Track {
  file: string;
  title: string;
  author: string;
  license: string;
  source: string;
}

const T = (file: string, title: string, author: string, license: string, source: string): Track => ({ file: `/assets/music/${file}.mp3`, title, author, license, source });

export const TRACKS = {
  inn: T('atlas-tower-inn', 'Medieval: The Old Tower Inn', 'RandomMind', 'CC0', 'https://opengameart.org/content/medieval-the-old-tower-inn'),
  labyrinth: T('atlas-great-labyrinth', 'Great Labyrinth', 'Mintodog and Jonathan Shaw, mix by glitchart', 'CC-BY 3.0', 'https://opengameart.org/content/great-labyrinth-mintodog-jonathan-shaw'),
  theme: T('cine-fantasy-theme', 'Fantasy Orchestral Theme', 'Joth', 'CC0', 'https://opengameart.org/content/fantasy-orchestral-theme'),
  pursuit: T('cine-determined-pursuit', 'Determined Pursuit', 'Emma_MA', 'CC0', 'https://opengameart.org/content/determined-pursuit-epic-orchestra-loop'),
  battle: T('cine-battle', 'Battle Theme', 'Wolfgang_', 'CC0', 'https://opengameart.org/content/battle-theme-0'),
} as const;

export const MUSIC_CREDITS: Track[] = Object.values(TRACKS);

const PLAYLISTS: Record<Scene, Track[]> = {
  atlas: [TRACKS.inn, TRACKS.labyrinth],
  cinematic: [TRACKS.theme],
  battle: [TRACKS.pursuit, TRACKS.battle],
};

const FADE_MS = 1600;

class MusicPlayer {
  private decks: HTMLAudioElement[] = [];
  private live = 0;
  private scene: Scene | null = null;
  private index: Record<Scene, number> = { atlas: 0, cinematic: 0, battle: 0 };
  private volume = 0.5;
  private enabled = false;
  private unlocked = false;
  private fades = new Map<HTMLAudioElement, number>();
  private listeners = new Set<() => void>();
  current: Track | null = null;

  private deck(i: number): HTMLAudioElement {
    if (!this.decks[i]) {
      const a = new Audio();
      a.preload = 'none';
      a.addEventListener('ended', () => {
        if (a !== this.decks[this.live] || !this.scene) return;
        // Next track in the scene's playlist (a single-track scene repeats).
        this.index[this.scene] += 1;
        this.start(this.scene, true);
      });
      this.decks[i] = a;
    }
    return this.decks[i];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private fade(a: HTMLAudioElement, to: number, then?: () => void) {
    window.cancelAnimationFrame(this.fades.get(a) ?? 0);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) this.fades.set(a, window.requestAnimationFrame(step));
      else {
        this.fades.delete(a);
        then?.();
      }
    };
    this.fades.set(a, window.requestAnimationFrame(step));
  }

  private start(scene: Scene, force = false) {
    const list = PLAYLISTS[scene];
    const track = list[this.index[scene] % list.length];
    if (!force && this.current === track && !this.deck(this.live).paused) return;
    const old = this.deck(this.live);
    this.live = 1 - this.live;
    const next = this.deck(this.live);
    if (!old.paused) this.fade(old, 0, () => old.pause());
    next.src = track.file;
    next.volume = 0;
    this.current = track;
    this.emit();
    if (!this.enabled || !this.unlocked || document.hidden) return;
    void next.play().then(
      () => this.fade(next, this.volume),
      () => undefined, // autoplay refused: retried on the next interaction
    );
  }

  /** Called on the first pointer or key press: browsers only allow sound after one. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.scene) this.start(this.scene, true);
  }

  setScene(scene: Scene) {
    if (scene === this.scene) return;
    // Each new battle gets the other battle track.
    if (scene === 'battle' && this.scene !== null) this.index.battle += 1;
    this.scene = scene;
    this.start(scene);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    const a = this.decks[this.live];
    if (!on) {
      if (a && !a.paused) this.fade(a, 0, () => a.pause());
    } else if (this.scene) this.start(this.scene, true);
    this.emit();
  }

  setVolume(v: number) {
    this.volume = v;
    const a = this.decks[this.live];
    if (a && !a.paused && !this.fades.has(a)) a.volume = v;
  }

  /** Pause in a hidden tab (no work, no battery), resume when it returns. */
  visibility(hidden: boolean) {
    const a = this.decks[this.live];
    if (!a) return;
    if (hidden) a.pause();
    else if (this.enabled && this.unlocked && a.src) void a.play().catch(() => undefined);
  }
}

let player: MusicPlayer | null = null;
export function music(): MusicPlayer {
  player ??= new MusicPlayer();
  return player;
}
