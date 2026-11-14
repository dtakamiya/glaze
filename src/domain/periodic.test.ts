import { describe, expect, test } from 'vitest'
import { findTemplate } from './catalog'
import { dueStepIds, isStepDue } from './periodic'
import type { WashRecord } from './types'

const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

const WHEEL_NAME = 'タイヤ・ホイール洗浄'

const record = (washedAt: Date, steps: readonly string[]): WashRecord => ({
  id: washedAt.toISOString(),
  washedAt: washedAt.toISOString(),
  steps,
  note: '',
  waterType: null,
  chemicals: '',
  conditions: [],
})

const wheel = findTemplate('tire-wheel')!

describe('isStepDue', () => {
  test('is due when there is no history or the step was never completed', () => {
    expect(isStepDue(wheel, [], local(2026, 11, 14))).toBe(true)
    expect(isStepDue(wheel, [record(local(2026, 11, 1), ['シャンプー洗車'])], local(2026, 11, 14))).toBe(true)
  })

  test('becomes due 28 days after the last completion', () => {
    const history = [record(local(2026, 11, 1), [WHEEL_NAME])]

    expect(isStepDue(wheel, history, local(2026, 11, 28))).toBe(false)
    expect(isStepDue(wheel, history, local(2026, 11, 29))).toBe(true)
  })

  test('counts from the newest completion regardless of history order', () => {
    const history = [record(local(2026, 11, 15), [WHEEL_NAME]), record(local(2026, 10, 1), [WHEEL_NAME])]

    expect(isStepDue(wheel, history, local(2026, 12, 12))).toBe(false)
    expect(isStepDue(wheel, history, local(2026, 12, 13))).toBe(true)
  })

  test('ignores records newer than the date and invalid dates', () => {
    const history = [
      record(local(2026, 11, 20), [WHEEL_NAME]),
      { ...record(local(2026, 11, 1), [WHEEL_NAME]), washedAt: 'invalid' },
    ]

    expect(isStepDue(wheel, history, local(2026, 11, 14))).toBe(true)
  })

  test('is always due for a step without a cycle', () => {
    expect(isStepDue(findTemplate('shampoo')!, [record(local(2026, 11, 14), ['シャンプー洗車'])], local(2026, 11, 14))).toBe(true)
  })
})

describe('dueStepIds', () => {
  test('lists only the cyclic steps that are due', () => {
    const history = [record(local(2026, 11, 1), [WHEEL_NAME])]

    expect([...dueStepIds(history, local(2026, 11, 10))]).toEqual([])
    expect([...dueStepIds(history, local(2026, 11, 29))]).toEqual(['tire-wheel'])
  })
})
