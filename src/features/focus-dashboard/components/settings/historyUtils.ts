import { getCurrentIntlLocaleTag } from '../../../../i18n'
import type { Task, TaskColorKey } from '../../types'
import { toIsoDateStringInTimeZone } from '../../utils/time'

export type HistorySlice = {
  key: string
  title: string
  seconds: number
  minutes: number
  percentage: number
  sessionCount: number
  colorTag?: TaskColorKey
  iconTag?: Task['iconTag']
}

export type HistoryRecordRow = {
  id: string
  dateIso: string
  start: string
  duration: string
  seconds: number
  minutes: number
  taskId?: string
  taskTitle: string
  taskColorTag?: TaskColorKey
  taskIconTag?: Task['iconTag']
  activityLabel: string
}

export type HistoryDaySummary = {
  dateIso: string
  rows: HistoryRecordRow[]
  totalSeconds: number
  totalMinutes: number
  sessionCount: number
  taskIds: string[]
  iconTags: Task['iconTag'][]
  searchText: string
}

export type DayHistoryStats = {
  slices: HistorySlice[]
  totalSeconds: number
  totalMinutes: number
  trackedSeconds: number
  trackedMinutes: number
  trackedPercentage: number
  untrackedSeconds: number
  untrackedMinutes: number
  untrackedPercentage: number
  totalSessions: number
  topTask: HistorySlice | null
  averageSessionSeconds: number
  averageSessionMinutes: number
}

export const chartColorHexByTag: Record<TaskColorKey, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  pink: '#ec4899',
  violet: '#8b5cf6',
}

export const DAY_TOTAL_SECONDS = 24 * 60 * 60
export const DAY_TOTAL_MINUTES = DAY_TOTAL_SECONDS / 60
export const UNTRACKED_TIME_LABEL = 'Untracked Time'

export function buildDayHistoryStatsFromRows(rows: HistoryRecordRow[]): DayHistoryStats {
  const aggregated = new Map<string, Omit<HistorySlice, 'percentage'>>()

  for (const row of rows) {
    const seconds = Math.max(0, row.seconds || 0)
    if (seconds <= 0) {
      continue
    }

    const key = row.taskId ?? `activity-${row.taskTitle}`
    const current = aggregated.get(key)
    if (current) {
      current.seconds += seconds
      current.minutes = current.seconds / 60
      current.sessionCount += 1
      continue
    }

    aggregated.set(key, {
      key,
      title: row.taskTitle,
      seconds,
      minutes: seconds / 60,
      sessionCount: 1,
      colorTag: row.taskColorTag,
      iconTag: row.taskIconTag,
    })
  }

  const slices = Array.from(aggregated.values())
    .sort((a, b) => b.seconds - a.seconds)
    .map((slice) => ({
      ...slice,
      percentage: (slice.seconds / DAY_TOTAL_SECONDS) * 100,
    }))

  const totalSeconds = slices.reduce((sum, slice) => sum + slice.seconds, 0)
  const trackedSeconds = Math.min(DAY_TOTAL_SECONDS, totalSeconds)
  const totalSessions = slices.reduce((sum, slice) => sum + slice.sessionCount, 0)
  const untrackedSeconds = Math.max(0, DAY_TOTAL_SECONDS - trackedSeconds)
  const averageSessionSeconds = totalSessions > 0 ? totalSeconds / totalSessions : 0
  const totalMinutes = totalSeconds / 60
  const trackedMinutes = trackedSeconds / 60
  const untrackedMinutes = untrackedSeconds / 60

  return {
    slices,
    totalSeconds,
    totalMinutes,
    trackedSeconds,
    trackedMinutes,
    trackedPercentage: (trackedSeconds / DAY_TOTAL_SECONDS) * 100,
    untrackedSeconds,
    untrackedMinutes,
    untrackedPercentage: (untrackedSeconds / DAY_TOTAL_SECONDS) * 100,
    totalSessions,
    topTask: slices[0] ?? null,
    averageSessionSeconds,
    averageSessionMinutes: averageSessionSeconds / 60,
  }
}

export function buildPieChartBackground(history: Pick<DayHistoryStats, 'slices'>) {
  if (history.slices.length === 0) {
    return 'conic-gradient(rgba(71,85,105,0.45) 0deg 360deg)'
  }

  let cursor = 0
  const segments = history.slices.map((slice) => {
    const degrees = (Math.max(0, slice.seconds) / DAY_TOTAL_SECONDS) * 360
    const start = cursor
    const end = cursor + degrees
    cursor = end
    const color = slice.colorTag ? chartColorHexByTag[slice.colorTag] : '#64748b'
    return `${color} ${start}deg ${end}deg`
  })

  if (cursor < 360) {
    segments.push(`#334155 ${cursor}deg 360deg`)
  }

  return `conic-gradient(${segments.join(', ')})`
}

export function toIsoDateString(date: Date, timeZone?: string) {
  if (timeZone) {
    return toIsoDateStringInTimeZone(date, timeZone)
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfDayFromIso(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`)
}

export function formatIsoDateLong(isoDate: string) {
  const date = startOfDayFromIso(isoDate)
  return new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatIsoDateShort(isoDate: string) {
  const date = startOfDayFromIso(isoDate)
  return new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
