import { completedStepNames } from './plan'
import type { IdGenerator, WashPlan, WashRecord } from './types'

export const MAX_NOTE_LENGTH = 500

export function createRecord(
  plan: WashPlan,
  rawNote: string,
  now: Date,
  createId: IdGenerator,
): WashRecord {
  return {
    id: createId(),
    washedAt: now.toISOString(),
    steps: completedStepNames(plan),
    note: rawNote.trim().slice(0, MAX_NOTE_LENGTH),
  }
}

const byNewest = (a: WashRecord, b: WashRecord): number => b.washedAt.localeCompare(a.washedAt)

export function addRecord(history: readonly WashRecord[], record: WashRecord): WashRecord[] {
  return [...history, record].sort(byNewest)
}

export function removeRecord(history: readonly WashRecord[], recordId: string): WashRecord[] {
  return history.filter((record) => record.id !== recordId)
}
