import { fireEvent, render, screen, within } from '@testing-library/react'
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
const DEFAULT_COUNT = STEP_TEMPLATES.filter(
  (t) => t.menu === undefined && (t.slot === undefined || t.pureWater === false),
).length

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

describe('記録の編集', () => {
  const recordOnce = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '誤字メモ')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
  }

  test('メモ・ケミカル・水・状態を直して保存できる。日付とメニューは変わらない', async () => {
    const { user } = setup()
    await recordOnce(user)
    const before = within(screen.getByRole('article')).getByText('通常洗車')

    await user.click(screen.getByRole('button', { name: /の記録を編集/ }))
    const memo = screen.getByRole('textbox', { name: 'メモ' })
    await user.clear(memo)
    await user.type(memo, '直したメモ')
    await user.type(screen.getByRole('textbox', { name: '使用ケミカル・道具' }), 'ケミカルX')
    await user.selectOptions(screen.getByRole('combobox', { name: '水の種類' }), 'pure')
    await user.click(screen.getByRole('button', { name: '水シミ' }))
    await user.click(screen.getByRole('button', { name: '保存' }))

    const card = screen.getByRole('article')
    expect(within(card).getByText('直したメモ')).toBeInTheDocument()
    expect(within(card).getByText('使用: ケミカルX')).toBeInTheDocument()
    expect(within(card).getByText('純水')).toBeInTheDocument()
    expect(within(card).getByText('水シミ')).toBeInTheDocument()
    expect(before).toBeInTheDocument()
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument()
  })

  test('キャンセルすると変更は反映されない', async () => {
    const { user } = setup()
    await recordOnce(user)

    await user.click(screen.getByRole('button', { name: /の記録を編集/ }))
    await user.type(screen.getByRole('textbox', { name: 'メモ' }), '追記')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(within(screen.getByRole('article')).getByText('誤字メモ')).toBeInTheDocument()
  })

  test('編集した内容は再起動後も残る', async () => {
    const first = setup()
    await recordOnce(first.user)
    await first.user.click(screen.getByRole('button', { name: /の記録を編集/ }))
    await first.user.type(screen.getByRole('textbox', { name: 'メモ' }), '追記')
    await first.user.click(screen.getByRole('button', { name: '保存' }))
    first.unmount()

    const second = setup()
    await second.user.click(screen.getByRole('tab', { name: '施工履歴' }))

    expect(within(screen.getByRole('article')).getByText('誤字メモ追記')).toBeInTheDocument()
  })
})

describe('v1 ユーザーへの新機能の案内', () => {
  const seedLegacy = () =>
    localStorage.setItem(
      LEGACY_HISTORY_KEY,
      JSON.stringify([{ id: 'r', washedAt: '2026-01-01T00:00:00.000Z', steps: ['拭き上げ'], note: '' }]),
    )

  test('v1 のデータがあると案内が出て、閉じると次回以降も出ない', async () => {
    seedLegacy()
    const first = setup()

    expect(screen.getByRole('region', { name: '新しくなりました' })).toHaveTextContent('初期プランに戻す')

    await first.user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('region', { name: '新しくなりました' })).not.toBeInTheDocument()

    first.unmount()
    setup()
    expect(screen.queryByRole('region', { name: '新しくなりました' })).not.toBeInTheDocument()
  })

  test('閉じなければ再起動しても案内が残る', () => {
    seedLegacy()
    setup().unmount()

    setup()

    expect(screen.getByRole('region', { name: '新しくなりました' })).toBeInTheDocument()
  })

  test('v1 のデータが無い新規ユーザーには出ない', () => {
    setup()

    expect(screen.queryByRole('region', { name: '新しくなりました' })).not.toBeInTheDocument()
  })
})

