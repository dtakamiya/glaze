import { useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { EMPTY_DRAFT } from './domain/draft'
import { addRecord, createRecord, removeRecord } from './domain/history'
import { addStep, applyPureWater, createDefaultPlan, removeStep, resetPlan, toggleStep } from './domain/plan'
import { daysSinceLastWash } from './domain/reminder'
import { setPureWater } from './domain/settings'
import { HistoryScreen } from './features/history/HistoryScreen'
import { PlanScreen } from './features/plan/PlanScreen'
import { usePersistentState } from './hooks/usePersistentState'
import { createId } from './lib/id'
import {
  loadDraft,
  loadHistory,
  loadPlan,
  loadSettings,
  saveDraft,
  saveHistory,
  savePlan,
  saveSettings,
} from './storage/storage'

const loadInitialPlan = () => loadPlan(() => createDefaultPlan(loadSettings(), createId))

function App() {
  const [tab, setTab] = useState<TabId>('plan')
  const [settings, setSettings, settingsSaveFailed] = usePersistentState(loadSettings, saveSettings)
  const [plan, setPlan, planSaveFailed] = usePersistentState(loadInitialPlan, savePlan)
  const [history, setHistory, historySaveFailed] = usePersistentState(loadHistory, saveHistory)
  // 入力中の値は永続化する（タブ切り替え・リロードで失われない）
  const [draft, setDraft, draftSaveFailed] = usePersistentState(loadDraft, saveDraft)

  // 日数計算用の現在時刻。記録時と、アプリが前面に戻ったとき（日跨ぎ対策）に更新する
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const saveFailed = settingsSaveFailed || planSaveFailed || historySaveFailed || draftSaveFailed

  const handleRecord = () => {
    const recordedAt = new Date()
    const record = createRecord(plan, draft, settings, recordedAt, createId)
    setNow(recordedAt)
    setHistory((prev) => addRecord(prev, record))
    setPlan(resetPlan)
    setDraft(EMPTY_DRAFT)
  }

  const handlePureWaterChange = (hasPureWater: boolean) => {
    setSettings((s) => setPureWater(s, hasPureWater))
    setPlan((p) => applyPureWater(p, hasPureWater))
  }

  return (
    <div className="app">
      <main className="app__main">
        {saveFailed && (
          <p className="alert" role="alert">
            端末に保存できませんでした。ストレージの空き容量やブラウザの設定（プライベートモード等）を確認してください。
          </p>
        )}
        {tab === 'plan' ? (
          <PlanScreen
            plan={plan}
            settings={settings}
            draft={draft}
            daysSinceLastWash={daysSinceLastWash(history, now)}
            onDraftChange={setDraft}
            onPureWaterChange={handlePureWaterChange}
            onToggle={(id) => setPlan((p) => toggleStep(p, id))}
            onAdd={(name) => setPlan((p) => addStep(p, name, createId))}
            onRemove={(id) => setPlan((p) => removeStep(p, id))}
            onReset={() => setPlan(resetPlan)}
            onRestoreDefault={() => setPlan(createDefaultPlan(settings, createId))}
            onRecord={handleRecord}
          />
        ) : (
          <HistoryScreen history={history} onRemove={(id) => setHistory((h) => removeRecord(h, id))} />
        )}
      </main>
      <TabBar current={tab} onChange={setTab} />
    </div>
  )
}

export default App
