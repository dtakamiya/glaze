import { z } from 'zod'
import { DEFAULT_SCHEDULE_PREFS, DEFAULT_SETTINGS } from '../domain/settings'
import { EMPTY_DRAFT } from '../domain/draft'
import type { RecordDraft, SchedulePrefs, WashPlan, WashRecord, WashSettings } from '../domain/types'
import { migrateHistoryV1, migratePlanV1 } from './migrations'
import {
  draftSchema,
  historySchema,
  historySchemaV1,
  planSchema,
  planSchemaV1,
  schedulePrefsSchema,
  settingsSchema,
} from './schemas'

// スキーマを変えるときはキーのバージョンを上げ、移行処理を追加すること。
// v1 キーは移行元として読むだけで削除しない（不具合時のロールバック用）。
export const PLAN_KEY = 'glaze:v2:plan'
export const HISTORY_KEY = 'glaze:v2:history'
export const SETTINGS_KEY = 'glaze:v2:settings'
export const DRAFT_KEY = 'glaze:v2:draft'
export const SCHEDULE_KEY = 'glaze:v2:schedule'
export const UPGRADE_NOTICE_KEY = 'glaze:v2:upgrade-notice'
export const LEGACY_PLAN_KEY = 'glaze:v1:plan'
export const LEGACY_HISTORY_KEY = 'glaze:v1:history'

interface Legacy<T, L> {
  readonly key: string
  readonly schema: z.ZodType<L>
  readonly migrate: (value: L) => T
}

function warn(message: string, error: unknown): void {
  console.warn(`[glaze/storage] ${message}`, error)
}

/** 不正データを退避する。直後の保存で元データが失われないようにするため。 */
function backupCorrupt(key: string, raw: string): void {
  try {
    localStorage.setItem(`${key}:corrupt`, raw)
  } catch (error: unknown) {
    warn(`不正データの退避に失敗しました: ${key}`, error)
  }
}

function parse<T>(raw: string, schema: z.ZodType<T>): z.ZodSafeParseResult<T> | { success: false; error: unknown } {
  try {
    return schema.safeParse(JSON.parse(raw))
  } catch (error: unknown) {
    return { success: false, error }
  }
}

type RawRead = { readonly ok: true; readonly raw: string | null } | { readonly ok: false }

function readRaw(key: string): RawRead {
  try {
    return { ok: true, raw: localStorage.getItem(key) }
  } catch (error: unknown) {
    warn(`保存データの読み込みに失敗しました: ${key}`, error)
    return { ok: false }
  }
}

/** 検証して返す。不正なら退避して null。保存データが無いときも null。 */
function readValidated<T>(key: string, schema: z.ZodType<T>): { readonly value: T | null; readonly failed: boolean } {
  const read = readRaw(key)
  if (!read.ok) return { value: null, failed: true }
  if (read.raw === null) return { value: null, failed: false }

  const result = parse(read.raw, schema)
  if (result.success) return { value: result.data, failed: false }
  warn(`保存データが不正なため退避して初期値を使用します: ${key}`, result.error)
  backupCorrupt(key, read.raw)
  return { value: null, failed: true }
}

/**
 * v2 → v1(移行) → 初期値の順に読む。v2 が不正でも v1 には戻らない（削除済みデータの復活を避ける）。
 * 移行結果の v2 への書き込みは、呼び出し側の保存（usePersistentState）が行う。
 */
function read<T, L>(key: string, schema: z.ZodType<T>, fallback: () => T, legacy?: Legacy<T, L>): T {
  const current = readValidated(key, schema)
  if (current.value !== null) return current.value
  if (current.failed || legacy === undefined) return fallback()

  const old = readValidated(legacy.key, legacy.schema)
  return old.value === null ? fallback() : legacy.migrate(old.value)
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error: unknown) {
    warn(`保存に失敗しました: ${key}`, error)
    return false
  }
}

export function loadPlan(fallback: () => WashPlan): WashPlan {
  return read(PLAN_KEY, planSchema, fallback, {
    key: LEGACY_PLAN_KEY,
    schema: planSchemaV1,
    migrate: migratePlanV1,
  })
}

export function savePlan(plan: WashPlan): boolean {
  return write(PLAN_KEY, plan)
}

export function loadHistory(): WashRecord[] {
  return read(HISTORY_KEY, historySchema, () => [], {
    key: LEGACY_HISTORY_KEY,
    schema: historySchemaV1,
    migrate: migrateHistoryV1,
  })
}

export function saveHistory(history: readonly WashRecord[]): boolean {
  return write(HISTORY_KEY, history)
}

export function loadSettings(): WashSettings {
  return read(SETTINGS_KEY, settingsSchema, () => DEFAULT_SETTINGS)
}

export function saveSettings(settings: WashSettings): boolean {
  return write(SETTINGS_KEY, settings)
}

export function loadDraft(): RecordDraft {
  return read(DRAFT_KEY, draftSchema, () => EMPTY_DRAFT)
}

export function saveDraft(draft: RecordDraft): boolean {
  return write(DRAFT_KEY, draft)
}

export function loadSchedulePrefs(): SchedulePrefs {
  return read(SCHEDULE_KEY, schedulePrefsSchema, () => DEFAULT_SCHEDULE_PREFS)
}

export function saveSchedulePrefs(prefs: SchedulePrefs): boolean {
  return write(SCHEDULE_KEY, prefs)
}

/** v1 の保存データ（移行元）が端末に残っているか。 */
export function hasLegacyData(): boolean {
  const history = readRaw(LEGACY_HISTORY_KEY)
  const plan = readRaw(LEGACY_PLAN_KEY)
  return (history.ok && history.raw !== null) || (plan.ok && plan.raw !== null)
}

/** v1 ユーザー向けの新機能の案内を、閉じ済みか。 */
export function loadUpgradeNoticeDismissed(): boolean {
  return read(UPGRADE_NOTICE_KEY, z.boolean(), () => false)
}

export function saveUpgradeNoticeDismissed(dismissed: boolean): boolean {
  return write(UPGRADE_NOTICE_KEY, dismissed)
}