describe('初回の案内', () => {
  test('履歴が無いうちは使い方の案内が出て、最初の記録のあとに消える', async () => {
    const { user } = setup()

    expect(screen.getByRole('region', { name: 'はじめに' })).toHaveTextContent('施工を記録')

    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.queryByRole('region', { name: 'はじめに' })).not.toBeInTheDocument()
  })

  test('純水器の説明が、トグルの説明として結び付いている', () => {
    setup()

    const toggle = screen.getByRole('checkbox', { name: /純水器を使う/ })

    expect(toggle).toHaveAccessibleDescription(/ミネラル/)
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
    await user.type(screen.getByRole('textbox', { name: '使用ケミカル・道具' }), 'スリーク')
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

  test('洗車間隔を 3 週間にすると、15 日ではまだ通常表示のまま', async () => {
    const washedAt = new Date()
    washedAt.setDate(washedAt.getDate() - 15)
    localStorage.setItem(
      'glaze:v2:history',
      JSON.stringify([
        { id: 'r', washedAt: washedAt.toISOString(), steps: [], note: '', waterType: null, chemicals: '', conditions: [] },
      ]),
    )
    localStorage.setItem('glaze:v2:schedule', JSON.stringify({ intervalWeeks: 3, horizonWeeks: 8 }))

    setup()

    expect(screen.getByRole('status')).toHaveTextContent('前回の洗車から 15 日（洗車の間隔: 3 週間）')
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

describe('記録の完了表示', () => {
  test('記録すると完了メッセージと次回の予定が表示される', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.getByText(/記録しました。次回は .+ のコーティング補充です。/)).toBeInTheDocument()
    expect(window.scrollTo).toHaveBeenCalled()
  })

  test('工程をチェックすると完了メッセージは消える', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('checkbox', { name: 'シャンプー洗車' }))

    expect(screen.queryByText(/記録しました/)).not.toBeInTheDocument()
  })
})

describe('洗車日', () => {
  test('過去の日付を選んで記録すると、その日付で履歴に残り計画も過去日から数える', async () => {
    const { user } = setup()
    const past = new Date()
    past.setDate(past.getDate() - 10)
    const pastValue = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    fireEvent.change(screen.getByLabelText('洗車日'), { target: { value: pastValue } })
    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(within(screen.getByRole('article')).getByRole('time')).toHaveAttribute('datetime', expect.stringContaining(pastValue.slice(0, 4)))
    await user.click(screen.getByRole('tab', { name: '洗車プラン' }))
    expect(screen.getByRole('status')).toHaveTextContent('前回の洗車から 10 日')
  })

  test('今日の日付は未設定として扱われ、日付入力の上限は今日になる', () => {
    setup()

    const input = screen.getByLabelText('洗車日') as HTMLInputElement
    expect(input.max).toBe(input.value)
  })
})

describe('メニュー別の工程', () => {
  test('メニューを選ぶとそのメニュー専用の工程が加わり、戻すと消える', async () => {
    const { user } = setup()
    expect(screen.queryByRole('checkbox', { name: '水シミ・水アカ除去' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    expect(screen.getByRole('checkbox', { name: '水シミ・水アカ除去' })).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'regular')
    expect(screen.queryByRole('checkbox', { name: '水シミ・水アカ除去' })).not.toBeInTheDocument()
  })

  test('消したメニュー専用の工程は、メモを入力しても復活しない', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    await user.click(screen.getByRole('button', { name: '水シミ・水アカ除去 を削除' }))

    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'あ')

    expect(screen.queryByRole('checkbox', { name: '水シミ・水アカ除去' })).not.toBeInTheDocument()
  })

  test('記録するとメニュー専用の工程は次回の予定に合わせて入れ替わり、チェックは外れる', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('checkbox', { name: '水シミ・水アカ除去' }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    // 次回の予定は通常洗車（特別メニューは日数が空くまで入らない）
    expect(screen.queryByRole('checkbox', { name: '水シミ・水アカ除去' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'シャンプー洗車' })).not.toBeChecked()
  })

  test('メニュー専用の工程を完了して記録すると履歴の工程に残る', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    await user.click(screen.getByRole('checkbox', { name: '水シミ・水アカ除去' }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(within(screen.getByRole('article')).getAllByText('水シミ・水アカ除去')).toHaveLength(2)
  })
})

describe('ホイール洗浄の周期', () => {
  const dayAgoIso = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
  const seed = (days: number) =>
    localStorage.setItem(
      'glaze:v2:history',
      JSON.stringify([
        { id: 'w', washedAt: dayAgoIso(days), steps: [WHEELS], note: '', waterType: null, chemicals: '', conditions: [], menu: 'regular' },
      ]),
    )

  test('完了して記録すると、次の洗車ではホイール洗浄が外れる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.queryByRole('checkbox', { name: WHEELS })).not.toBeInTheDocument()
  })

  test('未チェックのまま記録すると、次回もホイール洗浄が出る', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: 'シャンプー洗車' }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    expect(screen.getByRole('checkbox', { name: WHEELS })).not.toBeChecked()
  })

  test('前回のホイール洗浄から 27 日では出ず、28 日たつと出る', () => {
    seed(27)
    const { unmount } = setup()
    expect(screen.queryByRole('checkbox', { name: WHEELS })).not.toBeInTheDocument()
    unmount()

    seed(28)
    setup()
    expect(screen.getByRole('checkbox', { name: WHEELS })).toBeInTheDocument()
  })

  test('消したホイール洗浄は、メモを入力しても復活しない', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: `${WHEELS} を削除` }))

    await user.type(screen.getByRole('textbox', { name: 'メモ' }), 'あ')

    expect(screen.queryByRole('checkbox', { name: WHEELS })).not.toBeInTheDocument()
  })
})

