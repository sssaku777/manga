# 漫画管理 PWA（iPhone対応）

## 使い方（iPhone / iPad）
1. どこかにホスティング（HTTPS推奨）するか、`http://localhost` で配信してください。
2. **Safari** でURLを開く。
3. 共有ボタン → **「ホーム画面に追加」** をタップするとPWAとしてインストールされます。

## ローカル実行（開発用）
- Node: `npx serve` をこのフォルダで実行 → `http://localhost:3000` などにアクセス
- Python: `python -m http.server 8080` → `http://localhost:8080`

## 主な機能
- 作品の追加/編集/削除（表紙画像アップロード）
- 検索・状態フィルタ・並び替え
- JSONエクスポート/インポート（バックアップ）
- オフライン対応（Service Worker）、PWAとしてホームに追加可
- データは端末ローカル（IndexedDB）に保存

## iOS向け調整
- `viewport-fit=cover` とセーフエリア対応（ノッチ/ホームバー）
- `apple-mobile-web-app-*` メタタグを追加
- `apple-touch-icon`（180px）を追加

## 補足
- プッシュ通知は未実装。必要ならWeb Pushの仕組みを追加してください（iOS 16.4+）。
- アイコンは仮の透明PNGです。お好みのアイコンに差し替えてください（/icons）。