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
  test('mineral removal comes every 90 days, much less often than coating and fluorin', () => {
    expect(MENU_CYCLES.mineral).toEqual({ firstDays: 90, everyDays: 90 })
    expect(MENU_CYCLES.mineral.everyDays).toBeGreaterThan(MENU_CYCLES.fluorin.everyDays)
  })

  test('every special menu has a cycle and a definition', () => {
    expect(Object.keys(MENU_CYCLES).every((id) => findMenu(id as MenuId) !== undefined)).toBe(true)
    expect(MENUS.map((m) => m.id)).toEqual(['regular', 'coating', 'mineral', 'fluorin'])
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

  test('adds coating 14 days and mineral removal 90 days after the first record', () => {
    const history = [record(local(2026, 11, 1), 'regular')]

    expect(menuFor(history, local(2026, 11, 14))).toBe('regular')
    expect(menuFor(history, local(2026, 11, 15))).toBe('coating')
    expect(menuFor(history, local(2026, 11, 28))).toBe('coating') // 水シミ除去はまだ（90 日後は 1/30）
    // コーティングとフルオリンが最近済んでいれば、最初の記録から 90 日後（1/30）に水シミ除去が入る
    const current = [...history, record(local(2027, 1, 16), 'coating'), record(local(2027, 1, 20), 'fluorin')]
    expect(menuFor(current, local(2027, 1, 29))).toBe('regular')
    expect(menuFor(current, local(2027, 1, 30))).toBe('mineral') // コーティングと同じ日なら水シミ除去が先
  })

  test('adds fluorin 28 days after the first record and counts 28 days from the last time it was done', () => {
    const history = [record(local(2026, 11, 1), 'regular'), record(local(2026, 11, 15), 'coating')]

    expect(menuFor(history, local(2026, 11, 28))).toBe('regular')
    expect(menuFor(history, local(2026, 11, 29))).toBe('fluorin') // コーティングと同じ日なら、フルオリンが先
    expect(menuFor([...history, record(local(2026, 11, 29), 'fluorin')], local(2026, 11, 29))).toBe('coating') // 実施済みなら次はコーティング
    const done = [...history, record(local(2026, 11, 29), 'fluorin'), record(local(2026, 12, 13), 'coating')]
    expect(menuFor(done, local(2026, 12, 26))).toBe('regular')
    expect(menuFor(done, local(2026, 12, 27))).toBe('fluorin')
  })

  test('picks the menu that has been due longer, so mineral removal waits behind older ones', () => {
    const history = [record(local(2026, 11, 1), 'regular')]

    expect(menuFor(history, local(2026, 11, 29))).toBe('coating') // コーティングは 11/15 から、フルオリンは 11/29 から
    // 1/30 には水シミ除去も来ているが、11/29 から来ているフルオリン（コーティングと同日ならフルオリンが先）が先
    expect(menuFor([...history, record(local(2026, 11, 15), 'coating')], local(2027, 1, 30))).toBe('fluorin')
  })

  test('counts 90 days for mineral from the last time it was done', () => {
    const history = [
      record(local(2026, 11, 1), 'regular'),
      record(local(2026, 11, 29), 'mineral'),
      record(local(2027, 2, 13), 'coating'),
      record(local(2027, 2, 13), 'fluorin'),
    ]

    expect(menuFor(history, local(2027, 2, 26))).toBe('regular') // 水シミ除去・コーティングは 2/27、フルオリンは 3/13 から
    expect(menuFor(history, local(2027, 2, 27))).toBe('mineral') // 11/29 の 90 日後。コーティングと同じ日なら水シミ除去が先
  })

  test('counts 14 days for coating from the last time it was done, while fluorin has been due since the first 28 days', () => {
    const history = [
      record(local(2026, 11, 1), 'regular'),
      record(local(2026, 11, 15), 'coating'),
      record(local(2026, 12, 13), 'coating'),
    ]

    expect(menuFor(history, local(2026, 12, 26))).toBe('fluorin') // フルオリンは最初の記録（11/1）から 28 日後の 11/29 以降ずっと来ている
    expect(menuFor(history, local(2026, 12, 27))).toBe('fluorin') // 来てから長い方が先（fluorin 11/29、coating 12/27）
  })

  test('a menu done earlier than planned pushes its next date back', () => {
    const history = [record(local(2026, 11, 1), 'regular'), record(local(2026, 11, 10), 'mineral')]

    expect(menuFor(history, local(2026, 11, 14))).toBe('regular')
    expect(menuFor(history, local(2026, 11, 15))).toBe('coating')
    const withFluorin = [...history, record(local(2026, 11, 29), 'fluorin'), record(local(2026, 11, 30), 'coating')]
    expect(menuFor(withFluorin, local(2026, 12, 7))).toBe('regular')
    expect(menuFor(withFluorin, local(2026, 12, 8))).toBe('regular') // 水シミ除去は 11/10 の 90 日後（2/8）まで来ない
  })

  test('is independent of history order and ignores unknown menus and invalid dates', () => {
    const a = record(local(2026, 11, 1))
    const b = record(local(2026, 11, 29), 'coating')
    const invalid = { ...record(local(2026, 11, 2), 'mineral'), washedAt: 'invalid' }

    expect(menuFor([b, a, invalid], local(2026, 12, 13))).toBe(menuFor([a, b], local(2026, 12, 13)))
    expect(menuFor([a], local(2026, 11, 15))).toBe('coating')
  })

  test('ignores records newer than the date, so a backfilled day gets that day\'s plan', () => {
    const history = [record(local(2026, 10, 1), 'regular'), record(local(2026, 11, 5), 'coating')]

    expect(menuFor(history, local(2026, 10, 15))).toBe('coating') // 10/1 から 14 日たっている
    expect(menuFor(history, local(2026, 9, 20))).toBe('regular') // 最初の記録より前
    expect(menuFor(history, local(2026, 11, 10))).toBe('fluorin') // 11/5 のコーティングは 11/19 から、フルオリンは 10/29 から（水シミ除去は 12/30 から）
  })

  test('nextMenu and currentMenu follow it, preferring a menu chosen in the draft', () => {
    const history = [record(local(2026, 11, 1), 'regular')]
    const day = local(2026, 11, 15)

    expect(nextMenu(history, day)).toBe('coating')
    expect(currentMenu(undefined, history, day)).toBe('coating')
    expect(currentMenu('mineral', history, day)).toBe('mineral')
  })

  test('does not add special menus just because the user washes often', () => {
    // 毎週洗っても、24 週で特別メニューは周期（コーティング 2 週・フルオリン 4 週・水シミ除去 90 日）ぶんだけ
    let history: WashRecord[] = []
    for (let week = 0; week < 24; week += 1) {
      const day = local(2026, 1, 5 + week * 7)
      history = [...history, record(day, menuFor(history, day))]
    }

    expect(history.filter((r) => r.menu === 'coating').length).toBeLessThanOrEqual(12)
    expect(history.filter((r) => r.menu === 'fluorin').length).toBeLessThanOrEqual(6)
    expect(history.filter((r) => r.menu === 'mineral').length).toBeLessThanOrEqual(2)
  })
})

