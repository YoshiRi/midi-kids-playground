import { ALL_12_KEYS, detectChord } from '../data/chords.js';
import { loadEarCopyState, saveEarCopyState } from '../core/storage.js';

/**
 * ミニゲーム7（大人向け）: 耳コピ・和音解析メモ
 * - いま弾いている和音をリアルタイム解析（オンコード・テンション・ディグリー・別名候補対応）
 * - 「👆 ポチポチ蓄積モード（1音ずつトグル追加）」と「🎹 同時押し解析モード」を切替可能
 * - 過去のコード進行を記録・自動保存・再生・テキストコピー・スロット保存できる
 * - UIルール準拠: 3層構造・ステージ100%全面・詳細設定は右上ポップオーバー集約
 */

export const earCopyPadGame = {
  id: 'ear-copy-pad',
  category: 'adult',
  title: '耳コピ・和音解析メモ',
  subtitle: '弾いた和音を即解析＆コード進行を記録・再生',
  ageLabel: 'オトナ学習',
  icon: '🔎',
  accentColor: '#3ec6ff',

  mount(ctx) {
    const saved = loadEarCopyState();
    let keyId = saved.keyId || 'C';
    let inputMode = saved.inputMode === 'simultaneous' ? 'simultaneous' : 'accumulate';
    let autoRecord = Boolean(saved.autoRecord);
    let history = Array.isArray(saved.history) ? [...saved.history] : [];
    let savedSlots = Array.isArray(saved.savedSlots) ? [...saved.savedSlots] : [];

    /** 現在押されているノート（同時押しモード用） */
    const livePressed = new Set();
    /** ポチポチ蓄積ノート（同じ鍵盤をもう一度押すと解除トグル） */
    const accumulatedNotes = new Set();
    /** 直近の解析結果（指を離しても表示＆記録できるように保持） */
    let lastDetected = null;

    let autoRecordTimer = null;
    let lastAutoRecordedSig = '';
    let isPlayingHistory = false;
    let playbackTimers = [];
    let activeChordCancels = [];
    let playingHistoryIdx = -1;

    const persist = () => {
      saveEarCopyState({ keyId, inputMode, autoRecord, history, savedSlots });
    };

    const stopPlayback = () => {
      isPlayingHistory = false;
      playingHistoryIdx = -1;
      playbackTimers.forEach((id) => clearTimeout(id));
      playbackTimers = [];
      activeChordCancels.forEach((fn) => fn());
      activeChordCancels = [];
      if (playHistBtn) playHistBtn.textContent = '▶ 進行を再生';
      highlightHistoryCard();
    };

    ctx.container.innerHTML = `
      <div class="game-stage-root game-earcopy">
        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip js-key-chip">Key: ${keyId}</span>
            <button type="button" class="hud-chip hud-chip-btn js-input-mode-chip" title="入力モード切替">
              ${inputMode === 'accumulate' ? '👆 ポチポチ蓄積' : '🎹 同時押し'}
            </button>
          </div>

          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ キー・保存 ▾
            </button>
            <div class="stage-popover stage-popover-wide is-hidden js-opt-popover" role="dialog" aria-label="耳コピ解析せってい">
              <div class="popover-title">入力スタイル</div>
              <div class="popover-segmented">
                <button type="button" class="seg-btn ${inputMode === 'accumulate' ? 'is-active' : ''}" data-imode="accumulate">👆 ポチポチ蓄積</button>
                <button type="button" class="seg-btn ${inputMode === 'simultaneous' ? 'is-active' : ''}" data-imode="simultaneous">🎹 同時押し</button>
              </div>
              <button type="button" class="popover-item ${autoRecord ? 'is-active' : ''} js-autorecord-toggle" style="margin-top:6px">
                <span>⏺️ 自動記録 (同時押し時): ${autoRecord ? 'ON' : 'OFF'}</span>
              </button>

              <div class="popover-divider"></div>
              <div class="popover-title">曲のキー（ディグリー計算用）</div>
              <div class="popover-grid-keys">
                ${ALL_12_KEYS.map(
                  (k) => `<button type="button" class="seg-btn ${k.id === keyId ? 'is-active' : ''}" data-ekey="${k.id}">${k.id}</button>`
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">💾 保存した進行メモ (<span class="js-slot-count">${savedSlots.length}</span>)</div>
              <div class="popover-list js-slot-list"></div>
            </div>
          </div>
        </div>

        <div class="earcopy-stage">
          <!-- 上段: リアルタイム和音解析カード -->
          <div class="earcopy-analyzer js-analyzer-card">
            <div class="earcopy-main-row">
              <div class="earcopy-symbol-col">
                <div class="earcopy-degree js-degree">鍵盤をポチポチ押してみよう</div>
                <div class="earcopy-symbol js-symbol">🎹 —</div>
                <div class="earcopy-alts js-alts"></div>
              </div>
              <div class="earcopy-quick-btns">
                <button type="button" class="action-btn js-record-btn" disabled>＋ 進行に記録</button>
                <button type="button" class="action-btn action-btn-sub js-clear-input-btn">🧹 音クリア</button>
              </div>
            </div>
            <div class="chord-tones js-tones"></div>
          </div>

          <!-- 下段: 過去の進行記録タイムライン -->
          <div class="earcopy-history-panel">
            <div class="earcopy-history-head">
              <span class="earcopy-history-title">📝 記録したコード進行 (<span class="js-hist-count">0</span>)</span>
              <div class="earcopy-history-tools">
                <button type="button" class="mini-pill-btn is-primary js-play-hist">▶ 進行を再生</button>
                <button type="button" class="mini-pill-btn js-copy-hist">📋 コピー</button>
                <button type="button" class="mini-pill-btn js-save-slot">💾 保存</button>
                <button type="button" class="mini-pill-btn js-undo-hist" title="1つ戻す">↩</button>
                <button type="button" class="mini-pill-btn js-clear-hist" title="全クリア">🗑️</button>
              </div>
            </div>
            <div class="earcopy-timeline js-timeline"></div>
            <div class="earcopy-toast js-toast" aria-live="polite"></div>
          </div>
        </div>
      </div>
    `;

    const keyChipEl = ctx.container.querySelector('.js-key-chip');
    const inputModeChip = ctx.container.querySelector('.js-input-mode-chip');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const iModeBtns = ctx.container.querySelectorAll('[data-imode]');
    const eKeyBtns = ctx.container.querySelectorAll('[data-ekey]');
    const autoRecordBtn = ctx.container.querySelector('.js-autorecord-toggle');
    const slotCountEl = ctx.container.querySelector('.js-slot-count');
    const slotListEl = ctx.container.querySelector('.js-slot-list');

    const analyzerCard = ctx.container.querySelector('.js-analyzer-card');
    const degreeEl = ctx.container.querySelector('.js-degree');
    const symbolEl = ctx.container.querySelector('.js-symbol');
    const altsEl = ctx.container.querySelector('.js-alts');
    const tonesEl = ctx.container.querySelector('.js-tones');
    const recordBtn = ctx.container.querySelector('.js-record-btn');
    const clearInputBtn = ctx.container.querySelector('.js-clear-input-btn');

    const histCountEl = ctx.container.querySelector('.js-hist-count');
    const playHistBtn = ctx.container.querySelector('.js-play-hist');
    const copyHistBtn = ctx.container.querySelector('.js-copy-hist');
    const saveSlotBtn = ctx.container.querySelector('.js-save-slot');
    const undoHistBtn = ctx.container.querySelector('.js-undo-hist');
    const clearHistBtn = ctx.container.querySelector('.js-clear-hist');
    const timelineEl = ctx.container.querySelector('.js-timeline');
    const toastEl = ctx.container.querySelector('.js-toast');

    let toastTimer = null;
    const showToast = (msg) => {
      toastEl.textContent = msg;
      toastEl.classList.add('is-visible');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
    };

    const closePopover = () => {
      optPopover.classList.add('is-hidden');
      optToggle.setAttribute('aria-expanded', 'false');
    };

    optToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = optPopover.classList.contains('is-hidden');
      optPopover.classList.toggle('is-hidden', !willOpen);
      optToggle.setAttribute('aria-expanded', String(willOpen));
    });

    const onDocClick = (e) => {
      if (!optPopover.contains(e.target) && e.target !== optToggle) {
        closePopover();
      }
    };
    document.addEventListener('click', onDocClick);

    function highlightHistoryCard() {
      timelineEl.querySelectorAll('.hist-chord-card').forEach((el, idx) => {
        el.classList.toggle('is-playing', idx === playingHistoryIdx);
      });
    }

    const renderAnalyzer = () => {
      if (!lastDetected) {
        analyzerCard.style.setProperty('--chord-color', '#3ec6ff');
        degreeEl.textContent =
          inputMode === 'accumulate'
            ? '👆 1音ずつポチポチ押して和音を組み立て（同じ鍵盤で解除）'
            : '🎹 同時押しでリアルタイム和音解析';
        symbolEl.textContent = '🎹 —';
        altsEl.textContent = '';
        tonesEl.innerHTML = '';
        recordBtn.disabled = true;
        return;
      }

      analyzerCard.style.setProperty('--chord-color', lastDetected.color);
      degreeEl.textContent = `${lastDetected.degree}  ・  ${lastDetected.hint}`;
      symbolEl.textContent = lastDetected.symbol;
      altsEl.textContent =
        lastDetected.alternatives.length > 0
          ? `別解釈: ${lastDetected.alternatives.join(' / ')}`
          : '';

      tonesEl.innerHTML = lastDetected.notes
        .map(
          (n) => `
            <span class="tone-pill is-hit" style="--tone-color:${n.color}">
              ${n.nameEn}<small>(${n.solfege}・${n.degreeLabel})</small>
            </span>
          `
        )
        .join('');

      recordBtn.disabled = false;
    };

    const recordCurrentChord = ({ silent = false } = {}) => {
      if (!lastDetected) return;
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        symbol: lastDetected.symbol,
        degree: lastDetected.degree,
        rootPc: lastDetected.rootPc,
        bassPc: lastDetected.bassPc,
        color: lastDetected.color,
        voicing: [...lastDetected.voicing],
      };
      history.push(entry);
      if (history.length > 64) history.shift();
      persist();
      renderHistory();

      // ポチポチ蓄積モード時は記録した瞬間にクリアして次のコードを探しやすくする
      if (inputMode === 'accumulate') {
        accumulatedNotes.clear();
        ctx.setHintKeys([]);
      }
      if (!silent) {
        showToast(`📝 「${entry.symbol} (${entry.degree})」を記録しました`);
      }
    };

    const playEntry = (entry, durationMs = 780) => {
      ctx.audio.unlock();
      ctx.audio.playBassNote(36 + (entry.bassPc ?? entry.rootPc), durationMs, 0.52);
      const cancel = ctx.audio.playDemoChord(entry.voicing, { durationMs, velocity: 0.52 });
      activeChordCancels.push(cancel);
      if (activeChordCancels.length > 8) activeChordCancels.shift();
    };

    const playHistorySequence = () => {
      if (history.length === 0) {
        showToast('まだコードが記録されていません');
        return;
      }
      stopPlayback();
      ctx.audio.unlock();
      isPlayingHistory = true;
      playHistBtn.textContent = '⏹ すとっぷ';

      const stepMs = 900;
      history.forEach((entry, idx) => {
        const tid = setTimeout(() => {
          if (!isPlayingHistory) return;
          playingHistoryIdx = idx;
          highlightHistoryCard();
          ctx.setHintKeys(entry.voicing, { ignoreOctave: false });
          ctx.audio.playDrum('hihat', 0.42);
          playEntry(entry, Math.round(stepMs * 0.88));
        }, idx * stepMs);
        playbackTimers.push(tid);
      });

      const endTid = setTimeout(() => {
        stopPlayback();
        ctx.setHintKeys(inputMode === 'accumulate' ? [...accumulatedNotes] : [], { ignoreOctave: false });
      }, history.length * stepMs + 150);
      playbackTimers.push(endTid);
    };

    const renderHistory = () => {
      histCountEl.textContent = String(history.length);
      if (history.length === 0) {
        timelineEl.innerHTML = `<div class="earcopy-empty">和音を弾いて「＋ 進行に記録」を押すと、ここに耳コピした進行が溜まります</div>`;
        return;
      }

      timelineEl.innerHTML = history
        .map(
          (item, idx) => `
            <div class="hist-chord-card" data-hidx="${idx}" style="--card-color:${item.color}">
              <button type="button" class="hist-del-btn" data-hdel="${idx}" aria-label="削除">×</button>
              <span class="hist-num">${idx + 1}</span>
              <span class="hist-deg">${item.degree}</span>
              <span class="hist-sym">${item.symbol}</span>
            </div>
          `
        )
        .join('');

      timelineEl.querySelectorAll('.hist-chord-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('[data-hdel]')) return;
          const idx = Number(card.dataset.hidx);
          const item = history[idx];
          if (!item) return;
          stopPlayback();
          playEntry(item, 850);
          ctx.setHintKeys(item.voicing, { ignoreOctave: false });
          showToast(`🔊 ${item.symbol} (${item.degree})`);
        });
      });

      timelineEl.querySelectorAll('[data-hdel]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = Number(btn.dataset.hdel);
          history.splice(idx, 1);
          persist();
          renderHistory();
        });
      });

      timelineEl.scrollLeft = timelineEl.scrollWidth;
    };

    const renderSavedSlots = () => {
      slotCountEl.textContent = String(savedSlots.length);
      if (savedSlots.length === 0) {
        slotListEl.innerHTML = `<div class="popover-empty">保存済みの進行はまだありません</div>`;
        return;
      }

      slotListEl.innerHTML = savedSlots
        .map(
          (slot, idx) => `
            <div class="slot-row">
              <button type="button" class="popover-item slot-load-btn" data-sload="${idx}">
                <span class="popover-item-main">${slot.name}</span>
                <span class="popover-item-sub">Key: ${slot.keyId} (${slot.items.length}コード)</span>
              </button>
              <button type="button" class="slot-del-btn" data-sdel="${idx}" aria-label="メモ削除">🗑️</button>
            </div>
          `
        )
        .join('');

      slotListEl.querySelectorAll('[data-sload]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const slot = savedSlots[Number(btn.dataset.sload)];
          if (!slot) return;
          stopPlayback();
          keyId = slot.keyId || 'C';
          history = slot.items.map((x) => ({ ...x, voicing: [...x.voicing] }));
          syncKeyUI();
          persist();
          renderHistory();
          closePopover();
          showToast(`📂 「${slot.name}」を読み込みました`);
        });
      });

      slotListEl.querySelectorAll('[data-sdel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          savedSlots.splice(Number(btn.dataset.sdel), 1);
          persist();
          renderSavedSlots();
        });
      });
    };

    const syncKeyUI = () => {
      keyChipEl.textContent = `Key: ${keyId}`;
      eKeyBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.ekey === keyId));
      // 現在の表示と履歴のディグリーも最新キーに合わせて再計算
      if (lastDetected) {
        lastDetected = detectChord(lastDetected.voicing, { keyId });
        renderAnalyzer();
      }
      history = history.map((item) => {
        const re = detectChord(item.voicing, { keyId });
        return re ? { ...item, symbol: re.symbol, degree: re.degree } : item;
      });
      renderHistory();
    };

    const syncInputModeUI = () => {
      inputModeChip.textContent = inputMode === 'accumulate' ? '👆 ポチポチ蓄積' : '🎹 同時押し';
      iModeBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.imode === inputMode));
      accumulatedNotes.clear();
      livePressed.clear();
      lastDetected = null;
      ctx.setHintKeys([]);
      renderAnalyzer();
    };

    // イベント配線
    inputModeChip.addEventListener('click', () => {
      inputMode = inputMode === 'accumulate' ? 'simultaneous' : 'accumulate';
      persist();
      syncInputModeUI();
      showToast(
        inputMode === 'accumulate'
          ? '👆 ポチポチ蓄積モード：1音ずつ押して和音を解析します'
          : '🎹 同時押しモード：押さえている和音を即解析します'
      );
    });

    iModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        inputMode = btn.dataset.imode;
        persist();
        syncInputModeUI();
      });
    });

    autoRecordBtn.addEventListener('click', () => {
      autoRecord = !autoRecord;
      autoRecordBtn.classList.toggle('is-active', autoRecord);
      autoRecordBtn.innerHTML = `<span>⏺️ 自動記録 (同時押し時): ${autoRecord ? 'ON' : 'OFF'}</span>`;
      persist();
    });

    eKeyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        keyId = btn.dataset.ekey;
        persist();
        syncKeyUI();
      });
    });

    recordBtn.addEventListener('click', () => {
      ctx.audio.unlock();
      recordCurrentChord();
    });

    clearInputBtn.addEventListener('click', () => {
      accumulatedNotes.clear();
      livePressed.clear();
      lastDetected = null;
      ctx.setHintKeys([]);
      renderAnalyzer();
    });

    playHistBtn.addEventListener('click', () => {
      if (isPlayingHistory) stopPlayback();
      else playHistorySequence();
    });

    copyHistBtn.addEventListener('click', async () => {
      if (history.length === 0) {
        showToast('コピーするコードがありません');
        return;
      }
      const symbols = history.map((h) => h.symbol).join(' - ');
      const degrees = history.map((h) => h.degree).join(' - ');
      const text = `Key: ${keyId} | ${symbols} (${degrees})`;
      try {
        await navigator.clipboard.writeText(text);
        showToast(`📋 コピーしました: ${symbols}`);
      } catch {
        showToast(text);
      }
    });

    saveSlotBtn.addEventListener('click', () => {
      if (history.length === 0) {
        showToast('保存するコードがありません');
        return;
      }
      const preview = history.slice(0, 4).map((h) => h.symbol).join('-');
      const slot = {
        id: String(Date.now()),
        name: `${preview}${history.length > 4 ? '…' : ''}`,
        keyId,
        createdAt: Date.now(),
        items: history.map((x) => ({ ...x, voicing: [...x.voicing] })),
      };
      savedSlots.unshift(slot);
      if (savedSlots.length > 12) savedSlots.pop();
      persist();
      renderSavedSlots();
      showToast(`💾 進行メモ「${slot.name}」を保存しました`);
    });

    undoHistBtn.addEventListener('click', () => {
      if (history.length === 0) return;
      history.pop();
      persist();
      renderHistory();
    });

    clearHistBtn.addEventListener('click', () => {
      stopPlayback();
      history = [];
      persist();
      renderHistory();
      showToast('🗑️ 記録をクリアしました');
    });

    renderAnalyzer();
    renderHistory();
    renderSavedSlots();

    return {
      onNoteOn(noteInfo) {
        stopPlayback();
        if (inputMode === 'accumulate') {
          if (accumulatedNotes.has(noteInfo.midi)) {
            accumulatedNotes.delete(noteInfo.midi);
          } else {
            accumulatedNotes.add(noteInfo.midi);
          }
          const notesArr = [...accumulatedNotes];
          ctx.setHintKeys(notesArr, { ignoreOctave: false });
          lastDetected = notesArr.length > 0 ? detectChord(notesArr, { keyId }) : null;
          renderAnalyzer();
          return;
        }

        // 同時押しモード
        livePressed.add(noteInfo.midi);
        const notesArr = [...livePressed];
        lastDetected = detectChord(notesArr, { keyId });
        renderAnalyzer();

        // 自動記録ONかつ3音以上の和音が450ms安定したときに自動追加
        if (autoRecord && lastDetected && lastDetected.kind === 'chord') {
          const sig = `${lastDetected.symbol}:${lastDetected.degree}`;
          if (autoRecordTimer) clearTimeout(autoRecordTimer);
          autoRecordTimer = setTimeout(() => {
            if (sig !== lastAutoRecordedSig) {
              lastAutoRecordedSig = sig;
              recordCurrentChord({ silent: false });
            }
          }, 450);
        }
      },

      onNoteOff(noteInfo) {
        livePressed.delete(noteInfo.midi);
        if (livePressed.size === 0) {
          lastAutoRecordedSig = '';
          if (autoRecordTimer) {
            clearTimeout(autoRecordTimer);
            autoRecordTimer = null;
          }
        }
      },

      unmount() {
        stopPlayback();
        if (autoRecordTimer) clearTimeout(autoRecordTimer);
        if (toastTimer) clearTimeout(toastTimer);
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
