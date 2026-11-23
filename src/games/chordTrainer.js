import {
  CHORD_QUALITIES,
  DIATONIC_DEGREES,
  KEYS,
  PROGRESSIONS,
  buildChord,
  evaluateChordMatch,
  getKeyById,
  getProgressionById,
  resolveProgression,
} from '../data/chords.js';

/**
 * ミニゲーム4（大人向け）: コード＆耳コピ道場
 * - 進行ドリル: 定番進行を好きなキーで押さえる（転回形OK・構成音リアルタイム表示）
 * - 耳コピ（クオリティ当て）: Major / Minor / 7th / maj7 / m7 / sus4 の聴き取り
 * - 耳コピ（ディグリー当て）: キーの I を基準に I〜vi のコード進行感を聴き取る
 */

const TRAIN_MODES = [
  { id: 'progression', icon: '🎹', label: 'コード進行ドリル', desc: '定番進行をガイド付きで弾く' },
  { id: 'ear-quality', icon: '👂', label: '耳コピ: コード種類', desc: 'Major / Minor / 7th を聴き分ける' },
  { id: 'ear-degree',  icon: '🎧', label: '耳コピ: ディグリー', desc: '基準 I から I〜vi を当てる' },
];

const QUALITY_QUIZ_POOL = ['maj', 'min', '7', 'maj7', 'm7', 'sus4'];

