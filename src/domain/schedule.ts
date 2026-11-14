import { ROTATION } from './catalog'
import { calendarDaysBetween, latestWashDate, startOfLocalDay } from './reminder'
import type { MenuId, SchedulePrefs, WashRecord } from './types'

export interface ScheduleItem {
  /** 予定日（ローカル暦日の 0 時） */
  readonly date: Date
  readonly menu: MenuId
  /** 予定日を過ぎている日数。先頭の項目だけ 0 より大きくなりうる */
  readonly overdueDays: number
}

const DAYS_PER_WEEK = 7

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** 古い順に並べた履歴（不正な日付は除く）。 */
function chronological(history: readonly WashRecord[]): WashRecord[] {
  return history
    .filter((record) => !Number.isNaN(new Date(record.washedAt).getTime()))
    .sort((a, b) => new Date(a.washedAt).getTime() - new Date(b.washedAt).getTime())
}

/**
 * ローテーション上の「次の位置」。履歴を古い順にたどって求める。
 * 予定と同じメニューをやれば 1 つ進み、別のメニューをやったときは、そのメニューが次に現れる位置の次へ進む。
 * メニュー不明の記録は 1 つ進めるだけ。
 */
export function rotationCursor(history: readonly WashRecord[]): number {
  const size = ROTATION.length
  return chronological(history).reduce((cursor, record) => {
    if (record.menu === undefined) return (cursor + 1) % size
    for (let offset = 0; offset < size; offset += 1) {
      const index = (cursor + offset) % size
      if (ROTATION[index] === record.menu) return (index + 1) % size
    }
    return (cursor + 1) % size
  }, 0)
}

/** 今回実施するメニュー。下書きで選ばれていればそれ、無ければ予定（ローテーションの次）。 */
export function currentMenu(draftMenu: MenuId | undefined, history: readonly WashRecord[]): MenuId {
  return draftMenu ?? nextMenu(history)
}

/** 次回のメニュー（ローテーションの次）。 */
export function nextMenu(history: readonly WashRecord[]): MenuId {
  return ROTATION[rotationCursor(history)]
}

/**
 * 洗車計画。先頭は次回の予定で、以降は洗車間隔ごとに表示期間の終わりまで並べる。
 * 予定日を過ぎていれば先頭を今日に寄せ（overdueDays に超過日数）、以降はそこから数える。
 * 履歴が無ければ先頭は今日。
 */
export function buildSchedule(history: readonly WashRecord[], prefs: SchedulePrefs, now: Date): ScheduleItem[] {
  const today = startOfLocalDay(now)
  const intervalDays = prefs.intervalWeeks * DAYS_PER_WEEK
  const last = latestWashDate(history)

  const due = last === null ? today : addDays(startOfLocalDay(last), intervalDays)
  const overdueDays = Math.max(0, calendarDaysBetween(today, due))
  const first = overdueDays > 0 ? today : due

  const end = addDays(today, prefs.horizonWeeks * DAYS_PER_WEEK)
  const start = rotationCursor(history)
  const items: ScheduleItem[] = []
  for (let index = 0; ; index += 1) {
    const date = addDays(first, index * intervalDays)
    if (index > 0 && date.getTime() > end.getTime()) break
    items.push({ date, menu: ROTATION[(start + index) % ROTATION.length], overdueDays: index === 0 ? overdueDays : 0 })
  }
  return items
}
