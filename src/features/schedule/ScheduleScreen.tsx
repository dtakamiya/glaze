import { findMenu, menuName } from '../../domain/catalog'
import type { LastWash, ScheduleItem } from '../../domain/schedule'
import type { Suggestion } from '../../domain/suggestion'
import { HORIZON_WEEKS_OPTIONS, INTERVAL_WEEKS_OPTIONS } from '../../domain/settings'
import { formatMonthDay, toDateString } from '../../lib/format'
import { SuggestionList } from './SuggestionList'
import type { HorizonWeeks, IntervalWeeks, MenuId, SchedulePrefs } from '../../domain/types'

interface ScheduleScreenProps {
  items: readonly ScheduleItem[]
  /** 前回の洗車（履歴が無ければ null） */
  lastWash: LastWash | null
  prefs: SchedulePrefs
  onPrefsChange: (prefs: SchedulePrefs) => void
  suggestions: readonly Suggestion[]
  /** 先頭の予定を、ローテーションではなく選択したメニューに変えているか */
  menuOverridden: boolean
  onAdopt: (menu: MenuId) => void
  onDismiss: (suggestionId: string) => void
  onClearOverride: () => void
  /** 「次回」の予定で洗車を始める（洗車プランへ移る） */
  onStartWash: () => void
}

function pickOption<T extends number>(options: readonly T[], value: string, fallback: T): T {
  return options.find((option) => String(option) === value) ?? fallback
}

export function ScheduleScreen({
  items,
  lastWash,
  prefs,
  onPrefsChange,
  suggestions,
  menuOverridden,
  onAdopt,
  onDismiss,
  onClearOverride,
  onStartWash,
}: ScheduleScreenProps) {
  return (
    <section className="screen" aria-labelledby="schedule-title">
      <h1 id="schedule-title">洗車計画</h1>

      <div className="schedule-prefs">
        <label className="field">
          <span>洗車の間隔</span>
          <select
            value={prefs.intervalWeeks}
            onChange={(e) =>
              onPrefsChange({
                ...prefs,
                intervalWeeks: pickOption<IntervalWeeks>(INTERVAL_WEEKS_OPTIONS, e.target.value, prefs.intervalWeeks),
              })
            }
          >
            {INTERVAL_WEEKS_OPTIONS.map((weeks) => (
              <option key={weeks} value={weeks}>
                {weeks} 週間ごと
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>表示期間</span>
          <select
            value={prefs.horizonWeeks}
            onChange={(e) =>
              onPrefsChange({
                ...prefs,
                horizonWeeks: pickOption<HorizonWeeks>(HORIZON_WEEKS_OPTIONS, e.target.value, prefs.horizonWeeks),
              })
            }
          >
            {HORIZON_WEEKS_OPTIONS.map((weeks) => (
              <option key={weeks} value={weeks}>
                {weeks} 週間先まで
              </option>
            ))}
          </select>
        </label>
      </div>

      <SuggestionList suggestions={suggestions} onAdopt={onAdopt} onDismiss={onDismiss} />

      {lastWash !== null && (
        <p className="schedule__last">
          前回の洗車: {formatMonthDay(lastWash.date)}
          {lastWash.menu !== undefined && `　${menuName(lastWash.menu)}`}
        </p>
      )}

      <ol className="schedule">
        {items.map((item, index) => {
          const menu = findMenu(item.menu)
          return (
            <li key={toDateString(item.date)}>
              <article className={index === 0 ? 'card card--next' : 'card'}>
                <header className="card__header">
                  <time dateTime={toDateString(item.date)}>{formatMonthDay(item.date)}</time>
                  {index === 0 && <span className="badge badge--next">次回</span>}
                </header>
                {item.overdueDays > 0 && <p className="schedule__overdue">予定日を {item.overdueDays} 日過ぎています</p>}
                <h2 className="schedule__menu">{menu?.name ?? item.menu}</h2>
                {menu && <p className="schedule__summary">{menu.summary}</p>}
                {index === 0 && (
                  <button type="button" className="button button--secondary" onClick={onStartWash}>
                    この内容で洗車する
                  </button>
                )}
                {index === 0 && menuOverridden && (
                  <button type="button" className="button button--ghost schedule__reset" onClick={onClearOverride}>
                    予定どおりに戻す
                  </button>
                )}
              </article>
            </li>
          )
        })}
      </ol>
      <p className="schedule__note">
        コーティング補充は 2 週間ごと、水シミ・水アカ除去は 4 週間ごとに、最後にやってからの日数で入ります。洗う回数が多くても増えすぎません。記録するときに別のメニューへ変えることもできます。
      </p>
    </section>
  )
}
