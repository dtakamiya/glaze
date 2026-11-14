import { describe, expect, test } from 'vitest'
import {
  CONDITION_TAGS,
  CONDITION_VALUES,
  LEGACY_NAME_TO_TEMPLATE,
  STEP_TEMPLATES,
  conditionLabel,
  findTemplate,
} from './catalog'
import { MAX_STEP_NAME_LENGTH } from './plan'

describe('STEP_TEMPLATES', () => {
  test('has unique ids', () => {
    const ids = STEP_TEMPLATES.map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('keeps every name within the storage limit', () => {
    const tooLong = STEP_TEMPLATES.filter((t) => t.name.length > MAX_STEP_NAME_LENGTH)

    expect(tooLong).toEqual([])
  })

  test('has exactly one pure and one tap variant in the rinse slot', () => {
    const rinse = STEP_TEMPLATES.filter((t) => t.slot === 'rinse')

    expect(rinse.map((t) => t.pureWater).sort()).toEqual([false, true])
  })

  test('starts with wheels and puts bug/bird treatment between rinse and coating', () => {
    const ids = STEP_TEMPLATES.map((t) => t.id)

    expect(ids[0]).toBe('tire-wheel')
    expect(ids.indexOf('bug-bird')).toBeGreaterThan(ids.indexOf('rinse-tap'))
    expect(ids.indexOf('bug-bird')).toBeLessThan(ids.indexOf('wipe-coat'))
  })
})

describe('findTemplate', () => {
  test('returns the template for a known id', () => {
    expect(findTemplate('shampoo')?.name).toBe('シャンプー洗車')
  })

  test('returns undefined for unknown or missing ids', () => {
    expect(findTemplate('removed-in-future')).toBeUndefined()
    expect(findTemplate(undefined)).toBeUndefined()
  })
})

describe('LEGACY_NAME_TO_TEMPLATE', () => {
  test('points only at existing templates', () => {
    const missing = Object.values(LEGACY_NAME_TO_TEMPLATE).filter((id) => findTemplate(id) === undefined)

    expect(missing).toEqual([])
  })
})

describe('condition tags', () => {
  test('exposes values and labels from a single definition', () => {
    expect(CONDITION_VALUES).toEqual(CONDITION_TAGS.map((t) => t.value))
    expect(conditionLabel('bird-dropping')).toBe('鳥フン')
  })
})
