# Glaze — 洗車プランナー

スマホ向け PWA。洗車の工程チェックリストと施工履歴を**端末内（localStorage）**に保存する。サーバー・ログインなし。外部通信は計画タブの OFUSE ウィジェット（`components/OfuseButton.tsx`、`https://ofuse.me/assets/platform/widget.js`）だけで、アプリのデータは送らない。

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
    reminder.ts  前回洗車からの日数と通知レベル、日付ヘルパー（保存せず履歴から算出）
    suggestion.ts 記録の内容（状態タグ・未実施の必須工程）から次回の提案を算出（保存せず都度算出・ルールベース）
    products.ts  BEAUTIFUL CARS の製品カタログ（ケミカル・道具）と、選択文字列の純関数（parseItems / toggleItem）
    periodic.ts  周期つき工程（ホイール洗浄は 28 日に 1 回）がその洗車で必要かの判定（保存せず履歴から算出）
    schedule.ts  洗車計画（日付ごとの予定メニューと、先の予定日の算出。保存せず履歴から算出）
  storage/     localStorage アダプタ（zod で検証）
    schemas.ts     v2 スキーマと凍結済み v1 スキーマ
    migrations.ts  v1 → v2 の純関数
    storage.ts     load/save（v2 → v1 移行 → 初期値の順に読む）
  hooks/       usePersistentState（読み込み + 変更時保存）
  features/    画面単位（plan/, schedule/, history/）
  components/  共通 UI（TabBar）
  lib/         汎用ユーティリティ（id 生成）
  App.tsx      状態の保持と画面の結線
```

## 設計ルール

- **イミュータブル**: ドメイン関数は常に新しいオブジェクトを返す。state を直接書き換えない。
- **履歴は工程名をスナップショット保存**する（プランの工程 ID を参照しない）。プランを編集しても過去の記録は変わらない。
- **ストレージは外部入力扱い**: 読み込み時に zod で検証し、不正・破損時は初期値にフォールバックして `console.warn` で記録する。握りつぶさない。
- **スキーマ変更時はキーのバージョンを上げる**（`glaze:v2:*` → `glaze:v3:*`）と同時に移行処理を追加する。現行は v2（plan / history / settings / draft。ほかに schedule、upgrade-notice）。v1 キーは移行元として読むだけで削除しない。v2 が不正でも v1 には戻らない。
- **標準工程は `templateId` だけを保存**し、名前以外（コツ・任意・純水対応）はコード（`catalog.ts`）に持つ。テンプレート ID は公開後に変更・再利用しない。工程名は 40 文字以内（超えると保存データ全体が不正扱いになる）。
- **状態タグ（`CONDITION_TAGS`）は追加のみ**。削除・改名すると保存済み履歴が検証に落ちる。
- **洗車計画は経過日数で決める**。通常洗車を基本に、コーティング補充（ナノダイヤモンドトナー）を「最初の記録から 14 日後、以降は最後に実施してから 14 日後」、フルオリンセラム施工を「28 日後、以降は 28 日後」、水シミ・水アカ除去を「90 日後、以降は 90 日後」（動画の目安は鉄粉・水シミまで落とす洗車が年 2〜3 回）に入れる（`catalog.ts` の `MENU_CYCLES`）。複数の周期が来ていれば、来てから長い方が先で、同じ日なら水シミ除去 → フルオリンセラム → コーティングの順（`MENU_PRIORITY`、`schedule.ts` の `pickMenu`）。周期は独立で数え、先に来たメニューが優先されるので、洗車が 4 週に 1 回だと水シミ除去は 5〜6 か月おきになる。洗う回数には比例しない。水シミ・鉄粉が目立つときは状態タグ → 提案で前倒しする。実施メニューは記録の `menu`（任意・未設定は不明）で、予定と違うメニューを実施したらその日から数え直す（`schedule.ts` の `menuFor`）。洗車間隔は 1/2/3/4/6 週、表示期間は 4/8/12 週で `glaze:v2:schedule`。
- **周期つき工程**（`catalog.ts` の `everyDays` 付きテンプレート。現在はタイヤ・ホイール洗浄 = 28 日）は、過去に完了した記録（`steps` の工程名一致）が無い、または最後の完了から `everyDays` 日以上たっているときだけ plan に入る（`periodic.ts`）。未チェックで記録した回は完了に数えない。メニュー専用工程と同様、必要かどうかが変わるときだけ `applyPeriodic` で反映する（ユーザーが消した工程を復活させない）。工程名を変えると判定も変わるので注意。
- **メニュー専用の工程**（`catalog.ts` の `menu` 付きテンプレート）は、今回のメニュー（下書きの選択、無ければ予定）に応じて `applyMenu` が plan に出し入れする。メニューが変わる操作（選択変更・記録・履歴削除）の各ハンドラで反映する。
- **使用ケミカル・道具**: 洗剤・道具は基本的に BEAUTIFUL CARS の製品（`products.ts` の `PRODUCTS`）から選ぶ。選んだ製品は記録の `chemicals`（文字列）に短い名前を「、」区切りで保存し、カタログに無いもの（他社製品など）は同じ入力欄に自由入力する。新しいフィールドは持たない。製品名は保存データに入るため追加のみ（削除・改名しない）。上限は `MAX_CHEMICALS_LENGTH`（200）。
- **洗車日**は下書きの `washedOn`（YYYY-MM-DD、未設定 = 今日）。過去日はローカル正午の日時で記録し、未来日は受け付けない（`resolveWashedAt`）。
- **進捗**は未チェックの任意工程を分母に入れない（`planProgress`）。
- 記録直後は完了メッセージ（次回の予定入り）を表示し、画面を先頭へ戻す。
- **次回の提案**（`suggestion.ts`）: メニュー変更案は状態タグ（水シミ/鉄粉 → 水シミ・水アカ除去）のみ（経過日数は予定 `menuFor` に含まれる）。鳥フン等・前回未実施の必須工程は情報のみの注意。採用は `draft.menu`、見送りは `draft.dismissed`（記録でドラフトが空になり失効）。自動では予定を書き換えない。
- 記録は `plannedMenu`（記録時点の予定）と `skipped`（未チェックの必須工程）も持つ。履歴に「予定との差」を出すため。どちらも任意項目（未設定 = 不明）。
- `menu` は v2 に任意項目として追加した。v2 は GitHub Pages で公開済みだが、メニュー ID の追加（`fluorin` など）では版を上げない。旧版を開くと知らない ID で履歴全体が不正扱い（`:corrupt` に退避して空で開始）になる点は許容する。今後は `menuSchema` が知らない ID を「未設定」として読むので、メニュー追加で履歴は落ちない。それ以外の項目追加・形式変更は版を上げる。
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
