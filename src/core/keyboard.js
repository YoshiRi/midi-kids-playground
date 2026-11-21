import { getNoteInfo, PITCH_CLASSES } from './notes.js';

/**
 * PCキーボード -> MIDIノート (ベースオクターブC4=60からのオフセット)
 */
const PC_KEY_OFFSETS = {
  a: 0,  // C
  w: 1,  // C#
  s: 2,  // D
  e: 3,  // D#
  d: 4,  // E
  f: 5,  // F
  t: 6,  // F#
  g: 7,  // G
  y: 8,  // G#
  h: 9,  // A
  u: 10, // A#
  j: 11, // B
  k: 12, // C+1
  o: 13, // C#+1
  l: 14, // D+1
  p: 15, // D#+1
  ';': 16, // E+1
};

const PC_HINT_BY_OFFSET = Object.fromEntries(
  Object.entries(PC_KEY_OFFSETS).map(([k, off]) => [off, k.toUpperCase()])
);

/**
 * マルチタッチ / マウス / PCキーボード / MIDI連動のキッズ向け画面鍵盤
 */
export class VisualKeyboard {
  /**
   * @param {HTMLElement} container
   * @param {{ onNoteOn: (info: any, source: string) => void, onNoteOff: (info: any, source: string) => void }} callbacks
   */
  constructor(container, callbacks) {
    this.container = container;
    this.onNoteOn = callbacks.onNoteOn;
    this.onNoteOff = callbacks.onNoteOff;

    this.startMidi = 60; // C4
    this.endMidi = 72;   // C5 (デフォルト1オクターブ強 = 白鍵8個、押しやすさ重視)
    this.showLabels = true;
    this.showPcHints = false;

    /** @type {Map<number, HTMLElement>} */
    this.keyElements = new Map();
    /** @type {Map<number, number>} pointerId -> midiNote */
    this.activePointers = new Map();
    /** @type {Map<string, number>} pcKey -> midiNote */
    this.activePcKeys = new Map();
    /** @type {Set<number>} */
    this.pressedMidis = new Set();
    /** @type {{ notes: number[], ignoreOctave: boolean }} */
    this.hintState = { notes: [], ignoreOctave: false };

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onBlur = this._handleWindowBlur.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    this.render();
  }

  setRange(startMidi, endMidi) {
    this.startMidi = startMidi;
    this.endMidi = endMidi;
    this.render();
    this._applyHints();
  }

  setShowLabels(show) {
    this.showLabels = Boolean(show);
    this.container.classList.toggle('hide-labels', !this.showLabels);
  }

  setShowPcHints(show) {
    this.showPcHints = Boolean(show);
    this.container.classList.toggle('show-pc-hints', this.showPcHints);
  }

  render() {
    this.container.innerHTML = '';
    this.keyElements.clear();

    const board = document.createElement('div');
    board.className = 'piano-board';
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', 'ピアノけんばん');

    // 白鍵リストを先に数えて横幅の割合を決める
    const whiteNotes = [];
    for (let m = this.startMidi; m <= this.endMidi; m++) {
      if (!PITCH_CLASSES[m % 12].isBlack) {
        whiteNotes.push(m);
      }
    }

    const whiteCount = whiteNotes.length;
    const whiteWidthPct = 100 / whiteCount;

    // 白鍵を生成
    const whiteIndexByMidi = new Map();
    whiteNotes.forEach((midi, idx) => {
      whiteIndexByMidi.set(midi, idx);
      const info = getNoteInfo(midi);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'piano-key white-key';
      el.dataset.midi = String(midi);
      el.style.setProperty('--note-color', info.color);
      el.style.setProperty('--note-color-light', info.colorLight);
      el.style.width = `${whiteWidthPct}%`;

      const pcOffset = midi - this.startMidi;
      const pcHint = PC_HINT_BY_OFFSET[pcOffset] || '';

      el.innerHTML = `
        <span class="key-hint-dot" aria-hidden="true">★</span>
        <span class="key-color-pill">
          <span class="key-solfege">${info.solfege}</span>
        </span>
        <span class="key-en">${info.nameEn}</span>
        ${pcHint ? `<span class="key-pc-hint">${pcHint}</span>` : ''}
      `;

      this._bindPointerEvents(el, midi);
      board.appendChild(el);
      this.keyElements.set(midi, el);
    });

    // 黒鍵を白鍵の上に絶対配置
    for (let m = this.startMidi; m <= this.endMidi; m++) {
      if (!PITCH_CLASSES[m % 12].isBlack) continue;
      const prevWhiteIdx = whiteIndexByMidi.get(m - 1);
      if (prevWhiteIdx === undefined) continue;

      const info = getNoteInfo(m);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'piano-key black-key';
      el.dataset.midi = String(m);
      el.style.setProperty('--note-color', info.color);
      el.style.setProperty('--note-color-light', info.colorLight);

      const blackWidthPct = whiteWidthPct * 0.62;
      const leftPct = (prevWhiteIdx + 1) * whiteWidthPct - blackWidthPct / 2;
      el.style.width = `${blackWidthPct}%`;
      el.style.left = `${leftPct}%`;

      const pcOffset = m - this.startMidi;
      const pcHint = PC_HINT_BY_OFFSET[pcOffset] || '';

      el.innerHTML = `
        <span class="key-hint-dot" aria-hidden="true">★</span>
        <span class="key-solfege-black">${info.solfege}</span>
        ${pcHint ? `<span class="key-pc-hint">${pcHint}</span>` : ''}
      `;

      this._bindPointerEvents(el, m);
      board.appendChild(el);
      this.keyElements.set(m, el);
    }

    this.container.appendChild(board);
    this.container.classList.toggle('hide-labels', !this.showLabels);
    this.container.classList.toggle('show-pc-hints', this.showPcHints);
  }

