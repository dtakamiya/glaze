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
  avoid?: readonly string[]
  why?: readonly string[]
}

interface TipSectionProps {
  title?: string
  lines: readonly string[]
  modifier?: string
}

function TipSection({ title, lines, modifier }: TipSectionProps) {
  if (lines.length === 0) return null
  return (
    <section className={modifier === undefined ? 'tip__section' : `tip__section tip__section--${modifier}`}>
      {title !== undefined && <h4 className="tip__title">{title}</h4>}
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

export function TipPanel({ id, tips, avoid = [], why = [] }: TipPanelProps) {
  return (
    <div id={id} className="tip">
      <TipSection lines={tips} />
      <TipSection title="やってはいけないこと" lines={avoid} modifier="avoid" />
      <TipSection title="理由" lines={why} />
    </div>
  )
}
