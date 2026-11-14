import { STEP_TEMPLATES, findTemplate } from './catalog'
import type { IdGenerator, WashPlan, WashSettings, WashStep } from './types'

export const MAX_STEP_NAME_LENGTH = 40

/** 設定に合うテンプレートだけを、カタログ順に並べた標準プランを作る。 */
export function createDefaultPlan(settings: WashSettings, createId: IdGenerator): WashPlan {
  const steps = STEP_TEMPLATES.filter(
    (template) => template.slot === undefined || template.pureWater === settings.hasPureWater,
  ).map((template) => ({
    id: createId(),
    name: template.name,
    done: false,
    templateId: template.id,
  }))
  return { steps }
}

function mapSteps(plan: WashPlan, fn: (step: WashStep) => WashStep): WashPlan {
  return { ...plan, steps: plan.steps.map(fn) }
}

/**
 * すすぎ工程を純水あり/なしの変種に差し替える。id・done・位置は保ち、自作工程には触れない。
 * 変更が無ければ同じ plan を返す（冪等）。
 */
export function applyPureWater(plan: WashPlan, hasPureWater: boolean): WashPlan {
  const target = STEP_TEMPLATES.find(
    (template) => template.slot === 'rinse' && template.pureWater === hasPureWater,
  )
  if (target === undefined) return plan

  let changed = false
  const next = mapSteps(plan, (step) => {
    const current = findTemplate(step.templateId)
    if (current?.slot !== 'rinse' || current.id === target.id) return step
    changed = true
    return { ...step, name: target.name, templateId: target.id }
  })
  return changed ? next : plan
}

export function toggleStep(plan: WashPlan, stepId: string): WashPlan {
  return mapSteps(plan, (step) => (step.id === stepId ? { ...step, done: !step.done } : step))
}

export function addStep(plan: WashPlan, rawName: string, createId: IdGenerator): WashPlan {
  const name = rawName.trim().slice(0, MAX_STEP_NAME_LENGTH)
  if (name === '') return plan
  return { ...plan, steps: [...plan.steps, { id: createId(), name, done: false }] }
}

export function removeStep(plan: WashPlan, stepId: string): WashPlan {
  return { ...plan, steps: plan.steps.filter((step) => step.id !== stepId) }
}

export function resetPlan(plan: WashPlan): WashPlan {
  return mapSteps(plan, (step) => (step.done ? { ...step, done: false } : step))
}

export function completedStepNames(plan: WashPlan): string[] {
  return plan.steps.filter((step) => step.done).map((step) => step.name)
}
