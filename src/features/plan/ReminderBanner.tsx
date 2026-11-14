import { reminderStatus } from '../../domain/reminder'

interface ReminderBannerProps {
  /** 最後の洗車からの日数。履歴が無ければ null */
  days: number | null
  /** 設定中の洗車間隔（週） */
  intervalWeeks: number
}

function message(days: number | null, intervalWeeks: number): string {
  const guide = `洗車の間隔: ${intervalWeeks} 週間`
  const status = reminderStatus(days, intervalWeeks)
  if (status === 'none' || days === null) return `まだ洗車の記録がありません（${guide}）`
  if (status === 'overdue') return `前回の洗車から ${days} 日。目安を過ぎています（${guide}）`
  if (status === 'due') return `前回の洗車から ${days} 日。そろそろ洗車のタイミングです（${guide}）`
  return `前回の洗車から ${days} 日（${guide}）`
}

export function ReminderBanner({ days, intervalWeeks }: ReminderBannerProps) {
  return (
    <p className={`reminder reminder--${reminderStatus(days, intervalWeeks)}`} role="status">
      {message(days, intervalWeeks)}
    </p>
  )
}
