import type { WashRecord } from './types'

const DAYS_PER_WEEK = 7
/** 洗車間隔を過ぎてから「目安超過」とみなすまでの猶予日数。 */
export const OVERDUE_GRACE_DAYS = 8

export type ReminderStatus = 'none' | 'ok' | 'due' | 'overdue'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** ローカル暦日の差（a - b）。DST で 23/25 時間の日があっても整数になる。 */
export function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()) / MS_PER_DAY)
}

/** 履歴の中で最新の洗車日時。履歴が無い・日付が不正なら null。並び順には依存しない。 */
export function latestWashDate(history: readonly WashRecord[]): Date | null {
  const times = history.map((record) => new Date(record.washedAt)).filter((date) => !Number.isNaN(date.getTime()))
  if (times.length === 0) return null
  return new Date(Math.max(...times.map((date) => date.getTime())))
}

/** 最後の洗車からの経過日数（ローカル暦日の差）。履歴が無い・日付が不正なら null。 */
export function daysSinceLastWash(history: readonly WashRecord[], now: Date): number | null {
  const latest = latestWashDate(history)
  if (latest === null) return null
  return Math.max(0, calendarDaysBetween(now, latest))
}

/** 洗車間隔（週）に応じた通知レベル。間隔に達したら due、さらに猶予を過ぎたら overdue。 */
export function reminderStatus(days: number | null, intervalWeeks: number): ReminderStatus {
  if (days === null) return 'none'
  const dueDays = intervalWeeks * DAYS_PER_WEEK
  if (days >= dueDays + OVERDUE_GRACE_DAYS) return 'overdue'
  if (days >= dueDays) return 'due'
  return 'ok'
}