describe('実績にもとづく次回提案', () => {
  const openSchedule = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('tab', { name: '計画' }))

  /** 水シミを記録した直後の状態を作る（次回予定はコーティング補充） */
  const recordWithWaterSpot = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '水シミ' }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
  }

  test('水シミを記録すると、計画タブに理由つきの提案が出る', async () => {
    const { user } = setup()
    await recordWithWaterSpot(user)

    await openSchedule(user)

    const suggestions = screen.getByRole('region', { name: '前回の記録からの提案' })
    expect(within(suggestions).getByText('前回、水シミを記録したため')).toBeInTheDocument()
    expect(within(suggestions).getByRole('button', { name: '採用する' })).toBeInTheDocument()
  })

  test('採用すると先頭の予定と記録フォームのメニューが変わり、専用工程が出る', async () => {
    const { user } = setup()
    await recordWithWaterSpot(user)
    await openSchedule(user)

    await user.click(screen.getByRole('button', { name: '採用する' }))

    expect(within(screen.getAllByRole('article')[0]).getByRole('heading', { name: '水シミ・水アカ除去' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '採用する' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '洗車プラン' }))
    expect(screen.getByRole('combobox', { name: '今回のメニュー' })).toHaveValue('mineral')
    expect(screen.getByRole('checkbox', { name: '水シミ・水アカ除去' })).toBeInTheDocument()
  })

  test('採用後は「予定どおりに戻す」で元のメニューに戻せる', async () => {
    const { user } = setup()
    await recordWithWaterSpot(user)
    await openSchedule(user)
    await user.click(screen.getByRole('button', { name: '採用する' }))

    await user.click(screen.getByRole('button', { name: '予定どおりに戻す' }))

    expect(within(screen.getAllByRole('article')[0]).getByRole('heading', { name: 'コーティング補充' })).toBeInTheDocument()
  })

  test('見送ると提案が消え、再起動しても出ない', async () => {
    const { user, unmount } = setup()
    await recordWithWaterSpot(user)
    await openSchedule(user)

    await user.click(screen.getByRole('button', { name: '見送る' }))
    expect(screen.queryByText('前回、水シミを記録したため')).not.toBeInTheDocument()
    unmount()

    const { user: user2 } = setup()
    await openSchedule(user2)
    expect(screen.queryByText('前回、水シミを記録したため')).not.toBeInTheDocument()
  })

  test('鳥フンは情報のみの注意として出る。1回だけの未実施工程は注意に出ない', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '鳥フン' }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await openSchedule(user)

    expect(screen.getByText(/前回、鳥フンを記録しました。次回は「虫・鳥フン処理」を忘れずに/)).toBeInTheDocument()
    expect(screen.queryByText(/2回連続で未実施/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '採用する' })).not.toBeInTheDocument()
  })

  test('必須工程を2回連続で未実施にすると、注意が出る', async () => {
    const { user } = setup()
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('tab', { name: '洗車プラン' }))
      await user.click(screen.getByRole('checkbox', { name: '予洗い（砂を流す）' }))
      await user.click(screen.getByRole('button', { name: '施工を記録' }))
    }

    await openSchedule(user)

    expect(screen.getByText(/2回連続で未実施: .*シャンプー洗車/)).toBeInTheDocument()
  })

  test('履歴に予定との差（予定メニューと未実施の工程）が出る', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    const record = screen.getByRole('article')
    expect(within(record).getByText('予定: 通常洗車 → 実施: 水シミ・水アカ除去')).toBeInTheDocument()
    expect(within(record).getByText(/未実施: .*予洗い（砂を流す）/)).toBeInTheDocument()
  })

  test('履歴が無いうちは提案が出ない', async () => {
    const { user } = setup()

    await openSchedule(user)

    expect(screen.queryByRole('region', { name: '前回の記録からの提案' })).not.toBeInTheDocument()
  })
})

