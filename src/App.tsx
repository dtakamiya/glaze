import { useEffect, useState } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { EMPTY_DRAFT, dismissSuggestion } from './domain/draft'
import { menuName } from './domain/catalog'
import {
  addRecord,
  createRecord,
  RECENT_CHEMICALS_LIMIT,
  recentChemicals,
  removeRecord,
  resolveWashedAt,
  updateRecord,
  type RecordEdit,
} from './domain/history'
import {
  addStep,
  applyMenu,
  applyPeriodic,
  applyPureWater,
  createDefaultPlan,
  removeStep,
  resetPlan,
  toggleStep,
} from './domain/plan'
import { dueStepIds, sameIds } from './domain/periodic'
import { daysSinceLastWash } from './domain/reminder'
import { buildSchedule, currentMenu, lastWash, nextMenu } from './domain/schedule'
import { setPureWater } from './domain/settings'
import { suggestNext, visibleSuggestions } from './domain/suggestion'
import type { MenuId, RecordDraft } from './domain/types'
import { HistoryScreen } from './features/history/HistoryScreen'
import { PlanScreen } from './features/plan/PlanScreen'
import { ScheduleScreen } from './features/schedule/ScheduleScreen'
import { usePersistentState } from './hooks/usePersistentState'
import { formatMonthDay, toDateString } from './lib/format'
import { createId } from './lib/id'
import {
  hasLegacyData,
  loadDraft,
  loadHistory,
  loadPlan,
  loadSchedulePrefs,
  loadSettings,
  loadUpgradeNoticeDismissed,
  saveDraft,
  saveHistory,
  savePlan,
  saveSchedulePrefs,
  saveSettings,
  saveUpgradeNoticeDismissed,
} from './storage/storage'

/** 保存済みの plan に、今回のメニュー専用の工程と、周期が来ている工程を反映して読み込む。 */
function loadInitialPlan() {
  const draft = loadDraft()
  const history = loadHistory()
  const washDate = resolveWashedAt(draft.washedOn, new Date())
  const menu = currentMenu(draft.menu, history, washDate)
  const due = dueStepIds(history, washDate)
  const plan = loadPlan(() => createDefaultPlan(loadSettings(), createId, menu, due))
  return applyPeriodic(applyMenu(plan, menu, createId), due, createId)
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

  // 以前のバージョンのデータを引き継いだ人に、新機能を案内する（初回描画時に判定。閉じたら保存）
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(() => hasLegacyData() && !loadUpgradeNoticeDismissed())
  const handleDismissUpgradeNotice = () => {
    saveUpgradeNoticeDismissed(true)
    setShowUpgradeNotice(false)
  }

  const [notice, setNotice] = useState<string | null>(null)
  const [prefs, setPrefs, prefsSaveFailed] = usePersistentState(loadSchedulePrefs, saveSchedulePrefs)

  const saveFailed =
    settingsSaveFailed || planSaveFailed || historySaveFailed || draftSaveFailed || prefsSaveFailed
  // 洗車日を過去にしたときは、その日時点の予定メニューで考える
  const washDate = (d: RecordDraft) => resolveWashedAt(d.washedOn, now)
  const plannedMenu = nextMenu(history, washDate(draft))
  const chosenMenu = currentMenu(draft.menu, history, washDate(draft))
  const dueSteps = dueStepIds(history, washDate(draft))
  const suggestions = visibleSuggestions(suggestNext(history, now), draft.dismissed ?? [], chosenMenu)

  const handleTabChange = (next: TabId) => {
    setNotice(null)
    setTab(next)
  }

  // メニューや周期が来ている工程が変わったら、plan に反映する
  // 変わったときだけ反映する（ユーザーが消した工程を、メモ入力などで復活させない）
  const syncPlan = (menu: MenuId, due: ReadonlySet<string>) => {
    if (menu === chosenMenu && sameIds(due, dueSteps)) return
    setPlan((p) => applyPeriodic(applyMenu(p, menu, createId), due, createId))
  }

  const handleDraftChange = (next: RecordDraft) => {
    setDraft(next)
    syncPlan(currentMenu(next.menu, history, washDate(next)), dueStepIds(history, washDate(next)))
  }

  const handleRecord = () => {
    const now = new Date()
    const recordedAt = resolveWashedAt(draft.washedOn, now)
    // 予定メニューは洗車した日の周期で決める（過去日で記録する場合も）
    const plannedAtWash = nextMenu(history, recordedAt)
    const record = createRecord(
      plan,
      { ...draft, menu: draft.menu ?? plannedAtWash },
      settings,
      recordedAt,
      createId,
      plannedAtWash,
    )
    const nextHistory = addRecord(history, record)
    setNow(now)
    setHistory(nextHistory)
    setPlan((p) =>
      applyPeriodic(applyMenu(resetPlan(p), nextMenu(nextHistory, now), createId), dueStepIds(nextHistory, now), createId),
    )
    setDraft(EMPTY_DRAFT)

    const [next] = buildSchedule(nextHistory, prefs, now)
    setNotice(`記録しました。次回は ${formatMonthDay(next.date)} の${menuName(next.menu)}です。`)
    window.scrollTo({ top: 0 })
  }

  const handleStartWash = () => {
    handleTabChange('plan')
    window.scrollTo({ top: 0 })
  }

  const handleAdoptMenu = (menu: MenuId) => handleDraftChange({ ...draft, menu })
  const handleDismissSuggestion = (id: string) => setDraft(dismissSuggestion(draft, id))
  const handleClearMenuOverride = () => handleDraftChange({ ...draft, menu: undefined })

  const handleRemoveRecord = (id: string) => {
    const nextHistory = removeRecord(history, id)
    setHistory(nextHistory)
    // 最新の記録が変わると同じ提案 ID が別の記録由来になりうるため、見送りは解除する
    setDraft((d) => (d.dismissed === undefined ? d : { ...d, dismissed: undefined }))
    syncPlan(currentMenu(draft.menu, nextHistory, washDate(draft)), dueStepIds(nextHistory, washDate(draft)))
  }

  const handleUpdateRecord = (id: string, edit: RecordEdit) => {
    setHistory((h) => updateRecord(h, id, edit))
    // 状態タグが変わると同じ提案 ID が別の内容になりうるため、見送りは解除する
    setDraft((d) => (d.dismissed === undefined ? d : { ...d, dismissed: undefined }))
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
            recentChemicals={recentChemicals(history, RECENT_CHEMICALS_LIMIT)}
            showUpgradeNotice={showUpgradeNotice}
            onDismissUpgradeNotice={handleDismissUpgradeNotice}
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
            onRestoreDefault={() => setPlan(createDefaultPlan(settings, createId, chosenMenu, dueSteps))}
            onRecord={handleRecord}
          />
        ) : tab === 'schedule' ? (
          <ScheduleScreen
            items={buildSchedule(history, prefs, now, draft.menu)}
            lastWash={lastWash(history)}
            prefs={prefs}
            onPrefsChange={setPrefs}
            suggestions={suggestions}
            menuOverridden={draft.menu !== undefined && draft.menu !== plannedMenu}
            onAdopt={handleAdoptMenu}
            onDismiss={handleDismissSuggestion}
            onClearOverride={handleClearMenuOverride}
            onStartWash={handleStartWash}
          />
        ) : (
          <HistoryScreen history={history} onRemove={handleRemoveRecord} onUpdate={handleUpdateRecord} />
        )}
      </main>
      <TabBar current={tab} onChange={handleTabChange} />
    </div>
  )
}

export default App
