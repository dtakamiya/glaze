import { describe, expect, test } from 'vitest'
import { ROTATION, findMenu, menuName } from './catalog'
import { buildSchedule, currentMenu, nextMenu, rotationCursor } from './schedule'
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

const prefs = (intervalWeeks: SchedulePrefs['intervalWeeks'], horizonWeeks: SchedulePrefs['horizonWeeks']): SchedulePrefs => ({
  intervalWeeks,
  horizonWeeks,
})

const ymd = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`

describe('menus', () => {
  test('rotation only uses defined menus and includes every menu', () => {
    expect(ROTATION.every((id) => findMenu(id) !== undefined)).toBe(true)
    expect(new Set(ROTATION)).toEqual(new Set(['regular', 'coating', 'mineral']))
    expect(menuName('mineral')).toBe('水シミ・水アカ除去')
  })
})

describe('rotationCursor / nextMenu', () => {
  test('starts at the first menu when there is no history', () => {
    expect(rotationCursor([])).toBe(0)
    expect(nextMenu([])).toBe('regular')
  })

  test('advances by one after following the planned rotation', () => {
    const history = [record(local(2026, 10, 1), 'regular'), record(local(2026, 10, 15), 'coating')]

    expect(nextMenu(history)).toBe('regular')
    expect(rotationCursor(history)).toBe(2)
  })

  test('wraps around after the last menu', () => {
    const history = ROTATION.map((menu, i) => record(local(2026, 1, 1 + i * 14), menu))

    expect(rotationCursor(history)).toBe(0)
  })

  test('is independent of history order', () => {
    const a = record(local(2026, 10, 1), 'regular')
    const b = record(local(2026, 10, 15), 'coating')

    expect(rotationCursor([b, a])).toBe(rotationCursor([a, b]))
  })

  test('jumps past the next occurrence when a different menu was done', () => {
    // 予定は regular だが mineral をやった → mineral の次（先頭）へ
    expect(nextMenu([record(local(2026, 10, 1), 'mineral')])).toBe('regular')
    expect(rotationCursor([record(local(2026, 10, 1), 'mineral')])).toBe(0)
  })

  test('counts a record with an unknown menu as one step', () => {
    expect(rotationCursor([record(local(2026, 10, 1))])).toBe(1)
  })

  test('ignores records with invalid dates', () => {
    const invalid = { ...record(local(2026, 10, 1), 'regular'), washedAt: 'invalid' }

    expect(rotationCursor([invalid])).toBe(0)
  })
})

describe('buildSchedule', () => {
  const now = local(2026, 11, 14)

  test('starts today when there is no history', () => {
    const items = buildSchedule([], prefs(2, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/14', '11/28', '12/12'])
    expect(items.map((i) => i.menu)).toEqual(['regular', 'coating', 'regular'])
    expect(items[0].overdueDays).toBe(0)
  })

  test('schedules the next wash one interval after the last one and follows the rotation', () => {
    const history = [record(local(2026, 11, 10), 'regular')]

    const items = buildSchedule(history, prefs(2, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['11/24', '12/8'])
    expect(items.map((i) => i.menu)).toEqual(['coating', 'regular'])
  })

  test('pulls an overdue first item to today and counts from there', () => {
    const history = [record(local(2026, 10, 20), 'coating')]

    const items = buildSchedule(history, prefs(2, 4), now)

    expect(ymd(items[0].date)).toBe('11/14')
    expect(items[0].overdueDays).toBe(11)
    expect(ymd(items[1].date)).toBe('11/28')
    expect(items[1].overdueDays).toBe(0)
    expect(items[0].menu).toBe('regular')
  })

  test('uses the longer interval and horizon', () => {
    const history = [record(local(2026, 11, 14), 'regular')]

    const items = buildSchedule(history, prefs(3, 12), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/5', '12/26', '1/16', '2/6'])
  })

  test('stops at the horizon without dropping the first item', () => {
    const history = [record(local(2026, 11, 14), 'regular')]

    const items = buildSchedule(history, prefs(3, 4), now)

    expect(items.map((i) => ymd(i.date))).toEqual(['12/5'])
  })

  test('includes an item that falls exactly on the end of the horizon', () => {
    const items = buildSchedule([], prefs(2, 4), now)

    expect(ymd(items.at(-1)!.date)).toBe('12/12')
  })
})

describe('currentMenu', () => {
  test('prefers the menu chosen in the draft, otherwise follows the rotation', () => {
    const history = [record(local(2026, 10, 1), 'regular')]

    expect(currentMenu('mineral', history)).toBe('mineral')
    expect(currentMenu(undefined, history)).toBe('coating')
  })
})
