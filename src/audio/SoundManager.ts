import { SoundEvent } from '../simulation/types';
import { Camera } from '../rendering/Camera';

const TILE_SIZE = 16;
const MAP_TILE_W = 80;
const MAP_TILE_H = 120;

export class SoundManager {
  private actx: AudioContext | null = null;
  private master: GainNode | null = null;

  // Lazily create (or resume) the AudioContext after user gesture
  private ctx(): AudioContext {
    if (!this.actx) {
      this.actx = new AudioContext();
      this.master = this.actx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.actx.destination);
    }
    if (this.actx.state === 'suspended') this.actx.resume();
    return this.actx;
  }

  private dest(): GainNode {
    this.ctx();
    return this.master!;
  }

  // ─── Spatial gain ────────────────────────────────────────────────────────────
  // Returns 0..1 based on distance from camera center and zoom level.
  private spatialGain(
    worldTileX: number | undefined,
    worldTileY: number | undefined,
    camera: Camera,
    canvas: HTMLCanvasElement,
  ): number {
    // Zoom multiplier: louder when zoomed in, quieter when zoomed out
    const zoomGain = Math.min(1, camera.zoom);

    if (worldTileX === undefined || worldTileY === undefined) return zoomGain;

    // Camera centre in world tiles
    const camCX = (camera.x + canvas.width  / (2 * camera.zoom)) / TILE_SIZE;
    const camCY = (camera.y + canvas.height / (2 * camera.zoom)) / TILE_SIZE;

    const dx = worldTileX - camCX;
    const dy = worldTileY - camCY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Max audible radius scales with zoom (zoomed out = hear more of the map)
    const maxDist = (Math.max(MAP_TILE_W, MAP_TILE_H) * 0.7) / camera.zoom;
    const distGain = Math.max(0, 1 - dist / maxDist);

    return zoomGain * distGain;
  }

  // ─── Low-level primitives ─────────────────────────────────────────────────

  /** Single square-wave note with exponential decay */
  private note(
    freq: number,
    duration: number,
    gain: number,
    dest: GainNode,
    type: OscillatorType = 'square',
    startOffset = 0,
  ): void {
    const ac = this.ctx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ac.currentTime + startOffset;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  /** Frequency sweep (portamento) */
  private sweep(
    freqFrom: number,
    freqTo: number,
    duration: number,
    gain: number,
    dest: GainNode,
    type: OscillatorType = 'square',
    startOffset = 0,
  ): void {
    const ac = this.ctx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = type;
    const t0 = ac.currentTime + startOffset;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(freqTo, t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  /** White noise burst */
  private noise(duration: number, gain: number, dest: GainNode, startOffset = 0): void {
    const ac = this.ctx();
    const bufSize = Math.floor(ac.sampleRate * duration);
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    const g   = ac.createGain();
    src.buffer = buf;
    const t0 = ac.currentTime + startOffset;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + duration + 0.01);
  }

  // ─── Named sound effects ──────────────────────────────────────────────────

  private playBuildingPlaced(v: number): void {
    const d = this.dest();
    this.note(330, 0.06, v * 0.4, d, 'square', 0);
    this.note(494, 0.06, v * 0.4, d, 'square', 0.065);
    this.note(659, 0.10, v * 0.5, d, 'square', 0.13);
  }

  private playBuildingDestroyed(v: number): void {
    const d = this.dest();
    this.sweep(400, 50, 0.28, v * 0.5, d, 'sawtooth');
    this.noise(0.25, v * 0.3, d);
  }

  private playUnitKilled(v: number): void {
    const d = this.dest();
    this.sweep(280, 80, 0.09, v * 0.25, d, 'square');
  }

  private playNukeIncoming(v: number): void {
    const d = this.dest();
    // Rising siren in two waves
    this.sweep(220, 880, 0.8, v * 0.5, d, 'sawtooth', 0);
    this.sweep(220, 880, 0.8, v * 0.4, d, 'sawtooth', 0.85);
  }

  private playNukeDetonated(v: number): void {
    const d = this.dest();
    this.note(60, 0.5, v * 0.6, d, 'sine');
    this.note(40, 0.4, v * 0.5, d, 'sine', 0.05);
    this.noise(0.55, v * 0.6, d);
    this.sweep(300, 30, 0.5, v * 0.4, d, 'sawtooth');
  }

  private playDiamondExposed(v: number): void {
    const d = this.dest();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((f, i) => this.note(f, 0.15, v * 0.45, d, 'square', i * 0.13));
  }

  private playDiamondCarried(v: number): void {
    const d = this.dest();
    this.note(1047, 0.07, v * 0.4, d, 'square', 0);
    this.note(1319, 0.10, v * 0.5, d, 'square', 0.08);
  }

  private playHqDamaged(v: number): void {
    const d = this.dest();
    this.sweep(150, 50, 0.22, v * 0.55, d, 'square');
    this.noise(0.18, v * 0.25, d);
  }

  private playMatchStart(v: number): void {
    const d = this.dest();
    const notes = [262, 330, 392, 523]; // C4 E4 G4 C5
    notes.forEach((f, i) => this.note(f, 0.12, v * 0.5, d, 'square', i * 0.11));
  }

  private playMatchEndWin(v: number): void {
    const d = this.dest();
    const notes = [523, 659, 784, 1047, 1047]; // C5 E5 G5 C6 C6
    notes.forEach((f, i) => {
      const dur = i === notes.length - 1 ? 0.4 : 0.13;
      this.note(f, dur, v * 0.5, d, 'square', i * 0.14);
    });
  }

  private playMatchEndLose(v: number): void {
    const d = this.dest();
    const notes = [392, 330, 262, 220]; // G4 E4 C4 A3
    notes.forEach((f, i) => this.note(f, 0.18, v * 0.45, d, 'square', i * 0.16));
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  play(event: SoundEvent, camera: Camera, canvas: HTMLCanvasElement): void {
    const v = this.spatialGain(event.x, event.y, camera, canvas);
    if (v < 0.01) return;

    switch (event.type) {
      case 'building_placed':    this.playBuildingPlaced(v);   break;
      case 'building_destroyed': this.playBuildingDestroyed(v); break;
      case 'unit_killed':        this.playUnitKilled(v);        break;
      case 'nuke_incoming':      this.playNukeIncoming(v);      break;
      case 'nuke_detonated':     this.playNukeDetonated(v);     break;
      case 'diamond_exposed':    this.playDiamondExposed(v);    break;
      case 'diamond_carried':    this.playDiamondCarried(v);    break;
      case 'hq_damaged':         this.playHqDamaged(v);         break;
      case 'match_start':        this.playMatchStart(v);        break;
      case 'match_end_win':      this.playMatchEndWin(v);       break;
      case 'match_end_lose':     this.playMatchEndLose(v);      break;
    }
  }
}
