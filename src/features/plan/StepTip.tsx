interface TipToggleProps {
  stepName: string
  expanded: boolean
  panelId: string
  onToggle: () => void
}

/** 工程の行に置くコツの開閉ボタン。 */
export function TipToggle({ stepName, expanded, panelId, onToggle }: TipToggleProps) {
  return (
    <button
      type="button"
      className="tip-toggle"
      aria-label={`${stepName} のコツ`}
      aria-expanded={expanded}
      aria-controls={panelId}
      onClick={onToggle}
    >
      コツ
    </button>
  )
}

interface TipPanelProps {
  id: string
  tips: readonly string[]
}

export function TipPanel({ id, tips }: TipPanelProps) {
  return (
    <div id={id} className="tip">
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  )
}
