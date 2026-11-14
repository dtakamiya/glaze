import { describe, expect, test } from 'vitest'
import { historySchema, planSchema } from '../storage/schemas'
import { KOBAYASHI, NAKAMURA, PERSONAS, TAKAHASHI } from './personas'
import { SIMULATION_START, simulatePersona } from './simulateYear'
import { formatReport, summarize } from './summarize'

const END = new Date(SIMULATION_START.getFullYear() + 1, SIMULATION_START.getMonth(), SIMULATION_START.getDate())
const STORAGE_BUDGET_BYTES = 100 * 1024

describe.each(PERSONAS)('1 年間のシミュレーション: $name', (persona) => {
  const result = simulatePersona(persona)
  const summary = summarize(result)

  test('毎回の洗車が記録され、同じ入力なら結果が再現する', () => {
    expect(result.history.length).toBeGreaterThan(5)
    expect(simulatePersona(persona).history).toEqual(result.history)
  })

  test('保存データが検証を通り、記録は未来日でなく ID が重複しない', () => {
    expect(historySchema.safeParse(result.history).success).toBe(true)
    expect(planSchema.safeParse(result.plan).success).toBe(true)
    expect(result.history.every((r) => new Date(r.washedAt).getTime() <= END.getTime())).toBe(true)
    expect(new Set(result.history.map((r) => r.id)).size).toBe(result.history.length)
  })

  test('1 年分の履歴が保存容量に対して十分小さい', () => {
    expect(summary.historyBytes).toBeLessThan(STORAGE_BUDGET_BYTES)
  })

  test('計画に専用工程が複数残らない', () => {
    const menuSteps = result.plan.steps.filter((s) => s.templateId?.startsWith('menu-'))
    expect(menuSteps.length).toBeLessThanOrEqual(1)
  })

  test('採用した提案は、記録の実施メニューに反映される', () => {
    const adoptedEvents = result.events.filter((e) => e.adopted !== null)
    expect(adoptedEvents.every((e) => e.adopted?.includes(e.menu))).toBe(true)
  })
})

describe('提案をすべて無視しても', () => {
  const ignoring = simulatePersona({ ...TAKAHASHI, adoptRate: 0, dismissRate: 0 })
  const summary = summarize(ignoring)

  test('ローテーションに従って水シミ除去・コーティング補充が定期的に入る', () => {
    expect(summary.menuCounts.mineral).toBeGreaterThanOrEqual(4)
    expect(summary.menuCounts.coating).toBeGreaterThanOrEqual(4)
    expect(summary.deviations).toBe(0)
  })
})

describe('洗車が月 1 回のペルソナ（間隔 4 週）', () => {
  test('リマインドの超過週は全体の 3 割を超えない', () => {
    const summary = summarize(simulatePersona(NAKAMURA))

    expect(summary.overdueWeeks).toBeLessThan(summary.weeks * 0.3)
  })

  test('間が空いても水シミ除去は 4 か月以内に入る', () => {
    expect(summarize(simulatePersona(NAKAMURA)).mineralGapMax).toBeLessThanOrEqual(120)
  })
})

describe('毎週洗うペルソナ', () => {
  test('洗う回数が多くても、コーティングは 2 週ごと（年 26 回以下）・水シミ除去は 4 週ごと（年 13 回以下）に収まる', () => {
    const { menuCounts } = summarize(simulatePersona(KOBAYASHI))

    expect(menuCounts.mineral).toBeLessThanOrEqual(13)
    expect(menuCounts.coating).toBeLessThanOrEqual(26)
  })

  test('洗車回数が 2 週ごとの人より多く、1 年で 35 回を超える', () => {
    expect(summarize(simulatePersona(KOBAYASHI)).washes).toBeGreaterThan(35)
    expect(summarize(simulatePersona(KOBAYASHI)).washes).toBeGreaterThan(summarize(simulatePersona(TAKAHASHI)).washes)
  })
})

describe('レポート', () => {
  test.runIf(import.meta.env.VITE_SIM_REPORT !== undefined)('標準出力に出す', () => {
    console.info(formatReport(PERSONAS.map((persona) => simulatePersona(persona))))
  })
})
