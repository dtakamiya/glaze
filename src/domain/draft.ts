import type { ConditionTag, RecordDraft } from './types'

export const EMPTY_DRAFT: RecordDraft = {
  note: '',
  waterType: null,
  chemicals: '',
  conditions: [],
}

export function toggleCondition(draft: RecordDraft, tag: ConditionTag): RecordDraft {
  const conditions = draft.conditions.includes(tag)
    ? draft.conditions.filter((current) => current !== tag)
    : [...draft.conditions, tag]
  return { ...draft, conditions }
}

export function dismissSuggestion(draft: RecordDraft, suggestionId: string): RecordDraft {
  const dismissed = draft.dismissed ?? []
  return dismissed.includes(suggestionId) ? draft : { ...draft, dismissed: [...dismissed, suggestionId] }
}