describe('buildSchedule', () => {
  const now = local(2026, 11, 14)

  test('starts today when there is no history and brings in special menus by elapsed days', () => {
    const items = buildSchedule([], prefs(2, 8), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/14', '11/28', '12/12', '12/26', '1/9'])
    expect(items.map((i) => i.menu)).toEqual(['regular', 'coating', 'fluorin', 'coating', 'fluorin'])
    expect(items[0].overdueDays).toBe(0)
  })

  test('schedules the next wash one interval after the last one', () => {
    const items = buildSchedule([record(local(2026, 11, 10), 'regular')], prefs(2, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/24', '12/8'])
    expect(items.map((i) => i.menu)).toEqual(['coating', 'fluorin'])
  })

  test('pulls an overdue first item to today and counts from there', () => {
    const items = buildSchedule([record(local(2026, 10, 20), 'coating')], prefs(2, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/14', '11/28', '12/12'])
    expect(items[0].overdueDays).toBe(11)
    expect(items[1].overdueDays).toBe(0)
    expect(items.map((i) => i.menu)).toEqual(['coating', 'fluorin', 'coating'])
  })

  test('uses the longer interval and horizon', () => {
    const items = buildSchedule([record(local(2026, 11, 14), 'regular')], prefs(3, 12), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/5', '12/26', '1/16', '2/6'])
    // 周期が来てから長い方が先。12/26 はフルオリン（12/12 から）、1/16 はコーティング（12/19 から）
    expect(items.map((i) => i.menu)).toEqual(['coating', 'fluorin', 'coating', 'fluorin'])
  })

  test('supports a monthly or longer interval', () => {
    const items = buildSchedule([record(local(2026, 11, 14), 'regular')], prefs(4, 12), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/12', '1/9', '2/6'])
    expect(items.map((i) => i.menu)).toEqual(['coating', 'fluorin', 'coating'])
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

    expect(items.map((i) => i.menu)).toEqual(['mineral', 'coating', 'fluorin'])
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
