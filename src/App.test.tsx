import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import { DEFAULT_STEP_NAMES } from './domain/plan'

afterEach(() => {
  vi.restoreAllMocks()
})

const setup = () => {
  const user = userEvent.setup()
  const utils = render(<App />)
  return { user, ...utils }
}

const progressText = () => screen.getByRole('progressbar').getAttribute('aria-valuenow')

describe('洗車プラン画面', () => {
  test('初期表示でデフォルト工程が未チェックで並ぶ', () => {
    setup()

    const items = screen.getAllByRole('checkbox')
    expect(items).toHaveLength(DEFAULT_STEP_NAMES.length)
    expect(items.every((c) => !(c as HTMLInputElement).checked)).toBe(true)
    expect(progressText()).toBe('0')
  })

  test('工程をチェックすると進捗が更新される', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))

    expect(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] })).toBeChecked()
    expect(progressText()).toBe('1')
  })

  test('工程を追加・削除できる', async () => {
    const { user } = setup()

    await user.type(screen.getByRole('textbox', { name: '追加する工程' }), '鉄粉除去')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(screen.getByRole('checkbox', { name: '鉄粉除去' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '鉄粉除去 を削除' }))
    expect(screen.queryByRole('checkbox', { name: '鉄粉除去' })).not.toBeInTheDocument()
  })

  test('完了工程がないと記録ボタンは押せない', () => {
    setup()

    expect(screen.getByRole('button', { name: '施工を記録' })).toBeDisabled()
  })

  test('チェックをすべて外せる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))

    await user.click(screen.getByRole('button', { name: 'チェックをリセット' }))

    expect(progressText()).toBe('0')
  })
})

describe('施工の記録と履歴画面', () => {
  test('記録すると履歴に工程とメモが残り、プランはリセットされる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[2] }))
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '晴れ・気温15度')

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(progressText()).toBe('0')
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    const record = screen.getByRole('article')
    expect(within(record).getByText(DEFAULT_STEP_NAMES[0])).toBeInTheDocument()
    expect(within(record).getByText(DEFAULT_STEP_NAMES[2])).toBeInTheDocument()
    expect(within(record).getByText('晴れ・気温15度')).toBeInTheDocument()
  })

  test('履歴が空のときは案内を表示する', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    expect(screen.getByText('まだ施工記録がありません')).toBeInTheDocument()
  })

  test('確認後に履歴を削除できる', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    await user.click(screen.getByRole('button', { name: /を削除$/ }))

    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  test('確認をキャンセルすると履歴は残る', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    await user.click(screen.getByRole('button', { name: /を削除$/ }))

    expect(screen.getByRole('article')).toBeInTheDocument()
  })
})

describe('入力中のメモ', () => {
  test('タブを切り替えても入力中のメモが残る', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '下書き')

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    await user.click(screen.getByRole('tab', { name: '洗車プラン' }))

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('下書き')
  })

  test('記録後はメモが空になる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'メモ')

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('')
  })
})

describe('保存失敗の通知', () => {
  test('保存に失敗すると警告を表示する', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { user } = setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))

    expect(screen.getByRole('alert')).toHaveTextContent('端末に保存できませんでした')
  })

  test('通常時は警告を表示しない', () => {
    setup()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('端末内保存', () => {
  test('再起動してもチェック状態と履歴が残る', async () => {
    const { user, unmount } = setup()
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[0] }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[1] }))
    unmount()

    const { user: user2 } = setup()

    expect(screen.getByRole('checkbox', { name: DEFAULT_STEP_NAMES[1] })).toBeChecked()
    await user2.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })
})
