import { useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { EMPTY_DRAFT } from './domain/draft'
import { menuName } from './domain/catalog'
import { addRecord, createRecord, removeRecord, resolveWashedAt } from './domain/history'
import {
  addStep,
  applyMenu,
  applyPureWater,
  createDefaultPlan,
  removeStep,
  resetPlan,
  toggleStep,
} from './domain/plan'
import { daysSinceLastWash } from './domain/reminder'
import { buildSchedule, currentMenu, nextMenu } from './domain/schedule'
import { setPureWater } from './domain/settings'
import type { RecordDraft } from './domain/types'
import { HistoryScreen } from './features/history/HistoryScreen'
import { PlanScreen } from './features/plan/PlanScreen'
import { ScheduleScreen } from './features/schedule/ScheduleScreen'
import { usePersistentState } from './hooks/usePersistentState'
import { formatMonthDay, toDateString } from './lib/format'
import { createId } from './lib/id'
import {
  loadDraft,
  loadHistory,
  loadPlan,
  loadSchedulePrefs,
  loadSettings,
  saveDraft,
  saveHistory,
  savePlan,
  saveSchedulePrefs,
  saveSettings,
} from './storage/storage'

/** 保存済みの plan に、今回のメニュー専用の工程を反映して読み込む。 */
function loadInitialPlan() {
  const menu = currentMenu(loadDraft().menu, loadHistory())
  const plan = loadPlan(() => createDefaultPlan(loadSettings(), createId, menu))
  return applyMenu(plan, menu, createId)
}

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

  const [notice, setNotice] = useState<string | null>(null)
  const [prefs, setPrefs, prefsSaveFailed] = usePersistentState(loadSchedulePrefs, saveSchedulePrefs)

  const saveFailed =
    settingsSaveFailed || planSaveFailed || historySaveFailed || draftSaveFailed || prefsSaveFailed
  const plannedMenu = nextMenu(history)

  const handleTabChange = (next: TabId) => {
    setNotice(null)
    setTab(next)
  }

  // メニューが変わったら、そのメニュー専用の工程を plan に反映する
  const handleDraftChange = (next: RecordDraft) => {
    setDraft(next)
    const menu = currentMenu(next.menu, history)
    // メニューが変わったときだけ反映する（ユーザーが消した専用工程を、メモ入力などで復活させない）
    if (menu !== currentMenu(draft.menu, history)) setPlan((p) => applyMenu(p, menu, createId))
  }

  const handleRecord = () => {
    const now = new Date()
    const recordedAt = resolveWashedAt(draft.washedOn, now)
    const record = createRecord(plan, { ...draft, menu: draft.menu ?? plannedMenu }, settings, recordedAt, createId)
    const nextHistory = addRecord(history, record)
    setNow(now)
    setHistory(nextHistory)
    setPlan((p) => applyMenu(resetPlan(p), nextMenu(nextHistory), createId))
    setDraft(EMPTY_DRAFT)

    const [next] = buildSchedule(nextHistory, prefs, now)
    setNotice(`記録しました。次回は ${formatMonthDay(next.date)} の${menuName(next.menu)}です。`)
    window.scrollTo({ top: 0 })
  }

  const handleRemoveRecord = (id: string) => {
    const nextHistory = removeRecord(history, id)
    setHistory(nextHistory)
    const menu = currentMenu(draft.menu, nextHistory)
    if (menu !== currentMenu(draft.menu, history)) setPlan((p) => applyMenu(p, menu, createId))
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
            plannedMenu={plannedMenu}
            notice={notice}
            today={toDateString(now)}
            daysSinceLastWash={daysSinceLastWash(history, now)}
            intervalWeeks={prefs.intervalWeeks}
            onDraftChange={handleDraftChange}
            onPureWaterChange={handlePureWaterChange}
            onToggle={(id) => {
              setNotice(null)
              setPlan((p) => toggleStep(p, id))
            }}
            onAdd={(name) => setPlan((p) => addStep(p, name, createId))}
            onRemove={(id) => setPlan((p) => removeStep(p, id))}
            onReset={() => setPlan(resetPlan)}
            onRestoreDefault={() => setPlan(createDefaultPlan(settings, createId, currentMenu(draft.menu, history)))}
            onRecord={handleRecord}
          />
        ) : tab === 'schedule' ? (
          <ScheduleScreen items={buildSchedule(history, prefs, now)} prefs={prefs} onPrefsChange={setPrefs} />
        ) : (
          <HistoryScreen history={history} onRemove={handleRemoveRecord} />
        )}
      </main>
      <TabBar current={tab} onChange={handleTabChange} />
    </div>
  )
}

export default App
