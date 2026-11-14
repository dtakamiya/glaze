import { findMenu } from '../../domain/catalog'
import type { ScheduleItem } from '../../domain/schedule'
import { HORIZON_WEEKS_OPTIONS, INTERVAL_WEEKS_OPTIONS } from '../../domain/settings'
import { formatMonthDay, toDateString } from '../../lib/format'
import type { HorizonWeeks, IntervalWeeks, SchedulePrefs } from '../../domain/types'

interface ScheduleScreenProps {
  items: readonly ScheduleItem[]
  prefs: SchedulePrefs
  onPrefsChange: (prefs: SchedulePrefs) => void
}

function pickOption<T extends number>(options: readonly T[], value: string, fallback: T): T {
  return options.find((option) => String(option) === value) ?? fallback
}

export function ScheduleScreen({ items, prefs, onPrefsChange }: ScheduleScreenProps) {
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
              </article>
            </li>
          )
        })}
      </ol>
      <p className="schedule__note">
        洗車のたびに、メニューは「通常 → コーティング補充 → 通常 → 水シミ・水アカ除去」の順で進みます。記録するときに別のメニューへ変えることもできます。
      </p>
    </section>
  )
}
