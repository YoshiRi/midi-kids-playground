import { KidsAudioEngine, SOUND_PRESETS } from './core/audio.js';
import { MidiManager, isIPadOrIOS } from './core/midi.js';
import { VisualKeyboard } from './core/keyboard.js';
import { GAMES, getGameById } from './core/gameRegistry.js';

const audio = new KidsAudioEngine();
const midi = new MidiManager();

const els = {
  // Topbar
  gameSwitcherBtn: document.getElementById('game-switcher-btn'),
  currentGameIcon: document.getElementById('current-game-icon'),
  currentGameTitle: document.getElementById('current-game-title'),
  midiStatusBtn: document.getElementById('midi-status-btn'),
  midiStatusText: document.getElementById('midi-status-text'),
  quickMuteBtn: document.getElementById('quick-mute-btn'),
  settingsOpenBtn: document.getElementById('settings-open-btn'),

  // Stage & Keyboard
  stageContainer: document.getElementById('stage-container'),
  keyboardContainer: document.getElementById('keyboard-container'),
  audioUnlockBanner: document.getElementById('audio-unlock-banner'),
  audioUnlockBtn: document.getElementById('audio-unlock-btn'),

  // Game Sheet
  gameSheet: document.getElementById('game-sheet'),
  gameSheetClose: document.getElementById('game-sheet-close'),
  gameSheetGrid: document.getElementById('game-sheet-grid'),

  // Settings Drawer
  settingsDrawer: document.getElementById('settings-drawer'),
  settingsCloseBtn: document.getElementById('settings-close-btn'),
  soundSelect: document.getElementById('sound-select'),
  muteToggle: document.getElementById('mute-toggle'),
  soundTestBtn: document.getElementById('sound-test-btn'),
  rangeBtns: document.querySelectorAll('[data-range]'),
  kbSizeBtns: document.querySelectorAll('[data-kbsize]'),
  labelToggle: document.getElementById('label-toggle'),
  pcHintToggle: document.getElementById('pc-hint-toggle'),
  drawerMidiStatus: document.getElementById('drawer-midi-status'),
  midiDeviceRow: document.getElementById('midi-device-row'),
  midiDeviceSelect: document.getElementById('midi-device-select'),
  midiLastNote: document.getElementById('midi-last-note'),

  // Help Modal
  helpOpenBtns: document.querySelectorAll('.js-open-help'),
  helpModal: document.getElementById('help-modal'),
  helpCloseBtn: document.getElementById('help-close-btn'),
};

let activeGameId = GAMES[0].id;
let activeGameInstance = null;

// iOS/iPadOS Safari は touchstart / touchend / click の同期ハンドラ内でないと
// Web Audio API とメディアオーディオセッションのロックが解除されないため全イベントで捕捉する
const unlockAudio = () => {
  audio.unlock();
};
window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
window.addEventListener('touchend', unlockAudio, { capture: true, passive: true });
window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
window.addEventListener('click', unlockAudio, { capture: true, passive: true });
window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    audio.ensureContext();
  }
});

// 統一ノートハンドラ（MIDI / 画面タッチ / PCキーボード 共通）
function handleNoteOn(noteInfo, source) {
  audio.unlock();
  audio.noteOn(noteInfo.midi, noteInfo.velocity);

  if (source === 'midi') {
    keyboard.setPressed(noteInfo.midi, true);
  }

  if (els.midiLastNote) {
    const srcIcon = source === 'midi' ? '🎹' : source === 'pc-key' ? '⌨️' : '👆';
    els.midiLastNote.textContent = `${srcIcon} ${noteInfo.solfege} (${noteInfo.nameEn})`;
    els.midiLastNote.style.setProperty('--chip-color', noteInfo.color);
  }

  if (activeGameInstance && typeof activeGameInstance.onNoteOn === 'function') {
    activeGameInstance.onNoteOn(noteInfo, source);
  }
}

function handleNoteOff(noteInfo, source) {
  audio.noteOff(noteInfo.midi);

  if (source === 'midi') {
    keyboard.setPressed(noteInfo.midi, false);
  }

  if (activeGameInstance && typeof activeGameInstance.onNoteOff === 'function') {
    activeGameInstance.onNoteOff(noteInfo, source);
  }
}

const keyboard = new VisualKeyboard(els.keyboardContainer, {
  onNoteOn: handleNoteOn,
  onNoteOff: handleNoteOff,
});

midi.onNoteOn(handleNoteOn);
midi.onNoteOff(handleNoteOff);

// オーバーレイ開閉ユーティリティ
function setOverlayOpen(backdropEl, isOpen, triggerBtn) {
  backdropEl.classList.toggle('is-open', isOpen);
  backdropEl.setAttribute('aria-hidden', String(!isOpen));
  if (triggerBtn) {
    triggerBtn.setAttribute('aria-expanded', String(isOpen));
  }
}