describe('過去日で記録するときの予定メニュー', () => {
  test('洗車日を過去にすると、その日の予定メニューに合わせて専用工程と選択が変わる', () => {
    const daysAgo = (n: number) => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return d
    }
    const value = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem(
      'glaze:v2:history',
      JSON.stringify([
        { id: 'r', washedAt: daysAgo(45).toISOString(), steps: [], note: '', waterType: null, chemicals: '', conditions: [], menu: 'regular' },
        { id: 'c', washedAt: daysAgo(10).toISOString(), steps: [], note: '', waterType: null, chemicals: '', conditions: [], menu: 'coating' },
      ]),
    )
    setup()
    // 最初の記録から 45 日・10 日前にコーティング済み → 今日の予定は水シミ・水アカ除去（17 日前から周期が来ている）
    expect(screen.getByRole('combobox', { name: '今回のメニュー' })).toHaveValue('mineral')
    expect(screen.getByRole('checkbox', { name: '水シミ・水アカ除去' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('洗車日'), { target: { value: value(daysAgo(44)) } })

    // その日は最初の記録から 1 日後（新しい記録は数えない） → 通常洗車
    expect(screen.getByRole('combobox', { name: '今回のメニュー' })).toHaveValue('regular')
    expect(screen.queryByRole('checkbox', { name: '水シミ・水アカ除去' })).not.toBeInTheDocument()
  })
})

describe('製品の選択', () => {
  const chemicals = () => screen.getByRole('textbox', { name: '使用ケミカル・道具' })

  test('製品を押すと入力欄に入り、もう一度押すと外れる', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'スリークシャンプー' }))
    await user.click(screen.getByRole('button', { name: '洗車スポンジ' }))

    expect(chemicals()).toHaveValue('スリークシャンプー、洗車スポンジ')
    expect(screen.getByRole('button', { name: 'スリークシャンプー' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'スリークシャンプー' }))

    expect(chemicals()).toHaveValue('洗車スポンジ')
    expect(screen.getByRole('button', { name: 'スリークシャンプー' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('自由入力と併用でき、記録すると履歴に残る', async () => {
    const { user } = setup()
    await user.type(chemicals(), '他社ワックス')
    await user.click(screen.getByRole('button', { name: 'コロイドクレンザー' }))
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(screen.getByText('使用: 他社ワックス、コロイドクレンザー')).toBeInTheDocument()
  })

  test('履歴の編集フォームでも製品を選べる', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))

    await user.click(screen.getByRole('button', { name: /の記録を編集/ }))
    await user.click(screen.getByRole('button', { name: 'ミネラルリムーバー' }))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('使用: ミネラルリムーバー')).toBeInTheDocument()
  })
})

