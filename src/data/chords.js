import { PITCH_CLASSES } from '../core/notes.js';

/**
 * 大人向け学習（コード練習・進行パターン学習・テンション耳コピ・伴奏リズム）共通の理論＆進行データ
 */

export const CHORD_QUALITIES = {
  maj:  { id: 'maj',  suffix: '',     label: 'メジャー (Major)',  shortLabel: 'Major', intervals: [0, 4, 7] },
  min:  { id: 'min',  suffix: 'm',    label: 'マイナー (Minor)',  shortLabel: 'Minor', intervals: [0, 3, 7] },
  '7':  { id: '7',    suffix: '7',    label: 'セブンス (7)',      shortLabel: '7th',   intervals: [0, 4, 7, 10] },
  maj7: { id: 'maj7', suffix: 'maj7', label: 'メジャー7 (maj7)',  shortLabel: 'maj7',  intervals: [0, 4, 7, 11] },
  m7:   { id: 'm7',   suffix: 'm7',   label: 'マイナー7 (m7)',    shortLabel: 'm7',    intervals: [0, 3, 7, 10] },
  sus4: { id: 'sus4', suffix: 'sus4', label: 'サスフォー (sus4)', shortLabel: 'sus4',  intervals: [0, 5, 7] },
  add9: { id: 'add9', suffix: 'add9', label: 'アドナインス (add9)', shortLabel: 'add9', intervals: [0, 4, 7, 14] },
  maj9: { id: 'maj9', suffix: 'maj9', label: 'メジャー9 (maj9)',  shortLabel: 'maj9',  intervals: [0, 4, 7, 11, 14] },
  '9':  { id: '9',    suffix: '9',    label: 'ナインス (9)',      shortLabel: '9th',   intervals: [0, 4, 7, 10, 14] },
  m9:   { id: 'm9',   suffix: 'm9',   label: 'マイナー9 (m9)',    shortLabel: 'm9',    intervals: [0, 3, 7, 10, 14] },
  '13': { id: '13',   suffix: '13',   label: 'サーティーンス (13)', shortLabel: '13th', intervals: [0, 4, 7, 10, 21] },
};

/**
 * 7th / 9th / 11th / 13th などのテンション音（カラー音）定義
 * basic=true: 基本5種（まずはここから）
 * basic=false: ジャズ・オルタード拡張4種
 */
export const TENSION_DEGREES = [
  {
    id: 'b7',
    label: 'b7',
    jp: 'セブンス (短7度)',
    semitones: 10,
    baseQuality: 'maj',
    symbolSuffix: '7',
    basic: true,
    feel: 'ブルージーで次へ進みたくなるドミナントの響き',
  },
  {
    id: 'maj7',
    label: 'maj7',
    jp: 'メジャー7 (長7度)',
    semitones: 11,
    baseQuality: 'maj',
    symbolSuffix: 'maj7',
    basic: true,
    feel: '透明感・切なさ・都会的なおしゃれさ',
  },
  {
    id: '9',
    label: '9th',
    jp: 'ナインス (長9度)',
    semitones: 14,
    baseQuality: 'maj',
    symbolSuffix: 'add9',
    basic: true,
    feel: '爽やかでふわっと広がる浮遊感（J-POP定番）',
  },
  {
    id: '11',
    label: '11th',
    jp: 'イレブンス (完全11度)',
    semitones: 17,
    baseQuality: 'min',
    symbolSuffix: 'm11',
    basic: true,
    feel: 'クールで洗練された浮遊感（マイナー上で定番）',
  },
  {
    id: '13',
    label: '13th',
    jp: 'サーティーンス (長13度)',
    semitones: 21,
    baseQuality: '7',
    symbolSuffix: '13',
    basic: true,
    feel: '明るくゴージャス・ジャズ＆シティポップの華やかさ',
  },
  {
    id: 'b9',
    label: 'b9',
    jp: 'フラット9 (短9度)',
    semitones: 13,
    baseQuality: '7',
    symbolSuffix: '7(b9)',
    basic: false,
    feel: 'ドラマチックで強い緊張感（マイナーへの解決前）',
  },
  {
    id: '#9',
    label: '#9',
    jp: 'シャープ9 (増9度)',
    semitones: 15,
    baseQuality: '7',
    symbolSuffix: '7(#9)',
    basic: false,
    feel: 'ファンキー＆ブルージー（ジミヘンコードの響き）',
  },
  {
    id: '#11',
    label: '#11',
    jp: 'シャープ11 (増11度)',
    semitones: 18,
    baseQuality: 'maj7',
    symbolSuffix: 'maj7(#11)',
    basic: false,
    feel: '幻想的・映画音楽のようなリディアンカラー',
  },
  {
    id: 'b13',
    label: 'b13',
    jp: 'フラット13 (短13度)',
    semitones: 20,
    baseQuality: '7',
    symbolSuffix: '7(b13)',
    basic: false,
    feel: '哀愁と大人の色気があるジャジーな緊張感',
  },
];

