import { getNoteInfo } from '../core/notes.js';
import {
  KEYS,
  PROGRESSIONS,
  evaluateChordMatch,
  generateProgressionMelodies,
  getProgressionById,
  getScalePitchClasses,
  resolveProgression,
} from '../data/chords.js';

/**
 * ミニゲーム5（大人向け）: 伴奏リズム・グルーヴ＆セッション練習
 * - 「🎹 伴奏を弾く」: ドラム＋ベース＋自動ガイドメロディに合わせてコードを刻む
 * - 「🎷 メロディを弾く」: ドラム＋ベース＋自動コード伴奏バックトラックの上でメロディ/アドリブ演奏
 * - UIルール準拠: Canvas全面表示＋四隅フローティングHUD＆設定ポップオーバー
 */

const GROOVE_PATTERNS = [
  {
    id: '4beat',
    label: '🎹 4つ打ち (1・2・3・4)',
    desc: '拍頭ごとにコードを刻む基本バッキング',
    hitSteps: [0, 2, 4, 6],
    bassSteps: [0, 4],
    drum: {
      0: ['kick', 'hihat'],
      1: ['hihat'],
      2: ['snare', 'hihat'],
      3: ['hihat'],
      4: ['kick', 'hihat'],
      5: ['hihat'],
      6: ['snare', 'hihat'],
      7: ['hihat'],
    },
  },
  {
    id: 'pop8',
    label: '🎸 ポップス 8ビート (1・2&・4)',
    desc: 'J-POPピアノ伴奏で定番のシンコペーション',
    hitSteps: [0, 3, 6],
    bassSteps: [0, 3, 5],
    drum: {
      0: ['kick', 'hihat'],
      1: ['hihat'],
      2: ['snare', 'hihat'],
      3: ['kick', 'hihat'],
      4: ['hihat'],
      5: ['kick', 'hihat'],
      6: ['snare', 'hihat'],
      7: ['hihat'],
    },
  },
  {
    id: 'ballad',
    label: '🌙 バラード (1・3拍)',
    desc: 'ゆったり2分音符でコードチェンジ練習',
    hitSteps: [0, 4],
    bassSteps: [0, 4],
    drum: {
      0: ['kick', 'hihat'],
      2: ['hihat'],
      4: ['snare', 'hihat'],
      6: ['hihat'],
    },
  },
  {
    id: 'neosoul',
    label: '☕ おしゃれシンコペ (1・2&・3&)',
    desc: '丸サ・ネオソウル系に合うハネ感リズム',
    hitSteps: [0, 3, 5],
    bassSteps: [0, 5],
    drum: {
      0: ['kick', 'hihat'],
      1: ['hihat'],
      2: ['snare', 'hihat'],
      3: ['hihat'],
      4: ['hihat'],
      5: ['kick', 'hihat'],
      6: ['snare', 'hihat'],
      7: ['hihat'],
    },
  },
];

const BPM_OPTIONS = [75, 90, 105, 120];
const STEP_LABELS = ['1', '&', '2', '&', '3', '&', '4', '&'];

