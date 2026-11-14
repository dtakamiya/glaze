import { reminderStatus } from '../../domain/reminder'

interface ReminderBannerProps {
  /** 最後の洗車からの日数。履歴が無ければ null */
  days: number | null
}

// 閾値（REMINDER_DUE_DAYS = 14 日）に対応する表記
const GUIDE = '目安は 2〜3 週間に 1 回'

function message(days: number | null): string {
  const status = reminderStatus(days)
  if (status === 'none' || days === null) return `まだ洗車の記録がありません（${GUIDE}）`
  if (status === 'overdue') return `前回の洗車から ${days} 日。目安を過ぎています（${GUIDE}）`
  if (status === 'due') return `前回の洗車から ${days} 日。そろそろ洗車のタイミングです（${GUIDE}）`
  return `前回の洗車から ${days} 日（${GUIDE}）`
}

export function ReminderBanner({ days }: ReminderBannerProps) {
  const status = reminderStatus(days)
  return (
    <p className={`reminder reminder--${status}`} role="status">
      {message(days)}
    </p>
  )
}