export const KEYS = [
  { id: 'C',  label: 'Key: C',  rootPc: 0 },
  { id: 'G',  label: 'Key: G',  rootPc: 7 },
  { id: 'F',  label: 'Key: F',  rootPc: 5 },
  { id: 'D',  label: 'Key: D',  rootPc: 2 },
  { id: 'Bb', label: 'Key: Bb', rootPc: 10 },
  { id: 'A',  label: 'Key: A',  rootPc: 9 },
];

export const ALL_12_KEYS = [
  { id: 'C',  rootPc: 0,  preferFlat: false },
  { id: 'Db', rootPc: 1,  preferFlat: true  },
  { id: 'D',  rootPc: 2,  preferFlat: false },
  { id: 'Eb', rootPc: 3,  preferFlat: true  },
  { id: 'E',  rootPc: 4,  preferFlat: false },
  { id: 'F',  rootPc: 5,  preferFlat: true  },
  { id: 'F#', rootPc: 6,  preferFlat: false },
  { id: 'G',  rootPc: 7,  preferFlat: false },
  { id: 'Ab', rootPc: 8,  preferFlat: true  },
  { id: 'A',  rootPc: 9,  preferFlat: false },
  { id: 'Bb', rootPc: 10, preferFlat: true  },
  { id: 'B',  rootPc: 11, preferFlat: false },
];

export const HARMONIC_FUNCTIONS = {
  T:    { id: 'T',    label: 'T (安定)',       color: '#38c976' },
  SD:   { id: 'SD',   label: 'SD (広がり)',    color: '#1982c4' },
  D:    { id: 'D',    label: 'D (緊張→解決)',  color: '#ff595e' },
  SDm:  { id: 'SDm',  label: 'SDm (切なさ)',   color: '#9b72ff' },
  SecD: { id: 'SecD', label: 'SecD (強い引き)', color: '#ff924c' },
};

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
export function buildChord(rootPc, qualityId = 'maj', { degree = '', fn = '', preferFlat = false, baseOctaveMidi = 60 } = {}) {
  const q = CHORD_QUALITIES[qualityId] || CHORD_QUALITIES.maj;
  const normalizedRoot = ((rootPc % 12) + 12) % 12;
  const rootName = formatRootName(normalizedRoot, preferFlat);
  const symbol = `${rootName}${q.suffix}`;

  const pitchClasses = [...new Set(q.intervals.map((iv) => (normalizedRoot + iv) % 12))];

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
    fn,
    pitchClasses,
    voicing,
    noteLabels,
    color: PITCH_CLASSES[normalizedRoot].color,
  };
}

/**
 * 7th / 9th / 11th / 13th テンション音当てクイズ用の問題を構築
 * 土台コード(低〜中域)の上に、ターゲットのカラー音をトップノートとして配置する
 */