function closeAllOverlays() {
  setOverlayOpen(els.gameSheet, false, els.gameSwitcherBtn);
  setOverlayOpen(els.settingsDrawer, false, els.settingsOpenBtn);
  setOverlayOpen(els.helpModal, false);
}

// ゲーム切り替え
function mountGame(gameId) {
  const game = getGameById(gameId);
  activeGameId = game.id;

  if (activeGameInstance && typeof activeGameInstance.unmount === 'function') {
    activeGameInstance.unmount();
  }
  activeGameInstance = null;
  els.stageContainer.innerHTML = '';

  // トップバーの現在ゲーム表示を更新
  els.currentGameIcon.textContent = game.icon;
  els.currentGameTitle.textContent = game.title;
  els.gameSwitcherBtn.style.setProperty('--switcher-accent', game.accentColor);

  // ゲーム選択シートの選択状態更新
  els.gameSheetGrid.querySelectorAll('.game-card').forEach((card) => {
    card.classList.toggle('is-active', card.dataset.gameId === game.id);
  });

  activeGameInstance = game.mount({
    container: els.stageContainer,
    audio,
    midi,
    keyboard,
    setHintKeys: (notes, opts) => keyboard.setHintKeys(notes, opts),
  });
}

function renderGameSheet() {
  els.gameSheetGrid.innerHTML = GAMES.map(
    (g) => `
      <button
        type="button"
        class="game-card"
        data-game-id="${g.id}"
        style="--card-accent: ${g.accentColor}"
      >
        <span class="game-card-icon">${g.icon}</span>
        <span class="game-card-body">
          <span class="game-card-top">
            <span class="game-card-title">${g.title}</span>
            <span class="game-card-age">${g.ageLabel}</span>
          </span>
          <span class="game-card-sub">${g.subtitle}</span>
        </span>
      </button>
    `
  ).join('');

  els.gameSheetGrid.querySelectorAll('.game-card').forEach((card) => {
    card.addEventListener('click', () => {
      audio.unlock();
      mountGame(card.dataset.gameId);
      setOverlayOpen(els.gameSheet, false, els.gameSwitcherBtn);
    });
  });
}

function syncMuteUI(muted) {
  els.quickMuteBtn.textContent = muted ? '🔇' : '🔊';
  els.quickMuteBtn.classList.toggle('is-muted', muted);
  els.muteToggle.textContent = muted ? '🔇 おと OFF' : '🔊 おと ON';
  els.muteToggle.classList.toggle('is-active', !muted);
  els.muteToggle.classList.toggle('is-muted', muted);
}

