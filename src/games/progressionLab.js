import {
  ChordInputCollector,
  HARMONIC_FUNCTIONS,
  KEYS,
  PROGRESSIONS,
  getProgressionById,
  resolveProgression,
} from '../data/chords.js';

/**
 * ミニゲーム6（大人向け）: コード進行パターン学習（図鑑＆聴き当てクイズ）
 * - 📖 パターン図鑑: 8種の定番コード進行を「和声機能(T/SD/D)＋解説＋ベース付き自動試聴＋同時押し/階段試奏」で学ぶ
 * - 👂 進行聴き当てクイズ: ランダム再生される進行を聴いて、どのパターン（王道/小室/丸サ/2-5-1等）か当てる
 * - UIルール準拠: 3層構造・ステージ100%全面・設定は右上ポップオーバー集約
 */

const LAB_MODES = [
  { id: 'learn', icon: '📖', label: 'パターン図鑑（学ぶ）', desc: '解説・機能(T/SD/D)・自動試聴＆試奏' },
  { id: 'quiz',  icon: '👂', label: '進行パターン聴き当て', desc: '耳で聴いて定番進行を当てる' },
];

export const progressionLabGame = {
  id: 'progression-lab',
  category: 'adult',
  title: 'コード進行パターン学習',
  subtitle: '定番8進行の響き・機能(T/SD/D)を学び聴き当てる',
  ageLabel: 'オトナ学習',
  icon: '🎼',
  accentColor: '#ff924c',

  mount(ctx) {
    let mode = 'learn'; // 'learn' | 'quiz'
    let keyId = 'C';
    let progId = PROGRESSIONS[0].id;
    let selectedStepIdx = 0;

    let isPlayingLoop = false;
    let playbackTimers = [];
    let activeChordCancels = [];
    let playingStepIdx = -1;

    // クイズ状態
    let quizTargetProg = PROGRESSIONS[0];
    let quizOptions = [];
    let quizRevealed = false;
    let quizScore = 0;
    let quizCombo = 0;
    let nextTimer = null;

    // 同時押し＆階段（アルペジオ）試奏マッチャー
    const collector = new ChordInputCollector({ windowMs: 3000, resetOnWrong: false });

    const stopPlayback = () => {
      isPlayingLoop = false;
      playingStepIdx = -1;
      playbackTimers.forEach((id) => clearTimeout(id));
      playbackTimers = [];
      activeChordCancels.forEach((fn) => fn());
      activeChordCancels = [];
      if (playBtn) playBtn.textContent = mode === 'learn' ? '▶ 進行を聴く' : '🔊 もういちど聴く';
      highlightPlayingBlock();
    };

    ctx.container.innerHTML = `
      <div class="game-stage-root game-proglab">
        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip js-hud-primary">📖 1 / ${PROGRESSIONS.length}</span>
            <span class="hud-chip hud-chip-combo js-hud-combo is-hidden">🔥 <span class="js-combo">0</span></span>
            <span class="hud-chip js-key-badge">Key: C</span>
          </div>

          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ <span class="js-opt-summary">📖 パターン図鑑</span> ▾
            </button>
            <div class="stage-popover stage-popover-wide is-hidden js-opt-popover" role="dialog" aria-label="進行学習せってい">
              <div class="popover-title">学習モード</div>
              <div class="popover-list">
                ${LAB_MODES.map(
                  (m) => `
                    <button type="button" class="popover-item ${m.id === mode ? 'is-active' : ''}" data-lmode="${m.id}">
                      <span class="popover-item-main">${m.icon} ${m.label}</span>
                      <span class="popover-item-sub">${m.desc}</span>
                    </button>
                  `
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">キー（移調）</div>
              <div class="popover-grid-keys">
                ${KEYS.map(
                  (k) => `<button type="button" class="seg-btn ${k.id === keyId ? 'is-active' : ''}" data-lkey="${k.id}">${k.id}</button>`
                ).join('')}
              </div>

              <div class="js-learn-prog-list">
                <div class="popover-divider"></div>
                <div class="popover-title">進行パターンを選ぶ</div>
                <div class="popover-list">
                  ${PROGRESSIONS.map(
                    (p) => `
                      <button type="button" class="popover-item ${p.id === progId ? 'is-active' : ''}" data-lprog="${p.id}">
                        <span class="popover-item-main">${p.title}</span>
                        <span class="popover-item-sub">${p.mood}</span>
                      </button>
                    `
                  ).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="proglab-stage">
          <div class="proglab-header-card js-header-card">
            <div class="proglab-title-row">
              <span class="proglab-title js-prog-title"></span>
              <span class="proglab-mood js-prog-mood"></span>
            </div>
            <p class="proglab-theory js-prog-theory"></p>
          </div>

          <div class="proglab-blocks js-blocks"></div>

          <div class="chord-tones js-tones"></div>

          <div class="proglab-quiz-choices js-quiz-choices is-hidden"></div>

          <div class="quest-feedback js-feedback" aria-live="polite"></div>

          <div class="quest-actions">
            <button type="button" class="action-btn js-play-btn">▶ 進行を聴く</button>
            <button type="button" class="action-btn action-btn-sub js-prev-prog">◀ まえの進行</button>
            <button type="button" class="action-btn action-btn-sub js-next-prog">つぎの進行 ▶</button>
          </div>
        </div>
      </div>
    `;

    const hudPrimary = ctx.container.querySelector('.js-hud-primary');
    const hudCombo = ctx.container.querySelector('.js-hud-combo');
    const comboEl = ctx.container.querySelector('.js-combo');
    const keyBadgeEl = ctx.container.querySelector('.js-key-badge');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optSummary = ctx.container.querySelector('.js-opt-summary');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const learnProgList = ctx.container.querySelector('.js-learn-prog-list');
    const modeBtns = ctx.container.querySelectorAll('[data-lmode]');
    const keyBtns = ctx.container.querySelectorAll('[data-lkey]');
    const progBtns = ctx.container.querySelectorAll('[data-lprog]');

    const progTitleEl = ctx.container.querySelector('.js-prog-title');
    const progMoodEl = ctx.container.querySelector('.js-prog-mood');
    const progTheoryEl = ctx.container.querySelector('.js-prog-theory');
    const blocksEl = ctx.container.querySelector('.js-blocks');
    const tonesEl = ctx.container.querySelector('.js-tones');
    const quizChoicesEl = ctx.container.querySelector('.js-quiz-choices');
    const feedbackEl = ctx.container.querySelector('.js-feedback');
    const playBtn = ctx.container.querySelector('.js-play-btn');
    const prevProgBtn = ctx.container.querySelector('.js-prev-prog');
    const nextProgBtn = ctx.container.querySelector('.js-next-prog');

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

    const showFeedback = (text, kind = 'good') => {
      feedbackEl.textContent = text;
      feedbackEl.className = `quest-feedback is-visible is-${kind}`;
    };

    const getCurrentChords = () => resolveProgression(mode === 'learn' ? progId : quizTargetProg.id, keyId);

    function highlightPlayingBlock() {
      blocksEl.querySelectorAll('.proglab-block').forEach((el, idx) => {
        el.classList.toggle('is-playing', idx === playingStepIdx);
        if (mode === 'learn') {
          el.classList.toggle('is-selected', idx === selectedStepIdx);
        }
      });
    }

    const renderSelectedTones = () => {
      if (mode !== 'learn') {
        tonesEl.innerHTML = '';
        return;
      }
      const chords = getCurrentChords();
      const ch = chords[selectedStepIdx % chords.length];
      const evalRes = collector.evaluate(ch.pitchClasses);
      const hitSet = new Set(evalRes.matched);

      tonesEl.innerHTML = `
        <span class="tone-prefix">試奏 ${ch.symbol} (同時/階段OK):</span>
        ${ch.noteLabels
          .map((n) => {
            const hit = hitSet.has(n.pc);
            return `<span class="tone-pill ${hit ? 'is-hit' : ''}" style="--tone-color:${n.color}">${hit ? '✓ ' : ''}${n.nameEn}<small>(${n.solfege})</small></span>`;
          })
          .join('')}
      `;
    };

    const playSingleChord = (chord) => {
      ctx.audio.unlock();
      ctx.audio.playBassNote(36 + chord.rootPc, 650, 0.52);
      const cancel = ctx.audio.playDemoChord(chord.voicing, { durationMs: 780, velocity: 0.52 });
      activeChordCancels.push(cancel);
      if (activeChordCancels.length > 6) activeChordCancels.shift();
    };

    const playFullProgression = () => {
      stopPlayback();
      ctx.audio.unlock();
      const chords = getCurrentChords();
      isPlayingLoop = true;
      playBtn.textContent = '⏹ すとっぷ';

      const stepMs = chords.length > 4 ? 720 : 900;

      chords.forEach((ch, idx) => {
        const tid = setTimeout(() => {
          if (!isPlayingLoop) return;
          playingStepIdx = idx;
          if (mode === 'learn') {
            selectedStepIdx = idx;
            collector.reset();
            ctx.setHintKeys(ch.voicing, { ignoreOctave: true });
            renderSelectedTones();
          }
          highlightPlayingBlock();

          ctx.audio.playBassNote(36 + ch.rootPc, stepMs * 0.88, 0.55);
          ctx.audio.playDrum('hihat', 0.45);
          const cancel = ctx.audio.playDemoChord(ch.voicing, {
            durationMs: Math.round(stepMs * 0.88),
            velocity: 0.48,
          });
          activeChordCancels.push(cancel);
        }, idx * stepMs);
        playbackTimers.push(tid);
      });

      const endTid = setTimeout(() => {
        stopPlayback();
      }, chords.length * stepMs + 150);
      playbackTimers.push(endTid);
    };

    const renderLearnView = () => {
      const prog = getProgressionById(progId);
      const progIndex = PROGRESSIONS.findIndex((p) => p.id === prog.id);
      const chords = resolveProgression(prog.id, keyId);
      selectedStepIdx = Math.min(selectedStepIdx, chords.length - 1);
      collector.reset();

      hudPrimary.textContent = `📖 ${progIndex + 1} / ${PROGRESSIONS.length}`;
      hudCombo.classList.add('is-hidden');
      keyBadgeEl.textContent = `Key: ${keyId}`;

      progTitleEl.textContent = prog.title;
      progMoodEl.textContent = prog.mood;
      progMoodEl.classList.remove('is-hidden');
      progTheoryEl.textContent = prog.theory;

      blocksEl.innerHTML = chords
        .map((ch, idx) => {
          const fnMeta = HARMONIC_FUNCTIONS[ch.fn] || { label: '', color: ch.color };
          return `
            <button
              type="button"
              class="proglab-block ${idx === selectedStepIdx ? 'is-selected' : ''}"
              data-step="${idx}"
              style="--block-color: ${ch.color}; --fn-color: ${fnMeta.color}"
            >
              <span class="pb-fn">${ch.fn || ''}</span>
              <span class="pb-deg">${ch.degree}</span>
              <span class="pb-sym">${ch.symbol}</span>
            </button>
          `;
        })
        .join('');

      blocksEl.querySelectorAll('[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          stopPlayback();
          selectedStepIdx = Number(btn.dataset.step) || 0;
          collector.reset();
          const ch = chords[selectedStepIdx];
          ctx.setHintKeys(ch.voicing, { ignoreOctave: true });
          highlightPlayingBlock();
          renderSelectedTones();
          playSingleChord(ch);
        });
      });

      quizChoicesEl.classList.add('is-hidden');
      quizChoicesEl.innerHTML = '';
      prevProgBtn.classList.remove('is-hidden');
      nextProgBtn.textContent = 'つぎの進行 ▶';
      playBtn.textContent = '▶ 進行を聴く';

      ctx.setHintKeys(chords[selectedStepIdx].voicing, { ignoreOctave: true });
      renderSelectedTones();
    };

    const startQuizRound = ({ autoPlay = true } = {}) => {
      stopPlayback();
      if (nextTimer) clearTimeout(nextTimer);
      quizRevealed = false;
      feedbackEl.className = 'quest-feedback';

      const pool = PROGRESSIONS;
      let chosen = pool[Math.floor(Math.random() * pool.length)];
      if (quizTargetProg && chosen.id === quizTargetProg.id && pool.length > 1) {
        chosen = pool[(pool.indexOf(chosen) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length];
      }
      quizTargetProg = chosen;

      const others = pool.filter((p) => p.id !== chosen.id).sort(() => Math.random() - 0.5).slice(0, 3);
      quizOptions = [chosen, ...others].sort(() => Math.random() - 0.5);

      renderQuizView();
      if (autoPlay) {
        playFullProgression();
      }
    };

    const renderQuizView = () => {
      const chords = resolveProgression(quizTargetProg.id, keyId);
      hudPrimary.textContent = `🎯 ${quizScore}`;
      hudCombo.classList.remove('is-hidden');
      comboEl.textContent = String(quizCombo);
      keyBadgeEl.textContent = `Key: ${keyId}`;

      if (quizRevealed) {
        progTitleEl.textContent = `正解: ${quizTargetProg.title}`;
        progMoodEl.textContent = quizTargetProg.mood;
        progMoodEl.classList.remove('is-hidden');
        progTheoryEl.textContent = quizTargetProg.theory;
      } else {
        progTitleEl.textContent = '🎧 いま流れた進行パターンはどれ？';
        progMoodEl.classList.add('is-hidden');
        progTheoryEl.textContent = 'コードの流れ・ベースの動き・切なさや明るさに注目して4択から選ぼう！';
      }

      blocksEl.innerHTML = chords
        .map((ch, idx) => {
          const fnMeta = HARMONIC_FUNCTIONS[ch.fn] || { color: ch.color };
          if (!quizRevealed) {
            return `
              <div class="proglab-block is-masked" style="--block-color: #7c6ff6; --fn-color: #7c6ff6">
                <span class="pb-deg">BAR ${idx + 1}</span>
                <span class="pb-sym">？</span>
              </div>
            `;
          }
          return `
            <div class="proglab-block" style="--block-color: ${ch.color}; --fn-color: ${fnMeta.color}">
              <span class="pb-fn">${ch.fn || ''}</span>
              <span class="pb-deg">${ch.degree}</span>
              <span class="pb-sym">${ch.symbol}</span>
            </div>
          `;
        })
        .join('');

      tonesEl.innerHTML = '';
      quizChoicesEl.classList.remove('is-hidden');
      quizChoicesEl.innerHTML = quizOptions
        .map(
          (p) => `
            <button type="button" class="quiz-prog-btn" data-qans="${p.id}">
              <strong>${p.shortTitle}</strong>
              <small>${p.mood}</small>
            </button>
          `
        )
        .join('');

      quizChoicesEl.querySelectorAll('[data-qans]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (quizRevealed) return;
          ctx.audio.unlock();
          const ok = btn.dataset.qans === quizTargetProg.id;
          if (ok) {
            quizRevealed = true;
            quizScore++;
            quizCombo++;
            btn.classList.add('is-correct');
            ctx.audio.playSfx(quizCombo >= 3 && quizCombo % 3 === 0 ? 'combo' : 'correct');
            showFeedback(`✨ 正解！ ${quizTargetProg.shortTitle}`, 'good');
            renderQuizView();
            nextTimer = setTimeout(() => startQuizRound({ autoPlay: true }), 2200);
          } else {
            quizCombo = 0;
            comboEl.textContent = '0';
            btn.classList.add('is-wrong');
            ctx.audio.playSfx('softOops');
            showFeedback('おしい！「🔊 もういちど聴く」で流れを聴き比べてみよう', 'oops');
          }
        });
      });

      prevProgBtn.classList.add('is-hidden');
      nextProgBtn.textContent = '⏭️ つぎの問題';
      playBtn.textContent = isPlayingLoop ? '⏹ すとっぷ' : '🔊 もういちど聴く';
      ctx.setHintKeys([]);
      highlightPlayingBlock();
    };

    const syncMode = () => {
      stopPlayback();
      if (nextTimer) clearTimeout(nextTimer);
      const m = LAB_MODES.find((x) => x.id === mode) || LAB_MODES[0];
      optSummary.textContent = `${m.icon} ${mode === 'learn' ? 'パターン図鑑' : '聴き当てクイズ'}`;
      learnProgList.classList.toggle('is-hidden', mode !== 'learn');
      feedbackEl.className = 'quest-feedback';

      if (mode === 'learn') {
        renderLearnView();
      } else {
        startQuizRound({ autoPlay: false });
      }
    };

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.lmode;
        modeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        syncMode();
        closePopover();
        if (mode === 'quiz') {
          playFullProgression();
        }
      });
    });

    keyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        keyId = btn.dataset.lkey;
        keyBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        stopPlayback();
        if (mode === 'learn') renderLearnView();
        else renderQuizView();
      });
    });

    progBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        progId = btn.dataset.lprog;
        progBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        selectedStepIdx = 0;
        stopPlayback();
        renderLearnView();
        closePopover();
      });
    });

    playBtn.addEventListener('click', () => {
      if (isPlayingLoop) stopPlayback();
      else playFullProgression();
    });

    prevProgBtn.addEventListener('click', () => {
      if (mode !== 'learn') return;
      stopPlayback();
      const idx = PROGRESSIONS.findIndex((p) => p.id === progId);
      progId = PROGRESSIONS[(idx - 1 + PROGRESSIONS.length) % PROGRESSIONS.length].id;
      progBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.lprog === progId));
      selectedStepIdx = 0;
      renderLearnView();
    });

    nextProgBtn.addEventListener('click', () => {
      stopPlayback();
      if (mode === 'learn') {
        const idx = PROGRESSIONS.findIndex((p) => p.id === progId);
        progId = PROGRESSIONS[(idx + 1) % PROGRESSIONS.length].id;
        progBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.lprog === progId));
        selectedStepIdx = 0;
        renderLearnView();
      } else {
        startQuizRound({ autoPlay: true });
      }
    });

    syncMode();

    return {
      onNoteOn(noteInfo) {
        if (mode !== 'learn') return;
        const chords = getCurrentChords();
        const ch = chords[selectedStepIdx % chords.length];
        const res = collector.noteOn(noteInfo.midi, ch.pitchClasses);
        renderSelectedTones();
        if (res.isComplete) {
          const how = res.isArpeggio ? '階段で' : '';
          showFeedback(`✨ ${ch.symbol} (${ch.degree}) ${how}バッチリ！`, 'good');
          collector.reset();
        }
      },

      onNoteOff(noteInfo) {
        collector.noteOff(noteInfo.midi);
        if (mode === 'learn') {
          renderSelectedTones();
        }
      },

      unmount() {
        stopPlayback();
        if (nextTimer) clearTimeout(nextTimer);
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
