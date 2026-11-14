import { describe, expect, test } from 'vitest'
import { STEP_TEMPLATES } from './catalog'
import { formatMinutes, planTiming, stepMinutes } from './timing'
import type { WashPlan, WashStep } from './types'

const step = (templateId: string | undefined, done = false): WashStep => ({
  id: `${templateId ?? 'custom'}-${done}`,
  name: templateId ?? '自作',
  done,
  templateId,
})
const plan = (...steps: WashStep[]): WashPlan => ({ steps })
const minutesOf = (id: string) => stepMinutes(step(id))

describe('stepMinutes', () => {
  test('every catalog template has a positive whole-minute estimate', () => {
    for (const template of STEP_TEMPLATES) {
      expect(Number.isInteger(template.minutes) && template.minutes > 0, template.id).toBe(true)
    }
  })

  test('returns 0 for custom steps and unknown templates', () => {
    expect(stepMinutes(step(undefined))).toBe(0)
    expect(stepMinutes(step('removed-template'))).toBe(0)
  })
})

describe('planTiming', () => {
  test('sums required steps for the total and unchecked ones for the remainder', () => {
    const result = planTiming(plan(step('tire-wheel', true), step('pre-rinse'), step('shampoo')))

    expect(result.totalMinutes).toBe(minutesOf('tire-wheel') + minutesOf('pre-rinse') + minutesOf('shampoo'))
    expect(result.remainingMinutes).toBe(minutesOf('pre-rinse') + minutesOf('shampoo'))
  })

  test('leaves unchecked optional steps out, like progress does', () => {
    const result = planTiming(plan(step('shampoo'), step('window'), step('interior')))

    expect(result.totalMinutes).toBe(minutesOf('shampoo'))
    expect(result.remainingMinutes).toBe(minutesOf('shampoo'))
  })

  test('counts a checked optional step in both total and done', () => {
    const result = planTiming(plan(step('shampoo'), step('window', true)))

    expect(result.totalMinutes).toBe(minutesOf('shampoo') + minutesOf('window'))
    expect(result.remainingMinutes).toBe(minutesOf('shampoo'))
  })

  test('ignores custom steps (unknown duration) and reports them', () => {
    const result = planTiming(plan(step('shampoo'), step(undefined)))

    expect(result.totalMinutes).toBe(minutesOf('shampoo'))
    expect(result.hasUnestimated).toBe(true)
  })

  test('is zero for an empty plan', () => {
    expect(planTiming(plan())).toEqual({ totalMinutes: 0, remainingMinutes: 0, hasUnestimated: false })
  })
})

describe('formatMinutes', () => {
  test.each([
    [0, '0分'],
    [45, '45分'],
    [60, '1時間'],
    [75, '1時間15分'],
  ])('formats %i minutes as %s', (minutes, label) => {
    expect(formatMinutes(minutes)).toBe(label)
  })
})
