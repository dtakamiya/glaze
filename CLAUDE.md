# Glaze — 洗車プランナー

スマホ向け PWA。洗車の工程チェックリストと施工履歴を**端末内（localStorage）**に保存する。サーバー・ログイン・外部通信なし。

> ディレクトリ名は `graze` だがアプリ名は **Glaze**（package name も `glaze`）。

## 技術スタック

- React 19 + Vite 8 + TypeScript（strict）
- PWA: `vite-plugin-pwa`（generateSW / autoUpdate）、アイコンは `@vite-pwa/assets-generator`
- 検証: `zod`（ストレージ読み込み時）
- テスト: Vitest + Testing Library（jsdom）

## コマンド

| 目的 | コマンド |
|------|----------|
| 開発サーバー | `npm run dev` |
| テスト | `npm test` |
| カバレッジ（閾値 80%） | `npm run coverage` |
| 型チェック | `npm run typecheck` |
| 本番ビルド | `npm run build` |
| ビルド確認（SW 有効） | `npm run build && npm run preview` |
| Lint | `npm run lint` |
| PWA アイコン再生成 | `npm run generate-pwa-assets`（元画像: `public/favicon.svg`） |

## 構成（依存は上 → 下の一方向）

```
src/
  domain/      純粋関数とモデル（React・ストレージ非依存）
    types.ts     WashStep / WashPlan / WashRecord / WashSettings / RecordDraft
    catalog.ts   標準工程テンプレート（コツ・任意・純水対応）と状態タグの定義元
    plan.ts      工程の追加・削除・チェック・リセット・純水切り替え
    history.ts   施工記録の作成・追加・削除
    draft.ts     入力中の記録（メモ・水・ケミカル・状態タグ）
    settings.ts  設定（純水器の有無）
    reminder.ts  前回洗車からの日数と通知レベル（保存せず履歴から算出）
  storage/     localStorage アダプタ（zod で検証）
    schemas.ts     v2 スキーマと凍結済み v1 スキーマ
    migrations.ts  v1 → v2 の純関数
    storage.ts     load/save（v2 → v1 移行 → 初期値の順に読む）
  hooks/       usePersistentState（読み込み + 変更時保存）
  features/    画面単位（plan/, history/）
  components/  共通 UI（TabBar）
  lib/         汎用ユーティリティ（id 生成）
  App.tsx      状態の保持と画面の結線
```

## 設計ルール

- **イミュータブル**: ドメイン関数は常に新しいオブジェクトを返す。state を直接書き換えない。
- **履歴は工程名をスナップショット保存**する（プランの工程 ID を参照しない）。プランを編集しても過去の記録は変わらない。
- **ストレージは外部入力扱い**: 読み込み時に zod で検証し、不正・破損時は初期値にフォールバックして `console.warn` で記録する。握りつぶさない。
- **スキーマ変更時はキーのバージョンを上げる**（`glaze:v2:*` → `glaze:v3:*`）と同時に移行処理を追加する。現行は v2（plan / history / settings / draft）。v1 キーは移行元として読むだけで削除しない。v2 が不正でも v1 には戻らない。
- **標準工程は `templateId` だけを保存**し、名前以外（コツ・任意・純水対応）はコード（`catalog.ts`）に持つ。テンプレート ID は公開後に変更・再利用しない。工程名は 40 文字以内（超えると保存データ全体が不正扱いになる）。
- **状態タグ（`CONDITION_TAGS`）は追加のみ**。削除・改名すると保存済み履歴が検証に落ちる。
- 履歴の `waterType` が null は「不明」（v1 由来）。推測で埋めない。
- 入力長の上限はドメイン定数（`MAX_STEP_NAME_LENGTH`, `MAX_NOTE_LENGTH`, `MAX_CHEMICALS_LENGTH`）を UI・スキーマで共有する。
- 画面遷移はタブ state のみ（ルーター不要）。必要になるまで追加しない。
- モバイル前提: タップ領域 44px 以上、入力は 16px 以上（iOS ズーム抑止）、下部タブは `env(safe-area-inset-bottom)` を考慮。

## 開発フロー

1. feature ブランチを切る（main に直接コミットしない）
2. テストを先に書く（ドメイン → `*.test.ts`、画面の振る舞い → `App.test.tsx` など）
3. 実装 → `npm test` / `npm run typecheck` / `npm run build` を通し、出力を確認
4. UI 変更時はブラウザ（モバイル幅）で操作確認し、コンソールエラーがないことを確認

## 注意

- `crypto.randomUUID` と Service Worker は **secure context（https / localhost）限定**。LAN の `http://192.168.x.x` で実機確認すると SW は動かない（ID 生成はフォールバックあり）。実機で PWA を試すときは https で配信する。
- Service Worker は `npm run dev` では無効。PWA 挙動は `build` + `preview` で確認する。
- 洗車の流儀は BEAUTIFUL CARS 洗車チャンネル（村上アツシ氏）の解説に基づく。コツの文面は `src/domain/catalog.ts`。洗車頻度の目安は 2〜3 週間に 1 回（`reminder.ts` の閾値）。
- データは端末・ブラウザごとに独立。ブラウザのデータ削除で消える（バックアップ機能は未実装）。
