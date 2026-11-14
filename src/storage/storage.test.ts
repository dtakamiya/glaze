import { afterEach, describe, expect, test, vi } from 'vitest'
import { EMPTY_DRAFT } from '../domain/draft'
import type { RecordDraft, WashPlan, WashRecord } from '../domain/types'
import {
  DRAFT_KEY,
  HISTORY_KEY,
  LEGACY_HISTORY_KEY,
  LEGACY_PLAN_KEY,
  PLAN_KEY,
  SCHEDULE_KEY,
  SETTINGS_KEY,
  loadDraft,
  loadHistory,
  loadPlan,
  loadSchedulePrefs,
  loadSettings,
  saveDraft,
  saveHistory,
  savePlan,
  saveSchedulePrefs,
  saveSettings,
} from './storage'

const fallbackPlan: WashPlan = { steps: [{ id: 'd', name: 'デフォルト', done: false }] }

const record = (overrides: Partial<WashRecord> = {}): WashRecord => ({
  id: 'r',
  washedAt: '2026-11-13T10:00:00.000Z',
  steps: ['予洗い'],
  note: 'メモ',
  waterType: 'pure',
  chemicals: 'スリーク',
  conditions: ['bug'],
  ...overrides,
})

const silenceWarn = () => vi.spyOn(console, 'warn').mockImplementation(() => {})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('plan storage', () => {
  test('round-trips a saved plan including templateId', () => {
    const plan: WashPlan = { steps: [{ id: 'a', name: '予洗い', done: true, templateId: 'pre-rinse' }] }

    savePlan(plan)

    expect(loadPlan(() => fallbackPlan)).toEqual(plan)
  })

  test('returns fallback when nothing is stored', () => {
    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
  })

  test('returns fallback and logs when stored data is corrupt', () => {
    const warn = silenceWarn()
    localStorage.setItem(PLAN_KEY, '{"steps":[{"id":1}]}')

    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
    expect(warn).toHaveBeenCalled()
  })

  test('returns fallback and logs when JSON is invalid', () => {
    const warn = silenceWarn()
    localStorage.setItem(PLAN_KEY, 'not-json')

    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
    expect(warn).toHaveBeenCalled()
  })

  test('accepts an unknown templateId instead of discarding the whole plan', () => {
    const plan = { steps: [{ id: 'a', name: '未来の工程', done: false, templateId: 'added-later' }] }
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan))

    expect(loadPlan(() => fallbackPlan)).toEqual(plan)
  })
})

describe('v1 → v2 migration', () => {
  const v1Plan = { steps: [{ id: 'a', name: 'シャンプー洗車', done: true }, { id: 'b', name: '自作', done: false }] }
  const v1History = [{ id: 'r', washedAt: '2026-11-13T10:00:00.000Z', steps: ['予洗い'], note: '旧メモ' }]

  test('migrates a v1 plan, keeps v1 data and does not back anything up', () => {
    localStorage.setItem(LEGACY_PLAN_KEY, JSON.stringify(v1Plan))

    const plan = loadPlan(() => fallbackPlan)

    expect(plan.steps).toEqual([
      { id: 'a', name: 'シャンプー洗車', done: true, templateId: 'shampoo' },
      { id: 'b', name: '自作', done: false },
    ])
    expect(localStorage.getItem(LEGACY_PLAN_KEY)).toBe(JSON.stringify(v1Plan))
    expect(localStorage.getItem(`${LEGACY_PLAN_KEY}:corrupt`)).toBeNull()
  })

  test('migrates v1 history with unknown water, no chemicals and no conditions', () => {
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(v1History))

    expect(loadHistory()).toEqual([{ ...v1History[0], waterType: null, chemicals: '', conditions: [] }])
  })

  test('prefers v2 data over v1 data', () => {
    localStorage.setItem(LEGACY_PLAN_KEY, JSON.stringify(v1Plan))
    savePlan(fallbackPlan)

    expect(loadPlan(() => ({ steps: [] }))).toEqual(fallbackPlan)
  })

  test('does not fall back to v1 when v2 exists but is corrupt', () => {
    silenceWarn()
    localStorage.setItem(LEGACY_PLAN_KEY, JSON.stringify(v1Plan))
    localStorage.setItem(PLAN_KEY, 'broken')

    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
    expect(localStorage.getItem(`${PLAN_KEY}:corrupt`)).toBe('broken')
  })

  test('backs up a corrupt v1 value and falls back', () => {
    const warn = silenceWarn()
    localStorage.setItem(LEGACY_HISTORY_KEY, '[{"id":1}]')

    expect(loadHistory()).toEqual([])
    expect(warn).toHaveBeenCalled()
    expect(localStorage.getItem(`${LEGACY_HISTORY_KEY}:corrupt`)).toBe('[{"id":1}]')
  })
})

