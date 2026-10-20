/**
 * Procedural Web Audio Sound Generator for CityLife RP
 * Generates realistic sound effects on the fly without any external MP3/WAV assets.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.6;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;
  private lastFootstepTime: number = 0;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolume() {
    return this.masterVolume;
  }

  // Play footstep sound
  public playFootstep(isRunning: boolean = false) {
    if (this.isMuted) return;
    const now = performance.now();
    const interval = isRunning ? 260 : 380;
    if (now - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = now;

    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isRunning ? 280 : 200, t);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isRunning ? 110 : 85, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.08);

      gain.gain.setValueAtTime(this.masterVolume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore audio interruptions
    }
  }

  // Car engine simulation
  public startEngine() {
    if (this.isEngineRunning) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineFilter = this.ctx.createBiquadFilter();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, t);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(180, t);

      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume * 0.12, t);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(t);
      this.isEngineRunning = true;
    } catch {
      // Audio fallback
    }
  }

  public updateEngine(speedKmH: number, isAccelerating: boolean) {
    if (!this.isEngineRunning || !this.engineOsc || !this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const targetPitch = 40 + Math.abs(speedKmH) * 2.2 + (isAccelerating ? 25 : 0);
      const targetFreq = 160 + Math.abs(speedKmH) * 6;
      const clampedPitch = Math.min( targetPitch, 280 );

      this.engineOsc.frequency.setTargetAtTime(clampedPitch, t, 0.1);
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(targetFreq, t, 0.1);
      }
      if (this.engineGain) {
        const targetVol = this.masterVolume * (0.12 + Math.min(0.18, Math.abs(speedKmH) / 300));
        this.engineGain.gain.setTargetAtTime(targetVol, t, 0.1);
      }
    } catch {
      // Ignored
    }
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      setTimeout(() => {
        try {
          this.engineOsc?.stop();
          this.engineOsc?.disconnect();
          this.engineGain?.disconnect();
          this.engineFilter?.disconnect();
        } catch {}
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;
        this.isEngineRunning = false;
      }, 150);
    } catch {
      this.isEngineRunning = false;
    }
  }

  // Car Horn (Buzina)
  public playHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(415, t); // G#
      osc2.frequency.setValueAtTime(520, t); // C

      gain.gain.setValueAtTime(this.masterVolume * 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.35);
      osc2.stop(t + 0.35);
    } catch {}
  }

  // Cash / Money chime (som de dinheiro ganho)
  public playCashSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [987.77, 1318.51]; // B5, E6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(this.masterVolume * 0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {}
  }

  // Mission Complete Fanfare
  public playMissionComplete() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Arpeggio: C5, E5, G5, C6
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + i * 0.09;
        const dur = i === freqs.length - 1 ? 0.45 : 0.15;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(this.masterVolume * 0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      });
    } catch {}
  }

  // UI Click / Interaction Pop
  public playUiClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);

      gain.gain.setValueAtTime(this.masterVolume * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {}
  }
}

export const soundManager = new SoundManager();
