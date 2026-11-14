import { describe, expect, test } from 'vitest'
import { suggestNext, visibleSuggestions } from './suggestion'
import type { ConditionTag, MenuId, SkippedStep, WashRecord } from './types'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)

const record = (
  washedAt: Date,
  menu: MenuId | undefined,
  options: { conditions?: ConditionTag[]; skipped?: SkippedStep[] } = {},
): WashRecord => ({
  id: washedAt.toISOString(),
  washedAt: washedAt.toISOString(),
  steps: [],
  note: '',
  waterType: null,
  chemicals: '',
  conditions: options.conditions ?? [],
  menu,
  skipped: options.skipped,
})

const now = day(2026, 11, 14)
const daysAgo = (n: number) => day(2026, 11, 14 - n)

describe('suggestNext', () => {
  test('returns nothing without history', () => {
    expect(suggestNext([], now)).toEqual([])
  })

  test('suggests mineral removal when the latest record has a water spot, with the tag as the reason', () => {
    const history = [record(daysAgo(3), 'regular', { conditions: ['water-spot'] })]

    const [first] = suggestNext(history, now)

    expect(first).toMatchObject({ kind: 'menu', menu: 'mineral', id: 'menu:mineral:tags' })
    expect(first.reason).toContain('水シミ')
  })

  test('also treats iron fallout as a reason for mineral removal', () => {
    const history = [record(daysAgo(3), 'regular', { conditions: ['iron-fallout'] })]

    expect(suggestNext(history, now)[0].menu).toBe('mineral')
  })

  test('does not suggest the menu that is already planned for the day', () => {
    // 最初の記録から 42 日たつと、予定が水シミ・水アカ除去になる
    const history = [
      record(daysAgo(43), 'regular'),
      record(daysAgo(15), 'coating'),
      record(daysAgo(3), 'regular', { conditions: ['water-spot'] }),
    ]

    expect(suggestNext(history, now).filter((s) => s.kind === 'menu')).toEqual([])
  })

  test('does not suggest mineral removal again for a water spot recorded on a mineral wash', () => {
    const history = [record(daysAgo(3), 'mineral', { conditions: ['water-spot'] })]

    expect(suggestNext(history, now).map((s) => s.id)).not.toContain('menu:mineral:tags')
  })

  test('adds a carry-over note for bug, bird and tar records', () => {
    const history = [record(daysAgo(3), 'regular', { conditions: ['bird-dropping', 'tar'] })]

    const note = suggestNext(history, now).find((s) => s.id === 'note:bug-bird')

    expect(note?.kind).toBe('note')
    expect(note?.reason).toContain('鳥フン・タール')
  })

  test('adds a note listing the required steps skipped last time', () => {
    const history = [record(daysAgo(3), 'regular', { skipped: [{ name: 'すすぎ' }, { name: '自作' }] })]

    expect(suggestNext(history, now).find((s) => s.id === 'note:skipped')?.reason).toBe('前回未実施: すすぎ、自作')
  })

  test('only looks at the latest record for notes, regardless of order', () => {
    const history = [
      record(daysAgo(3), 'regular', { conditions: ['bug'] }),
      record(daysAgo(20), 'regular', { skipped: [{ name: '古い未実施' }] }),
    ]

    const ids = suggestNext(history, now).map((s) => s.id)

    expect(ids).toContain('note:bug-bird')
    expect(ids).not.toContain('note:skipped')
  })
})

describe('visibleSuggestions', () => {
  const mineral = { id: 'menu:mineral:tags', kind: 'menu', menu: 'mineral', reason: 'a' } as const
  const coating = { id: 'menu:coating:elapsed', kind: 'menu', menu: 'coating', reason: 'b' } as const
  const note = { id: 'note:skipped', kind: 'note', reason: 'c' } as const

  test('keeps only the first menu suggestion plus every note', () => {
    expect(visibleSuggestions([mineral, coating, note], [], 'regular').map((s) => s.id)).toEqual([
      'menu:mineral:tags',
      'note:skipped',
    ])
  })

  test('falls through to the next candidate when the first one is dismissed', () => {
    expect(visibleSuggestions([mineral, coating], ['menu:mineral:tags'], 'regular').map((s) => s.id)).toEqual([
      'menu:coating:elapsed',
    ])
  })

  test('hides a suggestion for the menu that is already chosen', () => {
    expect(visibleSuggestions([mineral, coating], [], 'mineral').map((s) => s.id)).toEqual(['menu:coating:elapsed'])
  })
})
