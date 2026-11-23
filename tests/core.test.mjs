import test from 'node:test';
import assert from 'node:assert/strict';

import { midiToFreq, getNoteInfo, matchesNote, getWhiteNotesInRange } from '../src/core/notes.js';
import { MidiManager } from '../src/core/midi.js';
import { GAMES, getGameById } from '../src/core/gameRegistry.js';
import { SONGS, getSongById, splitIntoPhrases } from '../src/data/songs.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/core/storage.js';
import {
  PROGRESSIONS,
  KEYS,
  buildChord,
  resolveProgression,
  evaluateChordMatch,
  getScalePitchClasses,
  generateProgressionMelodies,
} from '../src/data/chords.js';

test('notes.js: MIDI周波数と音名・ドレミ変換', () => {
  assert.equal(Math.round(midiToFreq(69)), 440);

  const c4 = getNoteInfo(60, 0.8);
  assert.equal(c4.nameEn, 'C4');
  assert.equal(c4.solfege, 'ド');
  assert.equal(c4.isBlack, false);

  const cs4 = getNoteInfo(61);
  assert.equal(cs4.nameEn, 'C#4');
  assert.equal(cs4.solfege, 'ド#');
  assert.equal(cs4.isBlack, true);

  const c5 = getNoteInfo(72);
  assert.equal(c5.solfegeWithOctave, 'たかいド');

  const whites = getWhiteNotesInRange(60, 72);
  assert.deepEqual(whites, [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('notes.js: オクターブ無視判定', () => {
  assert.equal(matchesNote(48, 60, { ignoreOctave: true }), true);
  assert.equal(matchesNote(48, 60, { ignoreOctave: false }), false);
  assert.equal(matchesNote(60, 60, { ignoreOctave: false }), true);
  assert.equal(matchesNote(62, 60, { ignoreOctave: true }), false);
});

test('midi.js: NoteOn / NoteOff / vel=0 メッセージ解析', () => {
  const manager = new MidiManager();
  const events = [];
  manager.onNoteOn((info, src) => events.push({ type: 'on', midi: info.midi, src }));
  manager.onNoteOff((info, src) => events.push({ type: 'off', midi: info.midi, src }));

  // NoteOn ch0, C4, vel 100
  manager._handleMessage('dev-1', { data: new Uint8Array([0x90, 60, 100]) });
  // NoteOn vel=0 (実質 NoteOff)
  manager._handleMessage('dev-1', { data: new Uint8Array([0x90, 60, 0]) });
  // NoteOff ch2, G4
  manager._handleMessage('dev-1', { data: new Uint8Array([0x82, 67, 0]) });

  assert.deepEqual(events, [
    { type: 'on', midi: 60, src: 'midi' },
    { type: 'off', midi: 60, src: 'midi' },
    { type: 'off', midi: 67, src: 'midi' },
  ]);
});

test('gameRegistry.js: 全ミニゲームが有効なプラグイン契約を満たす', () => {
  assert.ok(GAMES.length >= 5);
  const ids = new Set();
  for (const g of GAMES) {
    assert.ok(g.id && typeof g.id === 'string');
    assert.ok(g.title && typeof g.title === 'string');
    assert.equal(typeof g.mount, 'function');
    assert.equal(ids.has(g.id), false, `重複ID: ${g.id}`);
    ids.add(g.id);
    assert.equal(getGameById(g.id), g);
  }
});

test('songs.js: 曲データの整合性と単調増加ビート・フレーズ分割', () => {
  assert.ok(SONGS.length >= 6);
  const ids = new Set();
  for (const s of SONGS) {
    assert.ok(s.id && s.title && s.bpm > 0);
    assert.equal(ids.has(s.id), false);
    ids.add(s.id);
    assert.ok(s.notes.length > 0);
    let prevBeat = -1;
    for (const n of s.notes) {
      assert.ok(n.midi >= 48 && n.midi <= 84);
      assert.ok(n.beat > prevBeat);
      prevBeat = n.beat;
    }
    assert.equal(getSongById(s.id), s);

    const phrases = splitIntoPhrases(s.notes, 8);
    assert.ok(phrases.length >= 1);
    const flattened = phrases.flat();
    assert.equal(flattened.length, s.notes.length);
    for (const p of phrases) {
      assert.ok(p.length >= 1 && p.length <= 8);
    }
  }
});

test('storage.js: 設定の保存・復元と壊れたJSONへの耐性', () => {
  const mem = new Map();
  const mockStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
  };

  assert.deepEqual(loadSettings(mockStorage), DEFAULT_SETTINGS);

  const updated = saveSettings({ soundPreset: 'marimba', keyboardSize: 'large' }, mockStorage);
  assert.equal(updated.soundPreset, 'marimba');
  assert.equal(updated.keyboardSize, 'large');
  assert.equal(loadSettings(mockStorage).soundPreset, 'marimba');

  // 壊れたJSONでもデフォルトへ安全にフォールバック
  mockStorage.setItem('mkp:settings', '{invalid-json');
  assert.deepEqual(loadSettings(mockStorage), DEFAULT_SETTINGS);
});

test('chords.js: コード生成・移調・転回形判定・全進行の整合性', () => {
  const cmaj = buildChord(0, 'maj');
  assert.equal(cmaj.symbol, 'C');
  assert.deepEqual(cmaj.pitchClasses, [0, 4, 7]);

  const am7 = buildChord(9, 'm7');
  assert.equal(am7.symbol, 'Am7');
  assert.deepEqual(am7.pitchClasses, [9, 0, 4, 7]);

  // 転回形（E3, G4, C5）でも C メジャーと完全一致すること
  const invMatch = evaluateChordMatch([52, 67, 72], cmaj.pitchClasses);
  assert.equal(invMatch.isExact, true);
  assert.equal(invMatch.hasAllTargets, true);

  // 構成音不足と構成外音の検出
  const partial = evaluateChordMatch([60, 64, 65], cmaj.pitchClasses);
  assert.equal(partial.isExact, false);
  assert.deepEqual(partial.missing, [7]);
  assert.deepEqual(partial.extras, [5]);

  // 全進行 × 全キーでエラーなく展開でき、ガイドメロディ生成も整合すること
  for (const p of PROGRESSIONS) {
    for (const k of KEYS) {
      const resolved = resolveProgression(p.id, k.id);
      assert.equal(resolved.length, p.steps.length);
      for (const ch of resolved) {
        assert.ok(ch.symbol.length > 0);
        assert.ok(ch.voicing.length >= 3);
      }

      const melodies = generateProgressionMelodies(resolved, k.id, 1);
      assert.equal(melodies.length, resolved.length);
      for (let i = 0; i < melodies.length; i++) {
        assert.ok(melodies[i].length >= 3);
        // 拍頭は必ずコードトーンに着地すること
        const firstNotePc = melodies[i][0].midi % 12;
        assert.ok(resolved[i].pitchClasses.includes(firstNotePc));
      }
    }
  }

  assert.deepEqual(getScalePitchClasses('C', { pentatonic: true }), [0, 2, 4, 7, 9]);
  assert.deepEqual(getScalePitchClasses('C', { pentatonic: false }), [0, 2, 4, 5, 7, 9, 11]);
});
