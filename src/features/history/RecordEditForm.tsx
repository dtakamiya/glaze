import { useState } from 'react'
import { CONDITION_TAGS } from '../../domain/catalog'
import { MAX_CHEMICALS_LENGTH, MAX_NOTE_LENGTH, type RecordEdit } from '../../domain/history'
import type { ConditionTag, WaterType } from '../../domain/types'

interface RecordEditFormProps {
  initial: RecordEdit
  onSave: (edit: RecordEdit) => void
  onCancel: () => void
}

const UNKNOWN_WATER = ''

function toWaterType(value: string): WaterType | null {
  return value === 'pure' || value === 'tap' ? value : null
}

/** 履歴の記録の、メモ・ケミカル・水・状態タグを直すフォーム。 */
export function RecordEditForm({ initial, onSave, onCancel }: RecordEditFormProps) {
  const [edit, setEdit] = useState<RecordEdit>(initial)

  const toggleCondition = (tag: ConditionTag) =>
    setEdit((current) => ({
      ...current,
      conditions: current.conditions.includes(tag)
        ? current.conditions.filter((value) => value !== tag)
        : [...current.conditions, tag],
    }))

  return (
    <div className="record-edit">
      <label className="field">
        <span>水の種類</span>
        <select
          value={edit.waterType ?? UNKNOWN_WATER}
          onChange={(e) => setEdit({ ...edit, waterType: toWaterType(e.target.value) })}
        >
          <option value={UNKNOWN_WATER}>不明</option>
          <option value="pure">純水</option>
          <option value="tap">水道水</option>
        </select>
      </label>
      <label className="field">
        <span>使用ケミカル</span>
        <input
          type="text"
          maxLength={MAX_CHEMICALS_LENGTH}
          value={edit.chemicals}
          onChange={(e) => setEdit({ ...edit, chemicals: e.target.value })}
        />
      </label>
      <fieldset className="field chips">
        <legend>汚れ・状態</legend>
        {CONDITION_TAGS.map((tag) => (
          <button
            key={tag.value}
            type="button"
            className="chip"
            aria-pressed={edit.conditions.includes(tag.value)}
            onClick={() => toggleCondition(tag.value)}
          >
            {tag.label}
          </button>
        ))}
      </fieldset>
      <label className="field">
        <span>メモ</span>
        <textarea
          rows={2}
          maxLength={MAX_NOTE_LENGTH}
          value={edit.note}
          onChange={(e) => setEdit({ ...edit, note: e.target.value })}
        />
      </label>
      <div className="record__actions record-edit__actions">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          キャンセル
        </button>
        <button type="button" className="button" onClick={() => onSave(edit)}>
          保存
        </button>
      </div>
    </div>
  )
}
