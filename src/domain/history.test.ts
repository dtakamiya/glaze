import { describe, expect, test } from 'vitest'
import { EMPTY_DRAFT } from './draft'
import { addRecord, createRecord, recentChemicals, removeRecord, resolveWashedAt } from './history'
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
      'regular',
    )

    expect(result).toEqual({
      id: 'r1',
      washedAt: '2026-11-13T10:00:00.000Z',
      steps: ['予洗い', '拭き上げ'],
      note: '晴れ',
      waterType: 'tap',
      chemicals: 'スリーク',
      conditions: ['bug'],
      menu: undefined,
      plannedMenu: 'regular',
      skipped: [{ name: 'シャンプー' }],
    })
  })

  test('truncates long notes and chemicals', () => {
    const result = createRecord(
      plan,
      draft({ note: 'x'.repeat(1000), chemicals: 'y'.repeat(1000) }),
      DEFAULT_SETTINGS,
      new Date(),
      () => 'r1',
      'regular',
    )

    expect(result.note).toHaveLength(500)
    expect(result.chemicals).toHaveLength(100)
  })

  test('follows the pure-water setting when the draft leaves water unset', () => {
    const result = createRecord(plan, EMPTY_DRAFT, { hasPureWater: true }, new Date(), () => 'r1', 'regular')

    expect(result.waterType).toBe('pure')
  })

  test('prefers the explicit water type in the draft over the setting', () => {
    const result = createRecord(plan, draft({ waterType: 'tap' }), { hasPureWater: true }, new Date(), () => 'r1', 'regular')

    expect(result.waterType).toBe('tap')
  })

  test('removes duplicate condition tags', () => {
    const result = createRecord(
      plan,
      draft({ conditions: ['bug', 'tar', 'bug'] }),
      DEFAULT_SETTINGS,
      new Date(),
      () => 'r1',
      'regular',
    )

    expect(result.conditions).toEqual(['bug', 'tar'])
  })
})

describe('createRecord: planned menu and skipped steps', () => {
  const custom: WashPlan = {
    steps: [
      { id: 'a', name: 'シャンプー洗車', done: true, templateId: 'shampoo' },
      { id: 'b', name: 'すすぎ', done: false, templateId: 'rinse-tap' },
      { id: 'c', name: '虫・鳥フン処理', done: false, templateId: 'bug-bird' },
      { id: 'd', name: '自作', done: false },
    ],
  }

  test('keeps the planned menu next to the actual one', () => {
    const result = createRecord(custom, draft({ menu: 'mineral' }), DEFAULT_SETTINGS, new Date(), () => 'r', 'coating')

    expect([result.menu, result.plannedMenu]).toEqual(['mineral', 'coating'])
  })

  test('lists unchecked required steps only, not optional ones', () => {
    const result = createRecord(custom, EMPTY_DRAFT, DEFAULT_SETTINGS, new Date(), () => 'r', 'regular')

    expect(result.skipped).toEqual([{ name: 'すすぎ', templateId: 'rinse-tap' }, { name: '自作' }])
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

describe('resolveWashedAt', () => {
  const now = new Date(2026, 10, 14, 16, 30)

  test('uses now when no date is chosen', () => {
    expect(resolveWashedAt(undefined, now)).toBe(now)
  })

  test('uses local noon of a past date', () => {
    const result = resolveWashedAt('2026-11-10', now)

    expect([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours()]).toEqual([2026, 10, 10, 12])
  })

  test('falls back to now for today, future, malformed and impossible dates', () => {
    for (const value of ['2026-11-14', '2026-11-20', 'yesterday', '2026-02-31', '2026-13-01']) {
      expect(resolveWashedAt(value, now)).toBe(now)
    }
  })
})

describe('recentChemicals', () => {
  const withChemicals = (id: string, washedAt: string, chemicals: string): WashRecord => ({ ...record(id, washedAt), chemicals })

  test('returns distinct non-empty values, newest first, regardless of storage order', () => {
    const history = [
      withChemicals('a', '2026-10-01T03:00:00.000Z', 'シャンプーA'),
      withChemicals('c', '2026-11-01T03:00:00.000Z', 'コートB'),
      withChemicals('b', '2026-10-15T03:00:00.000Z', ''),
      withChemicals('d', '2026-10-20T03:00:00.000Z', 'シャンプーA'),
    ]

    expect(recentChemicals(history, 5)).toEqual(['コートB', 'シャンプーA'])
  })

  test('limits the number of candidates and does not mutate the history', () => {
    const history = [
      withChemicals('a', '2026-10-01T03:00:00.000Z', 'A'),
      withChemicals('b', '2026-10-02T03:00:00.000Z', 'B'),
      withChemicals('c', '2026-10-03T03:00:00.000Z', 'C'),
    ]

    expect(recentChemicals(history, 2)).toEqual(['C', 'B'])
    expect(history.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  test('is empty without history', () => {
    expect(recentChemicals([], 3)).toEqual([])
  })
})
