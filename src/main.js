import { KidsAudioEngine, SOUND_PRESETS } from './core/audio.js';
import { MidiManager, isIPadOrIOS } from './core/midi.js';
import { VisualKeyboard } from './core/keyboard.js';
import { GAMES, getGameById } from './core/gameRegistry.js';

const audio = new KidsAudioEngine();
const midi = new MidiManager();

const els = {
  gameTabs: document.getElementById('game-tabs'),
  stageContainer: document.getElementById('stage-container'),
  keyboardContainer: document.getElementById('keyboard-container'),
  midiStatusBadge: document.getElementById('midi-status-badge'),
  midiDeviceSelect: document.getElementById('midi-device-select'),
  midiLastNote: document.getElementById('midi-last-note'),
  soundSelect: document.getElementById('sound-select'),
  rangeToggle: document.getElementById('range-toggle'),
  labelToggle: document.getElementById('label-toggle'),
  pcHintToggle: document.getElementById('pc-hint-toggle'),
  muteToggle: document.getElementById('mute-toggle'),
  ipadBanner: document.getElementById('ipad-banner'),
  ipadBannerClose: document.getElementById('ipad-banner-close'),
  helpOpenBtns: document.querySelectorAll('.js-open-help'),
  helpModal: document.getElementById('help-modal'),
  helpCloseBtn: document.getElementById('help-close-btn'),
};

let activeGameId = GAMES[0].id;
let activeGameInstance = null;
let isTwoOctave = false;

// 初回操作で iOS/iPadOS のオーディオを確実にアンロック
const unlockOnce = () => {
  audio.unlock();
};
window.addEventListener('pointerdown', unlockOnce, { passive: true });
window.addEventListener('keydown', unlockOnce, { passive: true });

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

// ゲーム切り替え
function mountGame(gameId) {
  const game = getGameById(gameId);
  activeGameId = game.id;

  if (activeGameInstance && typeof activeGameInstance.unmount === 'function') {
    activeGameInstance.unmount();
  }
  activeGameInstance = null;
  els.stageContainer.innerHTML = '';

  // タブのアクティブ状態更新
  els.gameTabs.querySelectorAll('.game-tab').forEach((tab) => {
    const isActive = tab.dataset.gameId === game.id;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  activeGameInstance = game.mount({
    container: els.stageContainer,
    audio,
    midi,
    keyboard,
    setHintKeys: (notes, opts) => keyboard.setHintKeys(notes, opts),
  });
}

// ゲームタブ生成
function renderGameTabs() {
  els.gameTabs.innerHTML = GAMES.map(
    (g) => `
      <button
        type="button"
        class="game-tab"
        role="tab"
        data-game-id="${g.id}"
        style="--tab-accent: ${g.accentColor}"
      >
        <span class="game-tab-icon">${g.icon}</span>
        <span class="game-tab-text">
          <span class="game-tab-title">${g.title}</span>
          <span class="game-tab-age">${g.ageLabel}</span>
        </span>
      </button>
    `
  ).join('');

  els.gameTabs.querySelectorAll('.game-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.unlock();
      mountGame(btn.dataset.gameId);
    });
  });
}

// 音色セレクタ生成
function initControls() {
  els.soundSelect.innerHTML = SOUND_PRESETS.map(
    (p) => `<option value="${p.id}">${p.label}</option>`
  ).join('');

  els.soundSelect.addEventListener('change', () => {
    audio.unlock();
    audio.setPreset(els.soundSelect.value);
    audio.playDemoNote(60, 260, 0.55);
  });

  els.rangeToggle.addEventListener('click', () => {
    isTwoOctave = !isTwoOctave;
    if (isTwoOctave) {
      keyboard.setRange(48, 72); // C3 〜 C5
      els.rangeToggle.textContent = '🎹 2オクターブ';
    } else {
      keyboard.setRange(60, 72); // C4 〜 C5
      els.rangeToggle.textContent = '🎹 1オクターブ';
    }
  });

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

  let muted = false;
  els.muteToggle.addEventListener('click', () => {
    muted = !muted;
    audio.setMuted(muted);
    els.muteToggle.textContent = muted ? '🔇 おとOFF' : '🔊 おとON';
    els.muteToggle.classList.toggle('is-muted', muted);
  });

  els.midiDeviceSelect.addEventListener('change', () => {
    midi.setSelectedInput(els.midiDeviceSelect.value);
  });

  // ヘルプモーダル
  const openHelp = () => {
    els.helpModal.classList.add('is-open');
    els.helpModal.setAttribute('aria-hidden', 'false');
  };
  const closeHelp = () => {
    els.helpModal.classList.remove('is-open');
    els.helpModal.setAttribute('aria-hidden', 'true');
  };

  els.helpOpenBtns.forEach((btn) => btn.addEventListener('click', openHelp));
  els.helpCloseBtn.addEventListener('click', closeHelp);
  els.helpModal.addEventListener('click', (e) => {
    if (e.target === els.helpModal) closeHelp();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHelp();
  });

  if (els.ipadBannerClose) {
    els.ipadBannerClose.addEventListener('click', () => {
      els.ipadBanner.classList.add('is-hidden');
    });
  }
}

// MIDI接続ステータス表示
midi.onStatusChange((state) => {
  if (!state.supported) {
    els.midiStatusBadge.className = 'midi-badge is-touch';
    els.midiStatusBadge.textContent = '📱 タッチ鍵盤モード';
    els.midiDeviceSelect.classList.add('is-hidden');
    if (isIPadOrIOS() && els.ipadBanner) {
      els.ipadBanner.classList.remove('is-hidden');
    }
    return;
  }

  if (state.connectedCount > 0) {
    els.midiStatusBadge.className = 'midi-badge is-connected';
    const first = state.inputs[0].name;
    els.midiStatusBadge.textContent = state.connectedCount === 1
      ? `🎹 MIDI接続中: ${first}`
      : `🎹 MIDI接続中 (${state.connectedCount}台)`;

    els.midiDeviceSelect.classList.remove('is-hidden');
    const options = [
      `<option value="all">すべてのMIDI (${state.connectedCount})</option>`,
      ...state.inputs.map((inp) => `<option value="${inp.id}">${inp.name}</option>`),
    ];
    els.midiDeviceSelect.innerHTML = options.join('');
    els.midiDeviceSelect.value = state.selectedInputId;
  } else if (state.status === 'error') {
    els.midiStatusBadge.className = 'midi-badge is-warn';
    els.midiStatusBadge.textContent = '⚠️ MIDI許可が必要';
    els.midiDeviceSelect.classList.add('is-hidden');
  } else {
    els.midiStatusBadge.className = 'midi-badge is-waiting';
    els.midiStatusBadge.textContent = '🔌 MIDI待機中（さすと自動接続）';
    els.midiDeviceSelect.classList.add('is-hidden');
  }
});

// 初期化
renderGameTabs();
initControls();
mountGame(activeGameId);
midi.connect();
