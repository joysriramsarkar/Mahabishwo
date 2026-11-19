/**
 * Procedural Ambient Space Audio via Web Audio API.
 * Harmonic drone chord, scale-responsive low-pass filter and warp sweep.
 */
import { ScaleLevel } from '../core/types';

export class CosmicAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isEnabled = false;

  private init(): void {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 260;
    this.filter.Q.value = 1.2;
    this.filter.connect(this.masterGain);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.16;
    this.droneGain.connect(this.filter);

    const freqs = [43.65, 65.41, 98.0, 130.81, 196.0];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.value = i === 0 ? 0.34 : 0.12;
      osc.connect(g);
      g.connect(this.droneGain!);
      osc.start();
    });
  }

  public toggle(): boolean {
    this.init();
    if (!this.ctx || !this.masterGain) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.isEnabled = !this.isEnabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.24 : 0, now, 0.35);
    return this.isEnabled;
  }

  public setScale(scale: ScaleLevel): void {
    if (!this.ctx || !this.filter || !this.droneGain) return;
    const now = this.ctx.currentTime;
    const map: Record<ScaleLevel, [number, number]> = {
      [ScaleLevel.OBSERVABLE_UNIVERSE]: [150, 0.24],
      [ScaleLevel.COSMIC_WEB]: [210, 0.22],
      [ScaleLevel.GALAXY_CLUSTER]: [300, 0.19],
      [ScaleLevel.GALAXY]: [380, 0.18],
      [ScaleLevel.STAR_SYSTEM]: [560, 0.14],
      [ScaleLevel.PLANET]: [780, 0.12],
      [ScaleLevel.SURFACE]: [920, 0.11],
    };
    const [freq, gain] = map[scale] || [300, 0.16];
    this.filter.frequency.setTargetAtTime(freq, now, 0.7);
    this.droneGain.gain.setTargetAtTime(gain, now, 0.5);
  }

  public playWarp(): void {
    if (!this.isEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.32);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.38);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}