export const chordTrainerGame = {
  id: 'chord-trainer',
  category: 'adult',
  title: 'コード＆耳コピ道場',
  subtitle: '定番進行・転回形・コード耳コピを練習',
  ageLabel: 'オトナ学習',
  icon: '🎸',
  accentColor: '#9b72ff',

  mount(ctx) {
    let mode = 'progression'; // 'progression' | 'ear-quality' | 'ear-degree'
    let progId = PROGRESSIONS[0].id;
    let keyId = 'C';
    let showGuide = true;

    let chords = resolveProgression(progId, keyId);
    let stepIdx = 0;
    let currentTarget = chords[0];

    let score = 0;
    let combo = 0;
    let locked = false;
    let nextTimer = null;
    let stopDemo = null;

    /** 現在押されているノート（同時押し和音判定用） */
    const pressedNotes = new Set();

    const cancelDemo = () => {
      if (stopDemo) {
        stopDemo();
        stopDemo = null;
      }
    };

    ctx.container.innerHTML = `
      <div class="game-stage-root game-chord">
        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip">🎯 <span class="js-score">0</span></span>
            <span class="hud-chip hud-chip-combo">🔥 <span class="js-combo">0</span></span>
            <span class="hud-chip js-key-badge">Key: C</span>
          </div>

          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ <span class="js-opt-summary">🎹 進行ドリル</span> ▾
            </button>
            <div class="stage-popover stage-popover-wide is-hidden js-opt-popover" role="dialog" aria-label="コード練習せってい">
              <div class="popover-title">練習モード</div>
              <div class="popover-list">
                ${TRAIN_MODES.map(
                  (m) => `
                    <button type="button" class="popover-item ${m.id === mode ? 'is-active' : ''}" data-tmode="${m.id}">
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
                  (k) => `<button type="button" class="seg-btn ${k.id === keyId ? 'is-active' : ''}" data-key="${k.id}">${k.id}</button>`
                ).join('')}
              </div>

              <div class="js-prog-section">
                <div class="popover-divider"></div>
                <div class="popover-title">コード進行</div>
                <div class="popover-list">
                  ${PROGRESSIONS.map(
                    (p) => `
                      <button type="button" class="popover-item ${p.id === progId ? 'is-active' : ''}" data-prog="${p.id}">
                        <span class="popover-item-main">${p.title}</span>
                      </button>
                    `
                  ).join('')}
                </div>
                <div class="popover-divider"></div>
                <button type="button" class="popover-item is-active js-guide-toggle">
                  <span>💡 鍵盤ガイド: ON</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="chord-stage">
          <!-- コード進行タイムライン（進行ドリル時） / モード説明 -->
          <div class="chord-timeline js-timeline"></div>

          <!-- メインコードカード -->
          <div class="chord-card js-card">
            <div class="chord-degree js-degree">I</div>
            <div class="chord-symbol js-symbol">C</div>
            <div class="chord-tones js-tones"></div>
          </div>

          <!-- 耳コピ回答ボタン群（耳コピモード時のみ表示） -->
          <div class="chord-choices js-choices is-hidden"></div>

          <div class="quest-feedback js-feedback" aria-live="polite"></div>

          <!-- 再生アクション -->
          <div class="quest-actions">
            <button type="button" class="action-btn js-play-chord">🔊 和音を聴く</button>
            <button type="button" class="action-btn action-btn-sub js-play-arp">🎹 分散で聴く</button>
            <button type="button" class="action-btn action-btn-sub js-play-ref is-hidden">🎯 基準(I)→問題</button>
            <button type="button" class="action-btn action-btn-sub js-next-btn">⏭️ つぎ</button>
          </div>
        </div>
      </div>
    `;

    const scoreEl = ctx.container.querySelector('.js-score');
    const comboEl = ctx.container.querySelector('.js-combo');
    const keyBadgeEl = ctx.container.querySelector('.js-key-badge');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optSummary = ctx.container.querySelector('.js-opt-summary');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const progSection = ctx.container.querySelector('.js-prog-section');
    const guideToggleBtn = ctx.container.querySelector('.js-guide-toggle');
    const modeBtns = ctx.container.querySelectorAll('[data-tmode]');
    const keyBtns = ctx.container.querySelectorAll('[data-key]');
    const progBtns = ctx.container.querySelectorAll('[data-prog]');

    const timelineEl = ctx.container.querySelector('.js-timeline');
    const cardEl = ctx.container.querySelector('.js-card');
    const degreeEl = ctx.container.querySelector('.js-degree');
    const symbolEl = ctx.container.querySelector('.js-symbol');
    const tonesEl = ctx.container.querySelector('.js-tones');
    const choicesEl = ctx.container.querySelector('.js-choices');
    const feedbackEl = ctx.container.querySelector('.js-feedback');
    const playChordBtn = ctx.container.querySelector('.js-play-chord');
    const playArpBtn = ctx.container.querySelector('.js-play-arp');
    const playRefBtn = ctx.container.querySelector('.js-play-ref');
    const nextBtn = ctx.container.querySelector('.js-next-btn');

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

    const getTonicChord = () => {
      const key = getKeyById(keyId);
      const preferFlat = key.id === 'F' || key.id === 'Bb';
      return buildChord(key.rootPc, 'maj', { degree: 'I', preferFlat });
    };

    const playTarget = ({ arpeggio = false, withReference = false } = {}) => {
      cancelDemo();
      ctx.audio.unlock();

      if (withReference) {
        const tonic = getTonicChord();
        stopDemo = ctx.audio.playDemoChord(tonic.voicing, { durationMs: 520, velocity: 0.48 });
        const t = setTimeout(() => {
          stopDemo = ctx.audio.playDemoChord(currentTarget.voicing, {
            durationMs: 950,
            arpeggioMs: arpeggio ? 115 : 0,
            velocity: 0.56,
          });
        }, 620);
        const origStop = stopDemo;
        stopDemo = () => {
          clearTimeout(t);
          origStop();
        };
        return;
      }

      stopDemo = ctx.audio.playDemoChord(currentTarget.voicing, {
        durationMs: arpeggio ? 750 : 950,
        arpeggioMs: arpeggio ? 120 : 0,
        velocity: 0.56,
      });
    };

    const renderToneBadges = ({ revealed = true } = {}) => {
      if (!revealed) {
        tonesEl.innerHTML = `<span class="tone-pill tone-pill-hidden">? 構成音を耳で聴き取ろう（鍵盤またはボタンで回答）</span>`;
        return;
      }
      const match = evaluateChordMatch(pressedNotes, currentTarget.pitchClasses);
      const matchedSet = new Set(match.matched);
      tonesEl.innerHTML = currentTarget.noteLabels
        .map((n) => {
          const hit = matchedSet.has(n.pc);
          return `
            <span class="tone-pill ${hit ? 'is-hit' : ''}" style="--tone-color: ${n.color}">
              ${hit ? '✓ ' : ''}${n.nameEn}<small>(${n.solfege})</small>
            </span>
          `;
        })
        .join('');
    };

    const renderTimeline = () => {
      if (mode === 'progression') {
        timelineEl.innerHTML = chords
          .map((ch, idx) => {
            const cls = [
              'timeline-chord',
              idx < stepIdx ? 'is-done' : '',
              idx === stepIdx ? 'is-current' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return `
              <span class="${cls}" style="--chord-color: ${ch.color}">
                <span class="tl-deg">${ch.degree}</span>
                <span class="tl-sym">${ch.symbol}</span>
              </span>
            `;
          })
          .join('');
      } else if (mode === 'ear-quality') {
        timelineEl.innerHTML = `<span class="timeline-caption">👂 響きを聴いてコードの種類を当てよう（転回形でも鍵盤回答OK）</span>`;
      } else {
        timelineEl.innerHTML = `<span class="timeline-caption">🎧 基準コード I (${getTonicChord().symbol}) からの響きでディグリーを当てよう</span>`;
      }
    };

    const renderChoices = () => {
      if (mode === 'progression') {
        choicesEl.classList.add('is-hidden');
        choicesEl.innerHTML = '';
        return;
      }

      choicesEl.classList.remove('is-hidden');
      if (mode === 'ear-quality') {
        choicesEl.innerHTML = QUALITY_QUIZ_POOL.map((qId) => {
          const q = CHORD_QUALITIES[qId];
          return `<button type="button" class="choice-btn" data-ans-quality="${qId}">${q.shortLabel}</button>`;
        }).join('');
        choicesEl.querySelectorAll('[data-ans-quality]').forEach((btn) => {
          btn.addEventListener('click', () => handleAnswerChoice(btn.dataset.ansQuality === currentTarget.qualityId, btn));
        });
      } else {
        const key = getKeyById(keyId);
        const preferFlat = key.id === 'F' || key.id === 'Bb';
        choicesEl.innerHTML = DIATONIC_DEGREES.map((d) => {
          const ch = buildChord((key.rootPc + d.offset) % 12, d.quality, { degree: d.degree, preferFlat });
          return `
            <button type="button" class="choice-btn" data-ans-degree="${d.degree}">
              <strong>${d.degree}</strong><small>${ch.symbol}</small>
            </button>
          `;
        }).join('');
        choicesEl.querySelectorAll('[data-ans-degree]').forEach((btn) => {
          btn.addEventListener('click', () => handleAnswerChoice(btn.dataset.ansDegree === currentTarget.degree, btn));
        });
      }
    };

    const syncCard = ({ revealed = mode === 'progression' } = {}) => {
      cardEl.classList.remove('is-pop', 'is-shake');
      void cardEl.offsetWidth;

      if (revealed) {
        cardEl.style.setProperty('--chord-color', currentTarget.color);
        degreeEl.textContent = currentTarget.degree || CHORD_QUALITIES[currentTarget.qualityId].shortLabel;
        symbolEl.textContent = currentTarget.symbol;
      } else {
        cardEl.style.setProperty('--chord-color', '#9b72ff');
        degreeEl.textContent = mode === 'ear-quality' ? 'QUALITY ?' : `Key: ${keyId} / DEGREE ?`;
        symbolEl.textContent = '🎧 ？';
      }

      renderToneBadges({ revealed });
      renderTimeline();

      if (mode === 'progression' && showGuide) {
        ctx.setHintKeys(currentTarget.voicing, { ignoreOctave: true });
      } else {
        ctx.setHintKeys([]);
      }
    };

    const pickNextQuestion = ({ autoPlay = true } = {}) => {
      if (nextTimer) clearTimeout(nextTimer);
      locked = false;
      pressedNotes.clear();

      if (mode === 'progression') {
        currentTarget = chords[stepIdx % chords.length];
        syncCard({ revealed: true });
        return;
      }

      if (mode === 'ear-quality') {
        const key = getKeyById(keyId);
        const preferFlat = key.id === 'F' || key.id === 'Bb';
        const qId = QUALITY_QUIZ_POOL[Math.floor(Math.random() * QUALITY_QUIZ_POOL.length)];
        // ルートはキーのダイアトニック音またはキー中心からランダム
        const rootOffsets = [0, 2, 4, 5, 7, 9];
        const rootPc = (key.rootPc + rootOffsets[Math.floor(Math.random() * rootOffsets.length)]) % 12;
        currentTarget = buildChord(rootPc, qId, { preferFlat });
        syncCard({ revealed: false });
        renderChoices();
        if (autoPlay) playTarget({ arpeggio: false, withReference: false });
      } else {
        const key = getKeyById(keyId);
        const preferFlat = key.id === 'F' || key.id === 'Bb';
        let deg = DIATONIC_DEGREES[Math.floor(Math.random() * DIATONIC_DEGREES.length)];
        if (currentTarget && deg.degree === currentTarget.degree) {
          deg = DIATONIC_DEGREES[(DIATONIC_DEGREES.indexOf(deg) + 1 + Math.floor(Math.random() * 4)) % DIATONIC_DEGREES.length];
        }
        currentTarget = buildChord((key.rootPc + deg.offset) % 12, deg.quality, {
          degree: deg.degree,
          preferFlat,
        });
        syncCard({ revealed: false });
        renderChoices();
        if (autoPlay) playTarget({ arpeggio: false, withReference: true });
      }
    };

    const markCorrect = (message) => {
      locked = true;
      score++;
      combo++;
      scoreEl.textContent = String(score);
      comboEl.textContent = String(combo);
      cardEl.classList.add('is-pop');
      syncCard({ revealed: true });
      showFeedback(message, 'good');

      if (mode === 'progression') {
        const isLoopEnd = stepIdx === chords.length - 1;
        if (isLoopEnd) {
          ctx.audio.playSfx('combo');
          showFeedback(`🎉 1周クリア！ (${getProgressionById(progId).title})`, 'good');
        }
        nextTimer = setTimeout(() => {
          stepIdx = (stepIdx + 1) % chords.length;
          pickNextQuestion({ autoPlay: false });
        }, isLoopEnd ? 850 : 340);
      } else {
        ctx.audio.playSfx(combo >= 3 && combo % 3 === 0 ? 'combo' : 'correct');
        nextTimer = setTimeout(() => {
          pickNextQuestion({ autoPlay: true });
        }, 1050);
      }
    };

    const handleAnswerChoice = (isCorrect, btnEl) => {
      if (locked) return;
      ctx.audio.unlock();
      if (isCorrect) {
        btnEl.classList.add('is-correct');
        markCorrect(`✨ 正解！ ${currentTarget.symbol} (${currentTarget.degree || CHORD_QUALITIES[currentTarget.qualityId].shortLabel})`);
      } else {
        combo = 0;
        comboEl.textContent = '0';
        btnEl.classList.add('is-wrong');
        cardEl.classList.remove('is-shake');
        void cardEl.offsetWidth;
        cardEl.classList.add('is-shake');
        showFeedback('おしい！もういちど響きを聴いてみよう 👂', 'oops');
        ctx.audio.playSfx('softOops');
      }
    };

    const updateModeUI = () => {
      const m = TRAIN_MODES.find((x) => x.id === mode) || TRAIN_MODES[0];
      optSummary.textContent = `${m.icon} ${m.label}`;
      keyBadgeEl.textContent = `Key: ${keyId}`;
      progSection.classList.toggle('is-hidden', mode !== 'progression');
      playRefBtn.classList.toggle('is-hidden', mode !== 'ear-degree');
      chords = resolveProgression(progId, keyId);
      stepIdx = 0;
      renderChoices();
      pickNextQuestion({ autoPlay: false });
    };

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.tmode;
        modeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        feedbackEl.className = 'quest-feedback';
        updateModeUI();
        closePopover();
        if (mode !== 'progression') {
          playTarget({ withReference: mode === 'ear-degree' });
        }
      });
    });

    keyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        keyId = btn.dataset.key;
        keyBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        updateModeUI();
      });
    });

    progBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        progId = btn.dataset.prog;
        progBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        updateModeUI();
        closePopover();
      });
    });

    guideToggleBtn.addEventListener('click', () => {
      showGuide = !showGuide;
      guideToggleBtn.classList.toggle('is-active', showGuide);
      guideToggleBtn.innerHTML = `<span>💡 鍵盤ガイド: ${showGuide ? 'ON' : 'OFF（暗記テスト）'}</span>`;
      syncCard({ revealed: mode === 'progression' });
    });

    playChordBtn.addEventListener('click', () => playTarget({ arpeggio: false, withReference: false }));
    playArpBtn.addEventListener('click', () => playTarget({ arpeggio: true, withReference: false }));
    playRefBtn.addEventListener('click', () => playTarget({ arpeggio: false, withReference: true }));
    nextBtn.addEventListener('click', () => {
      ctx.audio.unlock();
      if (mode === 'progression') {
        stepIdx = (stepIdx + 1) % chords.length;
        pickNextQuestion({ autoPlay: false });
      } else {
        pickNextQuestion({ autoPlay: true });
      }
    });

    updateModeUI();

    return {
      onNoteOn(noteInfo) {
        pressedNotes.add(noteInfo.midi);
        if (locked) return;

        if (mode === 'progression') {
          renderToneBadges({ revealed: true });
        }

        const evalRes = evaluateChordMatch(pressedNotes, currentTarget.pitchClasses);
        if (evalRes.hasAllTargets && evalRes.extras.length === 0) {
          markCorrect(`✨ ${currentTarget.symbol} バッチリ！`);
        }
      },

      onNoteOff(noteInfo) {
        pressedNotes.delete(noteInfo.midi);
        if (!locked && mode === 'progression') {
          renderToneBadges({ revealed: true });
        }
      },

      unmount() {
        cancelDemo();
        if (nextTimer) clearTimeout(nextTimer);
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
