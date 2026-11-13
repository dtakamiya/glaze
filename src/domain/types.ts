export interface WashStep {
  readonly id: string
  readonly name: string
  readonly done: boolean
}

export interface WashPlan {
  readonly steps: readonly WashStep[]
}

/** 施工記録。工程名はスナップショットで保持し、プラン編集の影響を受けない。 */
export interface WashRecord {
  readonly id: string
  /** ISO 8601 */
  readonly washedAt: string
  readonly steps: readonly string[]
  readonly note: string
}

export type IdGenerator = () => string