export const compingGrooveGame = {
  id: 'comping-groove',
  category: 'adult',
  title: '伴奏リズム・グルーヴ',
  subtitle: 'ガイドメロディ付き伴奏 / 自動伴奏でメロディ演奏',
  ageLabel: 'オトナ学習',
  icon: '🥁',
  accentColor: '#38c976',

  mount(ctx) {
    let role = 'comping'; // 'comping' (自分が伴奏) | 'melody' (自分がメロディ)
    let progId = PROGRESSIONS[0].id;
    let keyId = 'C';
    let patternId = GROOVE_PATTERNS[1].id;
    let bpm = 90;
    let drumMode = 'drums'; // 'drums' | 'click'
    let guideMelodyOn = true; // 伴奏モード時に自動メロディを添える
    let autoBassOn = true;
    let melodyGuideType = 'penta'; // 'penta' | 'chord' | 'off' (メロディモード時の鍵盤ガイド)
    let compingGuideOn = true;     // 伴奏モード時の鍵盤ガイド
    let melodySeed = 1;

    let chords = resolveProgression(progId, keyId);
    let pattern = GROOVE_PATTERNS.find((p) => p.id === patternId) || GROOVE_PATTERNS[0];
    let barMelodies = generateProgressionMelodies(chords, keyId, melodySeed);

    let isRunning = false;
    let countInStepsLeft = 0;
    let barIdx = 0;
    let stepIdx = 0;
    let stepStartPerf = 0;
    let stepTimerId = null;
    let activeBackingCancels = [];
    let currentGuideMelodyNote = null; // Canvas表示用 { solfege, nameEn, color, step }

    let combo = 0;
    let totalJudged = 0;
    let totalGood = 0;
    let soloNoteCount = 0;
    let hitMarkers = [];
    let soloBursts = [];
    let stepHitDone = new Set();
    let lastNoteBurstTs = 0;
    const recentChordBuffer = [];
    const pressedNotes = new Set();

    const cancelBackingChords = () => {
      activeBackingCancels.forEach((fn) => fn());
      activeBackingCancels = [];
    };

    ctx.container.innerHTML = `
      <div class="game-stage-root game-groove">
        <canvas class="stage-canvas"></canvas>

        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip js-stat-main">🎯 <span class="js-acc">--%</span></span>
            <span class="hud-chip hud-chip-combo js-stat-sub">🔥 <span class="js-combo">0</span></span>
            <span class="hud-chip js-bpm-chip">♩=${bpm}</span>
          </div>

          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-play-toggle">▶ スタート</button>
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ <span class="js-role-chip">🎹 伴奏</span> ▾
            </button>

            <div class="stage-popover stage-popover-wide is-hidden js-opt-popover" role="dialog" aria-label="セッションせってい">
              <div class="popover-title">セッション役わり</div>
              <div class="popover-segmented">
                <button type="button" class="seg-btn is-active" data-role="comping">🎹 伴奏を弾く</button>
                <button type="button" class="seg-btn" data-role="melody">🎷 メロディを弾く</button>
              </div>

              <!-- 伴奏モード専用オプション -->
              <div class="js-comping-opts" style="margin-top:8px">
                <div class="popover-segmented">
                  <button type="button" class="seg-btn is-active js-melody-toggle">🎵 ガイドメロディ: ON</button>
                  <button type="button" class="seg-btn js-reroll-melody" title="別のメロディを作る">🎲 かえる</button>
                </div>
                <button type="button" class="popover-item is-active js-gguide-toggle" style="margin-top:6px">
                  <span>💡 鍵盤コードガイド: ON</span>
                </button>
              </div>

              <!-- メロディモード専用オプション -->
              <div class="js-melody-opts is-hidden" style="margin-top:8px">
                <div class="popover-title">アドリブ鍵盤ガイド</div>
                <div class="popover-segmented">
                  <button type="button" class="seg-btn is-active" data-mguide="penta">ペンタ</button>
                  <button type="button" class="seg-btn" data-mguide="chord">コード音</button>
                  <button type="button" class="seg-btn" data-mguide="off">OFF</button>
                </div>
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">リズムパターン</div>
              <div class="popover-list">
                ${GROOVE_PATTERNS.map(
                  (p) => `
                    <button type="button" class="popover-item ${p.id === patternId ? 'is-active' : ''}" data-pat="${p.id}">
                      <span class="popover-item-main">${p.label}</span>
                      <span class="popover-item-sub">${p.desc}</span>
                    </button>
                  `
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">テンポ (BPM)</div>
              <div class="popover-segmented">
                ${BPM_OPTIONS.map(
                  (b) => `<button type="button" class="seg-btn ${b === bpm ? 'is-active' : ''}" data-bpm="${b}">${b}</button>`
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">キー</div>
              <div class="popover-grid-keys">
                ${KEYS.map(
                  (k) => `<button type="button" class="seg-btn ${k.id === keyId ? 'is-active' : ''}" data-gkey="${k.id}">${k.id}</button>`
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">コード進行</div>
              <div class="popover-list">
                ${PROGRESSIONS.map(
                  (p) => `
                    <button type="button" class="popover-item ${p.id === progId ? 'is-active' : ''}" data-gprog="${p.id}">
                      <span>${p.title}</span>
                    </button>
                  `
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-segmented">
                <button type="button" class="seg-btn is-active" data-dmode="drums">🥁 ドラム</button>
                <button type="button" class="seg-btn" data-dmode="click">⏱️ クリック</button>
                <button type="button" class="seg-btn is-active js-bass-toggle">🎸 ベース</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const root = ctx.container.querySelector('.game-stage-root');
    const canvas = ctx.container.querySelector('.stage-canvas');
    const c = canvas.getContext('2d');
    const statMainEl = ctx.container.querySelector('.js-stat-main');
    const statSubEl = ctx.container.querySelector('.js-stat-sub');
    const bpmChipEl = ctx.container.querySelector('.js-bpm-chip');
    const playToggleBtn = ctx.container.querySelector('.js-play-toggle');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const roleChipEl = ctx.container.querySelector('.js-role-chip');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const compingOptsEl = ctx.container.querySelector('.js-comping-opts');
    const melodyOptsEl = ctx.container.querySelector('.js-melody-opts');

    const roleBtns = ctx.container.querySelectorAll('[data-role]');
    const melodyToggleBtn = ctx.container.querySelector('.js-melody-toggle');
    const rerollMelodyBtn = ctx.container.querySelector('.js-reroll-melody');
    const mGuideBtns = ctx.container.querySelectorAll('[data-mguide]');
    const patBtns = ctx.container.querySelectorAll('[data-pat]');
    const bpmBtns = ctx.container.querySelectorAll('[data-bpm]');
    const keyBtns = ctx.container.querySelectorAll('[data-gkey]');
    const progBtns = ctx.container.querySelectorAll('[data-gprog]');
    const drumBtns = ctx.container.querySelectorAll('[data-dmode]');
    const bassToggleBtn = ctx.container.querySelector('.js-bass-toggle');
    const guideBtn = ctx.container.querySelector('.js-gguide-toggle');

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

    let width = 800;
    let height = 380;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(180, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const getStepDurationMs = () => (60 / bpm / 2) * 1000;

    const rebuildProgression = () => {
      chords = resolveProgression(progId, keyId);
      barMelodies = generateProgressionMelodies(chords, keyId, melodySeed);
      barIdx = barIdx % chords.length;
      syncHintKeys();
    };

    const syncHudStats = () => {
      if (role === 'comping') {
        const acc = totalJudged > 0 ? `${Math.round((totalGood / totalJudged) * 100)}%` : '--%';
        statMainEl.textContent = `🎯 ${acc}`;
        statSubEl.textContent = `🔥 ${combo}`;
      } else {
        statMainEl.textContent = `🎷 ソロ中`;
        statSubEl.textContent = `🎵 ${soloNoteCount}`;
      }
    };

    const syncHintKeys = () => {
      const curChord = chords[barIdx % chords.length];
      if (role === 'comping') {
        if (!compingGuideOn) {
          ctx.setHintKeys([]);
          return;
        }
        ctx.setHintKeys(curChord.voicing, { ignoreOctave: true });
      } else {
        if (melodyGuideType === 'off') {
          ctx.setHintKeys([]);
        } else if (melodyGuideType === 'chord') {
          ctx.setHintKeys(curChord.voicing, { ignoreOctave: true });
        } else {
          // メジャーペンタトニック（C4基準のピッチクラスをガイド発光）
          const pentaMidis = getScalePitchClasses(keyId, { pentatonic: true }).map((pc) => 60 + pc);
          ctx.setHintKeys(pentaMidis, { ignoreOctave: true });
        }
      }
    };

    const syncRoleUI = () => {
      roleChipEl.textContent = role === 'comping' ? '🎹 伴奏' : '🎷 メロディ';
      compingOptsEl.classList.toggle('is-hidden', role !== 'comping');
      melodyOptsEl.classList.toggle('is-hidden', role !== 'melody');
      syncHudStats();
      syncHintKeys();
    };

    const stopLoop = () => {
      isRunning = false;
      cancelBackingChords();
      currentGuideMelodyNote = null;
      if (stepTimerId) {
        clearTimeout(stepTimerId);
        stepTimerId = null;
      }
      playToggleBtn.textContent = '▶ スタート';
    };

    const scheduleNextStep = () => {
      if (!isRunning) return;
      const stepMs = getStepDurationMs();

      if (countInStepsLeft > 0) {
        if (countInStepsLeft % 2 === 0) {
          ctx.audio.playDrum(countInStepsLeft === 8 ? 'clickHigh' : 'clickLow', 0.9);
        }
        stepStartPerf = performance.now();
        countInStepsLeft--;
        if (countInStepsLeft === 0) {
          barIdx = 0;
          stepIdx = -1;
          stepHitDone.clear();
          syncHintKeys();
        }
      } else {
        stepIdx = (stepIdx + 1) % 8;
        if (stepIdx === 0 && stepStartPerf > 0) {
          barIdx = (barIdx + 1) % chords.length;
          stepHitDone.clear();
          currentGuideMelodyNote = null;
          syncHintKeys();
        }
        stepStartPerf = performance.now();

        const curChord = chords[barIdx % chords.length];

        // 1. ドラム / クリック
        if (drumMode === 'drums') {
          const hits = pattern.drum[stepIdx] || [];
          hits.forEach((d) => ctx.audio.playDrum(d, stepIdx === 0 ? 1.0 : 0.8));
        } else if (stepIdx % 2 === 0) {
          ctx.audio.playDrum(stepIdx === 0 ? 'clickHigh' : 'clickLow', 0.85);
        }

        // 2. 自動ベースライン（ルート音を低音域 C2〜B2 = MIDI 36..47 で鳴らす）
        if (autoBassOn && pattern.bassSteps.includes(stepIdx)) {
          const bassMidi = 36 + curChord.rootPc;
          ctx.audio.playBassNote(bassMidi, stepMs * 1.9, stepIdx === 0 ? 0.62 : 0.46);
        }

        // 3. 役割ごとの自動パート
        if (role === 'comping' && guideMelodyOn) {
          // ガイドメロディを添える
          const barEvents = barMelodies[barIdx % barMelodies.length] || [];
          const ev = barEvents.find((e) => e.step === stepIdx);
          if (ev) {
            ctx.audio.playLeadNote(ev.midi, Math.max(180, ev.durSteps * stepMs * 0.9), 0.46);
            const info = getNoteInfo(ev.midi);
            currentGuideMelodyNote = {
              solfege: info.solfege,
              nameEn: info.nameEn,
              color: info.color,
              step: stepIdx,
            };
          }
        } else if (role === 'melody') {
          // アプリがコード伴奏を自動で刻む（バックトラック）
          if (pattern.hitSteps.includes(stepIdx)) {
            // 低めボイシング（C3〜B4付近）に下げて主役メロディの邪魔をしないようにする
            const backingMidis = curChord.voicing.map((m) => (m >= 68 ? m - 12 : m));
            const cancel = ctx.audio.playDemoChord(backingMidis, {
              durationMs: Math.round(stepMs * 1.85),
              velocity: 0.34,
            });
            activeBackingCancels.push(cancel);
            if (activeBackingCancels.length > 6) activeBackingCancels.shift();
          }
        }
      }

      stepTimerId = setTimeout(scheduleNextStep, stepMs);
    };

    const startLoop = () => {
      ctx.audio.unlock();
      closePopover();
      stopLoop();
      isRunning = true;
      countInStepsLeft = 8;
      barIdx = 0;
      stepIdx = 0;
      stepStartPerf = 0;
      combo = 0;
      totalJudged = 0;
      totalGood = 0;
      soloNoteCount = 0;
      hitMarkers = [];
      soloBursts = [];
      stepHitDone.clear();
      syncHudStats();
      playToggleBtn.textContent = '⏹ ストップ';
      syncHintKeys();
      scheduleNextStep();
    };

    playToggleBtn.addEventListener('click', () => {
      if (isRunning) stopLoop();
      else startLoop();
    });

    roleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        role = btn.dataset.role;
        roleBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        cancelBackingChords();
        currentGuideMelodyNote = null;
        syncRoleUI();
      });
    });

    melodyToggleBtn.addEventListener('click', () => {
      guideMelodyOn = !guideMelodyOn;
      melodyToggleBtn.classList.toggle('is-active', guideMelodyOn);
      melodyToggleBtn.textContent = `🎵 ガイドメロディ: ${guideMelodyOn ? 'ON' : 'OFF'}`;
      if (!guideMelodyOn) currentGuideMelodyNote = null;
    });

    rerollMelodyBtn.addEventListener('click', () => {
      melodySeed++;
      barMelodies = generateProgressionMelodies(chords, keyId, melodySeed);
    });

    mGuideBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        melodyGuideType = btn.dataset.mguide;
        mGuideBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        syncHintKeys();
      });
    });

    patBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        patternId = btn.dataset.pat;
        pattern = GROOVE_PATTERNS.find((p) => p.id === patternId) || GROOVE_PATTERNS[0];
        patBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        stepHitDone.clear();
      });
    });

    bpmBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        bpm = Number(btn.dataset.bpm) || 90;
        bpmChipEl.textContent = `♩=${bpm}`;
        bpmBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    keyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        keyId = btn.dataset.gkey;
        keyBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        rebuildProgression();
      });
    });

    progBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        progId = btn.dataset.gprog;
        progBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        barIdx = 0;
        rebuildProgression();
        closePopover();
      });
    });

    drumBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        drumMode = btn.dataset.dmode;
        drumBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    bassToggleBtn.addEventListener('click', () => {
      autoBassOn = !autoBassOn;
      bassToggleBtn.classList.toggle('is-active', autoBassOn);
    });

    guideBtn.addEventListener('click', () => {
      compingGuideOn = !compingGuideOn;
      guideBtn.classList.toggle('is-active', compingGuideOn);
      guideBtn.innerHTML = `<span>💡 鍵盤コードガイド: ${compingGuideOn ? 'ON' : 'OFF'}</span>`;
      syncHintKeys();
    });

    const recordJudgment = (stepPos, label, color, isSuccess) => {
      totalJudged++;
      if (isSuccess) {
        totalGood++;
        combo++;
      } else {
        combo = 0;
      }
      syncHudStats();

      hitMarkers.push({ stepPos, label, color, alpha: 1.0, yOffset: 0 });
      if (hitMarkers.length > 24) hitMarkers.shift();
    };

    const evaluateStrike = () => {
      if (role !== 'comping' || !isRunning || countInStepsLeft > 0 || stepIdx < 0) return;

      const stepMs = getStepDurationMs();
      const elapsedInStep = Math.max(0, Math.min(stepMs, performance.now() - stepStartPerf));
      const exactStepPos = stepIdx + elapsedInStep / stepMs;

      let bestStep = pattern.hitSteps[0];
      let bestDiffSteps = 99;
      for (const s of pattern.hitSteps) {
        let diff = exactStepPos - s;
        if (diff > 4) diff -= 8;
        if (diff < -4) diff += 8;
        if (Math.abs(diff) < Math.abs(bestDiffSteps)) {
          bestDiffSteps = diff;
          bestStep = s;
        }
      }

      const diffMs = bestDiffSteps * stepMs;
      const absMs = Math.abs(diffMs);

      const curChord = chords[barIdx % chords.length];
      const checkSet = new Set([...pressedNotes, ...recentChordBuffer.map((x) => x.midi)]);
      const match = evaluateChordMatch(checkSet, curChord.pitchClasses);
      const chordGood = match.matched.length >= Math.min(2, curChord.pitchClasses.length) && match.extras.length === 0;
      const chordTag = match.hasAllTargets ? ' 🎹' : chordGood ? ' ♪' : '';

      if (absMs <= 95) {
        stepHitDone.add(bestStep);
        recordJudgment(exactStepPos, `JUST!${chordTag}`, '#38c976', true);
      } else if (absMs <= 180) {
        stepHitDone.add(bestStep);
        const dir = diffMs < 0 ? 'ちょい早' : 'ちょい遅';
        recordJudgment(exactStepPos, `GOOD (${dir})${chordTag}`, '#ffca3a', true);
      } else {
        recordJudgment(exactStepPos, diffMs < 0 ? 'はやい' : 'おそい', '#ff7a85', false);
      }
    };

    const spawnSoloVisual = (noteInfo) => {
      const curChord = chords[barIdx % chords.length];
      const majorScaleSet = new Set(getScalePitchClasses(keyId, { pentatonic: false }));
      const chordSet = new Set(curChord.pitchClasses);

      let badge = '♪ テンション';
      if (chordSet.has(noteInfo.pitchClass)) badge = '◎ コード音!';
      else if (majorScaleSet.has(noteInfo.pitchClass)) badge = '○ スケール';

      let normX = ctx.keyboard.getKeyNormalizedX(noteInfo.midi);
      if (normX <= 0.02 || normX >= 0.98) {
        normX = 0.12 + (noteInfo.pitchClass / 12) * 0.76;
      }

      soloBursts.push({
        x: Math.max(0.08, Math.min(0.92, normX)) * width,
        y: height - 34,
        vy: -1.8,
        r: 12,
        maxR: 48,
        color: noteInfo.color,
        text: `${noteInfo.solfege} ${badge}`,
        alpha: 1,
      });
      if (soloBursts.length > 24) soloBursts.shift();
    };

    let rafId = 0;

    const tick = (now) => {
      const bg = c.createLinearGradient(0, 0, 0, height);
      if (role === 'melody') {
        bg.addColorStop(0, '#14173b');
        bg.addColorStop(1, '#261d4f');
      } else {
        bg.addColorStop(0, '#121735');
        bg.addColorStop(1, '#1c244d');
      }
      c.fillStyle = bg;
      c.fillRect(0, 0, width, height);

      const curChord = chords[barIdx % chords.length];
      const nextChord = chords[(barIdx + 1) % chords.length];

      // 上部進行サマリ
      c.fillStyle = 'rgba(200, 210, 255, 0.58)';
      c.font = '700 12px "Hiragino Maru Gothic ProN", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const roleSub = role === 'comping'
        ? (guideMelodyOn ? '🎹 伴奏（メロディ付き）' : '🎹 伴奏')
        : '🎷 メロディ演奏（自動伴奏）';
      c.fillText(`${roleSub}  |  ${getProgressionById(progId).title}  |  Key: ${keyId}`, width / 2, 26);

      const headerY = Math.max(82, height * 0.3);
      if (isRunning && countInStepsLeft > 0) {
        const countNum = Math.ceil(countInStepsLeft / 2);
        c.fillStyle = '#ffca3a';
        c.font = '900 56px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText(`${countNum}`, width / 2, headerY);
        c.fillStyle = '#d6dcff';
        c.font = '700 15px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText(`カウントイン… 最初は ${curChord.symbol}`, width / 2, headerY + 42);
      } else {
        c.fillStyle = curChord.color;
        c.font = '800 15px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText(curChord.degree, width / 2, headerY - 34);

        c.fillStyle = '#ffffff';
        c.font = `900 ${Math.min(54, Math.round(height * 0.16))}px "Hiragino Maru Gothic ProN", sans-serif`;
        c.fillText(curChord.symbol, width / 2, headerY + 4);

        const tonesText = curChord.noteLabels.map((n) => `${n.nameEn}(${n.solfege})`).join('  ');
        c.fillStyle = '#cbd2ff';
        c.font = '700 14px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText(tonesText, width / 2, headerY + 38);

        if (width >= 480) {
          c.textAlign = 'left';
          c.fillStyle = 'rgba(200, 210, 255, 0.55)';
          c.font = '700 12px "Hiragino Maru Gothic ProN", sans-serif';
          c.fillText('NEXT', width * 0.72, headerY - 14);
          c.fillStyle = nextChord.color;
          c.font = '800 24px "Hiragino Maru Gothic ProN", sans-serif';
          c.fillText(nextChord.symbol, width * 0.72, headerY + 12);
          c.textAlign = 'center';
        }
      }

      // 8ステップ（1小節）タイムライン
      const padX = Math.max(24, width * 0.07);
      const trackW = width - padX * 2;
      const cellW = trackW / 8;
      const trackY = Math.min(height - 74, Math.max(headerY + 64, height * 0.62));
      const trackH = 52;

      // ガイドメロディのプレビュー（伴奏モード＋メロディON時）
      if (role === 'comping' && guideMelodyOn) {
        const barEvents = barMelodies[barIdx % barMelodies.length] || [];
        for (const ev of barEvents) {
          const ex = padX + ev.step * cellW + cellW / 2;
          const info = getNoteInfo(ev.midi);
          const isNow = isRunning && countInStepsLeft === 0 && currentGuideMelodyNote && currentGuideMelodyNote.step === ev.step;
          c.save();
          c.fillStyle = isNow ? info.color : 'rgba(255, 255, 255, 0.14)';
          c.beginPath();
          c.roundRect(ex - 18, trackY - 26, 36, 20, 999);
          c.fill();
          c.fillStyle = isNow ? '#ffffff' : '#cbd2ff';
          c.font = '800 11px "Hiragino Maru Gothic ProN", sans-serif';
          c.fillText(`♪${info.solfege}`, ex, trackY - 15);
          c.restore();
        }
      }

      for (let i = 0; i < 8; i++) {
        const x = padX + i * cellW;
        const isHitTarget = pattern.hitSteps.includes(i);
        const isCurrentStep = isRunning && countInStepsLeft === 0 && stepIdx === i;
        const isAlreadyHit = stepHitDone.has(i);

        c.fillStyle = isCurrentStep
          ? 'rgba(255, 255, 255, 0.16)'
          : i % 2 === 0
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(255, 255, 255, 0.025)';
        c.fillRect(x + 2, trackY, cellW - 4, trackH);

        if (isHitTarget) {
          c.save();
          if (role === 'melody') {
            // 自動伴奏が鳴るタイミングを可視化
            c.fillStyle = isCurrentStep ? curChord.color : `${curChord.color}66`;
            c.beginPath();
            c.roundRect(x + 6, trackY + 10, cellW - 12, trackH - 20, 10);
            c.fill();
            c.fillStyle = '#ffffff';
            c.font = '800 11px "Hiragino Maru Gothic ProN", sans-serif';
            c.fillText('伴奏♪', x + cellW / 2, trackY + trackH / 2 + 1);
          } else {
            c.fillStyle = isAlreadyHit ? '#38c976' : curChord.color;
            c.globalAlpha = isCurrentStep ? 1 : 0.85;
            c.beginPath();
            c.roundRect(x + 6, trackY + 7, cellW - 12, trackH - 14, 10);
            c.fill();
            c.strokeStyle = '#ffffff';
            c.lineWidth = isCurrentStep ? 3 : 1.5;
            c.stroke();

            c.fillStyle = '#ffffff';
            c.font = '800 13px "Hiragino Maru Gothic ProN", sans-serif';
            c.fillText(isAlreadyHit ? '✓' : '弾く!', x + cellW / 2, trackY + trackH / 2 + 1);
          }
          c.restore();
        }

        c.fillStyle = i % 2 === 0 ? '#ffffff' : 'rgba(200, 210, 255, 0.55)';
        c.font = `${i % 2 === 0 ? '800 14px' : '700 12px'} "Hiragino Maru Gothic ProN", sans-serif`;
        c.fillText(STEP_LABELS[i], x + cellW / 2, trackY + trackH + 18);
      }

      // プレイヘッド
      if (isRunning && countInStepsLeft === 0 && stepIdx >= 0) {
        const stepMs = getStepDurationMs();
        const frac = Math.max(0, Math.min(1, (now - stepStartPerf) / stepMs));
        const headX = padX + (stepIdx + frac) * cellW;
        c.strokeStyle = '#ffde7d';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(headX, trackY - 8);
        c.lineTo(headX, trackY + trackH + 4);
        c.stroke();
      } else if (!isRunning) {
        c.fillStyle = 'rgba(255, 222, 125, 0.92)';
        c.font = '700 14px "Hiragino Maru Gothic ProN", sans-serif';
        const prompt = role === 'comping'
          ? '「▶ スタート」でガイドメロディ＆ドラムに合わせて伴奏しよう！'
          : '「▶ スタート」で自動伴奏を流し、光る音でメロディを弾こう！';
        c.fillText(prompt, width / 2, trackY - (role === 'comping' && guideMelodyOn ? 36 : 16));
      }

      // 伴奏タイミング判定ポップアップ
      for (let i = hitMarkers.length - 1; i >= 0; i--) {
        const m = hitMarkers[i];
        m.yOffset -= 0.9;
        m.alpha -= 0.022;
        if (m.alpha <= 0) {
          hitMarkers.splice(i, 1);
          continue;
        }
        const mx = padX + (m.stepPos % 8) * cellW;
        c.save();
        c.globalAlpha = m.alpha;
        c.font = '800 16px "Hiragino Maru Gothic ProN", sans-serif';
        c.lineWidth = 4;
        c.strokeStyle = '#121735';
        c.strokeText(m.label, mx, trackY - 12 + m.yOffset);
        c.fillStyle = m.color;
        c.fillText(m.label, mx, trackY - 12 + m.yOffset);
        c.restore();
      }

      // メロディ演奏時の音符リング＆スケール評価
      for (let i = soloBursts.length - 1; i >= 0; i--) {
        const sb = soloBursts[i];
        sb.y += sb.vy;
        sb.r += (sb.maxR - sb.r) * 0.12;
        sb.alpha -= 0.022;
        if (sb.alpha <= 0) {
          soloBursts.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = sb.alpha;
        c.strokeStyle = sb.color;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(sb.x, sb.y, sb.r, 0, Math.PI * 2);
        c.stroke();

        c.font = '800 15px "Hiragino Maru Gothic ProN", sans-serif';
        c.lineWidth = 4;
        c.strokeStyle = '#14173b';
        c.strokeText(sb.text, sb.x, sb.y - 6);
        c.fillStyle = '#ffffff';
        c.fillText(sb.text, sb.x, sb.y - 6);
        c.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    syncRoleUI();
    rafId = requestAnimationFrame(tick);

    return {
      onNoteOn(noteInfo) {
        pressedNotes.add(noteInfo.midi);

        if (role === 'melody') {
          soloNoteCount++;
          syncHudStats();
          spawnSoloVisual(noteInfo);
          return;
        }

        const now = performance.now();
        while (recentChordBuffer.length > 0 && now - recentChordBuffer[0].ts > 120) {
          recentChordBuffer.shift();
        }
        recentChordBuffer.push({ midi: noteInfo.midi, ts: now });

        if (now - lastNoteBurstTs > 75) {
          lastNoteBurstTs = now;
          setTimeout(() => evaluateStrike(), 35);
        }
      },

      onNoteOff(noteInfo) {
        pressedNotes.delete(noteInfo.midi);
      },

      unmount() {
        stopLoop();
        cancelAnimationFrame(rafId);
        ro.disconnect();
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
