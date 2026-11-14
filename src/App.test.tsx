import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import { STEP_TEMPLATES } from './domain/catalog'
import { LEGACY_HISTORY_KEY, LEGACY_PLAN_KEY } from './storage/storage'

afterEach(() => {
  vi.restoreAllMocks()
})

const setup = () => {
  const user = userEvent.setup()
  const utils = render(<App />)
  return { user, ...utils }
}

const progressText = () => screen.getByRole('progressbar').getAttribute('aria-valuenow')

const WHEELS = 'タイヤ・ホイール洗浄'
const SHAMPOO = 'シャンプー洗車'
const DEFAULT_COUNT = STEP_TEMPLATES.filter((t) => t.slot === undefined || t.pureWater === false).length

describe('洗車プラン画面', () => {
  test('初期表示で BC 流の工程が未チェックで並ぶ', () => {
    setup()

    const items = screen.getAllByRole('checkbox')
    // 先頭は純水トグル、続いて工程
    expect(items).toHaveLength(DEFAULT_COUNT + 1)
    const stepNames = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.step__label')?.textContent)
      .filter(Boolean)
    expect(stepNames[0]).toBe(WHEELS)
    expect(stepNames).toContain('すすぎ')
    expect(progressText()).toBe('0')
  })

  test('工程をチェックすると進捗が更新される', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    expect(screen.getByRole('checkbox', { name: WHEELS })).toBeChecked()
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
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: 'チェックをリセット' }))

    expect(progressText()).toBe('0')
  })

  test('任意工程には「任意」バッジが付く', () => {
    setup()

    expect(screen.getAllByText('任意').length).toBeGreaterThan(0)
  })
})

describe('工程のコツ', () => {
  test('コツを開閉できる', async () => {
    const { user } = setup()
    const toggle = screen.getByRole('button', { name: `${WHEELS} のコツ` })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/音が鳴らない力加減/)).toBeVisible()

    await user.click(toggle)

    expect(screen.queryByText(/音が鳴らない力加減/)).not.toBeInTheDocument()
  })
})

describe('純水設定', () => {
  test('切り替えるとすすぎ工程が入れ替わりチェック状態は維持される', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: 'すすぎ' }))

    await user.click(screen.getByRole('checkbox', { name: /純水器を使う/ }))

    expect(screen.queryByRole('checkbox', { name: 'すすぎ' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '純水すすぎ' })).toBeChecked()
  })

  test('設定は再起動後も残る', async () => {
    const { user, unmount } = setup()
    await user.click(screen.getByRole('checkbox', { name: /純水器を使う/ }))
    unmount()

    setup()

    expect(screen.getByRole('checkbox', { name: /純水器を使う/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '純水すすぎ' })).toBeInTheDocument()
  })
})

describe('初期プランに戻す', () => {
  test('確認後に標準の並びへ戻り、自作工程とチェックが消える', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { user } = setup()
    await user.type(screen.getByRole('textbox', { name: '追加する工程' }), '自作')
    await user.click(screen.getByRole('button', { name: '追加' }))
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '初期プランに戻す' }))

    expect(screen.queryByRole('checkbox', { name: '自作' })).not.toBeInTheDocument()
    expect(progressText()).toBe('0')
  })

  test('キャンセルすると何も変わらない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '初期プランに戻す' }))

    expect(progressText()).toBe('1')
  })
})

