import { PITCH_CLASSES } from '../core/notes.js';

/**
 * 大人向け学習（コード練習・耳コピ・伴奏リズム）共通のコード理論＆進行データ
 */

export const CHORD_QUALITIES = {
  maj:  { id: 'maj',  suffix: '',     label: 'メジャー (Major)',  shortLabel: 'Major', intervals: [0, 4, 7] },
  min:  { id: 'min',  suffix: 'm',    label: 'マイナー (Minor)',  shortLabel: 'Minor', intervals: [0, 3, 7] },
  '7':  { id: '7',    suffix: '7',    label: 'セブンス (7)',      shortLabel: '7th',   intervals: [0, 4, 7, 10] },
  maj7: { id: 'maj7', suffix: 'maj7', label: 'メジャー7 (maj7)',  shortLabel: 'maj7',  intervals: [0, 4, 7, 11] },
  m7:   { id: 'm7',   suffix: 'm7',   label: 'マイナー7 (m7)',    shortLabel: 'm7',    intervals: [0, 3, 7, 10] },
  sus4: { id: 'sus4', suffix: 'sus4', label: 'サスフォー (sus4)', shortLabel: 'sus4',  intervals: [0, 5, 7] },
};

export const KEYS = [
  { id: 'C',  label: 'Key: C',  rootPc: 0 },
  { id: 'G',  label: 'Key: G',  rootPc: 7 },
  { id: 'F',  label: 'Key: F',  rootPc: 5 },
  { id: 'D',  label: 'Key: D',  rootPc: 2 },
  { id: 'Bb', label: 'Key: Bb', rootPc: 10 },
  { id: 'A',  label: 'Key: A',  rootPc: 9 },
];

const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function formatRootName(pc, preferFlat = false) {
  const idx = ((pc % 12) + 12) % 12;
  return preferFlat ? NOTE_NAMES_FLAT[idx] : NOTE_NAMES_SHARP[idx];
}

/**
 * ルート(0..11) とクオリティIDからコード情報を構築
 * ボイシングは中央域（C4=60付近）に自然に収まるように配置
 */
export function buildChord(rootPc, qualityId = 'maj', { degree = '', preferFlat = false, baseOctaveMidi = 60 } = {}) {
  const q = CHORD_QUALITIES[qualityId] || CHORD_QUALITIES.maj;
  const normalizedRoot = ((rootPc % 12) + 12) % 12;
  const rootName = formatRootName(normalizedRoot, preferFlat);
  const symbol = `${rootName}${q.suffix}`;

  const pitchClasses = q.intervals.map((iv) => (normalizedRoot + iv) % 12);

  // ルートが G# 以上なら少し下に寄せると中央鍵盤で弾きやすい
  const anchorRoot = normalizedRoot >= 8 ? baseOctaveMidi - 12 + normalizedRoot : baseOctaveMidi + normalizedRoot;
  const voicing = q.intervals.map((iv) => anchorRoot + iv);
  const noteLabels = pitchClasses.map((pc) => ({
    pc,
    nameEn: formatRootName(pc, preferFlat),
    solfege: PITCH_CLASSES[pc].solfege,
    color: PITCH_CLASSES[pc].color,
  }));

  return {
    rootPc: normalizedRoot,
    qualityId: q.id,
    symbol,
    degree,
    pitchClasses,
    voicing,
    noteLabels,
    color: PITCH_CLASSES[normalizedRoot].color,
  };
}

/**
 * 定番コード進行（ディグリー定義なので任意のキーへ移調可能）
 */
