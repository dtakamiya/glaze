import { describe, expect, test } from 'vitest'
import {
  CONDITION_TAGS,
  CONDITION_VALUES,
  LEGACY_NAME_TO_TEMPLATE,
  STEP_TEMPLATES,
  conditionLabel,
  findTemplate,
} from './catalog'
import { MAX_STEP_NAME_LENGTH } from './plan'

describe('STEP_TEMPLATES', () => {
  test('has unique ids', () => {
    const ids = STEP_TEMPLATES.map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('keeps every name within the storage limit', () => {
    const tooLong = STEP_TEMPLATES.filter((t) => t.name.length > MAX_STEP_NAME_LENGTH)

    expect(tooLong).toEqual([])
  })

  test('has exactly one pure and one tap variant in the rinse slot', () => {
    const rinse = STEP_TEMPLATES.filter((t) => t.slot === 'rinse')

    expect(rinse.map((t) => t.pureWater).sort()).toEqual([false, true])
  })

  test('starts with wheels and puts bug/bird treatment between rinse and coating', () => {
    const ids = STEP_TEMPLATES.map((t) => t.id)

    expect(ids[0]).toBe('tire-wheel')
    expect(ids.indexOf('bug-bird')).toBeGreaterThan(ids.indexOf('rinse-tap'))
    expect(ids.indexOf('bug-bird')).toBeLessThan(ids.indexOf('wipe-coat'))
  })
})

describe('findTemplate', () => {
  test('returns the template for a known id', () => {
    expect(findTemplate('shampoo')?.name).toBe('シャンプー洗車')
  })

  test('returns undefined for unknown or missing ids', () => {
    expect(findTemplate('removed-in-future')).toBeUndefined()
    expect(findTemplate(undefined)).toBeUndefined()
  })
})

describe('LEGACY_NAME_TO_TEMPLATE', () => {
  test('points only at existing templates', () => {
    const missing = Object.values(LEGACY_NAME_TO_TEMPLATE).filter((id) => findTemplate(id) === undefined)

    expect(missing).toEqual([])
  })
})

describe('condition tags', () => {
  test('exposes values and labels from a single definition', () => {
    expect(CONDITION_VALUES).toEqual(CONDITION_TAGS.map((t) => t.value))
    expect(conditionLabel('bird-dropping')).toBe('鳥フン')
  })
})

describe('beginner guidance (avoid / why)', () => {
  const templateOf = (id: string) => {
    const template = findTemplate(id)
    if (template === undefined) throw new Error(`template not found: ${id}`)
    return template
  }
  const allLines = (id: string) => {
    const template = templateOf(id)
    return [...template.tips, ...(template.avoid ?? []), ...(template.why ?? [])].join('\n')
  }

  test('has no blank or duplicated lines in tips, avoid and why', () => {
    for (const template of STEP_TEMPLATES) {
      const lines = [...template.tips, ...(template.avoid ?? []), ...(template.why ?? [])]

      expect(lines.every((line) => line.trim() !== '')).toBe(true)
      expect(new Set(lines).size).toBe(lines.length)
    }
  })

  test('tells how much shampoo to put in the bucket', () => {
    expect(allLines('shampoo')).toMatch(/15L/)
    expect(allLines('shampoo')).toMatch(/30ml/)
    expect(allLines('shampoo')).toMatch(/7/)
  })

  test('lists what not to use on the body in the shampoo step', () => {
    expect(templateOf('shampoo').avoid?.join('\n')).toMatch(/食器用洗剤/)
  })

  test('warns which wheels the acid wheel cleaner must not touch', () => {
    const avoid = templateOf('tire-wheel').avoid?.join('\n') ?? ''

    for (const keyword of ['高輝度', '切削', 'アルマイト', 'ブレーキディスク']) {
      expect(avoid).toContain(keyword)
    }
  })

  test('requires gloves and keeps the mineral remover off glass, plating and rubber', () => {
    const lines = allLines('menu-mineral')

    for (const keyword of ['手袋', 'ガラス', 'メッキ', 'ゴム', '乾かさない']) {
      expect(lines).toContain(keyword)
    }
  })

  test('explains the window routine with three towels and a dry wipe for tap water', () => {
    const lines = allLines('window')

    expect(lines).toMatch(/3 枚/)
    expect(lines).toMatch(/空拭き/)
    expect(templateOf('window').avoid?.join('\n')).toMatch(/ガラスクリーナー/)
  })

  test('explains how to apply the toner and where not to use it', () => {
    const lines = allLines('menu-coating')

    expect(lines).toMatch(/振る/)
    expect(lines).toMatch(/ワンプッシュ/)
    expect(templateOf('menu-coating').avoid?.join('\n')).toMatch(/室内/)
    expect(templateOf('menu-coating').avoid?.join('\n')).toMatch(/タイヤ/)
  })

  test('says the serum goes after the toner and is not used alone', () => {
    const lines = allLines('menu-fluorin')

    expect(lines).toMatch(/ナノダイヤモンドトナー/)
    expect(templateOf('menu-fluorin').avoid?.join('\n')).toMatch(/単独|だけ/)
  })

  test('gives interior cleaning a water-first routine and lists what to avoid', () => {
    const lines = allLines('interior')

    expect(lines).toContain('水拭き')
    for (const keyword of ['艶出し', 'メラミン', 'メーター']) {
      expect(templateOf('interior').avoid?.join('\n')).toContain(keyword)
    }
  })

  test('explains iron fallout removal without a clay bar in the mineral step', () => {
    const lines = allLines('menu-mineral')

    for (const keyword of ['鉄粉', '粘土', '引っ張', '水気']) {
      expect(lines).toContain(keyword)
    }
  })

  test('explains tar and pitch removal with the oil stain remover and where it must not touch', () => {
    const lines = allLines('bug-bird')
    const avoid = templateOf('bug-bird').avoid?.join('\n') ?? ''

    expect(lines).toContain('タール')
    expect(lines).toContain('オイルステインリムーバー')
    for (const keyword of ['ゴム', '無塗装', 'ラッピング', 'グリス']) {
      expect(avoid).toContain(keyword)
    }
  })
})