describe('history storage', () => {
  test('round-trips saved history', () => {
    const history = [record()]

    saveHistory(history)

    expect(loadHistory()).toEqual(history)
  })

  test('rejects an unknown condition tag', () => {
    silenceWarn()
    localStorage.setItem(HISTORY_KEY, JSON.stringify([record({ conditions: ['unknown' as never] })]))

    expect(loadHistory()).toEqual([])
  })

  test('returns empty array for invalid data', () => {
    silenceWarn()
    localStorage.setItem(HISTORY_KEY, '[{"id":"r","washedAt":"not-a-date","steps":[],"note":""}]')

    expect(loadHistory()).toEqual([])
  })

  test('backs up corrupt raw data so a later save cannot destroy it', () => {
    silenceWarn()
    const raw = '[{"id":"r","washedAt":"not-a-date","steps":[],"note":""}]'
    localStorage.setItem(HISTORY_KEY, raw)

    loadHistory()
    saveHistory([])

    expect(localStorage.getItem(`${HISTORY_KEY}:corrupt`)).toBe(raw)
  })

  test('does not create a backup when data is valid or missing', () => {
    loadHistory()
    saveHistory([])
    loadHistory()

    expect(localStorage.getItem(`${HISTORY_KEY}:corrupt`)).toBeNull()
  })

  test('reports false and logs when writing fails', () => {
    const warn = silenceWarn()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(saveHistory([])).toBe(false)
    expect(warn).toHaveBeenCalled()
  })

  test('falls back and logs when reading throws', () => {
    const warn = silenceWarn()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(loadHistory()).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})

describe('settings and draft storage', () => {
  test('defaults to no pure water and round-trips settings', () => {
    expect(loadSettings()).toEqual({ hasPureWater: false })

    saveSettings({ hasPureWater: true })

    expect(loadSettings()).toEqual({ hasPureWater: true })
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull()
  })

  test('defaults to an empty draft and round-trips a draft', () => {
    const draft: RecordDraft = { note: '晴れ', waterType: 'tap', chemicals: 'A', conditions: ['tar'] }
    expect(loadDraft()).toEqual(EMPTY_DRAFT)

    saveDraft(draft)

    expect(loadDraft()).toEqual(draft)
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull()
  })

  test('keeps the planned menu in a draft and a record', () => {
    saveDraft({ ...EMPTY_DRAFT, menu: 'mineral' })
    saveHistory([record({ menu: 'coating' })])

    expect(loadDraft().menu).toBe('mineral')
    expect(loadHistory()[0].menu).toBe('coating')
  })

  test('round-trips the planned menu, skipped steps and dismissed suggestions', () => {
    const skipped = [{ name: 'すすぎ', templateId: 'rinse-tap' }, { name: '自作' }]
    saveHistory([record({ plannedMenu: 'coating', skipped })])
    saveDraft({ ...EMPTY_DRAFT, dismissed: ['menu:mineral:tags'] })

    expect(loadHistory()[0]).toMatchObject({ plannedMenu: 'coating', skipped })
    expect(loadDraft().dismissed).toEqual(['menu:mineral:tags'])
  })

  test('still loads records saved before planned menu and skipped steps existed', () => {
    const { plannedMenu, skipped, ...legacy } = record()
    void plannedMenu
    void skipped
    localStorage.setItem(HISTORY_KEY, JSON.stringify([legacy]))

    expect(loadHistory()).toEqual([legacy])
  })

  test('rejects a skipped step with an empty name', () => {
    silenceWarn()
    localStorage.setItem(HISTORY_KEY, JSON.stringify([record({ skipped: [{ name: '' }] })]))

    expect(loadHistory()).toEqual([])
  })

  test('discards an unknown menu id', () => {
    silenceWarn()
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...EMPTY_DRAFT, menu: 'unknown' }))

    expect(loadDraft()).toEqual(EMPTY_DRAFT)
  })

  test('discards an invalid draft', () => {
    silenceWarn()
    localStorage.setItem(DRAFT_KEY, '{"note":1}')

    expect(loadDraft()).toEqual(EMPTY_DRAFT)
  })
})

describe('chemicals length', () => {
  test('accepts up to 200 characters and rejects more', () => {
    silenceWarn()
    saveHistory([record({ chemicals: 'あ'.repeat(200) })])
    expect(loadHistory()[0].chemicals).toHaveLength(200)

    localStorage.setItem(HISTORY_KEY, JSON.stringify([record({ chemicals: 'あ'.repeat(201) })]))
    expect(loadHistory()).toEqual([])
  })
})

describe('schedule prefs storage', () => {
  test('defaults to a 2-week interval and 8-week horizon and round-trips', () => {
    expect(loadSchedulePrefs()).toEqual({ intervalWeeks: 2, horizonWeeks: 8 })

    saveSchedulePrefs({ intervalWeeks: 3, horizonWeeks: 12 })

    expect(loadSchedulePrefs()).toEqual({ intervalWeeks: 3, horizonWeeks: 12 })
    expect(localStorage.getItem(SCHEDULE_KEY)).not.toBeNull()
  })

  test('accepts a 1-week interval', () => {
    saveSchedulePrefs({ intervalWeeks: 1, horizonWeeks: 4 })

    expect(loadSchedulePrefs()).toEqual({ intervalWeeks: 1, horizonWeeks: 4 })
  })

  test('falls back to defaults for values outside the allowed options', () => {
    silenceWarn()
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify({ intervalWeeks: 5, horizonWeeks: 8 }))

    expect(loadSchedulePrefs()).toEqual({ intervalWeeks: 2, horizonWeeks: 8 })
  })
})