export function buildTensionChallenge(rootPc, tensionId, { preferFlat = false } = {}) {
  const tension = TENSION_DEGREES.find((t) => t.id === tensionId) || TENSION_DEGREES[0];
  const normalizedRoot = ((rootPc % 12) + 12) % 12;
  const baseAnchor = normalizedRoot >= 7 ? 48 + normalizedRoot : 54 + (normalizedRoot - 6);
  // ルートを C3(48)〜B3(59) 付近に置くと、トップの 9th〜13th が D4〜A5 に気持ちよく収まる
  const safeBaseRoot = 48 + normalizedRoot;
  const baseChord = buildChord(normalizedRoot, tension.baseQuality, {
    preferFlat,
    baseOctaveMidi: 48,
  });

  // 土台コードのボイシングは safeBaseRoot 基準に揃える
  const q = CHORD_QUALITIES[tension.baseQuality] || CHORD_QUALITIES.maj;
  const baseVoicing = q.intervals.map((iv) => safeBaseRoot + iv);
  const tensionMidi = safeBaseRoot + tension.semitones;
  const tensionPc = tensionMidi % 12;
  const rootName = formatRootName(normalizedRoot, preferFlat);
  const tensionNoteName = formatRootName(tensionPc, preferFlat || tension.id.startsWith('b'));
  const tensionSolfege = PITCH_CLASSES[tensionPc].solfege;

  return {
    rootPc: normalizedRoot,
    rootName,
    baseChord: {
      ...baseChord,
      voicing: baseVoicing,
    },
    tension,
    tensionMidi,
    tensionPc,
    tensionNoteName,
    tensionSolfege,
    tensionColor: PITCH_CLASSES[tensionPc].color,
    fullVoicing: [...baseVoicing, tensionMidi],
    fullSymbol: `${rootName}${tension.symbolSuffix}`,
    _unusedBaseAnchor: baseAnchor,
  };
}

/**
 * 定番コード進行（ディグリー＆和声機能＆学習解説付き）
 */
