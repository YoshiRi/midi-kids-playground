/**
 * 設定の永続化ユーティリティ（localStorage キーはすべて `mkp:` プレフィックス）
 * プライベートブラウズや非ブラウザ環境でも安全にフォールバックする
 */

const SETTINGS_KEY = 'mkp:settings';

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
