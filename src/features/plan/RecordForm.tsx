import { CONDITION_TAGS, MENUS } from '../../domain/catalog'
import { toggleCondition } from '../../domain/draft'
import { MAX_CHEMICALS_LENGTH, MAX_NOTE_LENGTH } from '../../domain/history'
import type { MenuId, RecordDraft, WashSettings, WaterType } from '../../domain/types'

interface RecordFormProps {
  draft: RecordDraft
  settings: WashSettings
  /** 計画上の次回メニュー。下書きで未選択のときの既定値 */
  plannedMenu: MenuId
  /** 今日の日付（YYYY-MM-DD） */
  today: string
  canRecord: boolean
  onDraftChange: (draft: RecordDraft) => void
  onReset: () => void
  onRecord: () => void
}

const DEFAULT_WATER = ''

function toWaterType(value: string): WaterType | null {
  return value === 'pure' || value === 'tap' ? value : null
}

function toMenuId(value: string): MenuId | undefined {
  return MENUS.find((menu) => menu.id === value)?.id
}

/** 今日・空欄・未来日は「未設定（今日）」として扱う。 */
function toWashedOn(value: string, today: string): string | undefined {
  return value === '' || value >= today ? undefined : value
}

export function RecordForm({ draft, settings, plannedMenu, today, canRecord, onDraftChange, onReset, onRecord }: RecordFormProps) {
  const followed = settings.hasPureWater ? '純水' : '水道水'

  return (
    <div className="record">
      <label className="field">
        <span>洗車日</span>
        <input
          type="date"
          max={today}
          value={draft.washedOn ?? today}
          onChange={(e) => onDraftChange({ ...draft, washedOn: toWashedOn(e.target.value, today) })}
        />
      </label>

      <label className="field">
        <span>今回のメニュー</span>
        <select
          value={draft.menu ?? plannedMenu}
          onChange={(e) => onDraftChange({ ...draft, menu: toMenuId(e.target.value) })}
        >
          {MENUS.map((menu) => (
            <option key={menu.id} value={menu.id}>
              {menu.name}
              {menu.id === plannedMenu ? '（予定）' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>水の種類</span>
        <select
          value={draft.waterType ?? DEFAULT_WATER}
          onChange={(e) => onDraftChange({ ...draft, waterType: toWaterType(e.target.value) })}
        >
          <option value={DEFAULT_WATER}>設定に従う（{followed}）</option>
          <option value="pure">純水</option>
          <option value="tap">水道水</option>
        </select>
      </label>

      <label className="field">
        <span>使用ケミカル</span>
        <input
          type="text"
          placeholder="例: スリーク シャンプー"
          maxLength={MAX_CHEMICALS_LENGTH}
          value={draft.chemicals}
          onChange={(e) => onDraftChange({ ...draft, chemicals: e.target.value })}
        />
      </label>

      <fieldset className="field chips">
        <legend>汚れ・状態</legend>
        {CONDITION_TAGS.map((tag) => (
          <button
            key={tag.value}
            type="button"
            className="chip"
            aria-pressed={draft.conditions.includes(tag.value)}
            onClick={() => onDraftChange(toggleCondition(draft, tag.value))}
          >
            {tag.label}
          </button>
        ))}
      </fieldset>

      <label className="field">
        <span>メモ</span>
        <textarea
          rows={2}
          placeholder="天気など"
          maxLength={MAX_NOTE_LENGTH}
          value={draft.note}
          onChange={(e) => onDraftChange({ ...draft, note: e.target.value })}
        />
      </label>

      <div className="record__actions">
        <button type="button" className="button button--ghost" onClick={onReset} disabled={!canRecord}>
          チェックをリセット
        </button>
        <button type="button" className="button" onClick={onRecord} disabled={!canRecord}>
          施工を記録
        </button>
      </div>
    </div>
  )
}
