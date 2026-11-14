import { describe, expect, test } from 'vitest'
import { EMPTY_DRAFT } from './draft'
import { addRecord, createRecord, removeRecord } from './history'
import { DEFAULT_SETTINGS } from './settings'
import type { RecordDraft, WashPlan, WashRecord } from './types'

const plan: WashPlan = {
  steps: [
    { id: 'a', name: '予洗い', done: true },
    { id: 'b', name: 'シャンプー', done: false },
    { id: 'c', name: '拭き上げ', done: true },
  ],
}

const record = (id: string, washedAt: string): WashRecord => ({
  id,
  washedAt,
  steps: ['予洗い'],
  note: '',
  waterType: null,
  chemicals: '',
  conditions: [],
})

const draft = (overrides: Partial<RecordDraft>): RecordDraft => ({ ...EMPTY_DRAFT, ...overrides })

describe('createRecord', () => {
  test('snapshots completed step names, trimmed text and timestamp', () => {
    const now = new Date('2026-11-13T10:00:00.000Z')

    const result = createRecord(
      plan,
      draft({ note: '  晴れ  ', chemicals: '  スリーク  ', conditions: ['bug'] }),
      DEFAULT_SETTINGS,
      now,
      () => 'r1',
    )

    expect(result).toEqual({
      id: 'r1',
      washedAt: '2026-11-13T10:00:00.000Z',
      steps: ['予洗い', '拭き上げ'],
      note: '晴れ',
      waterType: 'tap',
      chemicals: 'スリーク',
      conditions: ['bug'],
    })
  })

  test('truncates long notes and chemicals', () => {
    const result = createRecord(
      plan,
      draft({ note: 'x'.repeat(1000), chemicals: 'y'.repeat(1000) }),
      DEFAULT_SETTINGS,
      new Date(),
      () => 'r1',
    )

    expect(result.note).toHaveLength(500)
    expect(result.chemicals).toHaveLength(100)
  })

  test('follows the pure-water setting when the draft leaves water unset', () => {
    const result = createRecord(plan, EMPTY_DRAFT, { hasPureWater: true }, new Date(), () => 'r1')

    expect(result.waterType).toBe('pure')
  })

  test('prefers the explicit water type in the draft over the setting', () => {
    const result = createRecord(plan, draft({ waterType: 'tap' }), { hasPureWater: true }, new Date(), () => 'r1')

    expect(result.waterType).toBe('tap')
  })

  test('removes duplicate condition tags', () => {
    const result = createRecord(
      plan,
      draft({ conditions: ['bug', 'tar', 'bug'] }),
      DEFAULT_SETTINGS,
      new Date(),
      () => 'r1',
    )

    expect(result.conditions).toEqual(['bug', 'tar'])
  })
})

describe('addRecord', () => {
  test('keeps history sorted newest first without mutation', () => {
    const history = [record('old', '2026-01-01T00:00:00.000Z')]

    const next = addRecord(history, record('new', '2026-02-01T00:00:00.000Z'))

    expect(next.map((r) => r.id)).toEqual(['new', 'old'])
    expect(history).toHaveLength(1)
  })
})

describe('removeRecord', () => {
  test('removes the matching record', () => {
    const history = [record('a', '2026-01-01T00:00:00.000Z'), record('b', '2026-01-02T00:00:00.000Z')]

    expect(removeRecord(history, 'a').map((r) => r.id)).toEqual(['b'])
  })
})
