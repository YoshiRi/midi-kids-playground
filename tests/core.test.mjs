import test from 'node:test';
import assert from 'node:assert/strict';

import { midiToFreq, getNoteInfo, matchesNote, getWhiteNotesInRange } from '../src/core/notes.js';
import { MidiManager } from '../src/core/midi.js';
import { GAMES, getGameById } from '../src/core/gameRegistry.js';

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
  assert.equal(GAMES.length, 3);
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
