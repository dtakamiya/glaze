import { describe, expect, test } from 'vitest'
import { addRecord, createRecord, removeRecord } from './history'
import type { WashPlan, WashRecord } from './types'

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
})

describe('createRecord', () => {
  test('snapshots completed step names, trimmed note and timestamp', () => {
    const now = new Date('2026-11-13T10:00:00.000Z')

    const result = createRecord(plan, '  晴れ  ', now, () => 'r1')

    expect(result).toEqual({
      id: 'r1',
      washedAt: '2026-11-13T10:00:00.000Z',
      steps: ['予洗い', '拭き上げ'],
      note: '晴れ',
    })
  })

  test('truncates long notes', () => {
    const result = createRecord(plan, 'x'.repeat(1000), new Date(), () => 'r1')

    expect(result.note).toHaveLength(500)
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
