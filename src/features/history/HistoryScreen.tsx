import { useState } from 'react'
import { conditionLabel, menuName } from '../../domain/catalog'
import type { RecordEdit } from '../../domain/history'
import type { WashRecord, WaterType } from '../../domain/types'
import { RecordEditForm } from './RecordEditForm'

const WATER_LABEL: Record<WaterType, string> = { pure: '純水', tap: '水道水' }

interface HistoryScreenProps {
  history: readonly WashRecord[]
  onRemove: (recordId: string) => void
  onUpdate: (recordId: string, edit: RecordEdit) => void
}

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** 新しい順。保存順に依存しない（元の配列は変更しない）。日時が不正な記録は末尾に残す。 */
function newestFirst(history: readonly WashRecord[]): WashRecord[] {
  const time = (record: WashRecord) => {
    const value = new Date(record.washedAt).getTime()
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value
  }
  return [...history].sort((a, b) => (time(a) === time(b) ? 0 : time(a) < time(b) ? 1 : -1))
}

export function HistoryScreen({ history, onRemove, onUpdate }: HistoryScreenProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

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
          {newestFirst(history).map((record) => {
            const label = dateFormatter.format(new Date(record.washedAt))
            return (
              <li key={record.id}>
                <article className="card">
                  <header className="card__header">
                    <time dateTime={record.washedAt}>{label}</time>
                    <button
                      type="button"
                      className="button button--ghost card__edit"
                      aria-label={`${label} の記録を編集`}
                      onClick={() => setEditingId(record.id)}
                    >
                      編集
                    </button>
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
                  {record.plannedMenu !== undefined && record.menu !== undefined && record.plannedMenu !== record.menu && (
                    <p className="card__diff">
                      予定: {menuName(record.plannedMenu)} → 実施: {menuName(record.menu)}
                    </p>
                  )}
                  {record.skipped !== undefined && record.skipped.length > 0 && (
                    <p className="card__diff">未実施: {record.skipped.map((step) => step.name).join('、')}</p>
                  )}
                  {editingId === record.id ? (
                    <RecordEditForm
                      initial={{
                        note: record.note,
                        chemicals: record.chemicals,
                        waterType: record.waterType,
                        conditions: record.conditions,
                      }}
                      onSave={(edit) => {
                        onUpdate(record.id, edit)
                        setEditingId(null)
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      {record.chemicals && <p className="card__note">使用: {record.chemicals}</p>}
                      {record.note && <p className="card__note">{record.note}</p>}
                    </>
                  )}
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
