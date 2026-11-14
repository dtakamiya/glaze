import { z } from 'zod'
import { CONDITION_VALUES } from '../domain/catalog'
import { MAX_CHEMICALS_LENGTH, MAX_NOTE_LENGTH } from '../domain/history'
import { MAX_STEP_NAME_LENGTH } from '../domain/plan'

// ---- v2（現行）----

const stepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(MAX_STEP_NAME_LENGTH),
  done: z.boolean(),
  // enum にしない。カタログから ID が消えても plan 全体が不正扱いにならないようにする。
  templateId: z.string().min(1).optional(),
})

export const planSchema = z.object({ steps: z.array(stepSchema) })

const waterTypeSchema = z.enum(['pure', 'tap']).nullable()
const noteSchema = z.string().max(MAX_NOTE_LENGTH)
const chemicalsSchema = z.string().max(MAX_CHEMICALS_LENGTH)
const conditionsSchema = z.array(z.enum(CONDITION_VALUES))

const recordSchema = z.object({
  id: z.string().min(1),
  washedAt: z.iso.datetime(),
  steps: z.array(z.string()),
  note: noteSchema,
  waterType: waterTypeSchema,
  chemicals: chemicalsSchema,
  conditions: conditionsSchema,
})

export const historySchema = z.array(recordSchema)

export const settingsSchema = z.object({ hasPureWater: z.boolean() })

export const draftSchema = z.object({
  note: noteSchema,
  waterType: waterTypeSchema,
  chemicals: chemicalsSchema,
  conditions: conditionsSchema,
})

// ---- v1（移行元。凍結。変更しないこと）----

const stepSchemaV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  done: z.boolean(),
})

// 上限は定数を参照せず値を凍結する（定数を変えても v1 の検証結果が変わらないように）
export const planSchemaV1 = z.object({ steps: z.array(stepSchemaV1) })

const recordSchemaV1 = z.object({
  id: z.string().min(1),
  washedAt: z.iso.datetime(),
  steps: z.array(z.string()),
  note: z.string().max(500),
})

export const historySchemaV1 = z.array(recordSchemaV1)

export type PlanV1 = z.infer<typeof planSchemaV1>
export type HistoryV1 = z.infer<typeof historySchemaV1>
