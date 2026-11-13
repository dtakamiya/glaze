import { describe, expect, test } from 'vitest'
import {
  DEFAULT_STEP_NAMES,
  addStep,
  completedStepNames,
  createDefaultPlan,
  removeStep,
  resetPlan,
  toggleStep,
} from './plan'

const fixedId = (() => {
  let n = 0
  return () => `id-${++n}`
})()

describe('createDefaultPlan', () => {
  test('creates unchecked steps from default names', () => {
    const plan = createDefaultPlan(fixedId)

    expect(plan.steps.map((s) => s.name)).toEqual(DEFAULT_STEP_NAMES)
    expect(plan.steps.every((s) => !s.done)).toBe(true)
  })
})

describe('toggleStep', () => {
  test('flips done for the matching step without mutating the original', () => {
    const plan = createDefaultPlan(fixedId)
    const target = plan.steps[1]

    const next = toggleStep(plan, target.id)

    expect(next.steps[1].done).toBe(true)
    expect(plan.steps[1].done).toBe(false)
    expect(next.steps[0]).toBe(plan.steps[0])
  })
})

describe('addStep', () => {
  test('appends a trimmed step name', () => {
    const plan = createDefaultPlan(fixedId)

    const next = addStep(plan, '  ガラス撥水  ', () => 'new-id')

    expect(next.steps.at(-1)).toEqual({ id: 'new-id', name: 'ガラス撥水', done: false })
    expect(plan.steps).toHaveLength(DEFAULT_STEP_NAMES.length)
  })

  test('returns the same plan when name is blank', () => {
    const plan = createDefaultPlan(fixedId)

    expect(addStep(plan, '   ', fixedId)).toBe(plan)
  })

  test('truncates names longer than the max length', () => {
    const plan = createDefaultPlan(fixedId)

    const next = addStep(plan, 'あ'.repeat(100), fixedId)

    expect(next.steps.at(-1)?.name).toHaveLength(40)
  })
})

describe('removeStep', () => {
  test('removes the matching step', () => {
    const plan = createDefaultPlan(fixedId)
    const target = plan.steps[0]

    const next = removeStep(plan, target.id)

    expect(next.steps.find((s) => s.id === target.id)).toBeUndefined()
    expect(plan.steps).toHaveLength(DEFAULT_STEP_NAMES.length)
  })
})

describe('resetPlan / completedStepNames', () => {
  test('lists completed names in order and reset unchecks all', () => {
    const plan = createDefaultPlan(fixedId)
    const checked = toggleStep(toggleStep(plan, plan.steps[2].id), plan.steps[0].id)

    expect(completedStepNames(checked)).toEqual([plan.steps[0].name, plan.steps[2].name])
    expect(resetPlan(checked).steps.every((s) => !s.done)).toBe(true)
  })
})
