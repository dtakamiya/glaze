import type { ConditionTag, SchedulePrefs, WashSettings } from '../domain/types'

/** 固定シードの乱数（mulberry32）。同じシードなら同じ結果になり、再現できる。 */
export interface Rng {
  float(): number
  int(min: number, max: number): number
  chance(probability: number): boolean
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  const float = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    float,
    int: (min, max) => min + Math.floor(float() * (max - min + 1)),
    chance: (probability) => float() < probability,
  }
}

type Range = readonly [min: number, max: number]

/** シミュレーションで 1 人分のふるまいを決めるパラメータ。 */
export interface Persona {
  readonly id: string
  readonly name: string
  readonly profile: string
  readonly settings: WashSettings
  readonly prefs: SchedulePrefs
  /** 通常の洗車間隔（日） */
  readonly gapDays: Range
  /** 雨・出張などで間が空く回数（年）と、そのときの間隔（日） */
  readonly longGaps: number
  readonly longGapDays: Range
  /** 必須／任意工程を実際にやる確率 */
  readonly requiredRate: number
  readonly optionalRate: number
  /** メニュー提案を採用／見送る確率（残りは無視） */
  readonly adoptRate: number
  readonly dismissRate: number
  /** 洗車の数日後にまとめて（過去日で）記録する確率と、その遅れ（日） */
  readonly lateRecordRate: number
  readonly lateDays: Range
  /** 月ごとの状態タグの付与確率 */
  readonly conditionRates: (month: number) => Partial<Record<ConditionTag, number>>
}

export const TAKAHASHI: Persona = {
  id: 'takahashi',
  name: '高橋さん',
  profile: '41歳・会社員。D-Wash（純水）で 2 週間ごとに洗車。自宅に水道なし。',
  settings: { hasPureWater: true },
  prefs: { intervalWeeks: 2, horizonWeeks: 8 },
  gapDays: [11, 17],
  longGaps: 4,
  longGapDays: [21, 28],
  requiredRate: 0.9,
  optionalRate: 0.3,
  adoptRate: 0.4,
  dismissRate: 0.2,
  lateRecordRate: 0.25,
  lateDays: [1, 4],
  conditionRates: (month) => ({
    'water-spot': month >= 3 && month <= 5 ? 0.5 : 0.05,
    bug: month >= 6 && month <= 8 ? 0.4 : 0.02,
    'bird-dropping': 0.1,
    'iron-fallout': month >= 9 && month <= 11 ? 0.2 : 0.02,
  }),
}

export const NAKAMURA: Persona = {
  id: 'nakamura',
  name: '中村さん',
  profile: '35歳・共働き。コイン洗車場（純水なし）で月 1 回が限界。',
  settings: { hasPureWater: false },
  prefs: { intervalWeeks: 4, horizonWeeks: 8 },
  gapDays: [28, 42],
  longGaps: 2,
  longGapDays: [56, 70],
  requiredRate: 0.7,
  optionalRate: 0.05,
  adoptRate: 0.1,
  dismissRate: 0,
  lateRecordRate: 0.8,
  lateDays: [2, 6],
  conditionRates: () => ({ 'water-spot': 0.3, 'bird-dropping': 0.05 }),
}

export const KOBAYASHI: Persona = {
  id: 'kobayashi',
  name: '小林さん',
  profile: '48歳・洗車好き。純水のある洗車場で毎週洗う。',
  settings: { hasPureWater: true },
  prefs: { intervalWeeks: 2, horizonWeeks: 8 },
  gapDays: [7, 10],
  longGaps: 3,
  longGapDays: [14, 21],
  requiredRate: 1,
  optionalRate: 0.7,
  adoptRate: 0.7,
  dismissRate: 0.1,
  lateRecordRate: 0,
  lateDays: [0, 0],
  conditionRates: () => ({ 'water-spot': 0.03, bug: 0.03, 'bird-dropping': 0.03, 'iron-fallout': 0.03 }),
}

export const PERSONAS: readonly Persona[] = [TAKAHASHI, NAKAMURA, KOBAYASHI]
