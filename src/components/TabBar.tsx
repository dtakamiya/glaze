export type TabId = 'plan' | 'schedule' | 'history'

interface TabBarProps {
  current: TabId
  onChange: (tab: TabId) => void
}

const TABS: readonly { id: TabId; label: string; icon: string }[] = [
  { id: 'plan', label: '洗車プラン', icon: '✓' },
  { id: 'schedule', label: '計画', icon: '▤' },
  { id: 'history', label: '施工履歴', icon: '≡' },
]

export function TabBar({ current, onChange }: TabBarProps) {
  return (
    <nav className="tabbar" role="tablist" aria-label="画面切り替え">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={current === tab.id}
          className={current === tab.id ? 'tabbar__tab tabbar__tab--active' : 'tabbar__tab'}
          onClick={() => onChange(tab.id)}
        >
          <span aria-hidden="true" className="tabbar__icon">
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
