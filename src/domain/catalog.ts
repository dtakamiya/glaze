import type { ConditionTag, MenuId } from './types'

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
  /** 所要時間の目安（分）。実測ではなく目安で、計画の時間配分に使う */
  readonly minutes: number
  /** 設定すると、そのメニューの日だけ plan に入る工程（通常は未設定） */
  readonly menu?: MenuId
  /** 設定すると、最後に完了してからこの日数がたった洗車にだけ plan に入る周期つき工程（`periodic.ts`） */
  readonly everyDays?: number
  readonly tips: readonly string[]
}

/** 並び順がそのまま plan 上の工程順になる。 */
export const STEP_TEMPLATES: readonly StepTemplate[] = [
  {
    id: 'tire-wheel',
    name: 'タイヤ・ホイール洗浄',
    optional: false,
    minutes: 10,
    everyDays: 28,
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
    minutes: 5,
    tips: ['水で砂をしっかり流す。高圧洗浄機は必須ではなく、シャワーノズルでよい'],
  },
  {
    id: 'shampoo',
    name: 'シャンプー洗車',
    optional: false,
    minutes: 15,
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
    minutes: 5,
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
    minutes: 5,
    tips: [
      '水道水は乾くとミネラルが水シミになる。すすいだらすぐ拭き上げる',
      'ドア内側などは砂を流してから拭く（乾拭きで砂を擦らない）',
    ],
  },
  {
    id: 'bug-bird',
    name: '虫・鳥フン処理',
    optional: true,
    minutes: 5,
    tips: [
      'すすいだ後に専用リムーバーを汚れに吹きかける',
      '水で濡らして絞ったマイクロファイバーで撫でる。擦らない',
      '付いたら早めに洗う。その場で乾拭きしない',
    ],
  },
  {
    id: 'menu-mineral',
    name: '水シミ・水アカ除去',
    optional: false,
    minutes: 15,
    menu: 'mineral',
    tips: [
      'すすいだ後に、ミネラルリムーバーなどの専用品を使う',
      '切削仕上げのホイールなど、使えない場所があるので製品の説明で確認する',
    ],
  },
  {
    id: 'wipe-coat',
    name: '拭き上げ＋コーティング',
    optional: false,
    minutes: 10,
    tips: [
      '柔らかいマイクロファイバーに油分なしのスプレーコーティング剤を吹き、水気をふんわり拭く',
      '乾拭きはしない',
      '油分入りのワックスや厚いコーティングは汚れを取り込むため非推奨',
      '撥水の強さと車の綺麗さは関係ない',
    ],
  },
  {
    id: 'menu-coating',
    name: 'コーティング補充',
    optional: false,
    minutes: 10,
    menu: 'coating',
    tips: [
      '拭き上げの後に、油分なしのスプレーコーティング剤（シーラント）を丁寧に塗り直す',
      '油分入りのワックスや厚いコーティングは汚れを取り込むため使わない',
    ],
  },
  {
    id: 'window',
    name: '窓ガラス清掃',
    optional: true,
    minutes: 5,
    tips: ['内窓は、洗って少しカサカサにしたタオルと水だけでも綺麗になる'],
  },
  {
    id: 'interior',
    name: '内装清掃',
    optional: true,
    minutes: 15,
    tips: [],
  },
]

export function templateIndex(templateId: string | undefined): number {
  return STEP_TEMPLATES.findIndex((template) => template.id === templateId)
}

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

export interface MenuTemplate {
  readonly id: MenuId
  readonly name: string
  readonly summary: string
}

/**
 * 洗車メニューの定義。保存済みの記録が id を参照するため、追加のみ可（削除・改名は履歴が不正扱いになる）。
 */
export const MENUS: readonly MenuTemplate[] = [
  {
    id: 'regular',
    name: '通常洗車',
    summary: '基本の洗車。ホイール→予洗い→シャンプー→すすぎ→拭き上げまで。',
  },
  {
    id: 'coating',
    name: 'コーティング補充',
    summary: '通常洗車に加えて、油分なしのスプレーコーティング剤を丁寧に塗り直す日。',
  },
  {
    id: 'mineral',
    name: '水シミ・水アカ除去',
    summary:
      '通常洗車で落ちない水シミ・水アカをミネラルリムーバー等で落とす日。切削仕上げのホイールなど、使えない場所は製品の説明で確認する。',
  },
]

/** 特別メニュー（通常洗車以外）の周期。 */
export interface MenuCycle {
  /** 最初の記録から、初めて予定に入るまでの日数 */
  readonly firstDays: number
  /** 最後に実施してから、次に予定に入るまでの日数 */
  readonly everyDays: number
}

/**
 * 特別メニューは「洗車の回数」ではなく「経過日数」で決める（頻繁に洗う人に増えすぎない・間が空く人に抜けない）。
 * コーティング補充は 2 週に 1 回、水シミ・水アカ除去は 4 週に 1 回。
 */
export const MENU_CYCLES: Readonly<Record<Exclude<MenuId, 'regular'>, MenuCycle>> = {
  coating: { firstDays: 14, everyDays: 14 },
  mineral: { firstDays: 28, everyDays: 28 },
}

/** 周期が同じ日に来たときの優先順（水シミは放置すると落ちにくくなるため先）。周期が来てから長い方が先で、同順位のときだけこれに従う。 */
export const MENU_PRIORITY: readonly Exclude<MenuId, 'regular'>[] = ['mineral', 'coating']

export const MENU_IDS = MENUS.map((menu) => menu.id) as [MenuId, ...MenuId[]]

export function menuName(id: MenuId): string {
  return MENUS.find((menu) => menu.id === id)?.name ?? id
}

export function findMenu(id: MenuId): MenuTemplate | undefined {
  return MENUS.find((menu) => menu.id === id)
}