export const PROGRESSIONS = [
  {
    id: 'pop-royal',
    title: '🎸 王道ポップ (I - V - vi - IV)',
    shortTitle: '王道ポップ (1-5-6-4)',
    subtitle: '洋楽・J-POPの超定番4コード',
    mood: '明るい・王道・キャッチー',
    theory: '安定(I)から緊張(V)→切ない代理(vi)→広がり(IV)へ。迷ったらまず覚えるべき世界最強の4コード進行。',
    steps: [
      { offset: 0, quality: 'maj', degree: 'I',  fn: 'T' },
      { offset: 7, quality: 'maj', degree: 'V',  fn: 'D' },
      { offset: 9, quality: 'min', degree: 'vi', fn: 'T' },
      { offset: 5, quality: 'maj', degree: 'IV', fn: 'SD' },
    ],
  },
  {
    id: 'jpop-4536',
    title: '✨ J-POP王道 (IV - V - iii - vi)',
    shortTitle: 'J-POP王道 (4-5-3-6)',
    subtitle: 'サビでよく使われるエモい進行',
    mood: 'エモい・高揚感・サビ鉄板',
    theory: 'サブドミナント(IV)から始まり、V→iii→viと切なく着地するJ-POPの代名詞。サビの盛り上げに最強。',
    steps: [
      { offset: 5, quality: 'maj', degree: 'IV',  fn: 'SD' },
      { offset: 7, quality: 'maj', degree: 'V',   fn: 'D' },
      { offset: 4, quality: 'min', degree: 'iii', fn: 'T' },
      { offset: 9, quality: 'min', degree: 'vi',  fn: 'T' },
    ],
  },
  {
    id: 'komuro',
    title: '🔥 小室進行 (vi - IV - V - I)',
    shortTitle: '小室進行 (6-4-5-1)',
    subtitle: 'マイナー始まりのドラマチック進行',
    mood: '切ない→力強い・ドラマチック',
    theory: 'マイナー(vi)から入ってIV→Vと駆け上がり、最後Iでスカッと解放される90s〜現代アニソン定番。',
    steps: [
      { offset: 9, quality: 'min', degree: 'vi', fn: 'T' },
      { offset: 5, quality: 'maj', degree: 'IV', fn: 'SD' },
      { offset: 7, quality: 'maj', degree: 'V',  fn: 'D' },
      { offset: 0, quality: 'maj', degree: 'I',  fn: 'T' },
    ],
  },
  {
    id: 'marusa',
    title: '☕ 丸サ進行 (IVmaj7 - III7 - vim7 - Im7)',
    shortTitle: '丸サ進行 (4M7-37-6m7-1m7)',
    subtitle: 'おしゃれな都会的ネオソウル進行',
    mood: '都会的・おしゃれ・夜っぽい',
    theory: 'Just The Two of Us進行。2つ目のセカンダリードミナント(III7)がvim7を強く引き寄せ、独特の艶が出る。',
    steps: [
      { offset: 5, quality: 'maj7', degree: 'IVmaj7', fn: 'SD' },
      { offset: 4, quality: '7',    degree: 'III7',   fn: 'SecD' },
      { offset: 9, quality: 'm7',   degree: 'vim7',   fn: 'T' },
      { offset: 0, quality: 'm7',   degree: 'Im7',    fn: 'T' },
    ],
  },
  {
    id: 'jazz-251',
    title: '🎷 ジャズ 2-5-1 (iim7 - V7 - Imaj7 - vim7)',
    shortTitle: 'ジャズ 2-5-1 (2m7-57-1M7)',
    subtitle: 'ジャズ＆おしゃれポップス必須の循環',
    mood: '洗練・スムーズな解決感',
    theory: 'ベースが4度上行(D→G→C)する最も自然な解決パターン。耳コピで「2-5-1だ！」と聴き取れると世界が変わる。',
    steps: [
      { offset: 2, quality: 'm7',   degree: 'iim7',  fn: 'SD' },
      { offset: 7, quality: '7',    degree: 'V7',    fn: 'D' },
      { offset: 0, quality: 'maj7', degree: 'Imaj7', fn: 'T' },
      { offset: 9, quality: 'm7',   degree: 'vim7',  fn: 'T' },
    ],
  },
  {
    id: 'turnaround-1625',
    title: '🌙 循環進行 (Imaj7 - vim7 - iim7 - V7)',
    shortTitle: '循環進行 (1-6-2-5)',
    subtitle: 'シティポップ〜オールディーズの心地よいループ',
    mood: '心地よい・ノスタルジック',
    theory: 'Iから始まりvi→ii→Vと滑らかに戻ってくる定番ターンアラウンド。Aメロやエンディングのループに多用。',
    steps: [
      { offset: 0, quality: 'maj7', degree: 'Imaj7', fn: 'T' },
      { offset: 9, quality: 'm7',   degree: 'vim7',  fn: 'T' },
      { offset: 2, quality: 'm7',   degree: 'iim7',  fn: 'SD' },
      { offset: 7, quality: '7',    degree: 'V7',    fn: 'D' },
    ],
  },
  {
    id: 'sdm-44m15',
    title: '🌊 切ない転調感 (IV - ivm - I - V)',
    shortTitle: 'サブドミマイナー (4-4m-1-5)',
    subtitle: '映画的・グッと胸に刺さる切なさ',
    mood: 'ノスタルジー・映画的・泣ける',
    theory: '明るいIVの直後に同主短調のiv(サブドミナントマイナー)を挟む魔法。半音下降の響きが一気に切なさを生む。',
    steps: [
      { offset: 5, quality: 'maj', degree: 'IV', fn: 'SD' },
      { offset: 5, quality: 'min', degree: 'iv', fn: 'SDm' },
      { offset: 0, quality: 'maj', degree: 'I',  fn: 'T' },
      { offset: 7, quality: 'maj', degree: 'V',  fn: 'D' },
    ],
  },
  {
    id: 'canon',
    title: '🎻 カノン進行 (I - V - vi - iii - IV - I - IV - V)',
    shortTitle: 'カノン進行 (8小節)',
    subtitle: '8小節の王道クラシック〜ポップス進行',
    mood: '壮大・感動的・名曲製造機',
    theory: 'ベースがド→シ→ラ→ソ→ファ→ミ→ファ→ソと階段状に降りて戻る、何百年も愛される黄金の8小節進行。',
    steps: [
      { offset: 0, quality: 'maj', degree: 'I',   fn: 'T' },
      { offset: 7, quality: 'maj', degree: 'V',   fn: 'D' },
      { offset: 9, quality: 'min', degree: 'vi',  fn: 'T' },
      { offset: 4, quality: 'min', degree: 'iii', fn: 'T' },
      { offset: 5, quality: 'maj', degree: 'IV',  fn: 'SD' },
      { offset: 0, quality: 'maj', degree: 'I',   fn: 'T' },
      { offset: 5, quality: 'maj', degree: 'IV',  fn: 'SD' },
      { offset: 7, quality: 'maj', degree: 'V',   fn: 'D' },
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
      fn: step.fn || '',
      preferFlat,
    })
  );
}

