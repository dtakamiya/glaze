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
    [null, 'none'],
    [0, 'ok'],
    [13, 'ok'],
    [14, 'due'],
    [21, 'due'],
    [22, 'overdue'],
    [100, 'overdue'],
  ])('days=%s -> %s', (days, expected) => {
    expect(reminderStatus(days)).toBe(expected)
  })
})