describe('施工の記録と履歴画面', () => {
  test('記録すると履歴に工程・水・ケミカル・状態・メモが残り、プランはリセットされる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('checkbox', { name: SHAMPOO }))
    await user.selectOptions(screen.getByRole('combobox', { name: '水の種類' }), 'pure')
    await user.type(screen.getByRole('textbox', { name: '使用ケミカル' }), 'スリーク')
    await user.click(screen.getByRole('button', { name: '鳥フン' }))
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '晴れ・気温15度')

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(progressText()).toBe('0')
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    const record = screen.getByRole('article')
    expect(within(record).getByText(WHEELS)).toBeInTheDocument()
    expect(within(record).getByText(SHAMPOO)).toBeInTheDocument()
    expect(within(record).getByText('純水')).toBeInTheDocument()
    expect(within(record).getByText('鳥フン')).toBeInTheDocument()
    expect(within(record).getByText('使用: スリーク')).toBeInTheDocument()
    expect(within(record).getByText('晴れ・気温15度')).toBeInTheDocument()
  })

  test('水の種類を選ばないと設定に従って記録される', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(within(screen.getByRole('article')).getByText('水道水')).toBeInTheDocument()
  })

  test('履歴が空のときは案内を表示する', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    expect(screen.getByText('まだ施工記録がありません')).toBeInTheDocument()
  })

  test('確認後に履歴を削除できる', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    await user.click(screen.getByRole('button', { name: /の記録を削除$/ }))

    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  test('確認をキャンセルすると履歴は残る', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    await user.click(screen.getByRole('button', { name: /の記録を削除$/ }))

    expect(screen.getByRole('article')).toBeInTheDocument()
  })
})

describe('洗車リマインド', () => {
  test('履歴がなければ初回の案内を表示する', () => {
    setup()

    expect(screen.getByRole('status')).toHaveTextContent('まだ洗車の記録がありません')
  })

  test('記録直後は経過 0 日と表示される', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.getByRole('status')).toHaveTextContent('前回の洗車から 0 日')
  })

  test('日数が経過すると洗車のタイミングを知らせる', () => {
    const washedAt = new Date()
    washedAt.setDate(washedAt.getDate() - 15)
    localStorage.setItem(
      'glaze:v2:history',
      JSON.stringify([
        {
          id: 'r',
          washedAt: washedAt.toISOString(),
          steps: [],
          note: '',
          waterType: null,
          chemicals: '',
          conditions: [],
        },
      ]),
    )

    setup()

    expect(screen.getByRole('status')).toHaveTextContent('前回の洗車から 15 日。そろそろ洗車のタイミングです')
  })
})

describe('入力中の内容', () => {
  test('タブを切り替えても入力中のメモが残る', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '下書き')

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    await user.click(screen.getByRole('tab', { name: '洗車プラン' }))

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('下書き')
  })

  test('再起動してもメモ・ケミカル・状態タグが残る', async () => {
    const { user, unmount } = setup()
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '下書き')
    await user.type(screen.getByRole('textbox', { name: '使用ケミカル' }), 'A液')
    await user.click(screen.getByRole('button', { name: '水シミ' }))
    unmount()

    setup()

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('下書き')
    expect(screen.getByRole('textbox', { name: '使用ケミカル' })).toHaveValue('A液')
    expect(screen.getByRole('button', { name: '水シミ' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('記録後は入力内容が空になる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'メモ')
    await user.click(screen.getByRole('button', { name: '水シミ' }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('')
    expect(screen.getByRole('button', { name: '水シミ' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('保存失敗の通知', () => {
  test('保存に失敗すると警告を表示する', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { user } = setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

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
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('checkbox', { name: SHAMPOO }))
    unmount()

    const { user: user2 } = setup()

    expect(screen.getByRole('checkbox', { name: SHAMPOO })).toBeChecked()
    await user2.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  test('v1 の保存データを引き継いで起動する（工程の並びは変えない）', async () => {
    localStorage.setItem(
      LEGACY_PLAN_KEY,
      JSON.stringify({
        steps: [
          { id: 'a', name: 'シャンプー洗車', done: true },
          { id: 'b', name: '予洗い（高圧水で砂を落とす）', done: false },
        ],
      }),
    )
    localStorage.setItem(
      LEGACY_HISTORY_KEY,
      JSON.stringify([{ id: 'r', washedAt: '2026-01-01T00:00:00.000Z', steps: ['拭き上げ'], note: '旧メモ' }]),
    )

    const { user } = setup()

    const names = screen.getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)
    expect(names.slice(1)).toEqual(['シャンプー洗車', '予洗い（高圧水で砂を落とす）'])
    expect(screen.getByRole('checkbox', { name: 'シャンプー洗車' })).toBeChecked()
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    const record = screen.getByRole('article')
    expect(within(record).getByText('旧メモ')).toBeInTheDocument()
    expect(within(record).queryByText('純水')).not.toBeInTheDocument()
    expect(within(record).queryByText('水道水')).not.toBeInTheDocument()
  })
})
