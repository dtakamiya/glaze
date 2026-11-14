import type { ConditionTag } from './types'

/**
 * 標準工程のカタログ。コツ・任意フラグ・純水/水道水の対応はここ（コード）に持ち、
 * 保存するのは templateId だけにする。文面を直してもデータ移行は不要。
 * id は一度公開したら変更・再利用しない。
 * 出典: BEAUTIFUL CARS 洗車チャンネル（村上アツシ氏）の洗車解説動画・記事。
 */
export interface StepTemplate {
  readonly id: string
  readonly name: string
  /** 同じスロットのテンプレートは、plan にどれか 1 つだけ入る */
  readonly slot?: 'rinse'
  /** slot 内でどちらの変種か（true = 純水あり） */
  readonly pureWater?: boolean
  readonly optional: boolean
  readonly tips: readonly string[]
}

export const STEP_TEMPLATES: readonly StepTemplate[] = [
  {
    id: 'tire-wheel',
    name: 'タイヤ・ホイール洗浄',
    optional: false,
    tips: [
      'ボディより先に、洗車の最初に洗う',
      'キュッキュッと音が鳴らない力加減で、表面の砂を落とすように優しく洗う',
      '硬いブラシでゴシゴシ擦らない（傷の原因）',
      '隅の汚れは、使い古しのマイクロファイバーを指に巻いて撫でる',
    ],
  },
  {
    id: 'pre-rinse',
    name: '予洗い（砂を流す）',
    optional: false,
    tips: ['水で砂をしっかり流す。高圧洗浄機は必須ではなく、シャワーノズルでよい'],
  },
  {
    id: 'shampoo',
    name: 'シャンプー洗車',
    optional: false,
    tips: [
      'スポンジは力を入れず撫でるように。砂を寄せる意識で洗う',
      '一度付けたらスポンジを離さない',
      '1 回洗うごとにスポンジの面を目で見て、砂が付いていたら揉み洗いして別の面を使う',
      'ムートンは使わない',
      '虫汚れは最初から擦らず、一度全体を洗ってすすいでから別に処理する',
    ],
  },
  {
    id: 'rinse-pure',
    name: '純水すすぎ',
    slot: 'rinse',
    pureWater: true,
    optional: false,
    tips: [
      'TDS メーターが 0 になっていることを確認してから使う',
      '純水は乾いても水シミになりにくく、ドア内側などは洗わず流すだけでもよい',
    ],
  },
  {
    id: 'rinse-tap',
    name: 'すすぎ',
    slot: 'rinse',
    pureWater: false,
    optional: false,
    tips: [
      '水道水は乾くとミネラルが水シミになる。すすいだらすぐ拭き上げる',
      'ドア内側などは砂を流してから拭く（乾拭きで砂を擦らない）',
    ],
  },
  {
    id: 'bug-bird',
    name: '虫・鳥フン処理',
    optional: true,
    tips: [
      'すすいだ後に専用リムーバーを汚れに吹きかける',
      '水で濡らして絞ったマイクロファイバーで撫でる。擦らない',
      '付いたら早めに洗う。その場で乾拭きしない',
    ],
  },
  {
    id: 'wipe-coat',
    name: '拭き上げ＋コーティング',
    optional: false,
    tips: [
      '柔らかいマイクロファイバーに油分なしのスプレーコーティング剤を吹き、水気をふんわり拭く',
      '乾拭きはしない',
      '油分入りのワックスや厚いコーティングは汚れを取り込むため非推奨',
      '撥水の強さと車の綺麗さは関係ない',
    ],
  },
  {
    id: 'window',
    name: '窓ガラス清掃',
    optional: true,
    tips: ['内窓は、洗って少しカサカサにしたタオルと水だけでも綺麗になる'],
  },
  {
    id: 'interior',
    name: '内装清掃',
    optional: true,
    tips: [],
  },
]

export function findTemplate(templateId: string | undefined): StepTemplate | undefined {
  if (templateId === undefined) return undefined
  return STEP_TEMPLATES.find((template) => template.id === templateId)
}

/** v1 の初期工程名 → テンプレート。移行時に templateId を付けるための凍結マップ（完全一致のみ）。 */
export const LEGACY_NAME_TO_TEMPLATE: Readonly<Record<string, string>> = {
  '予洗い（高圧水で砂を落とす）': 'pre-rinse',
  'タイヤ・ホイール洗浄': 'tire-wheel',
  シャンプー洗車: 'shampoo',
  すすぎ: 'rinse-tap',
  窓ガラス清掃: 'window',
  内装清掃: 'interior',
}

/**
 * 状態タグの定義。履歴の検証に使うため追加のみ可（削除・改名は保存済み履歴が不正扱いになる）。
 */
export const CONDITION_TAGS: readonly { readonly value: ConditionTag; readonly label: string }[] = [
  { value: 'water-spot', label: '水シミ' },
  { value: 'bird-dropping', label: '鳥フン' },
  { value: 'bug', label: '虫' },
  { value: 'iron-fallout', label: '鉄粉' },
  { value: 'tar', label: 'タール' },
]

export const CONDITION_VALUES = CONDITION_TAGS.map((tag) => tag.value) as [ConditionTag, ...ConditionTag[]]

export function conditionLabel(value: ConditionTag): string {
  return CONDITION_TAGS.find((tag) => tag.value === value)?.label ?? value
}
