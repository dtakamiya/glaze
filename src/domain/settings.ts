import type { HorizonWeeks, IntervalWeeks, SchedulePrefs, WashSettings } from './types'

export const DEFAULT_SETTINGS: WashSettings = { hasPureWater: false }

export function setPureWater(settings: WashSettings, hasPureWater: boolean): WashSettings {
  return { ...settings, hasPureWater }
}

export const INTERVAL_WEEKS_OPTIONS: readonly IntervalWeeks[] = [1, 2, 3, 4, 6]
export const HORIZON_WEEKS_OPTIONS: readonly HorizonWeeks[] = [4, 8, 12]

export const DEFAULT_SCHEDULE_PREFS: SchedulePrefs = { intervalWeeks: 2, horizonWeeks: 8 }
