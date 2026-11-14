import { STEP_TEMPLATES, findTemplate, templateIndex } from './catalog'
import type { IdGenerator, MenuId, WashPlan, WashSettings, WashStep } from './types'

export const MAX_STEP_NAME_LENGTH = 40

/** 設定とメニューに合うテンプレートだけを、カタログ順に並べた標準プランを作る。 */
export function createDefaultPlan(settings: WashSettings, createId: IdGenerator, menu?: MenuId): WashPlan {
  const steps = STEP_TEMPLATES.filter(
    (template) =>
      (template.slot === undefined || template.pureWater === settings.hasPureWater) &&
      (template.menu === undefined || template.menu === menu),
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

const isMenuStep = (step: WashStep): boolean => findTemplate(step.templateId)?.menu !== undefined

/**
 * 今回のメニュー専用の工程を plan に反映する。他メニューの専用工程は取り除き、
 * 該当する工程をカタログ順の位置に入れる。変更が無ければ同じ plan を返す（冪等）。
 */
export function applyMenu(plan: WashPlan, menu: MenuId, createId: IdGenerator): WashPlan {
  const wanted = STEP_TEMPLATES.find((template) => template.menu === menu)
  const current = plan.steps.filter(isMenuStep)
  if (wanted === undefined && current.length === 0) return plan
  if (wanted !== undefined && current.length === 1 && current[0].templateId === wanted.id) return plan

  const base = plan.steps.filter((step) => !isMenuStep(step))
  if (wanted === undefined) return { ...plan, steps: base }

  const wantedIndex = templateIndex(wanted.id)
  const before = base.findIndex((step) => {
    const index = templateIndex(step.templateId)
    return index > wantedIndex
  })
  const lastTemplated = base.reduce((last, step, i) => (templateIndex(step.templateId) >= 0 ? i : last), -1)
  const at = before >= 0 ? before : lastTemplated + 1
  const added: WashStep = { id: createId(), name: wanted.name, done: false, templateId: wanted.id }
  return { ...plan, steps: [...base.slice(0, at), added, ...base.slice(at)] }
}

/** 進捗。未チェックの任意工程は分母に入れない（必須を終えれば完了にできる）。 */
export function planProgress(plan: WashPlan): { done: number; total: number } {
  const done = plan.steps.filter((step) => step.done).length
  const total = plan.steps.filter((step) => step.done || findTemplate(step.templateId)?.optional !== true).length
  return { done, total }
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
