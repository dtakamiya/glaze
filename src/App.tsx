import { useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { addRecord, createRecord, removeRecord } from './domain/history'
import { addStep, createDefaultPlan, removeStep, resetPlan, toggleStep } from './domain/plan'
import { HistoryScreen } from './features/history/HistoryScreen'
import { PlanScreen } from './features/plan/PlanScreen'
import { usePersistentState } from './hooks/usePersistentState'
import { createId } from './lib/id'
import { loadHistory, loadPlan, saveHistory, savePlan } from './storage/storage'

const loadInitialPlan = () => loadPlan(() => createDefaultPlan(createId))

function App() {
  const [tab, setTab] = useState<TabId>('plan')
  // タブ切り替えで PlanScreen がアンマウントされても失われないよう App で保持する
  const [note, setNote] = useState('')
  const [plan, setPlan, planSaveFailed] = usePersistentState(loadInitialPlan, savePlan)
  const [history, setHistory, historySaveFailed] = usePersistentState(loadHistory, saveHistory)

  const handleRecord = () => {
    const record = createRecord(plan, note, new Date(), createId)
    setHistory((prev) => addRecord(prev, record))
    setPlan(resetPlan)
    setNote('')
  }

  return (
    <div className="app">
      <main className="app__main">
        {(planSaveFailed || historySaveFailed) && (
          <p className="alert" role="alert">
            端末に保存できませんでした。ストレージの空き容量やブラウザの設定（プライベートモード等）を確認してください。
          </p>
        )}
        {tab === 'plan' ? (
          <PlanScreen
            plan={plan}
            note={note}
            onNoteChange={setNote}
            onToggle={(id) => setPlan((p) => toggleStep(p, id))}
            onAdd={(name) => setPlan((p) => addStep(p, name, createId))}
            onRemove={(id) => setPlan((p) => removeStep(p, id))}
            onReset={() => setPlan(resetPlan)}
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
