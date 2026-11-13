import { useState, type FormEvent } from 'react'
import { MAX_NOTE_LENGTH } from '../../domain/history'
import { MAX_STEP_NAME_LENGTH } from '../../domain/plan'
import type { WashPlan } from '../../domain/types'

interface PlanScreenProps {
  plan: WashPlan
  note: string
  onNoteChange: (note: string) => void
  onToggle: (stepId: string) => void
  onAdd: (name: string) => void
  onRemove: (stepId: string) => void
  onReset: () => void
  onRecord: () => void
}

export function PlanScreen({
  plan,
  note,
  onNoteChange,
  onToggle,
  onAdd,
  onRemove,
  onReset,
  onRecord,
}: PlanScreenProps) {
  const [newStep, setNewStep] = useState('')
  const doneCount = plan.steps.filter((s) => s.done).length
  const total = plan.steps.length

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    onAdd(newStep)
    setNewStep('')
  }

  return (
    <section className="screen" aria-labelledby="plan-title">
      <h1 id="plan-title">洗車プラン</h1>

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
        {plan.steps.map((step) => (
          <li key={step.id} className={step.done ? 'step step--done' : 'step'}>
            <label className="step__label">
              <input type="checkbox" checked={step.done} onChange={() => onToggle(step.id)} />
              <span>{step.name}</span>
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label={`${step.name} を削除`}
              onClick={() => onRemove(step.id)}
            >
              ×
            </button>
          </li>
        ))}
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

      <div className="record">
        <label className="field">
          <span>メモ</span>
          <textarea
            rows={2}
            placeholder="天気・使ったケミカルなど"
            maxLength={MAX_NOTE_LENGTH}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </label>
        <div className="record__actions">
          <button type="button" className="button button--ghost" onClick={onReset} disabled={doneCount === 0}>
            チェックをリセット
          </button>
          <button type="button" className="button" onClick={onRecord} disabled={doneCount === 0}>
            施工を記録
          </button>
        </div>
      </div>
    </section>
  )
}
