export interface WashStep {
  readonly id: string
  readonly name: string
  readonly done: boolean
  /** 標準テンプレート由来の工程のみ。コツ表示や純水切り替えの識別に使う。自作工程は未設定。 */
  readonly templateId?: string
}

export interface WashPlan {
  readonly steps: readonly WashStep[]
}

export type WaterType = 'pure' | 'tap'

/** 施工時の汚れ・状態タグ。値は CONDITION_TAGS（catalog.ts）が唯一の定義元。 */
export type ConditionTag = 'water-spot' | 'bird-dropping' | 'bug' | 'iron-fallout' | 'tar'

/** 洗車メニュー。ローテーションで「次回やること」を決める。定義は catalog.ts。 */
export type MenuId = 'regular' | 'coating' | 'mineral'

export type IntervalWeeks = 2 | 3
export type HorizonWeeks = 4 | 8 | 12

/** 洗車計画の設定。 */
export interface SchedulePrefs {
  /** 洗車の間隔（週） */
  readonly intervalWeeks: IntervalWeeks
  /** 先の予定を並べる期間（週） */
  readonly horizonWeeks: HorizonWeeks
}

export interface WashSettings {
  /** 純水器を使えるか。すすぎ工程の内容が切り替わる。 */
  readonly hasPureWater: boolean
}

/** 記録前の入力中の値。リロードで失われないよう永続化する。 */
export interface RecordDraft {
  readonly note: string
  /** null = 設定（hasPureWater）に従う */
  readonly waterType: WaterType | null
  readonly chemicals: string
  readonly conditions: readonly ConditionTag[]
  /** 今回やるメニュー。未設定 = 予定（ローテーションの次）に従う */
  readonly menu?: MenuId
  /** 洗車日（YYYY-MM-DD, ローカル日付）。未設定 = 今日 */
  readonly washedOn?: string
}

/** 施工記録。工程名はスナップショットで保持し、プラン編集の影響を受けない。 */
export interface WashRecord {
  readonly id: string
  /** ISO 8601 */
  readonly washedAt: string
  readonly steps: readonly string[]
  readonly note: string
  /** v1 から移行した記録は null（不明）。推測で埋めない。 */
  readonly waterType: WaterType | null
  readonly chemicals: string
  readonly conditions: readonly ConditionTag[]
  /** やったメニュー。未設定は不明（メニュー導入前の記録など）。 */
  readonly menu?: MenuId
}

export type IdGenerator = () => string