/**
 * 押されている MIDI ノート集合がターゲットコードを満たしているか判定
 * - 転回形（インバージョン）やオクターブ重複を許容
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

/**
 * 同時押し AND 階段（アルペジオ／1音ずつ順番弾き）の両方でコードを判定するコレクター
 * - 構成音を1音ずつ押して離しても、windowMs 以内なら積み上がって正解になる
 * - resetOnWrong=true のとき、構成外音を弾くと積み上げをリセットする（耳コピ総当たり防止）
 */
export class ChordInputCollector {
  constructor({ windowMs = 2600, resetOnWrong = false } = {}) {
    this.windowMs = windowMs;
    this.resetOnWrong = resetOnWrong;
    this.pressedMidis = new Set();
    this.recentPcTimestamps = new Map();
  }

  reset() {
    this.pressedMidis.clear();
    this.recentPcTimestamps.clear();
  }

  _prune(now) {
    for (const [pc, ts] of this.recentPcTimestamps.entries()) {
      if (now - ts > this.windowMs) {
        this.recentPcTimestamps.delete(pc);
      }
    }
  }

  noteOn(midi, targetPitchClasses, now = performance.now()) {
    this._prune(now);
    this.pressedMidis.add(midi);

    const pc = ((midi % 12) + 12) % 12;
    const targetSet = new Set(targetPitchClasses);
    if (targetSet.has(pc)) {
      this.recentPcTimestamps.set(pc, now);
    } else if (this.resetOnWrong) {
      this.recentPcTimestamps.clear();
    }

    return this.evaluate(targetPitchClasses, now);
  }

  noteOff(midi) {
    this.pressedMidis.delete(midi);
  }

  evaluate(targetPitchClasses, now = performance.now()) {
    this._prune(now);
    const simultaneous = evaluateChordMatch(this.pressedMidis, targetPitchClasses);

    const activePcs = new Set(this.recentPcTimestamps.keys());
    for (const m of this.pressedMidis) {
      activePcs.add(((m % 12) + 12) % 12);
    }
    const targetSet = new Set(targetPitchClasses);
    const matched = targetPitchClasses.filter((pc) => activePcs.has(pc));
    const missing = targetPitchClasses.filter((pc) => !activePcs.has(pc));
    const heldExtras = [...this.pressedMidis]
      .map((m) => ((m % 12) + 12) % 12)
      .filter((pc) => !targetSet.has(pc));

    const isComplete = simultaneous.isExact || (missing.length === 0 && heldExtras.length === 0);

    return {
      isComplete,
      isSimultaneous: simultaneous.isExact,
      isArpeggio: !simultaneous.isExact && isComplete,
      matched,
      missing,
      heldExtras,
    };
  }
}

/**
 * 指定キーのスケール構成音（ピッチクラス配列）を返す
 */
export function getScalePitchClasses(keyId = 'C', { pentatonic = true } = {}) {
  const key = getKeyById(keyId);
  const intervals = pentatonic ? [0, 2, 4, 7, 9] : [0, 2, 4, 5, 7, 9, 11];
  return intervals.map((iv) => (key.rootPc + iv) % 12);
}

/**
 * 伴奏練習に添える、コード進行に音楽的に馴染む自動ガイドメロディを生成する
 */
export function generateProgressionMelodies(chords, keyId = 'C', seed = 0) {
  const scalePcs = new Set(getScalePitchClasses(keyId, { pentatonic: true }));

  const rhythmMotifs = [
    [[0, 2], [2, 1], [3, 2], [5, 1], [6, 2]],
    [[0, 3], [3, 1], [4, 2], [6, 2]],
    [[0, 1], [1, 1], [2, 2], [4, 1], [5, 3]],
    [[0, 2], [3, 2], [5, 1], [6, 2]],
  ];

  const minMidi = 67;
  const maxMidi = 81;

  let rng = (seed * 9301 + 49297) % 233280;
  const nextRand = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };

  let prevMidi = 72 + getKeyById(keyId).rootPc;
  if (prevMidi > maxMidi) prevMidi -= 12;

  return chords.map((chord, barIdx) => {
    const chordPcs = new Set(chord.pitchClasses);
    const chordTones = [];
    const melodicPool = [];

    for (let m = minMidi; m <= maxMidi; m++) {
      const pc = m % 12;
      if (chordPcs.has(pc)) {
        chordTones.push(m);
        melodicPool.push(m);
      } else if (scalePcs.has(pc)) {
        melodicPool.push(m);
      }
    }

    const motif = rhythmMotifs[(barIdx + seed) % rhythmMotifs.length];
    const events = [];

    motif.forEach(([step, durSteps], noteIdx) => {
      const pool = noteIdx === 0 && chordTones.length > 0 ? chordTones : melodicPool;
      const nearby = pool.filter((m) => Math.abs(m - prevMidi) <= 5 && m !== prevMidi);
      const candidates = nearby.length > 0 ? nearby : pool;
      const chosen = candidates[Math.floor(nextRand() * candidates.length)] ?? prevMidi;
      prevMidi = chosen;
      events.push({ step, midi: chosen, durSteps });
    });

    return events;
  });
}

