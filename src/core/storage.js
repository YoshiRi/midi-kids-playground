/**
 * 設定の永続化ユーティリティ（localStorage キーはすべて `mkp:` プレフィックス）
 * プライベートブラウズや非ブラウザ環境でも安全にフォールバックする
 */

const SETTINGS_KEY = 'mkp:settings';
const EARCOPY_KEY = 'mkp:earcopy';

export const DEFAULT_SETTINGS = {
  lastGameId: 'fireworks-party',
  soundPreset: 'piano',
  keyboardRange: '1oct', // '1oct' | '2oct'
  keyboardSize: 'normal', // 'slim' | 'normal' | 'large'
  showLabels: true,
  showPcHints: false,
};

export function loadSettings(storage = getSafeStorage()) {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(partial, storage = getSafeStorage()) {
  const next = {
    ...loadSettings(storage),
    ...partial,
  };
  if (storage) {
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // quota exceeded or disabled storage
    }
  }
  return next;
}

function getSafeStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export const DEFAULT_EARCOPY_STATE = {
  keyId: 'C',
  inputMode: 'accumulate', // 'simultaneous' | 'accumulate'
  autoRecord: false,
  history: [], // Array<{ id, symbol, degree, rootPc, bassPc, color, voicing }>
  savedSlots: [], // Array<{ id, name, keyId, createdAt, items }>
};

export function loadEarCopyState(storage = getSafeStorage()) {
  if (!storage) return structuredCloneSafe(DEFAULT_EARCOPY_STATE);
  try {
    const raw = storage.getItem(EARCOPY_KEY);
    if (!raw) return structuredCloneSafe(DEFAULT_EARCOPY_STATE);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return structuredCloneSafe(DEFAULT_EARCOPY_STATE);
    return {
      ...DEFAULT_EARCOPY_STATE,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 64) : [],
      savedSlots: Array.isArray(parsed.savedSlots) ? parsed.savedSlots.slice(0, 12) : [],
    };
  } catch {
    return structuredCloneSafe(DEFAULT_EARCOPY_STATE);
  }
}

export function saveEarCopyState(partial, storage = getSafeStorage()) {
  const next = {
    ...loadEarCopyState(storage),
    ...partial,
  };
  if (storage) {
    try {
      storage.setItem(EARCOPY_KEY, JSON.stringify(next));
    } catch {
      // ignore quota error
    }
  }
  return next;
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}
