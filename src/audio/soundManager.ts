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

  // Combat punch impact (whoosh + thud)
  public playPunch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

      gain.gain.setValueAtTime(this.masterVolume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  // Shower running water
  public playShower() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(1.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.masterVolume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 1.5);
    } catch {}
  }

  // Smartphone message chime
  public playPhoneNotification() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const freqs = [659.25, 987.77]; // E5, B5
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + idx * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(this.masterVolume * 0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {}
  }

  // Police Siren alert
  public playSiren() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(900, t + 0.35);
      osc.frequency.linearRampToValueAtTime(600, t + 0.7);

      gain.gain.setValueAtTime(this.masterVolume * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.7);
    } catch {}
  }

  // Bus Door Chime
  public playBusChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const freqs = [880, 587.33]; // A5, D5
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + idx * 0.16;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(this.masterVolume * 0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {}
  }

  // Vehicle or building door latch sound
  public playDoorOpen() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

      gain.gain.setValueAtTime(this.masterVolume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // --- Rain Ambiance ---
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private isRaining: boolean = false;

  public startRain() {
    if (this.isRaining) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.isRaining = true;
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume * 0.18, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      this.rainNode = noise;
      this.rainGain = gain;
    } catch {}
  }

  public stopRain() {
    if (!this.isRaining) return;
    this.isRaining = false;
    try {
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      setTimeout(() => {
        try {
          this.rainNode?.stop();
          this.rainNode?.disconnect();
          this.rainGain?.disconnect();
        } catch {}
        this.rainNode = null;
        this.rainGain = null;
      }, 150);
    } catch {}
  }

  // --- Car Radio Stations (Procedural Brazilian Audio Tracks) ---
  public currentRadioStation: number = 0; // 0: Off, 1: Sertanejo, 2: Funk, 3: MPB, 4: Notícias
  private radioTimer: number | null = null;
  private radioStep: number = 0;

  public static readonly RADIO_STATIONS = [
    { id: 0, name: 'Rádio Desligada', genre: 'Mudo' },
    { id: 1, name: 'Sertanejo & Piseiro FM', genre: 'Forró & Piseiro 138 BPM' },
    { id: 2, name: 'Brasil Funk 150 BPM', genre: 'Batidão Paulista & Carioca' },
    { id: 3, name: 'Bossa Nova & MPB Suave', genre: 'Vibes Brasileiras Acústicas' },
    { id: 4, name: 'Vila Esperança Notícias 24h', genre: 'Jornalismo & Trânsito' },
  ];

  public setRadioStation(stationIndex: number) {
    this.currentRadioStation = (stationIndex + SoundManager.RADIO_STATIONS.length) % SoundManager.RADIO_STATIONS.length;
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
    this.radioStep = 0;

    if (this.currentRadioStation === 0 || this.isMuted) return;

    this.initContext();
    if (!this.ctx) return;

    // Tempo based on station
    const intervalMs = this.currentRadioStation === 2 ? 200 : this.currentRadioStation === 1 ? 220 : 360;

    this.radioTimer = window.setInterval(() => {
      this.tickRadio();
    }, intervalMs);
  }

  public cycleNextRadioStation(): { id: number; name: string; genre: string } {
    const nextIdx = (this.currentRadioStation + 1) % SoundManager.RADIO_STATIONS.length;
    this.setRadioStation(nextIdx);
    return SoundManager.RADIO_STATIONS[this.currentRadioStation];
  }

  private tickRadio() {
    if (!this.ctx || this.isMuted || this.currentRadioStation === 0) return;

    try {
      const t = this.ctx.currentTime;
      const step = this.radioStep % 16;
      this.radioStep++;

      if (this.currentRadioStation === 1) {
        // Sertanejo / Piseiro: Bass line on beats 0, 4, 8, 12, accordion synth on upbeats
        const bassNotes = [110, 110, 146.83, 164.81]; // A2, D3, E3
        if (step % 4 === 0) {
          const bass = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          bass.type = 'sawtooth';
          bass.frequency.setValueAtTime(bassNotes[(step / 4) % bassNotes.length], t);
          gain.gain.setValueAtTime(this.masterVolume * 0.14, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          bass.connect(gain);
          gain.connect(this.ctx.destination);
          bass.start(t);
          bass.stop(t + 0.2);
        }
        // Accordion arpeggio
        const leadNotes = [440, 554.37, 659.25, 880, 659.25, 554.37];
        const lead = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadNotes[step % leadNotes.length], t);
        lGain.gain.setValueAtTime(this.masterVolume * 0.08, t);
        lGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        lead.connect(lGain);
        lGain.connect(this.ctx.destination);
        lead.start(t);
        lead.stop(t + 0.16);
      } else if (this.currentRadioStation === 2) {
        // Funk 150 BPM: Sub-bass kick on 0, 3, 6, 10
        if ([0, 3, 6, 10].includes(step)) {
          const kick = this.ctx.createOscillator();
          const kGain = this.ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(140, t);
          kick.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          kGain.gain.setValueAtTime(this.masterVolume * 0.26, t);
          kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          kick.connect(kGain);
          kGain.connect(this.ctx.destination);
          kick.start(t);
          kick.stop(t + 0.16);
        }
        // Hi-hat tick on even steps
        if (step % 2 === 0) {
          const hh = this.ctx.createOscillator();
          const hGain = this.ctx.createGain();
          hh.type = 'square';
          hh.frequency.setValueAtTime(6000, t);
          hGain.gain.setValueAtTime(this.masterVolume * 0.03, t);
          hGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          hh.connect(hGain);
          hGain.connect(this.ctx.destination);
          hh.start(t);
          hh.stop(t + 0.04);
        }
      } else if (this.currentRadioStation === 3) {
        // Bossa Nova: Gentle Major 7th arpeggios
        const bossaChords = [
          [261.63, 329.63, 392.0, 493.88], // Cmaj7
          [220.0, 261.63, 329.63, 392.0],   // Am7
          [293.66, 349.23, 440.0, 523.25], // Dm7
          [196.0, 246.94, 293.66, 349.23], // G7
        ];
        const chord = bossaChords[Math.floor(step / 4) % bossaChords.length];
        const note = chord[step % 4];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, t);
        g.gain.setValueAtTime(this.masterVolume * 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      } else if (this.currentRadioStation === 4) {
        // News Jingle & Talk tone
        if (step % 8 === 0) {
          const jingle = this.ctx.createOscillator();
          const jGain = this.ctx.createGain();
          jingle.type = 'sine';
          jingle.frequency.setValueAtTime(523.25, t); // C5
          jingle.frequency.setValueAtTime(659.25, t + 0.08); // E5
          jingle.frequency.setValueAtTime(783.99, t + 0.16); // G5
          jGain.gain.setValueAtTime(this.masterVolume * 0.12, t);
          jGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          jingle.connect(jGain);
          jGain.connect(this.ctx.destination);
          jingle.start(t);
          jingle.stop(t + 0.28);
        }
      }
    } catch {}
  }
}

export const soundManager = new SoundManager();

