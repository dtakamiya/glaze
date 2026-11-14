import { describe, expect, test } from 'vitest'
import { EMPTY_DRAFT, toggleCondition } from './draft'
import { setPureWater } from './settings'

describe('toggleCondition', () => {
  test('adds a tag that is not selected without mutating the draft', () => {
    const next = toggleCondition(EMPTY_DRAFT, 'bug')

    expect(next.conditions).toEqual(['bug'])
    expect(EMPTY_DRAFT.conditions).toEqual([])
  })

  test('removes a tag that is already selected', () => {
    const selected = toggleCondition(toggleCondition(EMPTY_DRAFT, 'bug'), 'tar')

    expect(toggleCondition(selected, 'bug').conditions).toEqual(['tar'])
  })
})

describe('setPureWater', () => {
  test('returns a new settings object', () => {
    const tap = { hasPureWater: false }

    const next = setPureWater(tap, true)

    expect(next).toEqual({ hasPureWater: true })
    expect(tap.hasPureWater).toBe(false)
  })
})