export const PROGRESSIONS = [
  {
    id: 'pop-royal',
    title: '🎸 王道ポップ (I - V - vi - IV)',
    subtitle: '洋楽・J-POPの超定番4コード',
    steps: [
      { offset: 0, quality: 'maj', degree: 'I' },
      { offset: 7, quality: 'maj', degree: 'V' },
      { offset: 9, quality: 'min', degree: 'vi' },
      { offset: 5, quality: 'maj', degree: 'IV' },
    ],
  },
  {
    id: 'jpop-4536',
    title: '✨ J-POP王道 (IV - V - iii - vi)',
    subtitle: 'サビでよく使われるエモい進行',
    steps: [
      { offset: 5, quality: 'maj', degree: 'IV' },
      { offset: 7, quality: 'maj', degree: 'V' },
      { offset: 4, quality: 'min', degree: 'iii' },
      { offset: 9, quality: 'min', degree: 'vi' },
    ],
  },
  {
    id: 'komuro',
    title: '🔥 小室進行 (vi - IV - V - I)',
    subtitle: 'マイナー始まりのドラマチック進行',
    steps: [
      { offset: 9, quality: 'min', degree: 'vi' },
      { offset: 5, quality: 'maj', degree: 'IV' },
      { offset: 7, quality: 'maj', degree: 'V' },
      { offset: 0, quality: 'maj', degree: 'I' },
    ],
  },
  {
    id: 'marusa',
    title: '☕ 丸サ進行 (IVmaj7 - III7 - vim7 - Im7)',
    subtitle: 'おしゃれな都会的ネオソウル進行',
    steps: [
      { offset: 5, quality: 'maj7', degree: 'IVmaj7' },
      { offset: 4, quality: '7',    degree: 'III7' },
      { offset: 9, quality: 'm7',   degree: 'vim7' },
      { offset: 0, quality: 'm7',   degree: 'Im7' },
    ],
  },
  {
    id: 'jazz-251',
    title: '🎷 ジャズ 2-5-1 (iim7 - V7 - Imaj7 - vim7)',
    subtitle: 'ジャズ＆おしゃれポップス必須の循環',
    steps: [
      { offset: 2, quality: 'm7',   degree: 'iim7' },
      { offset: 7, quality: '7',    degree: 'V7' },
      { offset: 0, quality: 'maj7', degree: 'Imaj7' },
      { offset: 9, quality: 'm7',   degree: 'vim7' },
    ],
  },
  {
    id: 'canon',
    title: '🎻 カノン進行 (I - V - vi - iii - IV - I - IV - V)',
    subtitle: '8小節の王道クラシック〜ポップス進行',
    steps: [
      { offset: 0, quality: 'maj', degree: 'I' },
      { offset: 7, quality: 'maj', degree: 'V' },
      { offset: 9, quality: 'min', degree: 'vi' },
      { offset: 4, quality: 'min', degree: 'iii' },
      { offset: 5, quality: 'maj', degree: 'IV' },
      { offset: 0, quality: 'maj', degree: 'I' },
      { offset: 5, quality: 'maj', degree: 'IV' },
      { offset: 7, quality: 'maj', degree: 'V' },
    ],
  },
];

/**
 * メジャーキーの主要6ダイアトニックコード（耳コピ：ディグリー聴き取り用）
 */
export const DIATONIC_DEGREES = [
  { offset: 0, quality: 'maj', degree: 'I' },
  { offset: 2, quality: 'min', degree: 'ii' },
  { offset: 4, quality: 'min', degree: 'iii' },
  { offset: 5, quality: 'maj', degree: 'IV' },
  { offset: 7, quality: 'maj', degree: 'V' },
  { offset: 9, quality: 'min', degree: 'vi' },
];

export function getKeyById(keyId) {
  return KEYS.find((k) => k.id === keyId) || KEYS[0];
}

export function getProgressionById(progId) {
  return PROGRESSIONS.find((p) => p.id === progId) || PROGRESSIONS[0];
}

/**
 * 指定進行を指定キーに展開してコード配列を返す
 */
export function resolveProgression(progId, keyId = 'C') {
  const prog = getProgressionById(progId);
  const key = getKeyById(keyId);
  const preferFlat = key.id === 'F' || key.id === 'Bb';

  return prog.steps.map((step) =>
    buildChord((key.rootPc + step.offset) % 12, step.quality, {
      degree: step.degree,
      preferFlat,
    })
  );
}

/**
 * 押されている MIDI ノート集合がターゲットコードを満たしているか判定
 * - 転回形（インバージョン）やオクターブ重複を許容
 * - allowExtra: 4和音の途中やベース重複などを許すか（デフォルトは構成外音がなければOK、構成音が全一致で完全正解）
 */
export function evaluateChordMatch(pressedMidis, targetPitchClasses) {
  const pressedPcs = new Set();
  for (const m of pressedMidis) {
    pressedPcs.add(((m % 12) + 12) % 12);
  }
  const targetSet = new Set(targetPitchClasses);

  const matched = targetPitchClasses.filter((pc) => pressedPcs.has(pc));
  const missing = targetPitchClasses.filter((pc) => !pressedPcs.has(pc));
  const extras = [...pressedPcs].filter((pc) => !targetSet.has(pc));

  return {
    isExact: missing.length === 0 && extras.length === 0,
    hasAllTargets: missing.length === 0,
    matched,
    missing,
    extras,
  };
}
