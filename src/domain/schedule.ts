import { MENU_CYCLES, MENU_PRIORITY } from './catalog'
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
export function chronological(history: readonly WashRecord[]): WashRecord[] {
  return history
    .filter((record) => !Number.isNaN(new Date(record.washedAt).getTime()))
    .sort((a, b) => new Date(a.washedAt).getTime() - new Date(b.washedAt).getTime())
}

export interface LastWash {
  /** 洗車した日（ローカル暦日の 0 時） */
  readonly date: Date
  /** 実施したメニュー。旧記録など不明なときは undefined */
  readonly menu: MenuId | undefined
}

/** 一番新しい洗車の日付とメニュー。履歴が無い（日付が有効な記録が無い）ときは null。 */
export function lastWash(history: readonly WashRecord[]): LastWash | null {
  const latest = chronological(history).at(-1)
  if (latest === undefined) return null
  return { date: startOfLocalDay(new Date(latest.washedAt)), menu: latest.menu }
}

/** 特別メニューの周期を数えるための状態。履歴から作り、予定を先へ進めるときも使う。 */
interface CycleState {
  /** 最初の記録の日（履歴が無ければ null） */
  readonly oldest: Date | null
  readonly last: Readonly<Partial<Record<Exclude<MenuId, 'regular'>, Date>>>
}

function cycleState(history: readonly WashRecord[]): CycleState {
  const ordered = chronological(history)
  const last: Partial<Record<Exclude<MenuId, 'regular'>, Date>> = {}
  for (const record of ordered) {
    if (record.menu === 'coating' || record.menu === 'mineral') last[record.menu] = startOfLocalDay(new Date(record.washedAt))
  }
  return { oldest: ordered.length === 0 ? null : startOfLocalDay(new Date(ordered[0].washedAt)), last }
}

/** menu を date に実施したとして、状態を進める。 */
function performed(state: CycleState, menu: MenuId, date: Date): CycleState {
  const day = startOfLocalDay(date)
  return {
    oldest: state.oldest ?? day,
    last: menu === 'regular' ? state.last : { ...state.last, [menu]: day },
  }
}

/** 特別メニューが予定に入る日。履歴が無ければ null。 */
function dueDate(state: CycleState, menu: Exclude<MenuId, 'regular'>): Date | null {
  const last = state.last[menu]
  if (last !== undefined) return addDays(last, MENU_CYCLES[menu].everyDays)
  return state.oldest === null ? null : addDays(state.oldest, MENU_CYCLES[menu].firstDays)
}

/** 周期が来ている特別メニューのうち、来てから一番長いもの（同じ日なら MENU_PRIORITY の順）。無ければ通常洗車。 */
function pickMenu(state: CycleState, date: Date): MenuId {
  const day = startOfLocalDay(date).getTime()
  let picked: { readonly menu: MenuId; readonly due: number } | null = null
  for (const menu of MENU_PRIORITY) {
    const due = dueDate(state, menu)?.getTime()
    if (due === undefined || day < due) continue
    if (picked === null || due < picked.due) picked = { menu, due }
  }
  return picked?.menu ?? 'regular'
}

/**
 * date に洗車するときの予定メニュー（特別メニューの周期が来ていればそれ、無ければ通常洗車）。
 * date より後の記録は数えない（過去日で記録するとき、その日時点の予定を求めるため）。
 */
export function menuFor(history: readonly WashRecord[], date: Date): MenuId {
  const day = startOfLocalDay(date).getTime()
  const upToDate = history.filter((record) => startOfLocalDay(new Date(record.washedAt)).getTime() <= day)
  return pickMenu(cycleState(upToDate), date)
}

/** 今回実施するメニュー。下書きで選ばれていればそれ、無ければ date の予定。 */
export function currentMenu(draftMenu: MenuId | undefined, history: readonly WashRecord[], date: Date): MenuId {
  return draftMenu ?? menuFor(history, date)
}

/** 今日洗車するときの予定メニュー。 */
export function nextMenu(history: readonly WashRecord[], now: Date): MenuId {
  return menuFor(history, now)
}

/**
 * 洗車計画。先頭は次回の予定で、以降は洗車間隔ごとに表示期間の終わりまで並べる。
 * 各回のメニューは、その日までの経過日数から決める（先頭を置き換えたときは、その実施を前提に先へ進める）。
 * 予定日を過ぎていれば先頭を今日に寄せ（overdueDays に超過日数）、以降はそこから数える。
 * 履歴が無ければ先頭は今日。
 */
export function buildSchedule(
  history: readonly WashRecord[],
  prefs: SchedulePrefs,
  now: Date,
  /** 指定すると、先頭項目のメニューだけをこれに置き換える（提案の採用など） */
  firstMenu?: MenuId,
): ScheduleItem[] {
  const today = startOfLocalDay(now)
  const intervalDays = prefs.intervalWeeks * DAYS_PER_WEEK
  const last = latestWashDate(history)

  const due = last === null ? today : addDays(startOfLocalDay(last), intervalDays)
  const overdueDays = Math.max(0, calendarDaysBetween(today, due))
  const first = overdueDays > 0 ? today : due

  const end = addDays(today, prefs.horizonWeeks * DAYS_PER_WEEK)
  let state = cycleState(history)
  const items: ScheduleItem[] = []
  for (let index = 0; ; index += 1) {
    const date = addDays(first, index * intervalDays)
    if (index > 0 && date.getTime() > end.getTime()) break
    const menu = index === 0 && firstMenu !== undefined ? firstMenu : pickMenu(state, date)
    state = performed(state, menu, date)
    items.push({ date, menu, overdueDays: index === 0 ? overdueDays : 0 })
  }
  return items
}
