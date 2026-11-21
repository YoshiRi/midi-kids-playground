import { getNoteInfo, matchesNote } from '../core/notes.js';

/**
 * ミニゲーム3: おちてくるノーツ・リズムえんそう (5さい〜向け)
 * - まつモード（Wait Mode）: 弾くまで待ってくれるから幼児でも必ず最後まで弾ける！
 * - リズムモード（Flow Mode）: 一定テンポで落ちてくるノーツをタイミングよく弾く！
 */

const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72;

/**
 * [midiNote, durationBeats] の配列から開始拍(beat)付きノーツ配列を生成
 */
function buildNotes(pattern) {
  let beat = 1.5; // スタート前の準備拍
  return pattern.map(([midi, dur = 1], idx) => {
    const item = { id: idx, midi, beat, dur };
    beat += dur;
    return item;
  });
}

const SONGS = [
  {
    id: 'twinkle',
    title: '⭐ きらきらぼし',
    bpm: 96,
    notes: buildNotes([
      [C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 2],
      [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [D4, 1], [C4, 2],
      [G4, 1], [G4, 1], [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 2],
      [G4, 1], [G4, 1], [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 2],
      [C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 2],
      [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [D4, 1], [C4, 2],
    ]),
  },
  {
    id: 'frog',
    title: '🐸 かえるのうた',
    bpm: 100,
    notes: buildNotes([
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 2],
      [E4, 1], [F4, 1], [G4, 1], [A4, 1], [G4, 1], [F4, 1], [E4, 2],
      [C4, 1.5], [C4, 1.5], [C4, 1.5], [C4, 1.5],
      [C4, 0.75], [C4, 0.75], [D4, 0.75], [D4, 0.75], [E4, 0.75], [E4, 0.75], [F4, 0.75], [F4, 0.75],
      [E4, 1], [D4, 1], [C4, 2],
    ]),
  },
  {
    id: 'tulip',
    title: '🌷 チューリップ',
    bpm: 98,
    notes: buildNotes([
      [C4, 1], [D4, 1], [E4, 2],
      [C4, 1], [D4, 1], [E4, 2],
      [G4, 1], [E4, 1], [D4, 1], [C4, 1], [D4, 1], [E4, 1], [D4, 2],
      [C4, 1], [D4, 1], [E4, 2],
      [C4, 1], [D4, 1], [E4, 2],
      [G4, 1], [E4, 1], [D4, 1], [C4, 1], [D4, 1], [E4, 1], [C4, 2],
      [G4, 0.8], [G4, 0.8], [E4, 0.8], [G4, 0.8], [A4, 0.8], [A4, 0.8], [G4, 1.6],
      [E4, 0.8], [E4, 0.8], [D4, 0.8], [D4, 0.8], [C4, 2],
    ]),
  },
  {
    id: 'mary',
    title: '🐑 メリーさんのひつじ',
    bpm: 102,
    notes: buildNotes([
      [E4, 1], [D4, 1], [C4, 1], [D4, 1],
      [E4, 1], [E4, 1], [E4, 2],
      [D4, 1], [D4, 1], [D4, 2],
      [E4, 1], [G4, 1], [G4, 2],
      [E4, 1], [D4, 1], [C4, 1], [D4, 1],
      [E4, 1], [E4, 1], [E4, 1], [E4, 1],
      [D4, 1], [D4, 1], [E4, 1], [D4, 1],
      [C4, 2.5],
    ]),
  },
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
    let speedRate = 0.85;  // 0.7 | 0.85 | 1.05
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
      <div class="game-rhythm">
        <div class="game-toolbar rhythm-toolbar">
          <div class="rhythm-controls-left">
            <select class="select-pill js-song-select" aria-label="きょくをえらぶ">
              ${SONGS.map((s) => `<option value="${s.id}">${s.title}</option>`).join('')}
            </select>
            <div class="mode-pills" role="group" aria-label="えんそうモード">
              <button type="button" class="pill-btn is-active" data-rmode="wait">🐢 まつモード</button>
              <button type="button" class="pill-btn" data-rmode="flow">🚀 リズムモード</button>
            </div>
            <button type="button" class="pill-btn js-speed-btn" title="はやさをかえる">はやさ: ゆっくり</button>
          </div>
          <div class="rhythm-stats">
            <span class="stat-badge">🌟 <span class="js-score">0</span></span>
            <span class="stat-badge stat-combo">🔥 <span class="js-combo">0</span></span>
            <button type="button" class="action-btn action-btn-sm js-start-btn">▶ スタート</button>
          </div>
        </div>

        <div class="stage-canvas-wrap rhythm-canvas-wrap">
          <canvas class="stage-canvas"></canvas>
          <div class="rhythm-overlay js-overlay">
            <div class="overlay-card js-overlay-card">
              <div class="overlay-title js-overlay-title">⭐ きらきらぼし</div>
              <div class="overlay-desc js-overlay-desc">
                🐢 まつモード：ひかる けんばんを おすまで まってくれるよ！
              </div>
              <button type="button" class="action-btn action-btn-lg js-big-start">🎹 えんそう スタート！</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = ctx.container.querySelector('.stage-canvas');
    const c = canvas.getContext('2d');
    const songSelect = ctx.container.querySelector('.js-song-select');
    const modeBtns = ctx.container.querySelectorAll('[data-rmode]');
    const speedBtn = ctx.container.querySelector('.js-speed-btn');
    const scoreEl = ctx.container.querySelector('.js-score');
    const comboEl = ctx.container.querySelector('.js-combo');
    const startBtn = ctx.container.querySelector('.js-start-btn');
    const overlayEl = ctx.container.querySelector('.js-overlay');
    const overlayTitle = ctx.container.querySelector('.js-overlay-title');
    const overlayDesc = ctx.container.querySelector('.js-overlay-desc');
    const bigStartBtn = ctx.container.querySelector('.js-big-start');

    let width = 800;
    let height = 340;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(200, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const updateReadyCard = () => {
      overlayTitle.textContent = selectedSong.title;
      overlayDesc.textContent = playMode === 'wait'
        ? '🐢 まつモード：ひかる けんばんを おすまで まってくれるよ！'
        : '🚀 リズムモード：せんに かさなったら タイミングよく おそう！';
      bigStartBtn.textContent = '🎹 えんそう スタート！';
      overlayEl.classList.remove('is-hidden');
    };

    const startSong = () => {
      ctx.audio.unlock();
      notes = selectedSong.notes.map((n) => ({
        ...n,
        info: getNoteInfo(n.midi),
        status: 'pending', // 'pending' | 'hit' | 'missed'
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
      startBtn.textContent = '🔄 やりなおす';
      overlayEl.classList.add('is-hidden');
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

      // 紙吹雪
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

    songSelect.addEventListener('change', () => {
      selectedSong = SONGS.find((s) => s.id === songSelect.value) || SONGS[0];
      state = 'ready';
      ctx.setHintKeys([]);
      startBtn.textContent = '▶ スタート';
      updateReadyCard();
    });

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        playMode = btn.dataset.rmode;
        modeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        if (state === 'ready') updateReadyCard();
      });
    });

    const SPEEDS = [
      { rate: 0.65, label: 'はやさ: 超ゆっくり' },
      { rate: 0.85, label: 'はやさ: ゆっくり' },
      { rate: 1.05, label: 'はやさ: ふつう' },
    ];
    let speedIdx = 1;
    speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      speedRate = SPEEDS[speedIdx].rate;
      speedBtn.textContent = SPEEDS[speedIdx].label;
    });

    startBtn.addEventListener('click', startSong);
    bigStartBtn.addEventListener('click', startSong);

    const visibleBeats = 4.2; // 画面上端からヒットラインまで何拍分見えるか
    let rafId = 0;

    const tick = (now) => {
      const dtSec = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const hitY = height - 42;
      const pixelsPerBeat = (hitY - 22) / visibleBeats;

      // 曲の進行
      if (state === 'playing') {
        const beatsPerSec = (selectedSong.bpm / 60) * speedRate;
        const nextPending = getNextPendingNote();

        if (playMode === 'wait' && nextPending && currentBeat >= nextPending.beat) {
          // 弾くまでヒットラインでピタッと待つ！
          currentBeat = nextPending.beat;
          waitingNoteId = nextPending.id;
        } else {
          waitingNoteId = null;
          currentBeat += dtSec * beatsPerSec;
        }

        // リズムモードでの見送り判定
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

        // 終了チェック
        const allDone = notes.every((n) => n.status !== 'pending');
        const lastBeat = notes.length > 0 ? notes[notes.length - 1].beat : 0;
        if (allDone && (playMode === 'wait' || currentBeat > lastBeat + 1.0)) {
          finishSong();
        }
      }

      // 背景描画
      const bgGrad = c.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#14183d');
      bgGrad.addColorStop(1, '#232459');
      c.fillStyle = bgGrad;
      c.fillRect(0, 0, width, height);

      // 白鍵レーンガイド線
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

        // ヒットライン上のターゲット丸枠
        c.fillStyle = `${info.color}28`;
        c.strokeStyle = `${info.color}77`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(lx, hitY, 15, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }

      // ヒットライン本体
      c.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(12, hitY);
      c.lineTo(width - 12, hitY);
      c.stroke();

      // 進捗バー（上部）
      if (notes.length > 0) {
        const progress = notes.filter((n) => n.status !== 'pending').length / notes.length;
        c.fillStyle = 'rgba(255,255,255,0.14)';
        c.fillRect(14, 10, width - 28, 7);
        c.fillStyle = '#ffca3a';
        c.fillRect(14, 10, (width - 28) * progress, 7);
      }

      // ノーツ描画
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.01);
      for (const n of notes) {
        if (n.status !== 'pending') continue;
        const beatDiff = n.beat - currentBeat;
        if (beatDiff > visibleBeats + 0.8 || beatDiff < -1.2) continue;

        const x = ctx.keyboard.getKeyNormalizedX(n.midi) * width;
        const y = hitY - beatDiff * pixelsPerBeat;
        const isWaiting = waitingNoteId === n.id;
        const radius = isWaiting ? 24 + pulse * 4 : 21;

        // 待ち状態の光輪
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

        // ノーツ本体（カラフルな円＋ハイライト）
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

      // ヒットパーティクル
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

      // 判定ポップアップ文字
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

      // クリア紙吹雪
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

        const hitY = height - 42;
        const nextPending = getNextPendingNote();
        if (!nextPending) return;

        // まつモード: 現在の次ノーツ（少し先押しも許容）
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

        // リズムモード: ヒットウィンドウ内の最も近い一致ノーツを探す
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
        ctx.setHintKeys([]);
      },
    };
  },
};
