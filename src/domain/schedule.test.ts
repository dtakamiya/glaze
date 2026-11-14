import { describe, expect, test } from 'vitest'
import { MENU_CYCLES, MENUS, findMenu, menuName } from './catalog'
import { buildSchedule, currentMenu, lastWash, menuFor, nextMenu } from './schedule'
import type { MenuId, SchedulePrefs, WashRecord } from './types'

const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

const record = (washedAt: Date, menu?: MenuId): WashRecord => ({
  id: washedAt.toISOString(),
  washedAt: washedAt.toISOString(),
  steps: [],
  note: '',
  waterType: null,
  chemicals: '',
  conditions: [],
  menu,
})

const prefs = (
  intervalWeeks: SchedulePrefs['intervalWeeks'],
  horizonWeeks: SchedulePrefs['horizonWeeks'],
): SchedulePrefs => ({ intervalWeeks, horizonWeeks })

const ymd = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`

describe('menus', () => {
  test('every special menu has a cycle and a definition', () => {
    expect(Object.keys(MENU_CYCLES).every((id) => findMenu(id as MenuId) !== undefined)).toBe(true)
    expect(MENUS.map((m) => m.id)).toEqual(['regular', 'coating', 'mineral'])
    expect(menuName('mineral')).toBe('水シミ・水アカ除去')
  })
})

describe('buildSchedule with a 1-week interval', () => {
  test('lists a wash every 7 days up to the horizon', () => {
    const items = buildSchedule([record(local(2026, 11, 1), 'regular')], prefs(1, 4), local(2026, 11, 2))

    expect(items.map((i) => ymd(i.date))).toEqual(['11/8', '11/15', '11/22', '11/29'])
  })
})

describe('menuFor', () => {
  test('is a regular wash when there is no history', () => {
    expect(menuFor([], local(2026, 11, 14))).toBe('regular')
  })

  test('adds coating 28 days and mineral removal 42 days after the first record', () => {
    const history = [record(local(2026, 11, 1), 'regular')]

    expect(menuFor(history, local(2026, 11, 28))).toBe('regular')
    expect(menuFor(history, local(2026, 11, 29))).toBe('coating')
    expect(menuFor(history, local(2026, 12, 12))).toBe('coating') // 水シミ除去は 12/13 から
    expect(menuFor([...history, record(local(2026, 11, 29), 'coating')], local(2026, 12, 13))).toBe('mineral')
  })

  test('prefers mineral removal when both cycles are due', () => {
    const history = [record(local(2026, 11, 1), 'regular')]

    expect(menuFor(history, local(2026, 12, 13))).toBe('mineral')
  })

  test('counts 56 days from the last time a special menu was done', () => {
    const history = [
      record(local(2026, 11, 1), 'regular'),
      record(local(2026, 11, 29), 'coating'),
      record(local(2026, 12, 13), 'mineral'),
    ]

    expect(menuFor(history, local(2027, 1, 23))).toBe('regular')
    expect(menuFor(history, local(2027, 1, 24))).toBe('coating')
    expect(menuFor(history, local(2027, 2, 7))).toBe('mineral') // 両方の周期が来ていれば mineral が先
  })

  test('a menu done earlier than planned pushes its next date back', () => {
    const history = [record(local(2026, 11, 1), 'regular'), record(local(2026, 11, 10), 'mineral')]

    expect(menuFor(history, local(2026, 12, 13))).toBe('coating')
    expect(menuFor([...history, record(local(2026, 11, 29), 'coating')], local(2026, 12, 13))).toBe('regular')
  })

  test('is independent of history order and ignores unknown menus and invalid dates', () => {
    const a = record(local(2026, 11, 1))
    const b = record(local(2026, 11, 29), 'coating')
    const invalid = { ...record(local(2026, 11, 2), 'mineral'), washedAt: 'invalid' }

    expect(menuFor([b, a, invalid], local(2026, 12, 13))).toBe(menuFor([a, b], local(2026, 12, 13)))
    expect(menuFor([a], local(2026, 11, 29))).toBe('coating')
  })

  test('ignores records newer than the date, so a backfilled day gets that day\'s plan', () => {
    const history = [record(local(2026, 10, 1), 'regular'), record(local(2026, 11, 5), 'coating')]

    expect(menuFor(history, local(2026, 10, 30))).toBe('coating') // 10/1 から 28 日たっている
    expect(menuFor(history, local(2026, 9, 20))).toBe('regular') // 最初の記録より前
    expect(menuFor(history, local(2026, 11, 10))).toBe('regular') // 11/5 のコーティングから 56 日はまだ、水シミ除去は 11/12 から
  })

  test('nextMenu and currentMenu follow it, preferring a menu chosen in the draft', () => {
    const history = [record(local(2026, 11, 1), 'regular')]
    const day = local(2026, 11, 29)

    expect(nextMenu(history, day)).toBe('coating')
    expect(currentMenu(undefined, history, day)).toBe('coating')
    expect(currentMenu('mineral', history, day)).toBe('mineral')
  })

  test('does not add special menus just because the user washes often', () => {
    // 毎週洗っても、24 週で特別メニューは周期（約 8 週）ぶんだけ
    let history: WashRecord[] = []
    for (let week = 0; week < 24; week += 1) {
      const day = local(2026, 1, 5 + week * 7)
      history = [...history, record(day, menuFor(history, day))]
    }

    expect(history.filter((r) => r.menu === 'coating').length).toBeLessThanOrEqual(4)
    expect(history.filter((r) => r.menu === 'mineral').length).toBeLessThanOrEqual(4)
  })
})

describe('buildSchedule', () => {
  const now = local(2026, 11, 14)

  test('starts today when there is no history and brings in special menus by elapsed days', () => {
    const items = buildSchedule([], prefs(2, 8), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/14', '11/28', '12/12', '12/26', '1/9'])
    expect(items.map((i) => i.menu)).toEqual(['regular', 'regular', 'coating', 'mineral', 'regular'])
    expect(items[0].overdueDays).toBe(0)
  })

  test('schedules the next wash one interval after the last one', () => {
    const items = buildSchedule([record(local(2026, 11, 10), 'regular')], prefs(2, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/24', '12/8'])
    expect(items.map((i) => i.menu)).toEqual(['regular', 'coating'])
  })

  test('pulls an overdue first item to today and counts from there', () => {
    const items = buildSchedule([record(local(2026, 10, 20), 'coating')], prefs(2, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/14', '11/28', '12/12'])
    expect(items[0].overdueDays).toBe(11)
    expect(items[1].overdueDays).toBe(0)
    expect(items.map((i) => i.menu)).toEqual(['regular', 'regular', 'mineral'])
  })

  test('uses the longer interval and horizon', () => {
    const items = buildSchedule([record(local(2026, 11, 14), 'regular')], prefs(3, 12), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/5', '12/26', '1/16', '2/6'])
    // 12/26 は最初の記録から 42 日（水シミ除去が先）、その次の 1/16 でコーティング補充
    expect(items.map((i) => i.menu)).toEqual(['regular', 'mineral', 'coating', 'regular'])
  })

  test('supports a monthly or longer interval', () => {
    const items = buildSchedule([record(local(2026, 11, 14), 'regular')], prefs(4, 12), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/12', '1/9', '2/6'])
    expect(items.map((i) => i.menu)).toEqual(['coating', 'mineral', 'coating'])
  })

  test('stops at the horizon without dropping the first item', () => {
    const items = buildSchedule([record(local(2026, 11, 14), 'regular')], prefs(3, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/5'])
  })

  test('includes an item that falls exactly on the end of the horizon', () => {
    const items = buildSchedule([], prefs(2, 4), now)

    expect(ymd(items.at(-1)!.date)).toBe('12/12')
  })

  test('replaces only the first menu and carries on as if it had been done', () => {
    const items = buildSchedule([], prefs(2, 4), now, 'mineral')

    expect(items.map((i) => i.menu)).toEqual(['mineral', 'regular', 'coating'])
  })
})

describe('lastWash', () => {
  test('returns null without history', () => {
    expect(lastWash([])).toBeNull()
  })

  test('returns the newest record date and menu regardless of storage order', () => {
    const history = [record(local(2026, 11, 1), 'regular'), record(local(2026, 11, 10), 'coating'), record(local(2026, 10, 1), 'mineral')]

    const result = lastWash(history)

    expect(result?.menu).toBe('coating')
    expect(result?.date.getDate()).toBe(10)
  })

  test('keeps the menu undefined for old records of unknown menu', () => {
    expect(lastWash([record(local(2026, 11, 1), undefined)])?.menu).toBeUndefined()
  })

  test('ignores records with an invalid date', () => {
    const bad = { ...record(local(2026, 11, 1), 'regular'), washedAt: 'invalid' }

    expect(lastWash([bad, record(local(2026, 10, 5), 'mineral')])?.menu).toBe('mineral')
  })
})
