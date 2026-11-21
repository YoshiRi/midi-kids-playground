# 🎹 MIDI Kids Playground

PC や iPad に MIDI キーボードを繋いで、子どもが楽しく音あそび・ミニゲームで遊べる **ゼロ依存・ビルド不要のプレイグラウンド** です。

- 🌐 **ライブデモ (GitHub Pages)**: https://yoshiri.github.io/midi-kids-playground/
- 📱 **PC / iPad 両対応**: Web MIDI API + Web Audio API（MIDI キーボードがないときも画面マルチタッチ鍵盤・PCキーボードで動作）
- 🧩 **ミニゲーム追加が超かんたん**: `src/games/` に 1 ファイル足して登録するだけで新しいゲームを増やせます

---

## 🎮 初期収録ミニゲーム

1. **🎆 はなび＆どうぶつパーティー（2〜5さい向け）**
   - どの鍵盤を押しても音の高さに応じた色・場所から花火やどうぶつ、シャボン玉が飛び出します。
   - 鍵盤を強く弾く（ベロシティ）と大きく反応し、和音（同時押し）で虹色コンボ演出が出ます。
2. **⭐ ほしあつめクエスト（4〜8さい向け）**
   - 光った鍵盤やお手本と同じ音を弾いて星を集めます。
   - `🌱 やさしい`（オクターブ無視＋鍵盤ガイド）、`🎯 ぴったり`、`👂 みみクイズ`（音当て）の 3 モード対応。
3. **🎵 リズムえんそう（5さい〜向け）**
   - 上から落ちてくるカラフルな音符に合わせて演奏します（きらきらぼし / かえるのうた / チューリップ / メリーさんのひつじ）。
   - 幼児でも必ず最後まで弾ける **`🐢 まつモード`**（正解を弾くまでヒットラインで待機）と、テンポに合わせて弾く **`🚀 リズムモード`** を切り替え可能。

---

## 🚀 ローカルでの起動方法（ビルド不要）

HTML + ES Modules のみで構成されているため、`npm install` やビルドは不要です。静的ファイルサーバーで開くだけで動きます。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

---

## 📱 PC・iPad の MIDI 接続について

詳しい手順は [docs/IPAD_SETUP.md](./docs/IPAD_SETUP.md) をご覧ください。

- **PC**: Chrome / Edge / Firefox で開いて MIDI キーボードを USB 接続すれば自動認識します。
- **iPad**: 標準 Safari は Web MIDI API 非対応のため、MIDI キーボードを直接繋ぐ場合は **Web MIDI Browser** アプリでこの URL を開いてください（標準 Safari でも画面のマルチタッチ鍵盤で遊べます）。

---

## 🧩 新しいミニゲームを追加する（プレイグラウンドの使い方）

1. `src/games/myNewGame.js` を作成します。
2. 以下のテンプレート形式でゲームオブジェクトを export します。

```js
export const myNewGame = {
  id: 'my-new-game',
  title: 'あたらしいゲーム',
  subtitle: 'せつめいぶん',
  ageLabel: '3〜6さい',
  icon: '🚀',
  accentColor: '#8ac926',

  mount(ctx) {
    // ctx.container : ステージDOM要素
    // ctx.audio     : シンセ・効果音 (playDemoNote, playSfx)
    // ctx.keyboard  : 画面鍵盤 (getKeyNormalizedX など)
    // ctx.midi      : MIDIマネージャ
    // ctx.setHintKeys([60, 64], { ignoreOctave: true }) : ガイド発光

    ctx.container.innerHTML = `<div style="padding:24px">鍵盤を押してみよう！</div>`;

    return {
      onNoteOn(noteInfo, source) {
        // noteInfo: { midi, velocity, pitchClass, octave, nameEn, solfege, color, freq, emoji }
        console.log('押された音:', noteInfo.solfege, source);
      },
      onNoteOff(noteInfo, source) {},
      unmount() {
        ctx.setHintKeys([]);
      },
    };
  },
};
```

3. `src/core/gameRegistry.js` の `GAMES` 配列に追加すると、自動で上部タブに並びます！

---

## 📁 ディレクトリ構成

```text
midi-kids-playground/
├── index.html                 # メインUI + 接続ガイドモーダル
├── manifest.json              # iPadホーム画面追加用PWA設定
├── styles/main.css            # キッズ向けレスポンシブCSS
├── docs/IPAD_SETUP.md         # PC / iPad MIDI接続ガイド
└── src/
    ├── main.js                # アプリ初期化・入力ルーティング
    ├── core/
    │   ├── notes.js           # MIDIノート <-> ドレミ・周波数・虹色配色
    │   ├── audio.js           # Web Audio API シンセ(4音色)＆効果音
    │   ├── midi.js            # Web MIDI API マネージャ
    │   ├── keyboard.js        # マルチタッチ＆PCキー＆MIDI連動ピアノ鍵盤
    │   └── gameRegistry.js    # ミニゲーム登録リスト
    └── games/
        ├── fireworksParty.js  # 🎆 はなび＆どうぶつパーティー
        ├── starQuest.js       # ⭐ ほしあつめクエスト
        └── rhythmFall.js      # 🎵 リズムえんそう
```
