import { describe, expect, test } from 'vitest'
import { migrateHistoryV1, migratePlanV1 } from './migrations'

describe('migratePlanV1', () => {
  test('keeps order, names and done, and tags exact legacy default names only once', () => {
    const plan = {
      steps: [
        { id: '1', name: 'すすぎ', done: true },
        { id: '2', name: 'すすぎ', done: false },
        { id: '3', name: '拭き上げ', done: false },
        { id: '4', name: 'コーティング・ワックス', done: false },
      ],
    }

    const next = migratePlanV1(plan)

    expect(next.steps).toEqual([
      { id: '1', name: 'すすぎ', done: true, templateId: 'rinse-tap' },
      { id: '2', name: 'すすぎ', done: false },
      { id: '3', name: '拭き上げ', done: false },
      { id: '4', name: 'コーティング・ワックス', done: false },
    ])
    expect(plan.steps[0]).toEqual({ id: '1', name: 'すすぎ', done: true })
  })
})

describe('migrateHistoryV1', () => {
  test('fills new fields as unknown without touching existing ones', () => {
    const history = [{ id: 'r', washedAt: '2026-01-01T00:00:00.000Z', steps: ['予洗い'], note: 'メモ' }]

    expect(migrateHistoryV1(history)).toEqual([
      { ...history[0], waterType: null, chemicals: '', conditions: [] },
    ])
  })
})