function initControls() {
  // ゲーム切替シート
  els.gameSwitcherBtn.addEventListener('click', () => {
    const willOpen = !els.gameSheet.classList.contains('is-open');
    closeAllOverlays();
    setOverlayOpen(els.gameSheet, willOpen, els.gameSwitcherBtn);
  });
  els.gameSheetClose.addEventListener('click', () => setOverlayOpen(els.gameSheet, false, els.gameSwitcherBtn));
  els.gameSheet.addEventListener('click', (e) => {
    if (e.target === els.gameSheet) setOverlayOpen(els.gameSheet, false, els.gameSwitcherBtn);
  });

  // 設定ドロワー
  els.settingsOpenBtn.addEventListener('click', () => {
    const willOpen = !els.settingsDrawer.classList.contains('is-open');
    closeAllOverlays();
    setOverlayOpen(els.settingsDrawer, willOpen, els.settingsOpenBtn);
  });
  els.settingsCloseBtn.addEventListener('click', () => setOverlayOpen(els.settingsDrawer, false, els.settingsOpenBtn));
  els.settingsDrawer.addEventListener('click', (e) => {
    if (e.target === els.settingsDrawer) setOverlayOpen(els.settingsDrawer, false, els.settingsOpenBtn);
  });

  // 接続ガイドモーダル
  els.helpOpenBtns.forEach((btn) =>
    btn.addEventListener('click', () => {
      closeAllOverlays();
      setOverlayOpen(els.helpModal, true);
    })
  );
  els.helpCloseBtn.addEventListener('click', () => setOverlayOpen(els.helpModal, false));
  els.helpModal.addEventListener('click', (e) => {
    if (e.target === els.helpModal) setOverlayOpen(els.helpModal, false);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllOverlays();
  });

  // 音色
  els.soundSelect.innerHTML = SOUND_PRESETS.map(
    (p) => `<option value="${p.id}">${p.label}</option>`
  ).join('');
  els.soundSelect.addEventListener('change', () => {
    audio.unlock();
    audio.setPreset(els.soundSelect.value);
    audio.playDemoNote(60, 260, 0.55);
  });

  // ミュート（トップバー＆ドロワー同期）
  let muted = false;
  const toggleMute = () => {
    muted = !muted;
    audio.setMuted(muted);
    syncMuteUI(muted);
  };
  els.quickMuteBtn.addEventListener('click', toggleMute);
  els.muteToggle.addEventListener('click', toggleMute);

  // テスト音
  els.soundTestBtn.addEventListener('click', () => {
    audio.unlock();
    if (muted) {
      muted = false;
      audio.setMuted(false);
      syncMuteUI(false);
    }
    audio.playSfx('combo');
  });

  // オクターブ範囲
  els.rangeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      els.rangeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      if (range === '2oct') {
        keyboard.setRange(48, 72);
      } else {
        keyboard.setRange(60, 72);
      }
    });
  });

  // 鍵盤の高さ（スリム / ふつう / おおきめ）
  els.kbSizeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.kbsize;
      els.kbSizeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      els.keyboardContainer.classList.remove('is-size-slim', 'is-size-normal', 'is-size-large');
      els.keyboardContainer.classList.add(`is-size-${size}`);
    });
  });

  // ドレミ表示 / PCキー表示
  let showLabels = true;
  els.labelToggle.addEventListener('click', () => {
    showLabels = !showLabels;
    keyboard.setShowLabels(showLabels);
    els.labelToggle.classList.toggle('is-active', showLabels);
  });

  let showPcHints = false;
  els.pcHintToggle.addEventListener('click', () => {
    showPcHints = !showPcHints;
    keyboard.setShowPcHints(showPcHints);
    els.pcHintToggle.classList.toggle('is-active', showPcHints);
  });

  // MIDIデバイス選択
  els.midiDeviceSelect.addEventListener('change', () => {
    midi.setSelectedInput(els.midiDeviceSelect.value);
  });

  // 音声アンロックフローティングボタン
  if (els.audioUnlockBtn) {
    els.audioUnlockBtn.addEventListener('click', () => {
      audio.unlock();
      audio.playSfx('combo');
    });
  }

  audio.onStateChange((state) => {
    if (!els.audioUnlockBanner) return;
    els.audioUnlockBanner.classList.toggle('is-hidden', state.ready);
  });
}

// MIDI接続ステータス表示（トップバーは最小表示、詳細はドロワー内）
midi.onStatusChange((state) => {
  if (!state.supported) {
    els.midiStatusBtn.className = 'midi-pill is-touch js-open-help';
    els.midiStatusText.textContent = isIPadOrIOS() ? 'タッチ鍵盤' : 'タッチ鍵盤';
    els.drawerMidiStatus.textContent = isIPadOrIOS()
      ? '📱 タッチ鍵盤モード（iPadでMIDIキーボードを使うには「Web MIDI Browser」で開いてください）'
      : '📱 このブラウザは Web MIDI 未対応のためタッチ鍵盤モードです。';
    els.midiDeviceRow.classList.add('is-hidden');
    return;
  }

  if (state.connectedCount > 0) {
    els.midiStatusBtn.className = 'midi-pill is-connected js-open-help';
    els.midiStatusText.textContent = state.connectedCount === 1
      ? 'MIDI接続中'
      : `MIDI (${state.connectedCount})`;
    const names = state.inputs.map((i) => i.name).join(' / ');
    els.drawerMidiStatus.textContent = `🎹 接続中: ${names}`;
    els.midiDeviceRow.classList.remove('is-hidden');
    const options = [
      `<option value="all">すべてのMIDI (${state.connectedCount})</option>`,
      ...state.inputs.map((inp) => `<option value="${inp.id}">${inp.name}</option>`),
    ];
    els.midiDeviceSelect.innerHTML = options.join('');
    els.midiDeviceSelect.value = state.selectedInputId;
  } else if (state.status === 'error') {
    els.midiStatusBtn.className = 'midi-pill is-warn js-open-help';
    els.midiStatusText.textContent = 'MIDI未許可';
    els.drawerMidiStatus.textContent = `⚠️ ${state.errorMessage || 'MIDIへのアクセスが許可されませんでした'}`;
    els.midiDeviceRow.classList.add('is-hidden');
  } else {
    els.midiStatusBtn.className = 'midi-pill is-waiting js-open-help';
    els.midiStatusText.textContent = 'MIDI待機';
    els.drawerMidiStatus.textContent = '🔌 MIDIキーボードを接続すると自動で認識します。';
    els.midiDeviceRow.classList.add('is-hidden');
  }
});

// 初期化
renderGameSheet();
initControls();
mountGame(activeGameId);
midi.connect();
