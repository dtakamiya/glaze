import { LEGACY_NAME_TO_TEMPLATE } from '../domain/catalog'
import type { WashPlan, WashRecord } from '../domain/types'
import type { HistoryV1, PlanV1 } from './schemas'

/**
 * v1 → v2。工程の並び・名前・done は変えない。
 * v1 の初期工程名と完全一致する工程にだけ templateId を付ける（同じテンプレートは最初の 1 件のみ）。
 */
export function migratePlanV1(plan: PlanV1): WashPlan {
  const used = new Set<string>()
  const steps = plan.steps.map((step) => {
    const templateId = LEGACY_NAME_TO_TEMPLATE[step.name]
    if (templateId === undefined || used.has(templateId)) return { ...step }
    used.add(templateId)
    return { ...step, templateId }
  })
  return { steps }
}

/** v1 → v2。新項目は「不明」で埋め、推測しない。 */
export function migrateHistoryV1(history: HistoryV1): WashRecord[] {
  return history.map((record) => ({
    ...record,
    waterType: null,
    chemicals: '',
    conditions: [],
  }))
}
