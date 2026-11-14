import { completedStepNames } from './plan'
import type { IdGenerator, RecordDraft, WashPlan, WashRecord, WashSettings } from './types'

export const MAX_NOTE_LENGTH = 500
export const MAX_CHEMICALS_LENGTH = 100

export function createRecord(
  plan: WashPlan,
  draft: RecordDraft,
  settings: WashSettings,
  now: Date,
  createId: IdGenerator,
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
  }
}

const byNewest = (a: WashRecord, b: WashRecord): number => b.washedAt.localeCompare(a.washedAt)

export function addRecord(history: readonly WashRecord[], record: WashRecord): WashRecord[] {
  return [...history, record].sort(byNewest)
}

export function removeRecord(history: readonly WashRecord[], recordId: string): WashRecord[] {
  return history.filter((record) => record.id !== recordId)
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
