import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { HistoryScreen } from './HistoryScreen'
import type { WashRecord } from '../../domain/types'

const record = (id: string, washedAt: string): WashRecord => ({
  id,
  washedAt,
  steps: [],
  note: `memo-${id}`,
  waterType: null,
  chemicals: '',
  conditions: [],
})

describe('HistoryScreen', () => {
  test('shows records newest first regardless of storage order', () => {
    const history = [
      record('old', '2026-10-01T03:00:00.000Z'),
      record('new', '2026-11-10T03:00:00.000Z'),
      record('mid', '2026-10-20T03:00:00.000Z'),
    ]

    render(<HistoryScreen history={history} onRemove={() => {}} />)

    const notes = screen.getAllByText(/^memo-/).map((el) => el.textContent)
    expect(notes).toEqual(['memo-new', 'memo-mid', 'memo-old'])
  })

  test('does not mutate the history it receives', () => {
    const history = [record('a', '2026-10-01T03:00:00.000Z'), record('b', '2026-11-01T03:00:00.000Z')]
    const snapshot = history.map((r) => r.id)

    render(<HistoryScreen history={history} onRemove={() => {}} />)

    expect(history.map((r) => r.id)).toEqual(snapshot)
  })
})
