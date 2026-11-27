# 🎹 MIDI Kids Playground

PC や iPad に MIDI キーボードを繋いで、子どもが楽しく音あそび・ミニゲームで遊べる **ゼロ依存・ビルド不要のプレイグラウンド** です。

- 🌐 **ライブデモ (GitHub Pages)**: https://yoshiri.github.io/midi-kids-playground/
- 📱 **PC / Android / iPad 対応**: Web MIDI API + Web Audio API（MIDI キーボードがないときも画面マルチタッチ鍵盤・PCキーボードで動作）
- 🧩 **ミニゲーム追加が超かんたん**: `src/games/` に 1 ファイル足して登録するだけで新しいゲームを増やせます

---

## 🎮 収録ミニゲーム・練習モード

### 👶 こどもむけ
1. **🎆 はなび＆どうぶつパーティー（2〜5さい向け）**
   - どの鍵盤を押しても音の高さに応じた色・場所から花火やどうぶつ、シャボン玉が飛び出します。
   - 鍵盤を強く弾く（ベロシティ）と大きく反応し、和音（同時押し）で虹色コンボ演出が出ます。
2. **⭐ ほしあつめクエスト（4〜8さい向け）**
   - 実際の旋律（きらきらぼし・かえるのうた・チューリップ等）をベースに、光った鍵盤やお手本と同じ音を弾いて星を集めます。
   - `🌱 やさしい`（オクターブ無視＋鍵盤ガイド）、`🎯 ぴったり`、`👂 みみクイズ`（音当て）の 3 モード対応。
3. **🎵 リズムえんそう（5さい〜向け）**
   - 上から落ちてくるカラフルな音符に合わせて演奏します（きらきらぼし / かえるのうた / チューリップ / メリーさんのひつじ / ちょうちょう / ドレミかいだん）。
   - 幼児でも必ず最後まで弾ける **`🐢 まつモード`**（正解を弾くまでヒットラインで待機）と、テンポに合わせて弾く **`🚀 リズムモード`** を切り替え可能。

### 🎧 オトナ学習・耳コピ・伴奏練習
4. **🎼 コード進行パターン学習**
   - **📖 パターン図鑑**: 王道ポップ / J-POP王道 / 小室進行 / 丸サ進行 / ジャズ 2-5-1 / 循環進行 (1-6-2-5) / サブドミマイナー (4-4m-1-5) / カノン進行の8種を、和声機能 (`T / SD / D / SDm / SecD`)・解説・ベース付き自動試聴・鍵盤試奏（同時押し＆階段OK）で体系的に学習。
   - **👂 進行パターン聴き当てクイズ**: 再生される進行の響きを聴いて4択から当てるトレーニング。
5. **🎸 コード＆耳コピ道場**
   - **進行ドリル**: 定番8進行を好きなキー（C/G/F/D/Bb/A）へ移調して練習（**同時押し・階段アルペジオ・転回形すべてOK**・構成音リアルタイム表示）。
   - **🌈 テンション音当て (7th / 9th / 11th / 13th)**: 土台コードの上に乗せた `b7 / maj7 / 9th / 11th / 13th`（拡張モードで `b9 / #9 / #11 / b13`）を「土台→テンション重ね再生」や「まとめ再生」で聴き分け、ボタンまたは鍵盤1音で回答。
   - **耳コピ（コード種類 / ディグリー）**: 和音一括再生＆分散和音再生を使って、コードクオリティや基準 `I` からのディグリー（`I〜vi`）をボタンまたは鍵盤（同時押し＆階段OK）で回答。
6. **🥁 伴奏リズム・グルーヴ**
   - **🎹 伴奏を弾く（ガイドメロディ＆ベース付き）**: ゼロ依存のドラム・ベース・自動ガイドメロディに合わせて、4つ打ち / ポップス8ビート（1・2&・4） / バラード / おしゃれシンコペ のコード伴奏を練習。
   - **🎷 メロディを弾く（自動バックトラック伴奏）**: アプリがドラム・ベース・コード伴奏を自動演奏し、ペンタトニック / コードトーンの鍵盤ガイドを見ながらアドリブや耳コピメロディを演奏可能。

---

