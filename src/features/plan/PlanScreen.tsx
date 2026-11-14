import { useState, type FormEvent } from 'react'
import { findTemplate } from '../../domain/catalog'
import { MAX_STEP_NAME_LENGTH, planProgress } from '../../domain/plan'
import { formatMinutes, planTiming } from '../../domain/timing'
import type { MenuId, RecordDraft, WashPlan, WashSettings } from '../../domain/types'
import { FirstRunGuide } from './FirstRunGuide'
import { RecordForm } from './RecordForm'
import { ReminderBanner } from './ReminderBanner'
import { UpgradeNotice } from './UpgradeNotice'
import { TipPanel, TipToggle } from './StepTip'

interface PlanScreenProps {
  plan: WashPlan
  settings: WashSettings
  draft: RecordDraft
  plannedMenu: MenuId
  /** 記録直後の案内。無ければ null */
  notice: string | null
  /** 今日の日付（YYYY-MM-DD） */
  today: string
  /** 最後の洗車からの日数（履歴なしは null） */
  daysSinceLastWash: number | null
  /** 以前のバージョンから引き継いだ利用者向けの案内を出すか */
  showUpgradeNotice: boolean
  onDismissUpgradeNotice: () => void
  /** 最近使ったケミカル（新しい順） */
  recentChemicals: readonly string[]
  /** 設定中の洗車間隔（週） */
  intervalWeeks: number
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
  plannedMenu,
  notice,
  today,
  daysSinceLastWash,
  showUpgradeNotice,
  onDismissUpgradeNotice,
  recentChemicals,
  intervalWeeks,
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
  const { done: doneCount, total } = planProgress(plan)
  const timing = planTiming(plan)

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

      <div aria-live="polite" className="toast-region">
        {notice !== null && <p className="toast">{notice}</p>}
      </div>

      {showUpgradeNotice && <UpgradeNotice onDismiss={onDismissUpgradeNotice} />}
      {daysSinceLastWash === null && !showUpgradeNotice && <FirstRunGuide />}

      <ReminderBanner days={daysSinceLastWash} intervalWeeks={intervalWeeks} />

      <label className="toggle">
        <input
          type="checkbox"
          aria-describedby="pure-water-help"
          checked={settings.hasPureWater}
          onChange={(e) => onPureWaterChange(e.target.checked)}
        />
        <span>純水器を使う（すすぎの工程が切り替わります）</span>
      </label>
      <p id="pure-water-help" className="hint">
        純水器は、ミネラルを取り除いた水をつくる設備です。洗車場にある、またはすすぎに純水が使えるときにオンにします。
      </p>

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
          {doneCount} / {total} 工程{total > 0 && doneCount >= total ? ' ✓' : ''}
        </span>
      </div>

      <p className="timing" data-testid="plan-timing">
        所要の目安 約{formatMinutes(timing.totalMinutes)}・残り {formatMinutes(timing.remainingMinutes)}
        {timing.hasUnestimated && '（自作の工程は含みません）'}
      </p>

      <ul className="steps">
        {plan.steps.map((step) => {
          const template = findTemplate(step.templateId)
          const tips = template?.tips ?? []
          const avoid = template?.avoid ?? []
          const why = template?.why ?? []
          const hasGuidance = tips.length + avoid.length + why.length > 0
          const tipOpen = openTipIds.includes(step.id)
          const panelId = `tip-${step.id}`
          return (
            <li key={step.id} className={step.done ? 'step step--done' : 'step'}>
              <label className="step__label">
                <input type="checkbox" checked={step.done} onChange={() => onToggle(step.id)} />
                <span>{step.name}</span>
              </label>
              {template !== undefined && <span className="step__minutes">{template.minutes}分</span>}
              {template?.optional && <span className="badge">任意</span>}
              {hasGuidance && (
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
              {tipOpen && <TipPanel id={panelId} tips={tips} avoid={avoid} why={why} />}
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
        plannedMenu={plannedMenu}
        today={today}
        recentChemicals={recentChemicals}
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
