import { findTemplate } from '../domain/catalog'
import { EMPTY_DRAFT, dismissSuggestion } from '../domain/draft'
import { addRecord, createRecord, resolveWashedAt } from '../domain/history'
import { applyMenu, createDefaultPlan, resetPlan, toggleStep } from '../domain/plan'
import { daysSinceLastWash, reminderStatus, type ReminderStatus } from '../domain/reminder'
import { currentMenu, nextMenu } from '../domain/schedule'
import { suggestNext, visibleSuggestions } from '../domain/suggestion'
import type { ConditionTag, MenuId, RecordDraft, WashPlan, WashRecord } from '../domain/types'
import { toDateString } from '../lib/format'
import { createRng, type Persona, type Rng } from './personas'

/** 記録 1 件分の出来事（提案への反応を含む）。 */
export interface WashEvent {
  readonly washedOn: string
  readonly recordedOn: string
  readonly plannedMenu: MenuId
  readonly menu: MenuId
  /** 表示された提案の id（メニュー案と注意） */
  readonly shown: readonly string[]
  readonly adopted: string | null
  readonly dismissed: readonly string[]
  readonly skippedCount: number
  readonly conditions: readonly ConditionTag[]
}

export interface WeeklySample {
  readonly date: string
  readonly days: number | null
  readonly status: ReminderStatus
}

export interface SimulationResult {
  readonly persona: Persona
  readonly history: readonly WashRecord[]
  readonly plan: WashPlan
  readonly draft: RecordDraft
  readonly events: readonly WashEvent[]
  readonly weekly: readonly WeeklySample[]
}

const DAYS_IN_YEAR = 365
const DAYS_PER_WEEK = 7
const NOON = 12
export const SIMULATION_START = new Date(2026, 0, 5)

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, NOON)
}

interface PlannedWash {
  readonly washDay: number
  readonly recordDay: number
}

/** 年間の洗車日と記録日を決める。長く空く回数は、洗車の順番をランダムに選んで割り当てる。 */
function planWashes(persona: Persona, rng: Rng): PlannedWash[] {
  const gaps: number[] = []
  let day = rng.int(2, 5)
  const days: number[] = []
  while (day < DAYS_IN_YEAR) {
    days.push(day)
    gaps.push(rng.int(persona.gapDays[0], persona.gapDays[1]))
    day += gaps[gaps.length - 1]
  }
  const longIndexes = new Set<number>()
  while (longIndexes.size < Math.min(persona.longGaps, days.length - 1)) longIndexes.add(rng.int(1, days.length - 1))

  let washDay = days[0]
  const result: PlannedWash[] = []
  for (let i = 0; i < days.length; i += 1) {
    if (i > 0) washDay += longIndexes.has(i) ? rng.int(persona.longGapDays[0], persona.longGapDays[1]) : gaps[i - 1]
    if (washDay >= DAYS_IN_YEAR) break
    const late = rng.chance(persona.lateRecordRate)
    const recordDay = Math.min(DAYS_IN_YEAR - 1, washDay + (late ? rng.int(persona.lateDays[0], persona.lateDays[1]) : 0))
    result.push({ washDay, recordDay })
  }
  return result
}

function pickConditions(persona: Persona, month: number, rng: Rng): ConditionTag[] {
  const rates = persona.conditionRates(month)
  return (Object.keys(rates) as ConditionTag[]).filter((tag) => rng.chance(rates[tag] ?? 0))
}

/**
 * ペルソナが 1 年間アプリを使ったとして、記録・提案・予定を実際のドメイン関数で回す。
 * App.tsx の handleRecord / handleDraftChange と同じ順序で状態を更新する。
 */
export function simulatePersona(persona: Persona, seed = 1): SimulationResult {
  const rng = createRng(seed)
  let counter = 0
  const createId = () => `s${(counter += 1)}`

  let history: WashRecord[] = []
  let draft: RecordDraft = EMPTY_DRAFT
  let plan = applyMenu(
    createDefaultPlan(persona.settings, createId, nextMenu(history, SIMULATION_START)),
    currentMenu(undefined, history, SIMULATION_START),
    createId,
  )
  const events: WashEvent[] = []
  const weekly: WeeklySample[] = []
  const pending = planWashes(persona, rng)

  for (let day = 0; day < DAYS_IN_YEAR; day += 1) {
    const today = addDays(SIMULATION_START, day)

    for (const wash of pending.filter((p) => p.recordDay === day)) {
      const washDate = addDays(SIMULATION_START, wash.washDay)
      const washedOn = wash.recordDay > wash.washDay ? toDateString(washDate) : undefined
      const recordedAt = resolveWashedAt(washedOn, today)
      const plannedMenu = nextMenu(history, recordedAt)

      // 提案への反応（見送ると次の候補が出るので最大 2 回まで）
      const shown: string[] = []
      const dismissed: string[] = []
      let adopted: string | null = null
      for (let pass = 0; pass < 2; pass += 1) {
        const visible = visibleSuggestions(suggestNext(history, today), draft.dismissed ?? [], currentMenu(draft.menu, history, today))
        for (const s of visible) if (pass === 0 || s.kind === 'menu') shown.push(s.id)
        const menuSuggestion = visible.find((s) => s.kind === 'menu')
        if (menuSuggestion?.menu === undefined) break
        const roll = rng.float()
        if (roll < persona.adoptRate) {
          draft = { ...draft, menu: menuSuggestion.menu }
          plan = applyMenu(plan, menuSuggestion.menu, createId)
          adopted = menuSuggestion.id
          break
        }
        if (roll < persona.adoptRate + persona.dismissRate) {
          draft = dismissSuggestion(draft, menuSuggestion.id)
          dismissed.push(menuSuggestion.id)
          continue
        }
        break
      }

      for (const step of plan.steps) {
        const optional = findTemplate(step.templateId)?.optional === true
        if (rng.chance(optional ? persona.optionalRate : persona.requiredRate)) plan = toggleStep(plan, step.id)
      }

      const conditions = pickConditions(persona, washDate.getMonth() + 1, rng)
      const chosen = draft.menu ?? plannedMenu
      const record = createRecord(
        plan,
        { ...draft, menu: chosen, conditions, washedOn },
        persona.settings,
        recordedAt,
        createId,
        plannedMenu,
      )
      history = addRecord(history, record)
      plan = applyMenu(resetPlan(plan), nextMenu(history, today), createId)
      draft = EMPTY_DRAFT

      events.push({
        washedOn: toDateString(washDate),
        recordedOn: toDateString(today),
        plannedMenu,
        menu: chosen,
        shown,
        adopted,
        dismissed,
        skippedCount: record.skipped?.length ?? 0,
        conditions,
      })
    }

    if (day % DAYS_PER_WEEK === 0) {
      const days = daysSinceLastWash(history, today)
      weekly.push({ date: toDateString(today), days, status: reminderStatus(days, persona.prefs.intervalWeeks) })
    }
  }

  return { persona, history, plan, draft, events, weekly }
}
