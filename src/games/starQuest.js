import { getNoteInfo, matchesNote } from '../core/notes.js';
import { SONGS, getSongById, splitIntoPhrases } from '../data/songs.js';

/**
 * ミニゲーム2: ひかるけんばん・ほしあつめクエスト (4〜8さい向け)
 * - 意味のある旋律（きらきらぼし・かえるのうた・チューリップ等）をベースに1音ずつ星を集める
 * - 弾いた音そのものがメロディとして綺麗に繋がるテンポ＆効果音設計
 * - フレーズお手本再生・おまかせ連続メロディ・ランダムモード対応
 */

const PRAISES = ['すごい！✨', 'やったね！🌟', 'ばっちり！🎉', 'きらきら！💫', 'いいリズム！🎵'];
const QUEST_NOTES_C4_C5 = [60, 62, 64, 65, 67, 69, 71, 72];

const DIFFS = [
  { id: 'easy', icon: '🌱', label: 'やさしい', desc: 'どのたかさでもOK＋ガイドあり' },
  { id: 'exact', icon: '🎯', label: 'ぴったり', desc: 'ひかる位置をぴったり弾く' },
  { id: 'ear', icon: '👂', label: 'みみクイズ', desc: 'おとをきいて当てる' },
];

const COURSES = [
  { id: 'melody-auto', label: '🎶 メロディおまかせ' },
  ...SONGS.map((s) => ({ id: s.id, label: s.title })),
  { id: 'random', label: '🎲 ランダム' },
];

