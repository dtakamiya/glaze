const monthDayFormatter = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })

/** 例: 11/28(土) */
export function formatMonthDay(date: Date): string {
  return monthDayFormatter.format(date)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** ローカル日付を YYYY-MM-DD にする（input[type=date] の値と dateTime 属性に使う）。 */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
