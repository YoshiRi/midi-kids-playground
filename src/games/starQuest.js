import { getNoteInfo, matchesNote } from '../core/notes.js';

/**
 * ミニゲーム2: ひかるけんばん・ほしあつめクエスト (4〜8さい向け)
 * UIルール準拠: ステージ全面を使い、スコアと難易度切替はフローティングHUD＆ポップオーバー配置
 */

const PRAISES = ['すごい！✨', 'やったね！🌟', 'ばっちり！🎉', 'きらきら！💫', 'てんさい！👑'];
const QUEST_NOTES_C4_C5 = [60, 62, 64, 65, 67, 69, 71, 72];

const DIFFS = [
  { id: 'easy', icon: '🌱', label: 'やさしい', desc: 'どのたかさでもOK＋ガイドあり' },
  { id: 'exact', icon: '🎯', label: 'ぴったり', desc: 'ひかる位置をぴったり弾く' },
  { id: 'ear', icon: '👂', label: 'みみクイズ', desc: 'おとをきいて当てる' },
];

export const starQuestGame = {
  id: 'star-quest',
  title: 'ほしあつめクエスト',
  subtitle: 'ひかる けんばんを おして ほしを ゲット！',
  ageLabel: '4〜8さい',
  icon: '⭐',
  accentColor: '#ffca3a',

  mount(ctx) {
    let difficulty = 'easy';
    let score = 0;
    let combo = 0;
    let targetMidi = 60;
    let locked = false;
    let nextTimer = null;

    ctx.container.innerHTML = `
      <div class="game-stage-root game-quest">
        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip">⭐ <span class="js-score">0</span></span>
            <span class="hud-chip hud-chip-combo">🔥 <span class="js-combo">0</span></span>
          </div>
          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              <span class="js-diff-label">🌱 やさしい</span> ▾
            </button>
            <div class="stage-popover is-hidden js-opt-popover" role="dialog" aria-label="むずかしさ">
              <div class="popover-title">むずかしさ</div>
              <div class="popover-list">
                ${DIFFS.map(
                  (d) => `
                    <button type="button" class="popover-item ${d.id === difficulty ? 'is-active' : ''}" data-diff="${d.id}">
                      <span class="popover-item-main">${d.icon} ${d.label}</span>
                      <span class="popover-item-sub">${d.desc}</span>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
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
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const diffLabelEl = ctx.container.querySelector('.js-diff-label');
    const diffBtns = ctx.container.querySelectorAll('[data-diff]');

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
        ? [60, 62, 64, 65, 67, 69, 71]
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
        const found = DIFFS.find((d) => d.id === difficulty) || DIFFS[0];
        diffLabelEl.textContent = `${found.icon} ${found.label}`;
        diffBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        feedbackEl.className = 'quest-feedback';
        closePopover();
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
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
