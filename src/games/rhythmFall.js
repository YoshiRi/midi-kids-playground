import { getNoteInfo, matchesNote } from '../core/notes.js';
import { SONGS } from '../data/songs.js';

/**
 * ミニゲーム3: おちてくるノーツ・リズムえんそう (5さい〜向け)
 * UIルール準拠: Canvasをステージ100%全面表示し、曲・モード・はやさはフローティングポップオーバーに集約
 */

const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72;

const SPEEDS = [
  { rate: 0.65, label: '超ゆっくり' },
  { rate: 0.85, label: 'ゆっくり' },
  { rate: 1.05, label: 'ふつう' },
];

export const rhythmFallGame = {
  id: 'rhythm-fall',
  title: 'リズムえんそう',
  subtitle: 'おちてくる オンぷに あわせて ひこう！',
  ageLabel: '5さい〜',
  icon: '🎵',
  accentColor: '#1982c4',

  mount(ctx) {
    let selectedSong = SONGS[0];
    let playMode = 'wait'; // 'wait' | 'flow'
    let speedIdx = 1;
    let speedRate = SPEEDS[speedIdx].rate;
    let ignoreOctave = true;

    let state = 'ready'; // 'ready' | 'playing' | 'finished'
    let currentBeat = 0;
    let lastFrameTime = 0;
    let notes = [];
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let hitCount = 0;
    let waitingNoteId = null;

    const bursts = [];
    const popups = [];
    const confetti = [];

    ctx.container.innerHTML = `
      <div class="game-stage-root game-rhythm">
        <canvas class="stage-canvas"></canvas>

        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip">🌟 <span class="js-score">0</span></span>
            <span class="hud-chip hud-chip-combo">🔥 <span class="js-combo">0</span></span>
          </div>

          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-restart-btn is-hidden" title="さいしょから やりなおす">
              🔄
            </button>
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ <span class="js-opt-summary">${selectedSong.title}</span> ▾
            </button>

            <div class="stage-popover is-hidden js-opt-popover" role="dialog" aria-label="きょく・モードせってい">
              <div class="popover-title">きょくを えらぶ</div>
              <div class="popover-list">
                ${SONGS.map(
                  (s) => `
                    <button type="button" class="popover-item ${s.id === selectedSong.id ? 'is-active' : ''}" data-song="${s.id}">
                      <span>${s.title}</span>
                    </button>
                  `
                ).join('')}
              </div>

              <div class="popover-divider"></div>
              <div class="popover-title">えんそうモード</div>
              <div class="popover-segmented">
                <button type="button" class="seg-btn is-active" data-rmode="wait">🐢 まつ</button>
                <button type="button" class="seg-btn" data-rmode="flow">🚀 リズム</button>
              </div>

              <div class="popover-title popover-title-spaced">はやさ</div>
              <div class="popover-segmented">
                ${SPEEDS.map(
                  (sp, i) => `
                    <button type="button" class="seg-btn ${i === speedIdx ? 'is-active' : ''}" data-speed="${i}">${sp.label}</button>
                  `
                ).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="rhythm-overlay js-overlay">
          <div class="overlay-card">
            <div class="overlay-title js-overlay-title">${selectedSong.title}</div>
            <div class="overlay-desc js-overlay-desc">
              🐢 まつモード：ひかる けんばんを おすまで まってくれるよ！
            </div>
            <button type="button" class="action-btn action-btn-lg js-big-start">🎹 えんそう スタート！</button>
          </div>
        </div>
      </div>
    `;

    const root = ctx.container.querySelector('.game-stage-root');
    const canvas = ctx.container.querySelector('.stage-canvas');
    const c = canvas.getContext('2d');
    const scoreEl = ctx.container.querySelector('.js-score');
    const comboEl = ctx.container.querySelector('.js-combo');
    const restartBtn = ctx.container.querySelector('.js-restart-btn');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optSummary = ctx.container.querySelector('.js-opt-summary');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const songBtns = ctx.container.querySelectorAll('[data-song]');
    const modeBtns = ctx.container.querySelectorAll('[data-rmode]');
    const speedBtns = ctx.container.querySelectorAll('[data-speed]');
    const overlayEl = ctx.container.querySelector('.js-overlay');
    const overlayTitle = ctx.container.querySelector('.js-overlay-title');
    const overlayDesc = ctx.container.querySelector('.js-overlay-desc');
    const bigStartBtn = ctx.container.querySelector('.js-big-start');

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

    const updateReadyCard = () => {
      optSummary.textContent = selectedSong.title;
      overlayTitle.textContent = selectedSong.title;
      overlayDesc.textContent = playMode === 'wait'
        ? '🐢 まつモード：ひかる けんばんを おすまで まってくれるよ！'
        : '🚀 リズムモード：せんに かさなったら タイミングよく おそう！';
      bigStartBtn.textContent = '🎹 えんそう スタート！';
      overlayEl.classList.remove('is-hidden');
      restartBtn.classList.add('is-hidden');
    };

    const startSong = () => {
      ctx.audio.unlock();
      closePopover();
      notes = selectedSong.notes.map((n) => ({
        ...n,
        info: getNoteInfo(n.midi),
        status: 'pending',
      }));
      currentBeat = 0;
      score = 0;
      combo = 0;
      maxCombo = 0;
      hitCount = 0;
      waitingNoteId = null;
      confetti.length = 0;
      bursts.length = 0;
      popups.length = 0;
      scoreEl.textContent = '0';
      comboEl.textContent = '0';
      state = 'playing';
      lastFrameTime = performance.now();
      overlayEl.classList.add('is-hidden');
      restartBtn.classList.remove('is-hidden');
      syncHintKey();
    };

    const finishSong = () => {
      state = 'finished';
      ctx.setHintKeys([]);
      ctx.audio.playSfx('clear');

      const ratio = notes.length > 0 ? hitCount / notes.length : 1;
      const stars = ratio >= 0.9 ? '⭐⭐⭐' : ratio >= 0.6 ? '⭐⭐' : '⭐';
      overlayTitle.textContent = `${stars} クリア！`;
      overlayDesc.textContent = `${selectedSong.title}  スコア: ${score}  さいだいコンボ: ${maxCombo}`;
      bigStartBtn.textContent = '🔁 もういっかい ひく！';
      overlayEl.classList.remove('is-hidden');

      const colors = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#ff66b3'];
      for (let i = 0; i < 65; i++) {
        confetti.push({
          x: Math.random() * width,
          y: -20 - Math.random() * 140,
          vx: (Math.random() - 0.5) * 2.5,
          vy: 1.8 + Math.random() * 2.8,
          size: 6 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.16,
          color: colors[i % colors.length],
        });
      }
    };

    const getNextPendingNote = () => notes.find((n) => n.status === 'pending') || null;

    const syncHintKey = () => {
      if (state !== 'playing') {
        ctx.setHintKeys([]);
        return;
      }
      const next = getNextPendingNote();
      if (next && next.beat - currentBeat <= 2.2) {
        ctx.setHintKeys([next.midi], { ignoreOctave });
      } else {
        ctx.setHintKeys([]);
      }
    };

    const spawnHitEffect = (x, y, color, label) => {
      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18;
        const sp = 2 + Math.random() * 3.5;
        bursts.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 1,
          size: 3 + Math.random() * 3.5,
          color: i % 3 === 0 ? '#ffffff' : color,
          alpha: 1,
        });
      }
      popups.push({
        x,
        y: y - 16,
        vy: -1.4,
        text: label,
        color,
        alpha: 1,
      });
    };

    songBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSong = SONGS.find((s) => s.id === btn.dataset.song) || SONGS[0];
        songBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        state = 'ready';
        ctx.setHintKeys([]);
        closePopover();
        updateReadyCard();
      });
    });

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        playMode = btn.dataset.rmode;
        modeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        if (state === 'ready') updateReadyCard();
      });
    });

    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedIdx = Number(btn.dataset.speed) || 0;
        speedRate = SPEEDS[speedIdx].rate;
        speedBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    restartBtn.addEventListener('click', startSong);
    bigStartBtn.addEventListener('click', startSong);

    const visibleBeats = 4.2;
    let rafId = 0;

    const tick = (now) => {
      const dtSec = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const hitY = height - 40;
      const pixelsPerBeat = (hitY - 26) / visibleBeats;

      if (state === 'playing') {
        const beatsPerSec = (selectedSong.bpm / 60) * speedRate;
        const nextPending = getNextPendingNote();

        if (playMode === 'wait' && nextPending && currentBeat >= nextPending.beat) {
          currentBeat = nextPending.beat;
          waitingNoteId = nextPending.id;
        } else {
          waitingNoteId = null;
          currentBeat += dtSec * beatsPerSec;
        }

        if (playMode === 'flow') {
          for (const n of notes) {
            if (n.status === 'pending' && currentBeat - n.beat > 0.72) {
              n.status = 'missed';
              combo = 0;
              comboEl.textContent = '0';
            }
          }
        }

        syncHintKey();

        const allDone = notes.every((n) => n.status !== 'pending');
        const lastBeat = notes.length > 0 ? notes[notes.length - 1].beat : 0;
        if (allDone && (playMode === 'wait' || currentBeat > lastBeat + 1.0)) {
          finishSong();
        }
      }

      const bgGrad = c.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#14183d');
      bgGrad.addColorStop(1, '#232459');
      c.fillStyle = bgGrad;
      c.fillRect(0, 0, width, height);

      const laneNotes = [C4, D4, E4, F4, G4, A4, B4, C5];
      for (const m of laneNotes) {
        const lx = ctx.keyboard.getKeyNormalizedX(m) * width;
        const info = getNoteInfo(m);
        c.strokeStyle = `${info.color}22`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(lx, 0);
        c.lineTo(lx, hitY);
        c.stroke();

        c.fillStyle = `${info.color}28`;
        c.strokeStyle = `${info.color}77`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(lx, hitY, 15, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }

      c.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(12, hitY);
      c.lineTo(width - 12, hitY);
      c.stroke();

      // 最上部に薄い進捗バー
      if (notes.length > 0) {
        const progress = notes.filter((n) => n.status !== 'pending').length / notes.length;
        c.fillStyle = 'rgba(255,255,255,0.12)';
        c.fillRect(0, 0, width, 4);
        c.fillStyle = '#ffca3a';
        c.fillRect(0, 0, width * progress, 4);
      }

      const pulse = 0.5 + 0.5 * Math.sin(now * 0.01);
      for (const n of notes) {
        if (n.status !== 'pending') continue;
        const beatDiff = n.beat - currentBeat;
        if (beatDiff > visibleBeats + 0.8 || beatDiff < -1.2) continue;

        const x = ctx.keyboard.getKeyNormalizedX(n.midi) * width;
        const y = hitY - beatDiff * pixelsPerBeat;
        const isWaiting = waitingNoteId === n.id;
        const radius = isWaiting ? 24 + pulse * 4 : 21;

        if (isWaiting) {
          c.save();
          c.strokeStyle = '#ffffff';
          c.lineWidth = 4;
          c.globalAlpha = 0.45 + pulse * 0.55;
          c.beginPath();
          c.arc(x, y, radius + 7, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        }

        c.save();
        c.fillStyle = n.info.color;
        c.shadowColor = n.info.color;
        c.shadowBlur = isWaiting ? 20 : 10;
        c.beginPath();
        c.arc(x, y, radius, 0, Math.PI * 2);
        c.fill();

        c.lineWidth = 3;
        c.strokeStyle = '#ffffff';
        c.stroke();

        c.shadowBlur = 0;
        c.fillStyle = '#ffffff';
        c.font = `800 ${isWaiting ? 18 : 16}px "Hiragino Maru Gothic ProN", sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(n.info.solfege, x, y + 1);
        c.restore();
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.1;
        b.alpha -= 0.03;
        if (b.alpha <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = b.alpha;
        c.fillStyle = b.color;
        c.beginPath();
        c.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y += p.vy;
        p.alpha -= 0.025;
        if (p.alpha <= 0) {
          popups.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = p.alpha;
        c.font = '800 22px "Hiragino Maru Gothic ProN", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineWidth = 4;
        c.strokeStyle = '#14183d';
        c.strokeText(p.text, p.x, p.y);
        c.fillStyle = '#ffde7d';
        c.fillText(p.text, p.x, p.y);
        c.restore();
      }

      for (const cf of confetti) {
        cf.x += cf.vx;
        cf.y += cf.vy;
        cf.rot += cf.vrot;
        if (cf.y > height + 20) cf.y = -15;
        c.save();
        c.translate(cf.x, cf.y);
        c.rotate(cf.rot);
        c.fillStyle = cf.color;
        c.fillRect(-cf.size / 2, -cf.size / 3, cf.size, cf.size * 0.66);
        c.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
    updateReadyCard();

    return {
      onNoteOn(noteInfo) {
        if (state !== 'playing') return;

        const hitY = height - 40;
        const nextPending = getNextPendingNote();
        if (!nextPending) return;

        if (playMode === 'wait') {
          const canHitNow = nextPending.beat - currentBeat <= 1.1;
          if (canHitNow && matchesNote(noteInfo.midi, nextPending.midi, { ignoreOctave })) {
            nextPending.status = 'hit';
            waitingNoteId = null;
            hitCount++;
            combo++;
            maxCombo = Math.max(maxCombo, combo);
            score += 100 + Math.min(combo * 10, 100);
            scoreEl.textContent = String(score);
            comboEl.textContent = String(combo);

            const x = ctx.keyboard.getKeyNormalizedX(nextPending.midi) * width;
            spawnHitEffect(x, hitY, nextPending.info.color, combo >= 5 ? 'すごい！✨' : 'やったね！');
            syncHintKey();
          }
          return;
        }

        const candidates = notes.filter(
          (n) =>
            n.status === 'pending' &&
            Math.abs(n.beat - currentBeat) <= 0.72 &&
            matchesNote(noteInfo.midi, n.midi, { ignoreOctave })
        );
        if (candidates.length === 0) return;

        candidates.sort((a, b) => Math.abs(a.beat - currentBeat) - Math.abs(b.beat - currentBeat));
        const target = candidates[0];
        const diff = Math.abs(target.beat - currentBeat);
        target.status = 'hit';
        hitCount++;
        combo++;
        maxCombo = Math.max(maxCombo, combo);

        const isPerfect = diff <= 0.28;
        score += (isPerfect ? 150 : 100) + Math.min(combo * 10, 100);
        scoreEl.textContent = String(score);
        comboEl.textContent = String(combo);

        const x = ctx.keyboard.getKeyNormalizedX(target.midi) * width;
        spawnHitEffect(x, hitY, target.info.color, isPerfect ? 'PERFECT!!✨' : 'GOOD!🌟');
        syncHintKey();
      },

      onNoteOff() {},

      unmount() {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
