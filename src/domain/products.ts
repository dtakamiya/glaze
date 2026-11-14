/**
 * 洗車で使う製品のカタログ（BEAUTIFUL CARS の製品）。記録フォームの候補に使う。
 * 選んだ製品は `chemicals`（文字列）に name を「、」区切りで保存するため、
 * name は追加のみ可（削除・改名すると、保存済みの履歴との対応が外れる）。
 * 出典: BEAUTIFUL CARS 公式ショップ（楽天市場）の商品。商品名・価格は変わりうる。
 */
export type ProductKind = 'chemical' | 'tool'

export interface Product {
  /** 保存される短い名前。「、」「,」を含めない */
  readonly name: string
  readonly kind: ProductKind
  /** 画面に出す補足（公式の商品名・用途） */
  readonly note: string
}

export const PRODUCTS: readonly Product[] = [
  { name: 'スリークシャンプー', kind: 'chemical', note: '中性・300 倍濃縮のカーシャンプー' },
  { name: 'コロイドクレンザー', kind: 'chemical', note: 'マルチクリーナー（黒筋・虫汚れ）' },
  { name: 'ミネラルリムーバー', kind: 'chemical', note: '水垢クリーナー（酸性）' },
  { name: 'オイルステインリムーバー', kind: 'chemical', note: 'タール・ピッチ・油汚れ・タイヤカス（ボディ用）' },
  { name: 'インセクトリムーバー', kind: 'chemical', note: '虫・鳥フン除去（アルカリ性）' },
  { name: 'アシッドホイールクレンザー', kind: 'chemical', note: 'ホイールのブレーキダスト・黄ばみ除去（酸性）' },
  { name: 'ナノダイヤモンドトナー', kind: 'chemical', note: 'コーティング剤（超微撥水・防汚）' },
  { name: 'フルオリンセラム', kind: 'chemical', note: 'コーティング剤（防汚・超微撥水）' },
  { name: '洗車スポンジ', kind: 'tool', note: '傷をつけない手洗い用スポンジ（クロスカット）' },
  { name: 'ホイール用スポンジ', kind: 'tool', note: 'ソフトホイールウォッシュスポンジ' },
  { name: 'マイクロファイバークロス', kind: 'tool', note: '厚手・シームレス・ロングヘアー（4 枚）' },
  { name: 'マイクロファイバータオルS', kind: 'tool', note: 'シームレス（細部洗浄用・10 枚）' },
  { name: '純水器', kind: 'tool', note: 'ピュアニッシュシリーズ' },
  { name: 'TDSメーター', kind: 'tool', note: '水質測定器（純水の確認）' },
]

const SEPARATOR = '、'
const SEPARATORS = /[、,]/

/** 「、」「,」で区切った項目。前後の空白・空要素・重複を除く。 */
export function parseItems(text: string): string[] {
  const items = text
    .split(SEPARATORS)
    .map((item) => item.trim())
    .filter((item) => item !== '')
  return [...new Set(items)]
}

export function isSelected(text: string, name: string): boolean {
  return parseItems(text).includes(name)
}

/**
 * name が入っていれば外し、無ければ末尾に足した文字列を返す。他の項目（自由入力）と順序は保つ。
 * 足すと maxLength を超えるときは、そのまま返す。
 */
export function toggleItem(text: string, name: string, maxLength: number): string {
  const items = parseItems(text)
  if (items.includes(name)) return items.filter((item) => item !== name).join(SEPARATOR)
  const next = [...items, name].join(SEPARATOR)
  return next.length > maxLength ? text : next
}
