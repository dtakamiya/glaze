import type { IdGenerator, WashPlan, WashStep } from './types'

export const MAX_STEP_NAME_LENGTH = 40

export const DEFAULT_STEP_NAMES: readonly string[] = [
  '予洗い（高圧水で砂を落とす）',
  'タイヤ・ホイール洗浄',
  'シャンプー洗車',
  'すすぎ',
  '拭き上げ',
  '窓ガラス清掃',
  'コーティング・ワックス',
  '内装清掃',
]

export function createDefaultPlan(createId: IdGenerator): WashPlan {
  return {
    steps: DEFAULT_STEP_NAMES.map((name) => ({ id: createId(), name, done: false })),
  }
}

function mapSteps(plan: WashPlan, fn: (step: WashStep) => WashStep): WashPlan {
  return { ...plan, steps: plan.steps.map(fn) }
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
