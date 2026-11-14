import { PRODUCTS, isSelected, toggleItem, type ProductKind } from '../../domain/products'

interface ProductPickerProps {
  /** 使用ケミカル・道具の文字列（選んだ製品名と自由入力を「、」区切りで持つ） */
  value: string
  maxLength: number
  onChange: (value: string) => void
}

const GROUPS: readonly { readonly kind: ProductKind; readonly label: string }[] = [
  { kind: 'chemical', label: 'BEAUTIFUL CARS のケミカル' },
  { kind: 'tool', label: 'BEAUTIFUL CARS の道具' },
]

/** BEAUTIFUL CARS の製品を押して選ぶ。カタログに無いものは、親の入力欄に自由に書く。 */
export function ProductPicker({ value, maxLength, onChange }: ProductPickerProps) {
  return (
    <>
      {GROUPS.map((group) => (
        <fieldset key={group.kind} className="field chips">
          <legend>{group.label}</legend>
          {PRODUCTS.filter((product) => product.kind === group.kind).map((product) => (
            <button
              key={product.name}
              type="button"
              className="chip"
              title={product.note}
              aria-pressed={isSelected(value, product.name)}
              onClick={() => onChange(toggleItem(value, product.name, maxLength))}
            >
              {product.name}
            </button>
          ))}
        </fieldset>
      ))}
    </>
  )
}