/* =========================================================
   リアルタイム和音解析エンジン（耳コピ・オンコード・テンション対応）
   ========================================================= */

const INTERVAL_DEGREE_NAMES = ['R', 'b9', '9', 'm3', '3', '11', '#11', '5', 'b13', '13', 'b7', 'M7'];

const TWO_NOTE_INTERVALS = [
  'ユニゾン', '短2度 (b9)', '長2度 (9)', '短3度 (m3)', '長3度 (3)', '完全4度 (4)',
  '増4度 / 減5度', '完全5度 (5)', '短6度 (b6)', '長6度 (6)', '短7度 (b7)', '長7度 (M7)',
];

const ROMAN_BY_SEMITONE = [
  { upper: 'I',    lower: 'i'    },
  { upper: 'bII',  lower: 'bii'  },
  { upper: 'II',   lower: 'ii'   },
  { upper: 'bIII', lower: 'biii' },
  { upper: 'III',  lower: 'iii'  },
  { upper: 'IV',   lower: 'iv'   },
  { upper: '#IV',  lower: '#iv'  },
  { upper: 'V',    lower: 'v'    },
  { upper: 'bVI',  lower: 'bvi'  },
  { upper: 'VI',   lower: 'vi'   },
  { upper: 'bVII', lower: 'bvii' },
  { upper: 'VII',  lower: 'vii'  },
];

const DETECT_TEMPLATES = [
  { suffix: '',          required: [0, 4, 7],       optional: [],     priority: 100 },
  { suffix: 'm',         required: [0, 3, 7],       optional: [],     priority: 100 },
  { suffix: 'sus4',      required: [0, 5, 7],       optional: [],     priority: 92  },
  { suffix: 'sus2',      required: [0, 2, 7],       optional: [],     priority: 88  },
  { suffix: 'dim',       required: [0, 3, 6],       optional: [],     priority: 90  },
  { suffix: 'aug',       required: [0, 4, 8],       optional: [],     priority: 88  },
  { suffix: 'maj7',      required: [0, 4, 11],      optional: [7],    priority: 98  },
  { suffix: '7',         required: [0, 4, 10],      optional: [7],    priority: 98  },
  { suffix: 'm7',        required: [0, 3, 10],      optional: [7],    priority: 98  },
  { suffix: 'm(maj7)',   required: [0, 3, 11],      optional: [7],    priority: 88  },
  { suffix: 'm7(b5)',    required: [0, 3, 6, 10],   optional: [],     priority: 94  },
  { suffix: 'dim7',      required: [0, 3, 6, 9],    optional: [],     priority: 90  },
  { suffix: '6',         required: [0, 4, 7, 9],    optional: [],     priority: 84  },
  { suffix: 'm6',        required: [0, 3, 7, 9],    optional: [],     priority: 82  },
  { suffix: '7sus4',     required: [0, 5, 10],      optional: [7],    priority: 90  },
  { suffix: 'add9',      required: [0, 4, 7, 2],    optional: [],     priority: 94  },
  { suffix: 'm(add9)',   required: [0, 3, 7, 2],    optional: [],     priority: 92  },
  { suffix: 'maj9',      required: [0, 4, 11, 2],   optional: [7],    priority: 95  },
  { suffix: '9',         required: [0, 4, 10, 2],   optional: [7],    priority: 95  },
  { suffix: 'm9',        required: [0, 3, 10, 2],   optional: [7],    priority: 95  },
  { suffix: '9sus4',     required: [0, 5, 10, 2],   optional: [7],    priority: 82  },
  { suffix: 'm11',       required: [0, 3, 10, 5],   optional: [7, 2], priority: 92  },
  { suffix: '13',        required: [0, 4, 10, 9],   optional: [7, 2], priority: 93  },
  { suffix: 'maj13',     required: [0, 4, 11, 9],   optional: [7, 2], priority: 91  },
  { suffix: '7(b9)',     required: [0, 4, 10, 1],   optional: [7],    priority: 90  },
  { suffix: '7(#9)',     required: [0, 4, 10, 3],   optional: [7],    priority: 90  },
  { suffix: 'maj7(#11)', required: [0, 4, 11, 6],   optional: [7, 2], priority: 89  },
  { suffix: '7(b13)',    required: [0, 4, 10, 8],   optional: [7],    priority: 90  },
  { suffix: '6/9',       required: [0, 4, 9, 2],    optional: [7],    priority: 84  },
];