export const starQuestGame = {
  id: 'star-quest',
  title: 'ほしあつめクエスト',
  subtitle: 'メロディに のせて ひかる けんばんを おそう！',
  ageLabel: '4〜8さい',
  icon: '⭐',
  accentColor: '#ffca3a',

  mount(ctx) {
    let difficulty = 'easy';
    let courseId = 'melody-auto';
    let autoSongIdx = 0;

    let currentSong = SONGS[0];
    let phrases = splitIntoPhrases(currentSong.notes);
    let phraseIdx = 0;
    let noteInPhraseIdx = 0;

    let score = 0;
    let combo = 0;
    let trophies = 0;
    let targetMidi = 60;
    let locked = false;
    let nextTimer = null;
    let demoTimers = [];

    const clearDemoTimers = () => {
      for (const id of demoTimers) clearTimeout(id);
      demoTimers = [];
    };

    const isMelodyMode = () => courseId !== 'random';

    ctx.container.innerHTML = `
      <div class="game-stage-root game-quest">
        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip">⭐ <span class="js-score">0</span></span>
            <span class="hud-chip hud-chip-combo">🔥 <span class="js-combo">0</span></span>
            <span class="hud-chip js-trophy-chip is-hidden">🏆 <span class="js-trophies">0</span></span>
          </div>
          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              🎛️ <span class="js-opt-summary">${currentSong.title}</span> ▾
            </button>
            <div class="stage-popover is-hidden js-opt-popover" role="dialog" aria-label="メロディとむずかしさ">
              <div class="popover-title">メロディ（コース）</div>
              <div class="popover-list">
                ${COURSES.map(
                  (c) => `
                    <button type="button" class="popover-item ${c.id === courseId ? 'is-active' : ''}" data-course="${c.id}">
                      <span>${c.label}</span>
                    </button>
                  `
                ).join('')}
              </div>

              <div class="popover-divider"></div>
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
          <div class="quest-phrase-box">
            <div class="quest-song-meta js-song-meta"></div>
            <div class="quest-stars-track js-track" aria-label="あつめた ほし"></div>
          </div>

          <div class="quest-target-card js-target-card">
            <div class="quest-target-emoji js-target-emoji">⭐</div>
            <div class="quest-target-note js-target-note">ド</div>
            <div class="quest-target-sub js-target-sub">どの「ド」でもOK！</div>
          </div>

          <div class="quest-feedback js-feedback" aria-live="polite"></div>

          <div class="quest-actions">
            <button type="button" class="action-btn js-listen-btn">🔊 フレーズを きく</button>
            <button type="button" class="action-btn action-btn-sub js-skip-btn">⏭️ つぎの おと</button>
          </div>
        </div>
      </div>
    `;

    const scoreEl = ctx.container.querySelector('.js-score');
    const comboEl = ctx.container.querySelector('.js-combo');
    const trophyChip = ctx.container.querySelector('.js-trophy-chip');
    const trophiesEl = ctx.container.querySelector('.js-trophies');
    const songMetaEl = ctx.container.querySelector('.js-song-meta');
    const trackEl = ctx.container.querySelector('.js-track');
    const cardEl = ctx.container.querySelector('.js-target-card');
    const emojiEl = ctx.container.querySelector('.js-target-emoji');
    const noteEl = ctx.container.querySelector('.js-target-note');
    const subEl = ctx.container.querySelector('.js-target-sub');
    const feedbackEl = ctx.container.querySelector('.js-feedback');
    const listenBtn = ctx.container.querySelector('.js-listen-btn');
    const skipBtn = ctx.container.querySelector('.js-skip-btn');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optSummary = ctx.container.querySelector('.js-opt-summary');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const courseBtns = ctx.container.querySelectorAll('[data-course]');
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

    const updateSummary = () => {
      if (isMelodyMode()) {
        optSummary.textContent = currentSong.title;
      } else {
        optSummary.textContent = '🎲 ランダム';
      }
      listenBtn.textContent = isMelodyMode() && difficulty !== 'ear'
        ? '🔊 フレーズを きく'
        : '🔊 おてほんを きく';
    };

    const loadSong = (song) => {
      currentSong = song;
      phrases = splitIntoPhrases(song.notes);
      phraseIdx = 0;
      noteInPhraseIdx = 0;
      updateSummary();
    };

    const renderTrack = () => {
      if (trophies > 0) {
        trophyChip.classList.remove('is-hidden');
        trophiesEl.textContent = String(trophies);
      }

      if (!isMelodyMode()) {
        songMetaEl.textContent = '🎲 ランダム チャレンジ';
        const filled = score % 10;
        let html = '';
        for (let i = 0; i < 10; i++) {
          html += `<span class="track-star ${i < filled ? 'is-filled' : ''}">★</span>`;
        }
        trackEl.innerHTML = html;
        return;
      }

      const phrase = phrases[phraseIdx] || [];
      songMetaEl.textContent = `${currentSong.title}  (${phraseIdx + 1} / ${phrases.length})`;

      trackEl.innerHTML = phrase
        .map((n, idx) => {
          const info = getNoteInfo(n.midi);
          const isDone = idx < noteInPhraseIdx;
          const isCurrent = idx === noteInPhraseIdx;
          const hideName = difficulty === 'ear' && !isDone;
          const label = hideName ? '？' : info.solfege;
          const cls = [
            'phrase-note-pill',
            isDone ? 'is-done' : '',
            isCurrent ? 'is-current' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const pillColor = hideName ? '#7c6ff6' : info.color;
          return `
            <span class="${cls}" style="--pill-color: ${pillColor}">
              <span class="phrase-note-star">${isDone ? '★' : '☆'}</span>
              <span class="phrase-note-text">${label}</span>
            </span>
          `;
        })
        .join('');
    };

    const showTarget = (midi, { playDemo = false } = {}) => {
      targetMidi = midi;
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
          ? `ひかってる「${info.solfege}」を おしてね`
          : `ひかってる「${info.solfegeWithOctave} (${info.nameEn})」を おしてね`;
        ctx.setHintKeys([targetMidi], { ignoreOctave: difficulty === 'easy' });
      }

      renderTrack();

      if (playDemo) {
        clearDemoTimers();
        const tid = setTimeout(() => {
          ctx.audio.playDemoNote(targetMidi, 440, 0.65);
        }, 110);
        demoTimers.push(tid);
      }
    };

    const pickRandomTarget = ({ playDemo = true } = {}) => {
      const pool = difficulty === 'easy' ? [60, 62, 64, 65, 67, 69, 71] : QUEST_NOTES_C4_C5;
      let next = targetMidi;
      let guard = 0;
      while (next === targetMidi && guard < 10) {
        next = pool[Math.floor(Math.random() * pool.length)];
        guard++;
      }
      showTarget(next, { playDemo });
    };

    const showCurrentMelodyTarget = ({ playDemo = false } = {}) => {
      const phrase = phrases[phraseIdx] || phrases[0];
      const item = phrase[noteInPhraseIdx] || phrase[0];
      showTarget(item.midi, { playDemo });
    };

    const playCurrentPhraseDemo = () => {
      clearDemoTimers();
      ctx.audio.unlock();
      if (!isMelodyMode() || difficulty === 'ear') {
        ctx.audio.playDemoNote(targetMidi, 520, 0.7);
        return;
      }

      const phrase = phrases[phraseIdx] || [];
      const beatMs = Math.round((60 / currentSong.bpm) * 1000 * 0.9);
      let elapsed = 0;
      phrase.forEach((n) => {
        const durMs = Math.max(220, Math.round(n.dur * beatMs * 0.82));
        const tid = setTimeout(() => {
          ctx.audio.playDemoNote(n.midi, durMs, 0.62);
        }, elapsed);
        demoTimers.push(tid);
        elapsed += Math.round(n.dur * beatMs);
      });
    };

    const showFeedback = (text, kind = 'good') => {
      feedbackEl.textContent = text;
      feedbackEl.className = `quest-feedback is-visible is-${kind}`;
    };

    const selectCourse = (newCourseId) => {
      clearDemoTimers();
      if (nextTimer) clearTimeout(nextTimer);
      locked = false;
      courseId = newCourseId;
      courseBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.course === courseId));
      feedbackEl.className = 'quest-feedback';

      if (courseId === 'random') {
        updateSummary();
        pickRandomTarget({ playDemo: difficulty === 'ear' });
      } else if (courseId === 'melody-auto') {
        loadSong(SONGS[autoSongIdx % SONGS.length]);
        showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
      } else {
        loadSong(getSongById(courseId));
        showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
      }
    };

    courseBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectCourse(btn.dataset.course);
        closePopover();
      });
    });

    diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        diffBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        feedbackEl.className = 'quest-feedback';
        updateSummary();
        closePopover();
        if (isMelodyMode()) {
          showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
        } else {
          pickRandomTarget({ playDemo: true });
        }
      });
    });

    listenBtn.addEventListener('click', () => {
      playCurrentPhraseDemo();
    });

    skipBtn.addEventListener('click', () => {
      clearDemoTimers();
      if (nextTimer) clearTimeout(nextTimer);
      locked = false;
      ctx.audio.unlock();
      combo = 0;
      comboEl.textContent = '0';

      if (!isMelodyMode()) {
        pickRandomTarget({ playDemo: difficulty === 'ear' });
        return;
      }

      const phrase = phrases[phraseIdx] || [];
      noteInPhraseIdx++;
      if (noteInPhraseIdx >= phrase.length) {
        noteInPhraseIdx = 0;
        phraseIdx = (phraseIdx + 1) % phrases.length;
      }
      showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
    });

    // 初期起動: メロディおまかせ（きらきらぼしからスタート）
    loadSong(SONGS[0]);
    showCurrentMelodyTarget({ playDemo: false });

    return {
      onNoteOn(noteInfo) {
        if (locked) return;
        clearDemoTimers();

        const ignoreOctave = difficulty === 'easy' || difficulty === 'ear';
        const ok = matchesNote(noteInfo.midi, targetMidi, { ignoreOctave });

        if (!ok) {
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
          return;
        }

        // 正解！
        locked = true;
        score++;
        combo++;
        scoreEl.textContent = String(score);
        comboEl.textContent = String(combo);

        const targetInfo = getNoteInfo(targetMidi);
        if (difficulty === 'ear') {
          cardEl.style.setProperty('--target-color', targetInfo.color);
          emojiEl.textContent = targetInfo.emoji;
          noteEl.textContent = targetInfo.solfege;
        }
        cardEl.classList.add('is-pop');

        // ランダムモード
        if (!isMelodyMode()) {
          if (score % 10 === 0) {
            trophies++;
            ctx.audio.playSfx('clear');
            showFeedback('🏆 10こ たっせい！ だいせいかい！', 'good');
          } else {
            ctx.audio.playSfx(combo >= 3 && combo % 3 === 0 ? 'combo' : 'correct');
            showFeedback(PRAISES[score % PRAISES.length], 'good');
          }
          renderTrack();
          nextTimer = setTimeout(() => {
            locked = false;
            pickRandomTarget({ playDemo: true });
          }, 680);
          return;
        }

        // 旋律モード: 弾いたメロディの響きを邪魔しないよう通常時は効果音を重ねない
        const phrase = phrases[phraseIdx] || [];
        noteInPhraseIdx++;
        renderTrack();

        const finishedPhrase = noteInPhraseIdx >= phrase.length;
        const finishedSong = finishedPhrase && phraseIdx >= phrases.length - 1;

        if (finishedSong) {
          trophies++;
          renderTrack();
          showFeedback(`🎉 ${currentSong.title} かんせい！🏆`, 'good');
          ctx.setHintKeys([]);
          nextTimer = setTimeout(() => {
            ctx.audio.playSfx('clear');
          }, 260);
          const restartTimer = setTimeout(() => {
            locked = false;
            if (courseId === 'melody-auto') {
              autoSongIdx = (autoSongIdx + 1) % SONGS.length;
              loadSong(SONGS[autoSongIdx]);
            } else {
              loadSong(currentSong);
            }
            showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
          }, 1450);
          demoTimers.push(restartTimer);
        } else if (finishedPhrase) {
          showFeedback(`✨ フレーズ クリア！ つぎへ すすむよ♪`, 'good');
          nextTimer = setTimeout(() => {
            phraseIdx++;
            noteInPhraseIdx = 0;
            locked = false;
            showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
          }, 520);
        } else {
          showFeedback(PRAISES[score % PRAISES.length], 'good');
          nextTimer = setTimeout(() => {
            locked = false;
            showCurrentMelodyTarget({ playDemo: difficulty === 'ear' });
          }, difficulty === 'ear' ? 560 : 190);
        }
      },

      onNoteOff() {},

      unmount() {
        clearDemoTimers();
        if (nextTimer) clearTimeout(nextTimer);
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
