import {
  KEYS,
  PROGRESSIONS,
  evaluateChordMatch,
  getProgressionById,
  resolveProgression,
} from '../data/chords.js';

/**
 * ミニゲーム5（大人向け）: 伴奏リズム・グルーヴ練習
 * - ゼロ依存ドラム＆メトロノームビートに合わせてコード伴奏のリズム＆コードチェンジを練習
 * - 4つ打ち / ポップス8ビート（シンコペーション） / バラード / おしゃれシンコペ の4パターン
 * - UIルール準拠: Canvas全面表示＋四隅フローティングHUD＆設定ポップオーバー
 */

const GROOVE_PATTERNS = [
  {
    id: '4beat',
    label: '🎹 4つ打ち (1・2・3・4)',
    desc: '拍頭ごとにコードを刻む基本バッキング',
    hitSteps: [0, 2, 4, 6], // 8分音符8ステップ (0=1, 1=1&, 2=2, 3=2&, 4=3, 5=3&, 6=4, 7=4&)
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
  subtitle: 'ドラムに合わせてコード伴奏とリズムを鍛える',
  ageLabel: 'オトナ学習',
  icon: '🥁',
  accentColor: '#38c976',

  mount(ctx) {
    let progId = PROGRESSIONS[0].id;
    let keyId = 'C';
    let patternId = GROOVE_PATTERNS[1].id; // デフォルト: ポップス8ビート
    let bpm = 90;
    let drumMode = 'drums'; // 'drums' | 'click'
    let showGuide = true;

    let chords = resolveProgression(progId, keyId);
    let pattern = GROOVE_PATTERNS.find((p) => p.id === patternId) || GROOVE_PATTERNS[0];

    let isRunning = false;
    let countInStepsLeft = 0; // 4拍カウントイン = 8ステップ
    let barIdx = 0;
    let stepIdx = 0; // 0..7
    let stepStartPerf = 0;
    let stepTimerId = null;

    let combo = 0;
    let totalJudged = 0;
    let totalGood = 0;
    let hitMarkers = []; // { stepPos, label, color, alpha }
    let stepHitDone = new Set(); // 現在の小節内で既にヒット判定済みのステップ
    let lastNoteBurstTs = 0;
    const recentChordBuffer = []; // 和音同時押しをまとめる短時間バッファ
    const pressedNotes = new Set();

    ctx.container.innerHTML = `
      <div class="game-stage-root game-groove">
        <canvas class="stage-canvas"></canvas>

        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip">🎯 <span class="js-acc">--%</span></span>
            <span class="hud-chip hud-chip-combo">🔥 <span class="js-combo">0</span></span>
            <span class="hud-chip js-bpm-chip">♩=${bpm}</span>
          </div>

          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-play-toggle">▶ スタート</button>
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ せってい ▾
            </button>

            <div class="stage-popover stage-popover-wide is-hidden js-opt-popover" role="dialog" aria-label="伴奏リズムせってい">
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
                <button type="button" class="seg-btn is-active js-drum-btn" data-dmode="drums">🥁 ドラム</button>
                <button type="button" class="seg-btn js-drum-btn" data-dmode="click">⏱️ クリック</button>
              </div>
              <button type="button" class="popover-item is-active js-gguide-toggle" style="margin-top:8px">
                <span>💡 鍵盤ガイド: ON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const root = ctx.container.querySelector('.game-stage-root');
    const canvas = ctx.container.querySelector('.stage-canvas');
    const c = canvas.getContext('2d');
    const accEl = ctx.container.querySelector('.js-acc');
    const comboEl = ctx.container.querySelector('.js-combo');
    const bpmChipEl = ctx.container.querySelector('.js-bpm-chip');
    const playToggleBtn = ctx.container.querySelector('.js-play-toggle');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const patBtns = ctx.container.querySelectorAll('[data-pat]');
    const bpmBtns = ctx.container.querySelectorAll('[data-bpm]');
    const keyBtns = ctx.container.querySelectorAll('[data-gkey]');
    const progBtns = ctx.container.querySelectorAll('[data-gprog]');
    const drumBtns = ctx.container.querySelectorAll('[data-dmode]');
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

    const getStepDurationMs = () => (60 / bpm / 2) * 1000; // 8分音符1ステップの長さ(ms)

    const syncHintKeys = () => {
      if (!showGuide) {
        ctx.setHintKeys([]);
        return;
      }
      const curChord = chords[barIdx % chords.length];
      ctx.setHintKeys(curChord.voicing, { ignoreOctave: true });
    };

    const stopLoop = () => {
      isRunning = false;
      if (stepTimerId) {
        clearTimeout(stepTimerId);
        stepTimerId = null;
      }
      playToggleBtn.textContent = '▶ スタート';
    };

    const scheduleNextStep = () => {
      if (!isRunning) return;
      const stepMs = getStepDurationMs();

      // 現在のステップの音を鳴らす
      if (countInStepsLeft > 0) {
        // カウントイン（2ステップ = 1拍ごとにクリック）
        if (countInStepsLeft % 2 === 0) {
          ctx.audio.playDrum(countInStepsLeft === 8 ? 'clickHigh' : 'clickLow', 0.9);
        }
        stepStartPerf = performance.now();
        countInStepsLeft--;
        if (countInStepsLeft === 0) {
          barIdx = 0;
          stepIdx = -1; // 次ステップで 0 になる
          stepHitDone.clear();
          syncHintKeys();
        }
      } else {
        stepIdx = (stepIdx + 1) % 8;
        if (stepIdx === 0 && stepStartPerf > 0) {
          barIdx = (barIdx + 1) % chords.length;
          stepHitDone.clear();
          syncHintKeys();
        }
        stepStartPerf = performance.now();

        if (drumMode === 'drums') {
          const hits = pattern.drum[stepIdx] || [];
          hits.forEach((d) => ctx.audio.playDrum(d, stepIdx === 0 ? 1.0 : 0.82));
        } else if (stepIdx % 2 === 0) {
          ctx.audio.playDrum(stepIdx === 0 ? 'clickHigh' : 'clickLow', 0.85);
        }
      }

      stepTimerId = setTimeout(scheduleNextStep, stepMs);
    };

    const startLoop = () => {
      ctx.audio.unlock();
      closePopover();
      stopLoop();
      isRunning = true;
      countInStepsLeft = 8; // 4拍カウントイン
      barIdx = 0;
      stepIdx = 0;
      stepStartPerf = 0;
      combo = 0;
      totalJudged = 0;
      totalGood = 0;
      hitMarkers = [];
      stepHitDone.clear();
      comboEl.textContent = '0';
      accEl.textContent = '--%';
      playToggleBtn.textContent = '⏹ ストップ';
      syncHintKeys();
      scheduleNextStep();
    };

    playToggleBtn.addEventListener('click', () => {
      if (isRunning) stopLoop();
      else startLoop();
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
        chords = resolveProgression(progId, keyId);
        syncHintKeys();
      });
    });

    progBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        progId = btn.dataset.gprog;
        progBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        chords = resolveProgression(progId, keyId);
        barIdx = 0;
        syncHintKeys();
        closePopover();
      });
    });

    drumBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        drumMode = btn.dataset.dmode;
        drumBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    guideBtn.addEventListener('click', () => {
      showGuide = !showGuide;
      guideBtn.classList.toggle('is-active', showGuide);
      guideBtn.innerHTML = `<span>💡 鍵盤ガイド: ${showGuide ? 'ON' : 'OFF'}</span>`;
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
      comboEl.textContent = String(combo);
      accEl.textContent = `${Math.round((totalGood / totalJudged) * 100)}%`;

      hitMarkers.push({ stepPos, label, color, alpha: 1.0, yOffset: 0 });
      if (hitMarkers.length > 24) hitMarkers.shift();
    };

    const evaluateStrike = () => {
      if (!isRunning || countInStepsLeft > 0 || stepIdx < 0) return;

      const stepMs = getStepDurationMs();
      const elapsedInStep = Math.max(0, Math.min(stepMs, performance.now() - stepStartPerf));
      const exactStepPos = stepIdx + elapsedInStep / stepMs; // 0..8

      // 最も近いターゲットステップを探す（小節またぎ考慮）
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

    let rafId = 0;

    const tick = (now) => {
      // 背景グラデーション
      const bg = c.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#121735');
      bg.addColorStop(1, '#1c244d');
      c.fillStyle = bg;
      c.fillRect(0, 0, width, height);

      const curChord = chords[barIdx % chords.length];
      const nextChord = chords[(barIdx + 1) % chords.length];

      // 進行名（上部中央にうっすら）
      c.fillStyle = 'rgba(200, 210, 255, 0.55)';
      c.font = '700 12px "Hiragino Maru Gothic ProN", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`${getProgressionById(progId).title}  |  Key: ${keyId}`, width / 2, 26);

      // 現在コードカード & 次コード予告
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
        // 現在のコード
        c.fillStyle = curChord.color;
        c.font = '800 15px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText(curChord.degree, width / 2, headerY - 34);

        c.fillStyle = '#ffffff';
        c.font = `900 ${Math.min(54, Math.round(height * 0.16))}px "Hiragino Maru Gothic ProN", sans-serif`;
        c.fillText(curChord.symbol, width / 2, headerY + 4);

        // 構成音
        const tonesText = curChord.noteLabels.map((n) => `${n.nameEn}(${n.solfege})`).join('  ');
        c.fillStyle = '#cbd2ff';
        c.font = '700 14px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText(tonesText, width / 2, headerY + 38);

        // 次のコード予告（右側）
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

      // 8ステップ（1小節）ビートタイムライン
      const padX = Math.max(24, width * 0.07);
      const trackW = width - padX * 2;
      const cellW = trackW / 8;
      const trackY = Math.min(height - 74, Math.max(headerY + 64, height * 0.62));
      const trackH = 52;

      for (let i = 0; i < 8; i++) {
        const x = padX + i * cellW;
        const isHitTarget = pattern.hitSteps.includes(i);
        const isCurrentStep = isRunning && countInStepsLeft === 0 && stepIdx === i;
        const isAlreadyHit = stepHitDone.has(i);

        // セル背景
        c.fillStyle = isCurrentStep
          ? 'rgba(255, 255, 255, 0.16)'
          : i % 2 === 0
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(255, 255, 255, 0.025)';
        c.fillRect(x + 2, trackY, cellW - 4, trackH);

        // ヒットすべきリズムブロック
        if (isHitTarget) {
          c.save();
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
          c.restore();
        }

        // 拍ラベル (1 & 2 & 3 & 4 &)
        c.fillStyle = i % 2 === 0 ? '#ffffff' : 'rgba(200, 210, 255, 0.55)';
        c.font = `${i % 2 === 0 ? '800 14px' : '700 12px'} "Hiragino Maru Gothic ProN", sans-serif`;
        c.fillText(STEP_LABELS[i], x + cellW / 2, trackY + trackH + 18);
      }

      // 滑らかに走るプレイヘッド
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
        c.fillStyle = 'rgba(255, 222, 125, 0.9)';
        c.font = '700 14px "Hiragino Maru Gothic ProN", sans-serif';
        c.fillText('右上の「▶ スタート」を押してドラムに合わせてコードを刻もう！', width / 2, trackY - 16);
      }

      // 判定ポップアップ
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

      rafId = requestAnimationFrame(tick);
    };

    syncHintKeys();
    rafId = requestAnimationFrame(tick);

    return {
      onNoteOn(noteInfo) {
        pressedNotes.add(noteInfo.midi);
        const now = performance.now();
        // 和音の同時押し（65ms以内の連続NoteOn）は1回のストロークとして判定する
        while (recentChordBuffer.length > 0 && now - recentChordBuffer[0].ts > 120) {
          recentChordBuffer.shift();
        }
        recentChordBuffer.push({ midi: noteInfo.midi, ts: now });

        if (now - lastNoteBurstTs > 75) {
          lastNoteBurstTs = now;
          // 少しだけ(35ms)和音の残りの指が揃うのを待ってから判定
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
