import { midiToFreq } from './notes.js';

/**
 * Web Audio API を使ったゼロ依存のキッズ向けポリフォニックシンセ＆効果音エンジン
 * - iOS / iPadOS Safari / Web MIDI Browser 対応:
 *   - navigator.audioSession.type = 'playback' (iPadOS 17+)
 *   - 極小無音WAVの <audio> 再生によるサイレントモード突破
 *   - suspended / interrupted 状態からの自動 resume
 */
export const SOUND_PRESETS = [
  { id: 'piano', label: '🎹 ピアノ' },
  { id: 'marimba', label: '🪘 もっきん' },
  { id: 'bell', label: '🔔 キラキラ' },
  { id: 'chip', label: '👾 ピコピコ' },
];

// 44.1kHz 16bit mono の極小無音WAV（iOS/iPadOSのメディアオーディオセッション起動用）
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export class KidsAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.preset = 'piano';
    this.volume = 0.78;
    this.muted = false;
    /** @type {Map<number, { stop: () => void }>} */
    this.activeVoices = new Map();
    this._mediaUnlocked = false;
    this._silentAudioEl = null;
    /** @type {Set<(state: { ready: boolean, ctxState: string, muted: boolean }) => void>} */
    this._stateListeners = new Set();

    this._configureAudioSession();
  }

  _configureAudioSession() {
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch {
      // ignore unsupported browsers
    }
  }

  onStateChange(fn) {
    this._stateListeners.add(fn);
    fn(this.getState());
    return () => this._stateListeners.delete(fn);
  }

  getState() {
    const ctxState = this.ctx ? this.ctx.state : 'uninitialized';
    return {
      ready: ctxState === 'running',
      ctxState,
      muted: this.muted,
    };
  }

  _emitState() {
    const s = this.getState();
    for (const fn of this._stateListeners) {
      fn(s);
    }
  }

  ensureContext() {
    this._configureAudioSession();

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.ctx.onstatechange = () => {
        this._emitState();
      };

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
      this._emitState();
    }

    if (this.ctx.state !== 'running') {
      this.ctx
        .resume()
        .then(() => this._emitState())
        .catch(() => {});
    }
    return this.ctx;
  }

  /**
   * iOS / iPadOS のオーディオロック・サイレントモード制限をユーザー操作内で解除
   * touchstart / touchend / click / pointerdown の同期ハンドラから呼ぶこと
   */
  unlock() {
    this._configureAudioSession();

    // 1. HTML5 <audio> で極小無音WAVを再生し、iPadOS のメディア再生チャンネルを起こす
    //    （コントロールセンターの消音モード中でも Web Audio が鳴るようにする）
    if (!this._mediaUnlocked && typeof Audio !== 'undefined') {
      try {
        if (!this._silentAudioEl) {
          const el = new Audio(SILENT_WAV_DATA_URI);
          el.setAttribute('playsinline', '');
          el.playsInline = true;
          el.preload = 'auto';
          this._silentAudioEl = el;
        }
        const playPromise = this._silentAudioEl.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              this._mediaUnlocked = true;
            })
            .catch(() => {
              // ユーザー操作外だった場合は次回タッチで再試行
            });
        } else {
          this._mediaUnlocked = true;
        }
      } catch {
        // ignore
      }
    }

    // 2. Web AudioContext を生成・resume・無音バッファ発音
    const ctx = this.ensureContext();
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // ignore
    }

    if (ctx.state !== 'running') {
      ctx
        .resume()
        .then(() => this._emitState())
        .catch(() => {});
    } else {
      this._emitState();
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
    this._emitState();
  }

  noteOn(midiNote, velocity = 0.8) {
    const ctx = this.ensureContext();
    if (this.muted) return;

    const trigger = () => {
      if (this.muted) return;
      // 同じノートの既存発音を軽くリリース
      if (this.activeVoices.has(midiNote)) {
        this.activeVoices.get(midiNote).stop();
        this.activeVoices.delete(midiNote);
      }

      const freq = midiToFreq(midiNote);
      const vel = Math.max(0.2, Math.min(1.0, velocity));
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
    };

    // 初回タッチ等でまだ suspended/interrupted の場合は resume 完了直後に鳴らす
    if (ctx.state !== 'running') {
      ctx
        .resume()
        .then(() => {
          this._emitState();
          trigger();
        })
        .catch(() => {});
    } else {
      trigger();
    }
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

    const run = () => {
      if (this.muted) return;
      const freq = midiToFreq(midiNote);
      const now = ctx.currentTime;
      const voice = this._playPiano(ctx, freq, velocity, now);
      setTimeout(() => voice.stop(), durationMs);
    };

    if (ctx.state !== 'running') {
      ctx
        .resume()
        .then(() => {
          this._emitState();
          run();
        })
        .catch(() => {});
    } else {
      run();
    }
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
    out.gain.linearRampToValueAtTime(0.46 * vel, now + 0.008);
    out.gain.exponentialRampToValueAtTime(0.2 * vel, now + 0.22);
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
    out.gain.linearRampToValueAtTime(0.58 * vel, now + 0.005);
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
    out.gain.linearRampToValueAtTime(0.42 * vel, now + 0.004);
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
    out.gain.linearRampToValueAtTime(0.68 * vel, now + 0.005);
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
    const run = () => {
      if (this.muted) return;
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
        const durs = [0.12, 0.12, 0.12, 0.18, 0.12, 0.42];
        notes.forEach((f, i) => {
          this._beep(ctx, f, now + times[i], durs[i], 0.18, 'triangle');
        });
      } else if (type === 'softOops') {
        this._beep(ctx, 260, now, 0.09, 0.08, 'sine');
      }
    };

    if (ctx.state !== 'running') {
      ctx
        .resume()
        .then(() => {
          this._emitState();
          run();
        })
        .catch(() => {});
    } else {
      run();
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
