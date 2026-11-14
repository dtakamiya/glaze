import { describe, expect, test } from 'vitest'
import { MAX_CHEMICALS_LENGTH } from './history'
import { PRODUCTS, isSelected, parseItems, toggleItem } from './products'

describe('PRODUCTS', () => {
  test('names are unique, short and free of separators', () => {
    const names = PRODUCTS.map((p) => p.name)

    expect(new Set(names).size).toBe(names.length)
    expect(names.every((name) => name.length > 0 && name.length <= 20 && !/[、,]/.test(name))).toBe(true)
  })

  test('has both chemicals and tools', () => {
    expect(PRODUCTS.some((p) => p.kind === 'chemical')).toBe(true)
    expect(PRODUCTS.some((p) => p.kind === 'tool')).toBe(true)
  })

  test('selecting every product still fits within the length limit', () => {
    const all = PRODUCTS.reduce((text, p) => toggleItem(text, p.name, MAX_CHEMICALS_LENGTH), '')

    expect(all.length).toBeLessThanOrEqual(MAX_CHEMICALS_LENGTH)
    expect(parseItems(all)).toHaveLength(PRODUCTS.length)
  })
})

describe('parseItems', () => {
  test('splits on 、 and commas, trims, and drops empty and duplicate items', () => {
    expect(parseItems(' スリークシャンプー、 A液 ,, スリークシャンプー、')).toEqual(['スリークシャンプー', 'A液'])
  })

  test('returns an empty list for blank text', () => {
    expect(parseItems('')).toEqual([])
    expect(parseItems('  ')).toEqual([])
  })
})

describe('isSelected', () => {
  test('matches a whole item, not part of one', () => {
    expect(isSelected('スリークシャンプー、A液', 'A液')).toBe(true)
    expect(isSelected('スリークシャンプー', 'スリーク')).toBe(false)
  })
})

describe('toggleItem', () => {
  test('adds an item at the end, keeping free-form items and their order', () => {
    expect(toggleItem('A液', 'スリークシャンプー', 100)).toBe('A液、スリークシャンプー')
    expect(toggleItem('', 'スリークシャンプー', 100)).toBe('スリークシャンプー')
  })

  test('removes an item that is already selected', () => {
    expect(toggleItem('スリークシャンプー、A液', 'スリークシャンプー', 100)).toBe('A液')
    expect(toggleItem('スリークシャンプー', 'スリークシャンプー', 100)).toBe('')
  })

  test('does not add an item that would exceed the limit', () => {
    const text = 'あ'.repeat(95)

    expect(toggleItem(text, 'スリークシャンプー', 100)).toBe(text)
    expect(toggleItem(`${text}、スリークシャンプー`, 'スリークシャンプー', 100)).toBe(text)
  })
})
