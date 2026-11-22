/**
 * 複数ゲームで共有する子ども向け定番曲データ
 * すべて中央白鍵（C4=60 〜 C5=72）で演奏できるようアレンジ
 */

const C4 = 60;
const D4 = 62;
const E4 = 64;
const F4 = 65;
const G4 = 67;
const A4 = 69;
const B4 = 71;
const C5 = 72;

/**
 * [midiNote, durationBeats] の配列から開始拍(beat)付きノーツ配列を生成
 */
export function buildNotes(pattern, leadInBeats = 1.5) {
  let beat = leadInBeats;
  return pattern.map(([midi, dur = 1], idx) => {
    const item = { id: idx, midi, beat, dur };
    beat += dur;
    return item;
  });
}

export const SONGS = [
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
  {
    id: 'butterfly',
    title: '🦋 ちょうちょう',
    bpm: 98,
    notes: buildNotes([
      [G4, 1], [E4, 1], [E4, 2],
      [F4, 1], [D4, 1], [D4, 2],
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 1], [G4, 1], [G4, 2],
      [G4, 1], [E4, 1], [E4, 1], [E4, 1],
      [F4, 1], [D4, 1], [D4, 1], [D4, 1],
      [C4, 1], [E4, 1], [G4, 1], [G4, 1], [E4, 1], [E4, 1], [E4, 2],
    ]),
  },
  {
    id: 'scale',
    title: '🪜 ドレミかいだん',
    bpm: 96,
    notes: buildNotes([
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 1], [A4, 1], [B4, 1], [C5, 2],
      [C5, 1], [B4, 1], [A4, 1], [G4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 2],
    ]),
  },
];

export function getSongById(id) {
  return SONGS.find((s) => s.id === id) || SONGS[0];
}

/**
 * 曲のノーツ列を音楽的に自然なフレーズ（伸ばす音 dur >= 1.6 の直後、または最大8音）で分割する
 * @param {Array<{id: number, midi: number, beat: number, dur: number}>} notes
 * @param {number} maxLen
 * @returns {Array<Array<{id: number, midi: number, beat: number, dur: number}>>}
 */
export function splitIntoPhrases(notes, maxLen = 8) {
  const phrases = [];
  let current = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    current.push(note);

    const isPhraseEnd = note.dur >= 1.6 || current.length >= maxLen || i === notes.length - 1;
    if (isPhraseEnd) {
      phrases.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    phrases.push(current);
  }
  return phrases;
}
