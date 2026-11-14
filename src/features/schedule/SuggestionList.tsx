import { menuName } from '../../domain/catalog'
import type { Suggestion } from '../../domain/suggestion'
import type { MenuId } from '../../domain/types'

interface SuggestionListProps {
  suggestions: readonly Suggestion[]
  onAdopt: (menu: MenuId) => void
  onDismiss: (suggestionId: string) => void
}

/** 記録の内容を元にした次回の提案。メニューの変更案は採用／見送り、注意は情報のみ。 */
export function SuggestionList({ suggestions, onAdopt, onDismiss }: SuggestionListProps) {
  if (suggestions.length === 0) return null
  return (
    <section className="suggestions" aria-labelledby="suggestions-title">
      <h2 id="suggestions-title" className="suggestions__title">
        前回の記録からの提案
      </h2>
      <ul className="suggestions__list">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className={`suggestion suggestion--${suggestion.kind}`}>
            {suggestion.kind === 'menu' && suggestion.menu !== undefined ? (
              <>
                <p className="suggestion__text">
                  次回を「<strong>{menuName(suggestion.menu)}</strong>」にしませんか？
                </p>
                <p className="suggestion__reason">{suggestion.reason}</p>
                <div className="suggestion__actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => suggestion.menu !== undefined && onAdopt(suggestion.menu)}
                  >
                    採用する
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => onDismiss(suggestion.id)}>
                    見送る
                  </button>
                </div>
              </>
            ) : (
              <p className="suggestion__text">{suggestion.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
