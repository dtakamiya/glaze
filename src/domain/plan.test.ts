import { describe, expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import {
  addStep,
  applyPureWater,
  completedStepNames,
  createDefaultPlan,
  removeStep,
  resetPlan,
  toggleStep,
} from './plan'
import type { WashPlan } from './types'

const fixedId = (() => {
  let n = 0
  return () => `id-${++n}`
})()

const tapPlan = () => createDefaultPlan(DEFAULT_SETTINGS, fixedId)
const purePlan = () => createDefaultPlan({ hasPureWater: true }, fixedId)

describe('createDefaultPlan', () => {
  test('lists wheels first and uses the tap rinse by default', () => {
    const plan = tapPlan()

    expect(plan.steps.map((s) => s.templateId)).toEqual([
      'tire-wheel',
      'pre-rinse',
      'shampoo',
      'rinse-tap',
      'bug-bird',
      'wipe-coat',
      'window',
      'interior',
    ])
    expect(plan.steps.every((s) => !s.done)).toBe(true)
  })

  test('uses the pure-water rinse instead when available', () => {
    const ids = purePlan().steps.map((s) => s.templateId)

    expect(ids).toContain('rinse-pure')
    expect(ids).not.toContain('rinse-tap')
  })
})

describe('applyPureWater', () => {
  test('swaps the rinse step while keeping id, done and position', () => {
    const plan = toggleStep(tapPlan(), tapPlan().steps[0].id)
    const rinseIndex = plan.steps.findIndex((s) => s.templateId === 'rinse-tap')
    const checked = toggleStep(plan, plan.steps[rinseIndex].id)

    const next = applyPureWater(checked, true)

    expect(next.steps[rinseIndex]).toEqual({
      id: checked.steps[rinseIndex].id,
      name: '純水すすぎ',
      done: true,
      templateId: 'rinse-pure',
    })
    expect(checked.steps[rinseIndex].templateId).toBe('rinse-tap')
  })

  test('is idempotent and returns the same plan when nothing changes', () => {
    const plan = purePlan()

    expect(applyPureWater(plan, true)).toBe(plan)
  })

  test('does not touch custom steps or a plan without a rinse slot', () => {
    const custom: WashPlan = { steps: [{ id: 'x', name: 'すすぎ', done: false }] }

    expect(applyPureWater(custom, true)).toBe(custom)
  })

  test('swaps back to the tap rinse', () => {
    const next = applyPureWater(purePlan(), false)

    expect(next.steps.map((s) => s.templateId)).toContain('rinse-tap')
  })
})

describe('toggleStep', () => {
  test('flips done for the matching step without mutating the original', () => {
    const plan = tapPlan()
    const target = plan.steps[1]

    const next = toggleStep(plan, target.id)

    expect(next.steps[1].done).toBe(true)
    expect(plan.steps[1].done).toBe(false)
    expect(next.steps[0]).toBe(plan.steps[0])
  })
})

describe('addStep', () => {
  test('appends a trimmed custom step without a templateId', () => {
    const plan = tapPlan()

    const next = addStep(plan, '  ガラス撥水  ', () => 'new-id')

    expect(next.steps.at(-1)).toEqual({ id: 'new-id', name: 'ガラス撥水', done: false })
    expect(next.steps).toHaveLength(plan.steps.length + 1)
  })

  test('returns the same plan when name is blank', () => {
    const plan = tapPlan()

    expect(addStep(plan, '   ', fixedId)).toBe(plan)
  })

  test('truncates names longer than the max length', () => {
    const next = addStep(tapPlan(), 'あ'.repeat(100), fixedId)

    expect(next.steps.at(-1)?.name).toHaveLength(40)
  })
})

describe('removeStep', () => {
  test('removes the matching step', () => {
    const plan = tapPlan()
    const target = plan.steps[0]

    const next = removeStep(plan, target.id)

    expect(next.steps.find((s) => s.id === target.id)).toBeUndefined()
    expect(next.steps).toHaveLength(plan.steps.length - 1)
  })
})

describe('resetPlan / completedStepNames', () => {
  test('lists completed names in order and reset unchecks all', () => {
    const plan = tapPlan()
    const checked = toggleStep(toggleStep(plan, plan.steps[2].id), plan.steps[0].id)

    expect(completedStepNames(checked)).toEqual([plan.steps[0].name, plan.steps[2].name])
    expect(resetPlan(checked).steps.every((s) => !s.done)).toBe(true)
  })
})