describe('ケミカルの再利用', () => {
  const chemicals = () => screen.getByRole('textbox', { name: '使用ケミカル・道具' })

  test('履歴が無いうちは候補が出ない', () => {
    setup()

    expect(screen.queryByRole('button', { name: /^ケミカルに入力:/ })).not.toBeInTheDocument()
  })

  test('前回のケミカルを押すと入力欄に入る。入力済みの値と同じ候補は出ない', async () => {
    const { user } = setup()
    await user.type(chemicals(), 'スリーク')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    expect(chemicals()).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'ケミカルに入力: スリーク' }))

    expect(chemicals()).toHaveValue('スリーク')
    expect(screen.queryByRole('button', { name: 'ケミカルに入力: スリーク' })).not.toBeInTheDocument()
  })
})

describe('時間配分の目安', () => {
  const timing = () => screen.getByTestId('plan-timing').textContent ?? ''

  test('必須工程の合計と残りの目安が出る。任意工程は含めない', () => {
    setup()

    // 通常洗車: タイヤ・ホイール10 + 予洗い5 + シャンプー15 + すすぎ5 + 拭き上げ10
    expect(timing()).toContain('所要の目安 約45分')
    expect(timing()).toContain('残り 45分')
  })

  test('工程をチェックすると残りが減り、合計は変わらない', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('checkbox', { name: WHEELS }))

    expect(timing()).toContain('所要の目安 約45分')
    expect(timing()).toContain('残り 35分')
  })

  test('自作工程があると、目安に含まれないことを示す', async () => {
    const { user } = setup()

    await user.type(screen.getByRole('textbox', { name: '追加する工程' }), '鉄粉除去')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(timing()).toContain('自作の工程は含みません')
  })
})

describe('進捗', () => {
  test('必須工程をすべて終えれば完了になり、任意工程は分母に入らない', async () => {
    const { user } = setup()
    expect(screen.getByText('0 / 5 工程')).toBeInTheDocument()

    for (const name of [WHEELS, '予洗い（砂を流す）', SHAMPOO, 'すすぎ', '拭き上げ＋コーティング']) {
      await user.click(screen.getByRole('checkbox', { name }))
    }

    expect(screen.getByText('5 / 5 工程 ✓')).toBeInTheDocument()
  })
})

