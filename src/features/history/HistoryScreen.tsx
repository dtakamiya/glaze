import type { WashRecord } from '../../domain/types'

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
