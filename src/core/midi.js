import { getNoteInfo } from './notes.js';

/**
 * Web MIDI API マネージャ
 * - PC Chrome / Edge / Firefox および iPad Web MIDI Browser 等に対応
 * - ホットプラグ自動検出、全入力同時待ち受け
 */
export class MidiManager {
  constructor() {
    this.access = null;
    this.supported = typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
    this.status = this.supported ? 'idle' : 'unsupported';
    this.errorMessage = '';
    /** @type {Array<{id: string, name: string, manufacturer: string, state: string}>} */
    this.inputs = [];
    this.selectedInputId = 'all';

    /** @type {Set<(info: ReturnType<typeof getNoteInfo>, source: string) => void>} */
    this._noteOnListeners = new Set();
    /** @type {Set<(info: ReturnType<typeof getNoteInfo>, source: string) => void>} */
    this._noteOffListeners = new Set();
    /** @type {Set<(state: object) => void>} */
    this._statusListeners = new Set();
  }

  onNoteOn(fn) {
    this._noteOnListeners.add(fn);
    return () => this._noteOnListeners.delete(fn);
  }

  onNoteOff(fn) {
    this._noteOffListeners.add(fn);
    return () => this._noteOffListeners.delete(fn);
  }

  onStatusChange(fn) {
    this._statusListeners.add(fn);
    fn(this.getState());
    return () => this._statusListeners.delete(fn);
  }

  getState() {
    return {
      supported: this.supported,
      status: this.status,
      errorMessage: this.errorMessage,
      inputs: this.inputs,
      selectedInputId: this.selectedInputId,
      connectedCount: this.inputs.length,
    };
  }

  _emitStatus() {
    const state = this.getState();
    for (const fn of this._statusListeners) {
      fn(state);
    }
  }

  setSelectedInput(inputId) {
    this.selectedInputId = inputId || 'all';
    this._emitStatus();
  }

  async connect() {
    if (!this.supported) {
      this.status = 'unsupported';
      this._emitStatus();
      return false;
    }

    try {
      this.status = 'connecting';
      this._emitStatus();

      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => {
        this._refreshInputs();
      };
      this._refreshInputs();
      this.status = 'ready';
      this._emitStatus();
      return true;
    } catch (err) {
      this.status = 'error';
      this.errorMessage = err?.message || 'MIDIへのアクセスが許可されませんでした';
      this._emitStatus();
      return false;
    }
  }

  _refreshInputs() {
    if (!this.access) return;
    const list = [];
    for (const input of this.access.inputs.values()) {
      if (input.state === 'connected') {
        list.push({
          id: input.id,
          name: input.name || 'MIDIキーボード',
          manufacturer: input.manufacturer || '',
          state: input.state,
        });
        input.onmidimessage = (event) => this._handleMessage(input.id, event);
      } else {
        input.onmidimessage = null;
      }
    }
    this.inputs = list;
    if (this.selectedInputId !== 'all' && !list.some((i) => i.id === this.selectedInputId)) {
      this.selectedInputId = 'all';
    }
    this._emitStatus();
  }

  _handleMessage(inputId, event) {
    if (this.selectedInputId !== 'all' && this.selectedInputId !== inputId) {
      return;
    }
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const note = data[1];
    const rawVel = data.length > 2 ? data[2] : 0;

    if (status === 0x90 && rawVel > 0) {
      const velocity = rawVel / 127;
      const info = getNoteInfo(note, velocity);
      for (const fn of this._noteOnListeners) {
        fn(info, 'midi');
      }
    } else if (status === 0x80 || (status === 0x90 && rawVel === 0)) {
      const info = getNoteInfo(note, 0);
      for (const fn of this._noteOffListeners) {
        fn(info, 'midi');
      }
    }
  }
}

export function isIPadOrIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOSUA = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUA || isIPadOS;
}
