import { fireworksPartyGame } from '../games/fireworksParty.js';
import { starQuestGame } from '../games/starQuest.js';
import { rhythmFallGame } from '../games/rhythmFall.js';
import { progressionLabGame } from '../games/progressionLab.js';
import { chordTrainerGame } from '../games/chordTrainer.js';
import { compingGrooveGame } from '../games/compingGroove.js';

/**
 * プレイグラウンドのミニゲーム・練習モード一覧
 * 新しいゲームを作ったら src/games/ にファイルを追加してここに登録するだけ！
 */
export const GAMES = [
  fireworksPartyGame,
  starQuestGame,
  rhythmFallGame,
  progressionLabGame,
  chordTrainerGame,
  compingGrooveGame,
];

export const GAME_CATEGORIES = [
  { id: 'kids', label: '👶 こどもむけ ミニゲーム' },
  { id: 'adult', label: '🎧 オトナ学習・耳コピ・伴奏練習' },
];

export function getGameById(id) {
  return GAMES.find((g) => g.id === id) || GAMES[0];
}