describe('洗車計画タブ', () => {
  const openSchedule = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('tab', { name: '計画' }))

  test('履歴がなければ今日が次回の通常洗車になり、8 週先まで並ぶ', async () => {
    const { user } = setup()

    await openSchedule(user)

    const items = screen.getAllByRole('article')
    expect(items).toHaveLength(5)
    expect(within(items[0]).getByText('次回')).toBeInTheDocument()
    expect(within(items[0]).getByRole('heading', { name: '通常洗車' })).toBeInTheDocument()
    // 特別メニューは洗車の回数ではなく日数で入る（最初の記録から 2 週 → コーティング補充、4 週 → 水シミ・水アカ除去）
    expect(within(items[1]).getByRole('heading', { name: 'コーティング補充' })).toBeInTheDocument()
    expect(within(items[2]).getByRole('heading', { name: '水シミ・水アカ除去' })).toBeInTheDocument()
  })

  test('前回の洗車（日付とメニュー）が出る。履歴が無ければ出ない', async () => {
    const { user } = setup()
    await openSchedule(user)
    expect(screen.queryByText(/^前回の洗車:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '洗車プラン' }))
    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))
    await openSchedule(user)

    expect(screen.getByText(/^前回の洗車:.*水シミ・水アカ除去/)).toBeInTheDocument()
  })

  test('「次回」カードの「この内容で洗車する」で洗車プランに移る。先の予定にはボタンがない', async () => {
    const { user } = setup()
    await openSchedule(user)

    expect(screen.getAllByRole('button', { name: 'この内容で洗車する' })).toHaveLength(1)
    const [next] = screen.getAllByRole('article')
    await user.click(within(next).getByRole('button', { name: 'この内容で洗車する' }))

    expect(screen.getByRole('heading', { name: '洗車プラン' })).toBeInTheDocument()
  })

  test('選んだメニューの専用工程が入った状態で開き、チェックは変わらない', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: '今回のメニュー' }), 'mineral')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await openSchedule(user)

    await user.click(screen.getByRole('button', { name: 'この内容で洗車する' }))

    expect(screen.getByRole('checkbox', { name: '水シミ・水アカ除去' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: WHEELS })).toBeChecked()
  })

  test('記録すると次回は 2 週間後のコーティング補充で、その次の回に水シミ・水アカ除去が入る', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await openSchedule(user)

    const [next, second] = screen.getAllByRole('article')
    // 最初の記録（今日）から 2 週後がコーティング補充、4 週後が水シミ・水アカ除去
    expect(within(next).getByRole('heading', { name: 'コーティング補充' })).toBeInTheDocument()
    expect(within(second).getByRole('heading', { name: '水シミ・水アカ除去' })).toBeInTheDocument()
  })

  test('記録フォームの既定は予定のメニューで、別のメニューを選ぶと履歴とローテーションに反映される', async () => {
    const { user } = setup()
    const select = screen.getByRole('combobox', { name: '今回のメニュー' })
    expect(select).toHaveValue('regular')
    expect(screen.getByRole('option', { name: '通常洗車（予定）' })).toBeInTheDocument()

    await user.selectOptions(select, 'mineral')
    await user.click(screen.getByRole('checkbox', { name: WHEELS }))
    await user.click(screen.getByRole('button', { name: '施工を記録' }))

    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    expect(within(screen.getByRole('article')).getByText('水シミ・水アカ除去')).toBeInTheDocument()
    await openSchedule(user)
    expect(within(screen.getAllByRole('article')[0]).getByRole('heading', { name: 'コーティング補充' })).toBeInTheDocument()
  })

  test('予定日を過ぎていると超過日数を表示する', async () => {
    const washedAt = new Date()
    washedAt.setDate(washedAt.getDate() - 20)
    localStorage.setItem(
      'glaze:v2:history',
      JSON.stringify([
        { id: 'r', washedAt: washedAt.toISOString(), steps: [], note: '', waterType: null, chemicals: '', conditions: [], menu: 'regular' },
      ]),
    )
    const { user } = setup()

    await openSchedule(user)

    expect(screen.getByText('予定日を 6 日過ぎています')).toBeInTheDocument()
  })

  test('表示期間と間隔を切り替えられ、再起動後も残る', async () => {
    const { user, unmount } = setup()
    await openSchedule(user)

    await user.selectOptions(screen.getByRole('combobox', { name: '表示期間' }), '12')
    expect(screen.getAllByRole('article')).toHaveLength(7)
    await user.selectOptions(screen.getByRole('combobox', { name: '洗車の間隔' }), '3')
    expect(screen.getAllByRole('article')).toHaveLength(5)
    unmount()

    const { user: user2 } = setup()
    await openSchedule(user2)

    expect(screen.getByRole('combobox', { name: '表示期間' })).toHaveValue('12')
    expect(screen.getByRole('combobox', { name: '洗車の間隔' })).toHaveValue('3')
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
    await user.type(screen.getByRole('textbox', { name: '使用ケミカル・道具' }), 'A液')
    await user.click(screen.getByRole('button', { name: '水シミ' }))
    unmount()

    setup()

    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('下書き')
    expect(screen.getByRole('textbox', { name: '使用ケミカル・道具' })).toHaveValue('A液')
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
    // 既存の並びは保ち、周期が来ているホイール洗浄と、今回のメニュー（最初の記録から日数がたっているためコーティング補充）の工程だけが加わる
    expect(names.slice(1)).toEqual(['タイヤ・ホイール洗浄', 'シャンプー洗車', '予洗い（高圧水で砂を落とす）', 'コーティング補充'])
    expect(screen.getByRole('checkbox', { name: 'シャンプー洗車' })).toBeChecked()
    await user.click(screen.getByRole('tab', { name: '施工履歴' }))
    const record = screen.getByRole('article')
    expect(within(record).getByText('旧メモ')).toBeInTheDocument()
    expect(within(record).queryByText('純水')).not.toBeInTheDocument()
    expect(within(record).queryByText('水道水')).not.toBeInTheDocument()
  })
})
