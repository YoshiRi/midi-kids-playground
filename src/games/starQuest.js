import { getNoteInfo, matchesNote } from '../core/notes.js';

/**
 * ミニゲーム2: ひかるけんばん・ほしあつめクエスト (4〜8さい向け)
 * 光った鍵盤やお手本と同じ音を弾いて星を集める！
 */

const PRAISES = ['すごい！✨', 'やったね！🌟', 'ばっちり！🎉', 'きらきら！💫', 'てんさい！👑'];
const QUEST_NOTES_C4_C5 = [60, 62, 64, 65, 67, 69, 71, 72]; // C4〜C5 の白鍵

export const starQuestGame = {
  id: 'star-quest',
  title: 'ほしあつめクエスト',
  subtitle: 'ひかる けんばんを おして ほしを ゲット！',
  ageLabel: '4〜8さい',
  icon: '⭐',
  accentColor: '#ffca3a',

  mount(ctx) {
    let difficulty = 'easy'; // 'easy' (ガイドあり+オクターブ無視) | 'exact' (ぴったりC4-C5) | 'ear' (みみクイズ: ガイドなし)
    let score = 0;
    let combo = 0;
    let targetMidi = 60;
    let locked = false;
    let nextTimer = null;

    ctx.container.innerHTML = `
      <div class="game-quest">
        <div class="game-toolbar">
          <div class="mode-pills" role="group" aria-label="むずかしさ">
            <button type="button" class="pill-btn is-active" data-diff="easy">🌱 やさしい</button>
            <button type="button" class="pill-btn" data-diff="exact">🎯 ぴったり</button>
            <button type="button" class="pill-btn" data-diff="ear">👂 みみクイズ</button>
          </div>
          <div class="quest-stats">
            <span class="stat-badge">⭐ <span class="js-score">0</span></span>
            <span class="stat-badge stat-combo">🔥 <span class="js-combo">0</span> コンボ</span>
          </div>
        </div>

        <div class="quest-stage">
          <div class="quest-stars-track js-track" aria-label="あつめた ほし"></div>

          <div class="quest-target-card js-target-card">
            <div class="quest-target-emoji js-target-emoji">⭐</div>
            <div class="quest-target-note js-target-note">ド</div>
            <div class="quest-target-sub js-target-sub">どの「ド」でもOK！</div>
          </div>

          <div class="quest-feedback js-feedback" aria-live="polite"></div>

          <div class="quest-actions">
            <button type="button" class="action-btn js-listen-btn">🔊 おてほんを きく</button>
            <button type="button" class="action-btn action-btn-sub js-skip-btn">⏭️ つぎの おと</button>
          </div>
        </div>
      </div>
    `;

    const scoreEl = ctx.container.querySelector('.js-score');
    const comboEl = ctx.container.querySelector('.js-combo');
    const trackEl = ctx.container.querySelector('.js-track');
    const cardEl = ctx.container.querySelector('.js-target-card');
    const emojiEl = ctx.container.querySelector('.js-target-emoji');
    const noteEl = ctx.container.querySelector('.js-target-note');
    const subEl = ctx.container.querySelector('.js-target-sub');
    const feedbackEl = ctx.container.querySelector('.js-feedback');
    const listenBtn = ctx.container.querySelector('.js-listen-btn');
    const skipBtn = ctx.container.querySelector('.js-skip-btn');
    const diffBtns = ctx.container.querySelectorAll('.pill-btn');

    const renderTrack = () => {
      const filled = score % 10;
      const trophies = Math.floor(score / 10);
      let html = '';
      for (let i = 0; i < trophies; i++) {
        html += `<span class="track-trophy" title="10ほし達成">🏆</span>`;
      }
      for (let i = 0; i < 10; i++) {
        html += `<span class="track-star ${i < filled ? 'is-filled' : ''}">★</span>`;
      }
      trackEl.innerHTML = html;
    };

    const pickNextTarget = ({ playDemo = true } = {}) => {
      const pool = difficulty === 'easy'
        ? [60, 62, 64, 65, 67, 69, 71] // C4〜B4
        : QUEST_NOTES_C4_C5;
      let next = targetMidi;
      let guard = 0;
      while (next === targetMidi && guard < 10) {
        next = pool[Math.floor(Math.random() * pool.length)];
        guard++;
      }
      targetMidi = next;
      const info = getNoteInfo(targetMidi);

      cardEl.classList.remove('is-pop', 'is-shake');
      void cardEl.offsetWidth;

      if (difficulty === 'ear') {
        cardEl.style.setProperty('--target-color', '#7c6ff6');
        emojiEl.textContent = '🎧';
        noteEl.textContent = '？';
        subEl.textContent = 'おとを きいて あててみよう！';
        ctx.setHintKeys([]);
      } else {
        cardEl.style.setProperty('--target-color', info.color);
        emojiEl.textContent = info.emoji;
        noteEl.textContent = difficulty === 'exact' ? info.solfegeWithOctave : info.solfege;
        subEl.textContent = difficulty === 'easy'
          ? `ひかってる「${info.solfege}」を おしてね（どの たかさでもOK）`
          : `ひかってる「${info.solfegeWithOctave} (${info.nameEn})」を おしてね`;
        ctx.setHintKeys([targetMidi], { ignoreOctave: difficulty === 'easy' });
      }

      if (playDemo) {
        setTimeout(() => {
          ctx.audio.playDemoNote(targetMidi, 480, 0.65);
        }, 120);
      }
    };

    const showFeedback = (text, kind = 'good') => {
      feedbackEl.textContent = text;
      feedbackEl.className = `quest-feedback is-visible is-${kind}`;
    };

    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        diffBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        feedbackEl.className = 'quest-feedback';
        pickNextTarget({ playDemo: true });
      });
    });

    listenBtn.addEventListener('click', () => {
      ctx.audio.unlock();
      ctx.audio.playDemoNote(targetMidi, 550, 0.7);
    });

    skipBtn.addEventListener('click', () => {
      ctx.audio.unlock();
      combo = 0;
      comboEl.textContent = '0';
      pickNextTarget({ playDemo: true });
    });

    renderTrack();
    pickNextTarget({ playDemo: false });

    return {
      onNoteOn(noteInfo) {
        if (locked) return;
        const ignoreOctave = difficulty === 'easy' || difficulty === 'ear';
        const ok = matchesNote(noteInfo.midi, targetMidi, { ignoreOctave });

        if (ok) {
          locked = true;
          score++;
          combo++;
          scoreEl.textContent = String(score);
          comboEl.textContent = String(combo);
          renderTrack();

          const targetInfo = getNoteInfo(targetMidi);
          if (difficulty === 'ear') {
            cardEl.style.setProperty('--target-color', targetInfo.color);
            emojiEl.textContent = targetInfo.emoji;
            noteEl.textContent = targetInfo.solfege;
          }

          cardEl.classList.add('is-pop');
          const praise = PRAISES[score % PRAISES.length];
          showFeedback(score % 10 === 0 ? '🏆 10こ たっせい！ だいせいかい！' : praise, 'good');

          if (score % 10 === 0) {
            ctx.audio.playSfx('clear');
          } else if (combo >= 3 && combo % 3 === 0) {
            ctx.audio.playSfx('combo');
          } else {
            ctx.audio.playSfx('correct');
          }

          nextTimer = setTimeout(() => {
            locked = false;
            pickNextTarget({ playDemo: true });
          }, 720);
        } else {
          combo = 0;
          comboEl.textContent = '0';
          cardEl.classList.remove('is-shake');
          void cardEl.offsetWidth;
          cardEl.classList.add('is-shake');
          showFeedback(
            difficulty === 'ear'
              ? `いまのは「${noteInfo.solfege}」だよ。もういちど きいてみよう！`
              : `いまのは「${noteInfo.solfege}」！ひかってる けんばんを おしてみよう♪`,
            'oops'
          );
          ctx.audio.playSfx('softOops');
        }
      },

      onNoteOff() {},

      unmount() {
        if (nextTimer) clearTimeout(nextTimer);
        ctx.setHintKeys([]);
      },
    };
  },
};
