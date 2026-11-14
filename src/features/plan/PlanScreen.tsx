import { useState, type FormEvent } from 'react'
import { findTemplate } from '../../domain/catalog'
import { MAX_STEP_NAME_LENGTH } from '../../domain/plan'
import type { RecordDraft, WashPlan, WashSettings } from '../../domain/types'
import { RecordForm } from './RecordForm'
import { ReminderBanner } from './ReminderBanner'
import { TipPanel, TipToggle } from './StepTip'

interface PlanScreenProps {
  plan: WashPlan
  settings: WashSettings
  draft: RecordDraft
  /** 最後の洗車からの日数（履歴なしは null） */
  daysSinceLastWash: number | null
  onDraftChange: (draft: RecordDraft) => void
  onPureWaterChange: (hasPureWater: boolean) => void
  onToggle: (stepId: string) => void
  onAdd: (name: string) => void
  onRemove: (stepId: string) => void
  onReset: () => void
  onRestoreDefault: () => void
  onRecord: () => void
}

export function PlanScreen({
  plan,
  settings,
  draft,
  daysSinceLastWash,
  onDraftChange,
  onPureWaterChange,
  onToggle,
  onAdd,
  onRemove,
  onReset,
  onRestoreDefault,
  onRecord,
}: PlanScreenProps) {
  const [newStep, setNewStep] = useState('')
  const [openTipIds, setOpenTipIds] = useState<readonly string[]>([])
  const doneCount = plan.steps.filter((s) => s.done).length
  const total = plan.steps.length

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    onAdd(newStep)
    setNewStep('')
  }

  const toggleTip = (stepId: string) =>
    setOpenTipIds((ids) => (ids.includes(stepId) ? ids.filter((id) => id !== stepId) : [...ids, stepId]))

  const handleRestoreDefault = () => {
    if (window.confirm('工程を初期プランに戻しますか？追加・削除・並び替えした内容とチェック状態は失われます（施工履歴は残ります）。')) {
      onRestoreDefault()
    }
  }

  return (
    <section className="screen" aria-labelledby="plan-title">
      <h1 id="plan-title">洗車プラン</h1>

      <ReminderBanner days={daysSinceLastWash} />

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.hasPureWater}
          onChange={(e) => onPureWaterChange(e.target.checked)}
        />
        <span>純水器を使う（すすぎの工程が切り替わります）</span>
      </label>

      <div className="progress">
        <div
          className="progress__bar"
          role="progressbar"
          aria-label="完了した工程"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
        >
          <div className="progress__fill" style={{ width: total ? `${(doneCount / total) * 100}%` : 0 }} />
        </div>
        <span className="progress__label">
          {doneCount} / {total} 工程
        </span>
      </div>

      <ul className="steps">
        {plan.steps.map((step) => {
          const template = findTemplate(step.templateId)
          const tips = template?.tips ?? []
          const tipOpen = openTipIds.includes(step.id)
          const panelId = `tip-${step.id}`
          return (
            <li key={step.id} className={step.done ? 'step step--done' : 'step'}>
              <label className="step__label">
                <input type="checkbox" checked={step.done} onChange={() => onToggle(step.id)} />
                <span>{step.name}</span>
              </label>
              {template?.optional && <span className="badge">任意</span>}
              {tips.length > 0 && (
                <TipToggle
                  stepName={step.name}
                  expanded={tipOpen}
                  panelId={panelId}
                  onToggle={() => toggleTip(step.id)}
                />
              )}
              <button
                type="button"
                className="icon-button"
                aria-label={`${step.name} を削除`}
                onClick={() => onRemove(step.id)}
              >
                ×
              </button>
              {tipOpen && <TipPanel id={panelId} tips={tips} />}
            </li>
          )
        })}
      </ul>

      <form className="add-step" onSubmit={handleAdd}>
        <input
          type="text"
          aria-label="追加する工程"
          placeholder="工程を追加（例: 鉄粉除去）"
          maxLength={MAX_STEP_NAME_LENGTH}
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
        />
        <button type="submit" className="button button--secondary" disabled={newStep.trim() === ''}>
          追加
        </button>
      </form>

      <RecordForm
        draft={draft}
        settings={settings}
        canRecord={doneCount > 0}
        onDraftChange={onDraftChange}
        onReset={onReset}
        onRecord={onRecord}
      />

      <button type="button" className="button button--ghost restore" onClick={handleRestoreDefault}>
        初期プランに戻す
      </button>
    </section>
  )
}