## 🚀 ローカルでの起動方法（ビルド不要）

HTML + ES Modules のみで構成されているため、`npm install` やビルドは不要です。静的ファイルサーバーで開くだけで動きます。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

---

## 📱 PC・Android・iPad の MIDI 接続について

詳しい手順は [docs/IPAD_SETUP.md](./docs/IPAD_SETUP.md) をご覧ください。

- **PC**: Chrome / Edge / Firefox で開いて MIDI キーボードを USB 接続すれば自動認識します。
- **Android**: 標準の **Google Chrome** が Web MIDI API に対応しているため、USB-C（または OTG）で繋いでそのまま開くだけで動きます。
- **iPad**: 標準の Safari / Chrome は Web MIDI API 非対応のため、MIDI キーボードを直接繋ぐ場合は **Web MIDI Browser** アプリでこの URL を開いてください（標準ブラウザでも画面のマルチタッチ鍵盤で遊べます）。

---

## 🧩 新しいミニゲームを追加する（プレイグラウンドの使い方）

> 📐 **UI 設計ルール**: メニューやオプションを追加してもメインステージと鍵盤が圧迫されないよう、[docs/UI_GUIDELINES.md](./docs/UI_GUIDELINES.md) の「3層レイアウト＋フローティングHUD / オーバーレイ設定」ルールに沿って実装してください。

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
    // ctx.container : ステージDOM要素（100%全面）
    // ctx.audio     : シンセ・効果音 (playDemoNote, playSfx)
    // ctx.keyboard  : 画面鍵盤 (getKeyNormalizedX など)
    // ctx.midi      : MIDIマネージャ
    // ctx.setHintKeys([60, 64], { ignoreOctave: true }) : ガイド発光

    ctx.container.innerHTML = `
      <div class="game-stage-root">
        <div class="stage-hud-top">
          <div class="hud-group"><span class="hud-chip">⭐ 0</span></div>
        </div>
        <!-- ここにCanvasやメイン演出を全面配置 -->
      </div>
    `;

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

3. `src/core/gameRegistry.js` の `GAMES` 配列に追加すると、左上のゲーム切り替えシートに自動で並びます！

---

## 📁 ディレクトリ構成

```text
midi-kids-playground/
├── AGENTS.md                  # 開発ルール集（UI・キッズUX・プラグイン契約・検証手順）
├── index.html                 # メインUI + ゲーム選択シート + 設定ドロワー + 接続ガイド
├── manifest.json              # iPadホーム画面追加用PWA設定
├── styles/main.css            # キッズ向けレスポンシブCSS（3層構造＋オーバーレイ）
├── docs/
│   ├── IPAD_SETUP.md          # PC / Android / iPad MIDI接続ガイド
│   └── UI_GUIDELINES.md       # UI設計ルール（非圧迫3層レイアウト契約）
└── src/
    ├── main.js                # アプリ初期化・入力ルーティング・設定永続化
    ├── core/
    │   ├── notes.js           # MIDIノート <-> ドレミ・周波数・虹色配色
    │   ├── audio.js           # Web Audio API シンセ(4音色)＆効果音・iPad消音突破
    │   ├── midi.js            # Web MIDI API マネージャ
    │   ├── keyboard.js        # マルチタッチ＆PCキー＆MIDI連動ピアノ鍵盤
    │   ├── storage.js         # localStorage 設定自動保存 (`mkp:settings`)
    │   └── gameRegistry.js    # ミニゲーム登録リスト
    ├── data/
    │   ├── songs.js           # 複数ゲーム共通の子ども向け定番曲データ
    │   └── chords.js          # コード理論・キー移調・定番コード進行・転回形判定
    └── games/
        ├── fireworksParty.js  # 🎆 はなび＆どうぶつパーティー
        ├── starQuest.js       # ⭐ ほしあつめクエスト
        ├── rhythmFall.js      # 🎵 リズムえんそう
        ├── progressionLab.js  # 🎼 コード進行パターン学習（オトナ学習）
        ├── chordTrainer.js    # 🎸 コード＆耳コピ道場（オトナ学習）
        └── compingGroove.js   # 🥁 伴奏リズム・グルーヴ（オトナ学習）
```
