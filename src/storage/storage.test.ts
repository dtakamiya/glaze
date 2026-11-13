import { afterEach, describe, expect, test, vi } from 'vitest'
import { HISTORY_KEY, PLAN_KEY, loadHistory, loadPlan, saveHistory, savePlan } from './storage'
import type { WashPlan, WashRecord } from '../domain/types'

const fallbackPlan: WashPlan = { steps: [{ id: 'd', name: 'デフォルト', done: false }] }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('plan storage', () => {
  test('round-trips a saved plan', () => {
    const plan: WashPlan = { steps: [{ id: 'a', name: '予洗い', done: true }] }

    savePlan(plan)

    expect(loadPlan(() => fallbackPlan)).toEqual(plan)
  })

  test('returns fallback when nothing is stored', () => {
    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
  })

  test('returns fallback and logs when stored data is corrupt', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(PLAN_KEY, '{"steps":[{"id":1}]}')

    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
    expect(warn).toHaveBeenCalled()
  })

  test('returns fallback and logs when JSON is invalid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(PLAN_KEY, 'not-json')

    expect(loadPlan(() => fallbackPlan)).toEqual(fallbackPlan)
    expect(warn).toHaveBeenCalled()
  })
})

describe('history storage', () => {
  test('round-trips saved history', () => {
    const history: WashRecord[] = [
      { id: 'r', washedAt: '2026-11-13T10:00:00.000Z', steps: ['予洗い'], note: 'メモ' },
    ]

    saveHistory(history)

    expect(loadHistory()).toEqual(history)
  })

  test('returns empty array for invalid data', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(HISTORY_KEY, '[{"id":"r","washedAt":"not-a-date","steps":[],"note":""}]')

    expect(loadHistory()).toEqual([])
  })

  test('backs up corrupt raw data so a later save cannot destroy it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(saveHistory([])).toBe(false)
    expect(warn).toHaveBeenCalled()
  })
})
