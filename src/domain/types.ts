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
}

export type IdGenerator = () => string
