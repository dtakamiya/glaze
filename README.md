# Glaze — 洗車プランナー

スマホ向けの PWA。洗車の工程チェックリスト、次回の洗車計画、施工履歴を**端末内（localStorage）**に保存します。サーバー・ログイン・外部通信はありません。

洗車の流儀は、BEAUTIFUL CARS 洗車チャンネル（村上アツシ氏）の解説をもとにしています。

## できること

- **洗車プラン**: 標準工程のチェックリスト（コツ・所要時間の目安つき）。純水器の有無ですすぎの工程が切り替わります。
- **洗車計画**: 経過日数で決まる洗車メニュー（通常洗車 / コーティング補充 / 水シミ・水アカ除去）と、次回の予定日。
- **次回の提案**: 記録した汚れ・状態や、続けて未実施だった工程から、次回の注意や水シミ予防を提案します（ルールベース）。
- **施工履歴**: 記録の確認、メモ・ケミカル・水・状態の編集、削除。

## 開発

React 19 + Vite 8 + TypeScript（strict）。PWA は `vite-plugin-pwa`、保存データの検証は `zod`、テストは Vitest + Testing Library です。

```bash
npm ci
npm run dev        # 開発サーバー
npm test           # テスト
npm run coverage   # カバレッジ（閾値 80%）
npm run typecheck  # 型チェック
npm run lint       # Lint
npm run build      # 本番ビルド
npm run build && npm run preview   # Service Worker を有効にした確認
```

- Service Worker と `crypto.randomUUID` は secure context（https / localhost）限定です。実機で PWA を試すときは https で配信してください。
- PWA アイコンの再生成: `npm run generate-pwa-assets`（元画像: `public/favicon.svg`）。
- 構成と設計ルールは [CLAUDE.md](CLAUDE.md) を参照してください。

## データについて

データは端末・ブラウザごとに独立し、ブラウザのデータ削除で消えます（バックアップ機能は未実装）。
