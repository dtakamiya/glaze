import { conditionLabel, menuName } from '../../domain/catalog'
import type { WashRecord, WaterType } from '../../domain/types'

const WATER_LABEL: Record<WaterType, string> = { pure: '純水', tap: '水道水' }

interface HistoryScreenProps {
  history: readonly WashRecord[]
  onRemove: (recordId: string) => void
}

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function HistoryScreen({ history, onRemove }: HistoryScreenProps) {
  const handleRemove = (record: WashRecord, label: string) => {
    if (window.confirm(`${label} の記録を削除しますか？`)) onRemove(record.id)
  }

  return (
    <section className="screen" aria-labelledby="history-title">
      <h1 id="history-title">施工履歴</h1>

      {history.length === 0 ? (
        <p className="empty">まだ施工記録がありません</p>
      ) : (
        <ol className="history">
          {history.map((record) => {
            const label = dateFormatter.format(new Date(record.washedAt))
            return (
              <li key={record.id}>
                <article className="card">
                  <header className="card__header">
                    <time dateTime={record.washedAt}>{label}</time>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${label} の記録を削除`}
                      onClick={() => handleRemove(record, label)}
                    >
                      ×
                    </button>
                  </header>
                  <ul className="tags">
                    {record.steps.map((name, i) => (
                      <li key={`${i}-${name}`} className="tag">
                        {name}
                      </li>
                    ))}
                  </ul>
                  <ul className="tags tags--meta">
                    {record.menu !== undefined && <li className="tag tag--menu">{menuName(record.menu)}</li>}
                    {record.waterType !== null && (
                      <li className="tag tag--meta">{WATER_LABEL[record.waterType]}</li>
                    )}
                    {record.conditions.map((value) => (
                      <li key={value} className="tag tag--condition">
                        {conditionLabel(value)}
                      </li>
                    ))}
                  </ul>
                  {record.chemicals && <p className="card__note">使用: {record.chemicals}</p>}
                  {record.note && <p className="card__note">{record.note}</p>}
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
