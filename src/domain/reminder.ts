import type { WashRecord } from './types'

/** 推奨は 2〜3 週間に 1 回。 */
export const REMINDER_DUE_DAYS = 14
export const REMINDER_OVERDUE_DAYS = 22

export type ReminderStatus = 'none' | 'ok' | 'due' | 'overdue'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * 最後の洗車からの経過日数（ローカル暦日の差）。履歴が無い・日付が不正なら null。
 * 履歴の並び順には依存せず、最新の washedAt を使う。
 */
export function daysSinceLastWash(history: readonly WashRecord[], now: Date): number | null {
  const times = history.map((record) => new Date(record.washedAt)).filter((date) => !Number.isNaN(date.getTime()))
  if (times.length === 0) return null

  const latest = new Date(Math.max(...times.map((date) => date.getTime())))
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(latest)) / MS_PER_DAY)
  return Math.max(0, days)
}

export function reminderStatus(days: number | null): ReminderStatus {
  if (days === null) return 'none'
  if (days >= REMINDER_OVERDUE_DAYS) return 'overdue'
  if (days >= REMINDER_DUE_DAYS) return 'due'
  return 'ok'
}
