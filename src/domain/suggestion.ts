import { conditionLabel } from './catalog'
import { chronological, nextMenu } from './schedule'
import type { ConditionTag, MenuId, WashRecord } from './types'

/** 水シミ・水アカ除去を勧める状態タグ。 */
const MINERAL_TAGS: readonly ConditionTag[] = ['water-spot', 'iron-fallout']
/** 虫・鳥フン処理を勧める状態タグ。 */
const BUG_BIRD_TAGS: readonly ConditionTag[] = ['bird-dropping', 'bug', 'tar']

export interface Suggestion {
  /** 見送りの記録に使う安定した ID */
  readonly id: string
  /** menu = 次回メニューの変更案（採用／見送り）、note = 情報のみの注意 */
  readonly kind: 'menu' | 'note'
  readonly menu?: MenuId
  readonly reason: string
}

function labels(tags: readonly ConditionTag[]): string {
  return tags.map(conditionLabel).join('・')
}

/**
 * メニュー変更の候補。経過日数による特別メニューはすでに予定（menuFor）に入るため、
 * ここでは記録した状態に応じた候補だけを返す。
 */
function menuCandidates(latest: WashRecord): Suggestion[] {
  const result: Suggestion[] = []

  // 直前に水シミ・水アカ除去をした記録なら、同じタグで再び勧めない
  const found = latest.conditions.filter((tag) => MINERAL_TAGS.includes(tag))
  if (found.length > 0 && latest.menu !== 'mineral') {
    result.push({ id: 'menu:mineral:tags', kind: 'menu', menu: 'mineral', reason: `前回、${labels(found)}を記録したため` })
  }

  return result
}

function notes(latest: WashRecord): Suggestion[] {
  const result: Suggestion[] = []
  const dirty = latest.conditions.filter((tag) => BUG_BIRD_TAGS.includes(tag))
  if (dirty.length > 0) {
    result.push({
      id: 'note:bug-bird',
      kind: 'note',
      reason: `前回、${labels(dirty)}を記録しました。次回は「虫・鳥フン処理」を忘れずに`,
    })
  }
  const skipped = latest.skipped ?? []
  if (skipped.length > 0) {
    result.push({
      id: 'note:skipped',
      kind: 'note',
      reason: `前回未実施: ${skipped.map((step) => step.name).join('、')}`,
    })
  }
  return result
}

/**
 * 記録の内容から、次回に向けた提案の候補を作る。保存せず履歴から都度算出する。
 * メニュー変更案は、予定（その日の予定メニュー）と同じメニューを除く。履歴が無ければ空。
 * 見送り・採用済みの除外と「メニュー案は 1 件だけ表示」は visibleSuggestions で行う。
 */
export function suggestNext(history: readonly WashRecord[], now: Date): Suggestion[] {
  const ordered = chronological(history)
  const latest = ordered.at(-1)
  if (latest === undefined) return []

  const planned = nextMenu(history, now)
  const menuChanges = menuCandidates(latest).filter((s) => s.menu !== planned)
  return [...menuChanges, ...notes(latest)]
}

/**
 * 表示する提案。見送り済みと、すでに選択中のメニューへの案を除き、メニュー変更案は先頭の 1 件だけ残す。
 * 注意（note）はすべて残す。
 */
export function visibleSuggestions(
  suggestions: readonly Suggestion[],
  dismissedIds: readonly string[],
  chosenMenu: MenuId,
): Suggestion[] {
  const open = suggestions.filter((s) => !dismissedIds.includes(s.id) && (s.kind === 'note' || s.menu !== chosenMenu))
  const firstMenu = open.find((s) => s.kind === 'menu')
  return open.filter((s) => s.kind === 'note' || s === firstMenu)
}
