import type { WashSettings } from './types'

export const DEFAULT_SETTINGS: WashSettings = { hasPureWater: false }

export function setPureWater(settings: WashSettings, hasPureWater: boolean): WashSettings {
  return { ...settings, hasPureWater }
}