export function getRomanDegree(rootPc, suffix = '', keyId = 'C', bassPc = rootPc) {
  const key = ALL_12_KEYS.find((k) => k.id === keyId) || ALL_12_KEYS[0];
  const offset = (((rootPc - key.rootPc) % 12) + 12) % 12;
  const roman = ROMAN_BY_SEMITONE[offset];
  const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
  const isDim = suffix.startsWith('dim');

  const base = isMinor || isDim ? roman.lower : roman.upper;
  const cleanSuffix = isMinor ? suffix.slice(1) : suffix;
  let deg = `${base}${cleanSuffix}`;

  if (bassPc !== rootPc) {
    const bassOffset = (((bassPc - key.rootPc) % 12) + 12) % 12;
    deg += `/${ROMAN_BY_SEMITONE[bassOffset].upper}`;
  }
  return deg;
}

/**
 * 押された MIDI ノート配列から和音をリアルタイム解析する
 * - 転回形・オンコード（例: C/E, F/G, Dm7/G）・5度省略・7th/9th/11th/13th・別解釈候補に対応
 */
export function detectChord(midiNotes, { keyId = 'C' } = {}) {
  const uniqueMidis = [...new Set(midiNotes.map((m) => Math.round(m)))].sort((a, b) => a - b);
  if (uniqueMidis.length === 0) return null;

  const key = ALL_12_KEYS.find((k) => k.id === keyId) || ALL_12_KEYS[0];
  const preferFlat = key.preferFlat;

  const bassMidi = uniqueMidis[0];
  const bassPc = ((bassMidi % 12) + 12) % 12;
  const bassName = formatRootName(bassPc, preferFlat);

  const pcs = [...new Set(uniqueMidis.map((m) => ((m % 12) + 12) % 12))];
  const pcSet = new Set(pcs);

  const buildNoteDetails = (rootPc) =>
    pcs.map((pc) => {
      const iv = (((pc - rootPc) % 12) + 12) % 12;
      return {
        pc,
        nameEn: formatRootName(pc, preferFlat),
        solfege: PITCH_CLASSES[pc].solfege,
        degreeLabel: INTERVAL_DEGREE_NAMES[iv],
        color: PITCH_CLASSES[pc].color,
      };
    });

  if (pcs.length === 1) {
    const name = formatRootName(bassPc, preferFlat);
    return {
      symbol: name,
      rootPc: bassPc,
      bassPc,
      suffix: '',
      degree: getRomanDegree(bassPc, '', keyId, bassPc),
      kind: 'single',
      hint: `単音 (${PITCH_CLASSES[bassPc].solfege})`,
      color: PITCH_CLASSES[bassPc].color,
      alternatives: [],
      voicing: uniqueMidis,
      notes: buildNoteDetails(bassPc),
    };
  }

  if (pcs.length === 2) {
    const otherPc = pcs.find((p) => p !== bassPc) ?? bassPc;
    const iv = (((otherPc - bassPc) % 12) + 12) % 12;
    const isPower = iv === 7;
    const symbol = isPower ? `${bassName}5` : `${bassName} + ${formatRootName(otherPc, preferFlat)}`;
    return {
      symbol,
      rootPc: bassPc,
      bassPc,
      suffix: isPower ? '5' : '',
      degree: getRomanDegree(bassPc, isPower ? '5' : '', keyId, bassPc),
      kind: 'interval',
      hint: isPower ? 'パワーコード (完全5度)' : `2音インターバル: ${TWO_NOTE_INTERVALS[iv]}`,
      color: PITCH_CLASSES[bassPc].color,
      alternatives: [],
      voicing: uniqueMidis,
      notes: buildNoteDetails(bassPc),
    };
  }

  const candidates = [];

  for (let rootPc = 0; rootPc < 12; rootPc++) {
    for (const tpl of DETECT_TEMPLATES) {
      const reqPcs = tpl.required.map((iv) => (rootPc + iv) % 12);
      const optPcs = tpl.optional.map((iv) => (rootPc + iv) % 12);
      const allowedSet = new Set([...reqPcs, ...optPcs]);

      if (!reqPcs.every((p) => pcSet.has(p))) continue;
      if (pcs.some((p) => !allowedSet.has(p))) continue;

      const isRootInBass = rootPc === bassPc;
      const hasFifth = optPcs.includes((rootPc + 7) % 12) ? pcSet.has((rootPc + 7) % 12) : true;

      let score = tpl.priority;
      if (isRootInBass) score += 28;
      else if (pcSet.has(bassPc)) score += 6;
      if (hasFifth) score += 4;
      const keyOffset = (((rootPc - key.rootPc) % 12) + 12) % 12;
      if ([0, 2, 4, 5, 7, 9].includes(keyOffset)) score += 3;

      const rootName = formatRootName(rootPc, preferFlat);
      const symbol = isRootInBass ? `${rootName}${tpl.suffix}` : `${rootName}${tpl.suffix}/${bassName}`;

      candidates.push({
        symbol,
        rootPc,
        bassPc,
        suffix: tpl.suffix,
        score,
        isSlash: !isRootInBass,
      });
    }
  }

  // オンコード特別チェック: ベース音を除いた上声だけで綺麗なコードになるケース（例: F/G, Dm7/G）
  if (pcs.length >= 4) {
    const upperPcs = pcs.filter((p) => p !== bassPc);
    const upperSet = new Set(upperPcs);
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      if (rootPc === bassPc) continue;
      for (const tpl of DETECT_TEMPLATES) {
        if (tpl.required.length > 4) continue;
        const reqPcs = tpl.required.map((iv) => (rootPc + iv) % 12);
        const optPcs = tpl.optional.map((iv) => (rootPc + iv) % 12);
        const allowedSet = new Set([...reqPcs, ...optPcs]);
        if (!reqPcs.every((p) => upperSet.has(p))) continue;
        if (upperPcs.some((p) => !allowedSet.has(p))) continue;

        const rootName = formatRootName(rootPc, preferFlat);
        const symbol = `${rootName}${tpl.suffix}/${bassName}`;
        if (!candidates.some((c) => c.symbol === symbol)) {
          candidates.push({
            symbol,
            rootPc,
            bassPc,
            suffix: tpl.suffix,
            score: tpl.priority + (tpl.required.length === 3 ? 16 : 12),
            isSlash: true,
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    const best = candidates[0];
    const alternatives = candidates
      .slice(1)
      .filter((c) => c.symbol !== best.symbol)
      .slice(0, 3)
      .map((c) => c.symbol);

    return {
      symbol: best.symbol,
      rootPc: best.rootPc,
      bassPc: best.bassPc,
      suffix: best.suffix,
      degree: getRomanDegree(best.rootPc, best.suffix, keyId, best.bassPc),
      kind: 'chord',
      hint: best.isSlash ? `オンコード / 転回形 (Bass: ${bassName})` : `${pcs.length}和音`,
      color: PITCH_CLASSES[best.rootPc].color,
      alternatives,
      voicing: uniqueMidis,
      notes: buildNoteDetails(best.rootPc),
    };
  }

  const noteListStr = pcs.map((p) => formatRootName(p, preferFlat)).join(' + ');
  return {
    symbol: `${bassName} ?`,
    rootPc: bassPc,
    bassPc,
    suffix: '',
    degree: getRomanDegree(bassPc, '', keyId, bassPc),
    kind: 'custom',
    hint: `構成音: ${noteListStr}`,
    color: PITCH_CLASSES[bassPc].color,
    alternatives: [],
    voicing: uniqueMidis,
    notes: buildNoteDetails(bassPc),
  };
}
