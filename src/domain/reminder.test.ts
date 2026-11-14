import { describe, expect, test } from 'vitest'
import { daysSinceLastWash, reminderStatus } from './reminder'
import type { WashRecord } from './types'

const record = (washedAt: Date | string): WashRecord => ({
  id: String(washedAt),
  washedAt: typeof washedAt === 'string' ? washedAt : washedAt.toISOString(),
  steps: [],
  note: '',
  waterType: null,
  chemicals: '',
  conditions: [],
})

const localDate = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min)

describe('daysSinceLastWash', () => {
  test('returns null when there is no history', () => {
    expect(daysSinceLastWash([], new Date())).toBeNull()
  })

  test('counts local calendar days regardless of time of day', () => {
    const history = [record(localDate(2026, 11, 1, 23, 59))]

    expect(daysSinceLastWash(history, localDate(2026, 11, 2, 0, 1))).toBe(1)
    expect(daysSinceLastWash(history, localDate(2026, 11, 1, 23, 59))).toBe(0)
  })

  test('uses the latest record even when history is unsorted', () => {
    const history = [record(localDate(2026, 10, 1)), record(localDate(2026, 11, 10)), record(localDate(2026, 10, 20))]

    expect(daysSinceLastWash(history, localDate(2026, 11, 14))).toBe(4)
  })

  test('clamps future timestamps to 0 and ignores invalid dates', () => {
    const history = [record(localDate(2026, 12, 1)), record('invalid')]

    expect(daysSinceLastWash(history, localDate(2026, 11, 14))).toBe(0)
    expect(daysSinceLastWash([record('invalid')], new Date())).toBeNull()
  })
})

describe('reminderStatus', () => {
  test.each([
    [6, 1, 'ok'],
    [7, 1, 'due'],
    [14, 1, 'due'],
    [15, 1, 'overdue'],
    [null, 2, 'none'],
    [0, 2, 'ok'],
    [13, 2, 'ok'],
    [14, 2, 'due'],
    [21, 2, 'due'],
    [22, 2, 'overdue'],
    [20, 3, 'ok'],
    [21, 3, 'due'],
    [28, 3, 'due'],
    [29, 3, 'overdue'],
  ])('days=%s interval=%sw -> %s', (days, weeks, expected) => {
    expect(reminderStatus(days, weeks)).toBe(expected)
  })
})
