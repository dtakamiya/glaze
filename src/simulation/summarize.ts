import { calendarDaysBetween } from '../domain/reminder'
import type { MenuId } from '../domain/types'
import type { SimulationResult } from './simulateYear'

export interface Summary {
  readonly washes: number
  readonly gapAverage: number
  readonly gapMax: number
  readonly menuCounts: Readonly<Record<MenuId, number>>
  readonly deviations: number
  readonly suggestionShown: Readonly<Record<string, number>>
  readonly menuSuggestionRate: number
  readonly adopted: number
  readonly dismissed: number
  readonly longestSameSuggestionStreak: number
  readonly noteSkippedRate: number
  readonly skippedTotal: number
  readonly dueWeeks: number
  readonly overdueWeeks: number
  readonly weeks: number
  readonly historyBytes: number
  readonly mineralGapMax: number | null
  readonly coatingGapMax: number | null
  readonly fluorinGapMax: number | null
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/** menu を実施した記録の間隔（日）の最大値。1 回も無ければ null。 */
function maxGap(result: SimulationResult, menu: MenuId): number | null {
  const dates = result.history
    .filter((record) => record.menu === menu)
    .map((record) => new Date(record.washedAt))
    .sort((a, b) => a.getTime() - b.getTime())
  if (dates.length === 0) return null
  const boundary = [new Date(result.weekly[0].date), ...dates, new Date(result.weekly.at(-1)?.date ?? dates[0])]
  return Math.max(...boundary.slice(1).map((date, i) => calendarDaysBetween(date, boundary[i])))
}

export function summarize(result: SimulationResult): Summary {
  const ordered = [...result.history].sort((a, b) => a.washedAt.localeCompare(b.washedAt))
  const gaps = ordered.slice(1).map((record, i) => calendarDaysBetween(new Date(record.washedAt), new Date(ordered[i].washedAt)))
  const menuCounts: Record<MenuId, number> = { regular: 0, coating: 0, mineral: 0, fluorin: 0 }
  for (const record of ordered) if (record.menu !== undefined) menuCounts[record.menu] += 1

  const suggestionShown: Record<string, number> = {}
  let menuShown = 0
  let noteSkipped = 0
  let streak = 0
  let longest = 0
  let previousMenuId: string | null = null
  for (const event of result.events) {
    for (const id of event.shown) suggestionShown[id] = (suggestionShown[id] ?? 0) + 1
    const menuId = event.shown.find((id) => id.startsWith('menu:')) ?? null
    if (menuId !== null) menuShown += 1
    if (event.shown.includes('note:skipped')) noteSkipped += 1
    streak = menuId !== null && menuId === previousMenuId ? streak + 1 : menuId !== null ? 1 : 0
    longest = Math.max(longest, streak)
    previousMenuId = menuId
  }

  const washes = result.events.length
  return {
    washes,
    gapAverage: gaps.length === 0 ? 0 : round(gaps.reduce((a, b) => a + b, 0) / gaps.length),
    gapMax: gaps.length === 0 ? 0 : Math.max(...gaps),
    menuCounts,
    deviations: result.events.filter((e) => e.menu !== e.plannedMenu).length,
    suggestionShown,
    menuSuggestionRate: washes === 0 ? 0 : round(menuShown / washes),
    adopted: result.events.filter((e) => e.adopted !== null).length,
    dismissed: result.events.reduce((sum, e) => sum + e.dismissed.length, 0),
    longestSameSuggestionStreak: longest,
    noteSkippedRate: washes === 0 ? 0 : round(noteSkipped / washes),
    skippedTotal: result.events.reduce((sum, e) => sum + e.skippedCount, 0),
    dueWeeks: result.weekly.filter((w) => w.status === 'due').length,
    overdueWeeks: result.weekly.filter((w) => w.status === 'overdue').length,
    weeks: result.weekly.length,
    historyBytes: JSON.stringify(result.history).length,
    mineralGapMax: maxGap(result, 'mineral'),
    coatingGapMax: maxGap(result, 'coating'),
    fluorinGapMax: maxGap(result, 'fluorin'),
  }
}

export function formatReport(results: readonly SimulationResult[]): string {
  const lines = ['# 1 年間シミュレーション', '']
  for (const result of results) {
    const s = summarize(result)
    lines.push(
      `## ${result.persona.name}（${result.persona.profile}）`,
      `- 洗車 ${s.washes} 回 / 間隔 平均 ${s.gapAverage} 日・最大 ${s.gapMax} 日`,
      `- メニュー: 通常 ${s.menuCounts.regular} / コーティング ${s.menuCounts.coating} / 水シミ除去 ${s.menuCounts.mineral} / フルオリンセラム ${s.menuCounts.fluorin}（予定と違う実施 ${s.deviations} 回）`,
      `- 水シミ除去の最大間隔 ${s.mineralGapMax ?? 'なし'} 日 / コーティング補充の最大間隔 ${s.coatingGapMax ?? 'なし'} 日 / フルオリンセラムの最大間隔 ${s.fluorinGapMax ?? 'なし'} 日`,
      `- メニュー提案が出た割合 ${s.menuSuggestionRate}、採用 ${s.adopted}、見送り ${s.dismissed}、同じ提案の最長連続 ${s.longestSameSuggestionStreak} 回`,
      `- 提案の内訳: ${JSON.stringify(s.suggestionShown)}`,
      `- 未実施の必須工程 計 ${s.skippedTotal} 件、「前回未実施」注意の出現率 ${s.noteSkippedRate}`,
      `- リマインド: そろそろ ${s.dueWeeks} 週 / 超過 ${s.overdueWeeks} 週（全 ${s.weeks} 週）`,
      `- 履歴の保存サイズ ${s.historyBytes} バイト`,
      '',
    )
  }
  return lines.join('\n')
}