  _bindPointerEvents(el, midi) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (this.activePointers.has(e.pointerId)) return;
      this.activePointers.set(e.pointerId, midi);
      this.setPressed(midi, true);
      this.onNoteOn(getNoteInfo(midi, 0.85), 'touch');
    });

    const release = (e) => {
      const activeMidi = this.activePointers.get(e.pointerId);
      if (activeMidi === undefined) return;
      this.activePointers.delete(e.pointerId);
      this.setPressed(activeMidi, false);
      this.onNoteOff(getNoteInfo(activeMidi, 0), 'touch');
    };

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  }

  _handleKeyDown(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    const k = e.key.toLowerCase();
    if (!(k in PC_KEY_OFFSETS)) return;
    if (this.activePcKeys.has(k)) return;

    const midi = this.startMidi + PC_KEY_OFFSETS[k];
    if (midi > 108) return;
    this.activePcKeys.set(k, midi);
    this.setPressed(midi, true);
    this.onNoteOn(getNoteInfo(midi, 0.85), 'pc-key');
  }

  _handleKeyUp(e) {
    const k = e.key.toLowerCase();
    const midi = this.activePcKeys.get(k);
    if (midi === undefined) return;
    this.activePcKeys.delete(k);
    this.setPressed(midi, false);
    this.onNoteOff(getNoteInfo(midi, 0), 'pc-key');
  }

  _handleWindowBlur() {
    for (const [, midi] of this.activePcKeys) {
      this.setPressed(midi, false);
      this.onNoteOff(getNoteInfo(midi, 0), 'pc-key');
    }
    this.activePcKeys.clear();
  }

  /**
   * 外部入力(MIDI含む)で鍵盤を押下ハイライト
   */
  setPressed(midi, isPressed) {
    const el = this.keyElements.get(midi);
    if (el) {
      el.classList.toggle('is-pressed', isPressed);
    } else {
      // 表示範囲外のオクターブをMIDIで弾いた場合、同音名の鍵盤をうっすら反応させる
      const pc = midi % 12;
      for (const [keyMidi, keyEl] of this.keyElements.entries()) {
        if (keyMidi % 12 === pc) {
          keyEl.classList.toggle('is-pressed-ghost', isPressed);
        }
      }
    }
    if (isPressed) {
      this.pressedMidis.add(midi);
    } else {
      this.pressedMidis.delete(midi);
    }
  }

  /**
   * ゲームからのガイド発光（次に押してほしい鍵盤をキラキラ表示）
   */
  setHintKeys(notes = [], { ignoreOctave = false } = {}) {
    this.hintState = { notes: [...notes], ignoreOctave };
    this._applyHints();
  }

  _applyHints() {
    const { notes, ignoreOctave } = this.hintState;
    for (const [midi, el] of this.keyElements.entries()) {
      const matched = notes.some((target) =>
        ignoreOctave ? (midi % 12 === target % 12) : midi === target
      );
      el.classList.toggle('is-hint', matched);
    }
  }

  /**
   * 指定MIDIノートの鍵盤中心X位置（0..1 の正規化値）を返す
   * 落ちてくるノーツゲームなどでレーンを鍵盤と揃えるのに利用
   */
  getKeyNormalizedX(midi) {
    const el = this.keyElements.get(midi);
    const board = this.container.querySelector('.piano-board');
    if (el && board) {
      const boardRect = board.getBoundingClientRect();
      const keyRect = el.getBoundingClientRect();
      if (boardRect.width > 0) {
        return (keyRect.left + keyRect.width / 2 - boardRect.left) / boardRect.width;
      }
    }
    // 範囲外の場合はピッチクラスでフォールバック
    const pc = midi % 12;
    for (const [kMidi] of this.keyElements.entries()) {
      if (kMidi % 12 === pc) {
        return this.getKeyNormalizedX(kMidi);
      }
    }
    return 0.5;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
