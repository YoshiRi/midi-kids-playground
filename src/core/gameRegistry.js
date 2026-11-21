import { fireworksPartyGame } from '../games/fireworksParty.js';
import { starQuestGame } from '../games/starQuest.js';
import { rhythmFallGame } from '../games/rhythmFall.js';

/**
 * プレイグラウンドのミニゲーム一覧
 * 新しいゲームを作ったら src/games/ にファイルを追加してここに登録するだけ！
 */
export const GAMES = [
  fireworksPartyGame,
  starQuestGame,
  rhythmFallGame,
];

export function getGameById(id) {
  return GAMES.find((g) => g.id === id) || GAMES[0];
}
