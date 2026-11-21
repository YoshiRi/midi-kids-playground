/**
 * MIDIノート番号とドレミ・周波数・キッズ向け虹色配色のユーティリティ
 */

export const PITCH_CLASSES = [
  { nameEn: 'C',  solfege: 'ド',  isBlack: false, color: '#ff595e', colorLight: '#ff8a8e', emoji: '🍎' },
  { nameEn: 'C#', solfege: 'ド#', isBlack: true,  color: '#e04f3e', colorLight: '#ff7a6b', emoji: '🍓' },
  { nameEn: 'D',  solfege: 'レ',  isBlack: false, color: '#ff924c', colorLight: '#ffb380', emoji: '🍊' },
  { nameEn: 'D#', solfege: 'レ#', isBlack: true,  color: '#e59a32', colorLight: '#ffc168', emoji: '🍑' },
  { nameEn: 'E',  solfege: 'ミ',  isBlack: false, color: '#ffca3a', colorLight: '#ffde7d', emoji: '🍋' },
  { nameEn: 'F',  solfege: 'ファ', isBlack: false, color: '#8ac926', colorLight: '#b0e35f', emoji: '🍈' },
  { nameEn: 'F#', solfege: 'ファ#', isBlack: true, color: '#45b259', colorLight: '#7ad88a', emoji: '🥝' },
  { nameEn: 'G',  solfege: 'ソ',  isBlack: false, color: '#1982c4', colorLight: '#59b0e8', emoji: '🐳' },
  { nameEn: 'G#', solfege: 'ソ#', isBlack: true,  color: '#3f62b5', colorLight: '#7a97de', emoji: '🫐' },
  { nameEn: 'A',  solfege: 'ラ',  isBlack: false, color: '#6a4c93', colorLight: '#9c7ec7', emoji: '🍇' },
  { nameEn: 'A#', solfege: 'ラ#', isBlack: true,  color: '#a349a4', colorLight: '#ce7ad0', emoji: '🔮' },
  { nameEn: 'B',  solfege: 'シ',  isBlack: false, color: '#ff66b3', colorLight: '#ff9ece', emoji: '🌸' },
];

export const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

/**
 * MIDIノート番号(0..127)を周波数(Hz)に変換 (A4 = 69 = 440Hz)
 */
export function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * MIDIノート番号から詳細情報を取得
 */
export function getNoteInfo(midiNote, velocity = 0.8) {
  const clamped = Math.max(0, Math.min(127, Math.round(midiNote)));
  const pitchClass = clamped % 12;
  const octave = Math.floor(clamped / 12) - 1;
  const meta = PITCH_CLASSES[pitchClass];

  return {
    midi: clamped,
    velocity,
    pitchClass,
    octave,
    nameEn: `${meta.nameEn}${octave}`,
    pitchEn: meta.nameEn,
    solfege: meta.solfege,
    solfegeWithOctave: octave === 5 && pitchClass === 0 ? 'たかいド' : meta.solfege,
    isBlack: meta.isBlack,
    color: meta.color,
    colorLight: meta.colorLight,
    emoji: meta.emoji,
    freq: midiToFreq(clamped),
  };
}

/**
 * ターゲット音に一致したかを判定
 * ignoreOctave=true の場合、低いドでも高いドでも「ド」なら正解にする
 */
export function matchesNote(playedMidi, targetMidi, { ignoreOctave = false } = {}) {
  if (ignoreOctave) {
    return (playedMidi % 12) === (targetMidi % 12);
  }
  return playedMidi === targetMidi;
}

/**
 * 指定範囲の白鍵リストを取得
 */
export function getWhiteNotesInRange(minMidi, maxMidi) {
  const list = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    if (!PITCH_CLASSES[m % 12].isBlack) {
      list.push(m);
    }
  }
  return list;
}
