import { findTemplate } from './catalog'
import { completedStepNames } from './plan'
import type { ConditionTag, IdGenerator, MenuId, RecordDraft, SkippedStep, WashPlan, WashRecord, WashSettings, WaterType } from './types'

export const MAX_NOTE_LENGTH = 500
export const MAX_CHEMICALS_LENGTH = 100

/** 未チェックの必須工程（任意工程は含めない）。 */
function skippedRequiredSteps(plan: WashPlan): SkippedStep[] {
  return plan.steps
    .filter((step) => !step.done && findTemplate(step.templateId)?.optional !== true)
    .map((step) => (step.templateId === undefined ? { name: step.name } : { name: step.name, templateId: step.templateId }))
}

export function createRecord(
  plan: WashPlan,
  draft: RecordDraft,
  settings: WashSettings,
  now: Date,
  createId: IdGenerator,
  plannedMenu: MenuId,
): WashRecord {
  return {
    id: createId(),
    washedAt: now.toISOString(),
    steps: completedStepNames(plan),
    note: draft.note.trim().slice(0, MAX_NOTE_LENGTH),
    waterType: draft.waterType ?? (settings.hasPureWater ? 'pure' : 'tap'),
    chemicals: draft.chemicals.trim().slice(0, MAX_CHEMICALS_LENGTH),
    conditions: [...new Set(draft.conditions)],
    menu: draft.menu,
    plannedMenu,
    skipped: skippedRequiredSteps(plan),
  }
}

const byNewest = (a: WashRecord, b: WashRecord): number => b.washedAt.localeCompare(a.washedAt)

export function addRecord(history: readonly WashRecord[], record: WashRecord): WashRecord[] {
  return [...history, record].sort(byNewest)
}

export function removeRecord(history: readonly WashRecord[], recordId: string): WashRecord[] {
  return history.filter((record) => record.id !== recordId)
}

/** 記録のあとから直せる項目。日付・メニュー・工程は、予定の計算に関わるため含めない。 */
export interface RecordEdit {
  readonly note: string
  readonly chemicals: string
  readonly waterType: WaterType | null
  readonly conditions: readonly ConditionTag[]
}

/** 指定した記録の編集可能な項目だけを置き換えた、新しい履歴を返す（元は変更しない）。 */
export function updateRecord(history: readonly WashRecord[], recordId: string, edit: RecordEdit): WashRecord[] {
  return history.map((record) =>
    record.id !== recordId
      ? record
      : {
          ...record,
          note: edit.note.trim().slice(0, MAX_NOTE_LENGTH),
          chemicals: edit.chemicals.trim().slice(0, MAX_CHEMICALS_LENGTH),
          waterType: edit.waterType,
          conditions: [...new Set(edit.conditions)],
        },
  )
}

const WASHED_ON_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIDDAY_HOUR = 12

/**
 * 洗車日（YYYY-MM-DD）から記録の日時を決める。未設定・不正・未来日は now を使う。
 * 過去日は、その日のローカル正午として扱う。
 */
export function resolveWashedAt(washedOn: string | undefined, now: Date): Date {
  const match = washedOn === undefined ? null : WASHED_ON_PATTERN.exec(washedOn)
  if (match === null) return now
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(year, month - 1, day, MIDDAY_HOUR)
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayStart = new Date(year, month - 1, day).getTime()
  return valid && dayStart < todayStart ? date : now
}

/** 記録フォームに候補として出す、最近使ったケミカルの数。 */
export const RECENT_CHEMICALS_LIMIT = 3

/** 最近使ったケミカル（空欄を除き重複なし、新しい順）。履歴は変更しない。 */
export function recentChemicals(history: readonly WashRecord[], limit: number): string[] {
  const time = (record: WashRecord) => {
    const value = new Date(record.washedAt).getTime()
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value
  }
  const newestFirst = [...history].sort((a, b) => (time(a) === time(b) ? 0 : time(a) < time(b) ? 1 : -1))
  const values = newestFirst.map((record) => record.chemicals.trim()).filter((value) => value !== '')
  return [...new Set(values)].slice(0, limit)
}
