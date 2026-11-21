import { midiToFreq } from './notes.js';

/**
 * Web Audio API を使ったゼロ依存のキッズ向けポリフォニックシンセ＆効果音エンジン
 */
export const SOUND_PRESETS = [
  { id: 'piano', label: '🎹 ピアノ' },
  { id: 'marimba', label: '🪘 もっきん' },
  { id: 'bell', label: '🔔 キラキラ' },
  { id: 'chip', label: '👾 ピコピコ' },
];

export class KidsAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.preset = 'piano';
    this.volume = 0.7;
    this.muted = false;
    /** @type {Map<number, { stop: () => void }>} */
    this.activeVoices = new Map();
    this.unlocked = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.15;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * iOS / iPadOS のオーディオロックをユーザー操作時に解除
   */
  unlock() {
    const ctx = this.ensureContext();
    if (this.unlocked && ctx.state === 'running') return;
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
      this.unlocked = true;
    } catch {
      // ignore
    }
  }

  setPreset(presetId) {
    if (SOUND_PRESETS.some((p) => p.id === presetId)) {
      this.preset = presetId;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.015);
    }
  }

  noteOn(midiNote, velocity = 0.8) {
    const ctx = this.ensureContext();
    if (this.muted) return;

    // 同じノートの既存発音を軽くリリース
    if (this.activeVoices.has(midiNote)) {
      this.activeVoices.get(midiNote).stop();
      this.activeVoices.delete(midiNote);
    }

    const freq = midiToFreq(midiNote);
    const vel = Math.max(0.18, Math.min(1.0, velocity));
    const now = ctx.currentTime;

    let voice;
    switch (this.preset) {
      case 'marimba':
        voice = this._playMarimba(ctx, freq, vel, now);
        break;
      case 'bell':
        voice = this._playBell(ctx, freq, vel, now);
        break;
      case 'chip':
        voice = this._playChip(ctx, freq, vel, now);
        break;
      case 'piano':
      default:
        voice = this._playPiano(ctx, freq, vel, now);
        break;
    }

    this.activeVoices.set(midiNote, voice);
  }

  noteOff(midiNote) {
    const voice = this.activeVoices.get(midiNote);
    if (voice) {
      voice.stop();
      this.activeVoices.delete(midiNote);
    }
  }

  allNotesOff() {
    for (const voice of this.activeVoices.values()) {
      voice.stop();
    }
    this.activeVoices.clear();
  }

  /**
   * お手本や自動ガイド用の単音再生
   */
  playDemoNote(midiNote, durationMs = 420, velocity = 0.65) {
    const ctx = this.ensureContext();
    if (this.muted) return;
    const freq = midiToFreq(midiNote);
    const now = ctx.currentTime;
    const voice = this._playPiano(ctx, freq, velocity, now);
    setTimeout(() => voice.stop(), durationMs);
  }

  _playPiano(ctx, freq, vel, now) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(7000, freq * 6 + 1200), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 2.2), now + 0.8);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.28, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.03, now + 0.5);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(freq, now);

    const osc3Gain = ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.09 * vel, now);
    osc3Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(0.42 * vel, now + 0.008);
    out.gain.exponentialRampToValueAtTime(0.18 * vel, now + 0.22);
    out.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    osc3.connect(osc3Gain);
    osc3Gain.connect(filter);

    filter.connect(out);
    out.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    let stopped = false;
    const stopAll = (t) => {
      try {
        osc1.stop(t);
        osc2.stop(t);
        osc3.stop(t);
      } catch {
        // already stopped
      }
    };
    stopAll(now + 2.35);

    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        stopAll(t + 0.16);
      },
    };
  }

  _playMarimba(ctx, freq, vel, now) {
    const out = ctx.createGain();
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 4, now);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.22 * vel, now);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(0.55 * vel, now + 0.005);
    out.gain.exponentialRampToValueAtTime(0.0008, now + 0.48);

    osc1.connect(out);
    osc2.connect(g2);
    g2.connect(out);
    out.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    let stopped = false;
    const stopAt = (t) => {
      try {
        osc1.stop(t);
        osc2.stop(t);
      } catch {
        // ignore
      }
    };
    stopAt(now + 0.55);

    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        stopAt(t + 0.1);
      },
    };
  }

  _playBell(ctx, freq, vel, now) {
    const out = ctx.createGain();
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.0, now);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3.01, now);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.25, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.14, now);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(0.38 * vel, now + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);

    osc1.connect(out);
    osc2.connect(g2);
    g2.connect(out);
    osc3.connect(g3);
    g3.connect(out);
    out.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    let stopped = false;
    const stopAt = (t) => {
      try {
        osc1.stop(t);
        osc2.stop(t);
        osc3.stop(t);
      } catch {
        // ignore
      }
    };
    stopAt(now + 1.7);

    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        stopAt(t + 0.28);
      },
    };
  }

  _playChip(ctx, freq, vel, now) {
    const out = ctx.createGain();
    const osc1 = ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 0.5, now);

    const g1 = ctx.createGain();
    g1.gain.value = 0.16;
    const g2 = ctx.createGain();
    g2.gain.value = 0.24;

    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(0.65 * vel, now + 0.005);
    out.gain.exponentialRampToValueAtTime(0.28 * vel, now + 0.15);
    out.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(g1);
    g1.connect(out);
    osc2.connect(g2);
    g2.connect(out);
    out.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    let stopped = false;
    const stopAt = (t) => {
      try {
        osc1.stop(t);
        osc2.stop(t);
      } catch {
        // ignore
      }
    };
    stopAt(now + 1.3);

    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        stopAt(t + 0.08);
      },
    };
  }

  /**
   * ゲーム用効果音
   */
  playSfx(type) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    if (type === 'correct') {
      this._beep(ctx, 880, now, 0.09, 0.14, 'triangle');
      this._beep(ctx, 1174.66, now + 0.065, 0.14, 0.16, 'triangle');
    } else if (type === 'combo') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this._beep(ctx, f, now + i * 0.055, 0.14, 0.15, 'sine');
      });
    } else if (type === 'clear') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      const times = [0, 0.1, 0.2, 0.32, 0.48, 0.6];
      const durs  = [0.12, 0.12, 0.12, 0.18, 0.12, 0.42];
      notes.forEach((f, i) => {
        this._beep(ctx, f, now + times[i], durs[i], 0.18, 'triangle');
      });
    } else if (type === 'softOops') {
      this._beep(ctx, 260, now, 0.09, 0.08, 'sine');
    }
  }

  _beep(ctx, freq, startTime, duration, gainVal, type = 'sine') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}
