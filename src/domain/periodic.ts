import { STEP_TEMPLATES, type StepTemplate } from './catalog'
import { calendarDaysBetween } from './reminder'
import { chronological } from './schedule'
import type { WashRecord } from './types'

/**
 * 周期つき工程（`everyDays` を持つテンプレート）が date の洗車で必要か。
 * 過去に「完了した」記録（工程名が記録の steps にある）が無ければ必要、あれば最後の完了日から everyDays 日以上で必要。
 * 未チェックのまま記録した回は完了に数えないので、次回も必要になる。date より後の記録は数えない（過去日の記録用）。
 */
export function isStepDue(template: StepTemplate, history: readonly WashRecord[], date: Date): boolean {
  if (template.everyDays === undefined) return true
  const last = chronological(history)
    .filter((record) => new Date(record.washedAt).getTime() <= date.getTime() && record.steps.includes(template.name))
    .at(-1)
  if (last === undefined) return true
  return calendarDaysBetween(date, new Date(last.washedAt)) >= template.everyDays
}

/** date の洗車で必要な周期つき工程の templateId。 */
export function dueStepIds(history: readonly WashRecord[], date: Date): ReadonlySet<string> {
  return new Set(
    STEP_TEMPLATES.filter((template) => template.everyDays !== undefined && isStepDue(template, history, date)).map(
      (template) => template.id,
    ),
  )
}

/** 2 つの集合が同じ要素か。必要な周期工程が変わったかの判定に使う。 */
export function sameIds(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id))
}
