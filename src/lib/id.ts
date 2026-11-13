/**
 * 一意な ID を生成する。crypto.randomUUID は secure context（https / localhost）限定のため、
 * LAN の http でスマホ実機確認する場合に備えてフォールバックする。
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
