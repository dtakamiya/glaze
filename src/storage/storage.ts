import { z } from 'zod'
import { MAX_NOTE_LENGTH } from '../domain/history'
import { MAX_STEP_NAME_LENGTH } from '../domain/plan'
import type { WashPlan, WashRecord } from '../domain/types'

// スキーマを変えるときはキーのバージョンを上げ、移行処理を追加すること。
export const PLAN_KEY = 'glaze:v1:plan'
export const HISTORY_KEY = 'glaze:v1:history'

const stepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(MAX_STEP_NAME_LENGTH),
  done: z.boolean(),
})

const planSchema = z.object({ steps: z.array(stepSchema) })

const recordSchema = z.object({
  id: z.string().min(1),
  washedAt: z.iso.datetime(),
  steps: z.array(z.string()),
  note: z.string().max(MAX_NOTE_LENGTH),
})

const historySchema = z.array(recordSchema)

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

function read<T>(key: string, schema: z.ZodType<T>, fallback: () => T): T {
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch (error: unknown) {
    warn(`保存データの読み込みに失敗しました: ${key}`, error)
    return fallback()
  }
  if (raw === null) return fallback()

  const result = parse(raw, schema)
  if (result.success) return result.data
  warn(`保存データが不正なため退避して初期値を使用します: ${key}`, result.error)
  backupCorrupt(key, raw)
  return fallback()
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
  return read(PLAN_KEY, planSchema, fallback)
}

export function savePlan(plan: WashPlan): boolean {
  return write(PLAN_KEY, plan)
}

export function loadHistory(): WashRecord[] {
  return read(HISTORY_KEY, historySchema, () => [])
}

export function saveHistory(history: readonly WashRecord[]): boolean {
  return write(HISTORY_KEY, history)
}
