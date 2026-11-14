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
  }
}

const byNewest = (a: WashRecord, b: WashRecord): number => b.washedAt.localeCompare(a.washedAt)

export function addRecord(history: readonly WashRecord[], record: WashRecord): WashRecord[] {
  return [...history, record].sort(byNewest)
}

export function removeRecord(history: readonly WashRecord[], recordId: string): WashRecord[] {
  return history.filter((record) => record.id !== recordId)
}
