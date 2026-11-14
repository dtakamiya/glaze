import { findTemplate } from './catalog'
import type { WashPlan, WashStep } from './types'

export interface PlanTiming {
  /** 対象工程（必須とチェック済みの任意）の所要時間の目安（分） */
  readonly totalMinutes: number
  /** そのうち未チェックの工程の目安（分） */
  readonly remainingMinutes: number
  /** 所要時間が不明な工程（自作など）が対象に含まれる */
  readonly hasUnestimated: boolean
}

/** 工程の所要時間の目安（分）。自作工程・カタログに無い工程は 0（不明）。 */
export function stepMinutes(step: WashStep): number {
  return findTemplate(step.templateId)?.minutes ?? 0
}

/** 進捗（planProgress）と同じく、未チェックの任意工程は対象に入れない。 */
export function planTiming(plan: WashPlan): PlanTiming {
  const counted = plan.steps.filter((step) => step.done || findTemplate(step.templateId)?.optional !== true)
  const sum = (steps: readonly WashStep[]) => steps.reduce((total, step) => total + stepMinutes(step), 0)
  return {
    totalMinutes: sum(counted),
    remainingMinutes: sum(counted.filter((step) => !step.done)),
    hasUnestimated: counted.some((step) => findTemplate(step.templateId) === undefined),
  }
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}分`
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`
}
