# PC / iPad と MIDIキーボードの接続ガイド

## 💻 PC（Mac / Windows）で遊ぶ

1. MIDIキーボードを USB ケーブル（または Bluetooth MIDI）で PC に接続します。
2. 以下の Web MIDI API 対応ブラウザでこのサイトを開きます。
   - **Google Chrome**（おすすめ）
   - **Microsoft Edge**
   - **Firefox**（初回に MIDI アクセスの許可ダイアログが出ます）
3. 右上のステータスが `🎹 MIDI接続中: <キーボード名>` に変わったらそのまま遊べます。

> MIDIキーボードがなくても、PCキーボード（`A W S E D F T G Y H U J K`）やマウスクリックで全ゲームをテスト・プレイできます。

---

## 📱 iPad で MIDIキーボードを繋いで遊ぶ

### なぜ Safari だと MIDI キーボードが反応しない？

iPad 標準の Safari（および iOS 版 Chrome/Firefox）は WebKit の制約により **Web MIDI API に未対応** です。
そのため、以下の2通りの使い方を用意しています。

### 方法A：MIDIキーボードを直接繋ぐ（おすすめ）

1. **ハードウェア接続**
   - **USB-C 端子の iPad**: USB-C ⇔ USB-B / USB-C ケーブル（または USB-C ハブ）で MIDI キーボードを接続します。
     - バスパワー消費が大きいキーボードの場合は、給電対応の USB-C ハブを使うと安定します。
   - **Lightning 端子の iPad**: Apple 純正 **Lightning - USBカメラアダプタ** 経由で接続します。
   - **Bluetooth MIDI 対応キーボード**: Bluetooth MIDI 設定アプリ（GarageBand や MIDI 機器メーカーのアプリ、または Web MIDI Browser 内の BLE MIDI 接続画面）からペアリングします。
2. **Web MIDI 対応ブラウザで開く**
   - App Store から **Web MIDI Browser**（定番の Web MIDI API 対応ブラウザ）をインストールします。
   - Web MIDI Browser でこのページの URL（GitHub Pages 等）を開くと、接続した MIDI キーボードを自動で認識します。
3. **音が出ないときの確認**
   - iPad 本体の **消音モード（コントロールセンターのベルアイコン）** がオフになっているか確認してください。
   - 画面を一度タップすると iPadOS の音声再生ロックが解除されます。

### 方法B：ケーブルなしで遊ぶ（標準 Safari）

- 標準 Safari で開いた場合は自動で **タッチ鍵盤モード** になります。
- 画面下部の大きなピアノ鍵盤は **マルチタッチ和音対応** なので、そのまま iPad 単体でも遊べます。
- Safari の「共有」→「ホーム画面に追加」をしておくと、アプリのようにフルスクリーンで起動できます。

---

## 🎹 ミニキーボード（25鍵・32鍵）でのコツ

- どのゲームも **「やさしい」／「まつモード」ではオクターブ違いの同じ音名（低いド・高いドなど）も正解** として判定します。
- 画面下部の鍵盤は `🎹 1オクターブ` / `🎹 2オクターブ` ボタンで表示幅を切り替えられます。
