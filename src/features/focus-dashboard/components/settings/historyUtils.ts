import type { Task, TaskColorKey } from '../../types'

export type HistorySlice = {
  key: string
  title: string
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
  totalMinutes: number
  sessionCount: number
  taskIds: string[]
  iconTags: Task['iconTag'][]
  searchText: string
}

export type DayHistoryStats = {
  slices: HistorySlice[]
  totalMinutes: number
  trackedMinutes: number
  trackedPercentage: number
  untrackedMinutes: number
  untrackedPercentage: number
  totalSessions: number
  topTask: HistorySlice | null
  averageSessionMinutes: number
}

export const chartColorHexByTag: Record<TaskColorKey, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
}

export const DAY_TOTAL_MINUTES = 24 * 60
export const UNTRACKED_TIME_LABEL = 'Untracked Time'

export function buildDayHistoryStatsFromRows(rows: HistoryRecordRow[]): DayHistoryStats {
  const aggregated = new Map<string, Omit<HistorySlice, 'percentage'>>()

  for (const row of rows) {
    const minutes = Math.max(0, row.minutes || 0)
    if (minutes <= 0) {
      continue
    }

    const key = row.taskId ?? `activity-${row.taskTitle}`
    const current = aggregated.get(key)
    if (current) {
      current.minutes += minutes
      current.sessionCount += 1
      continue
    }

    aggregated.set(key, {
      key,
      title: row.taskTitle,
      minutes,
      sessionCount: 1,
      colorTag: row.taskColorTag,
      iconTag: row.taskIconTag,
    })
  }

  const slices = Array.from(aggregated.values())
    .sort((a, b) => b.minutes - a.minutes)
    .map((slice) => ({
      ...slice,
      percentage: (slice.minutes / DAY_TOTAL_MINUTES) * 100,
    }))

  const totalMinutes = slices.reduce((sum, slice) => sum + slice.minutes, 0)
  const trackedMinutes = Math.min(DAY_TOTAL_MINUTES, totalMinutes)
  const totalSessions = slices.reduce((sum, slice) => sum + slice.sessionCount, 0)
  const untrackedMinutes = Math.max(0, DAY_TOTAL_MINUTES - trackedMinutes)

  return {
    slices,
    totalMinutes,
    trackedMinutes,
    trackedPercentage: (trackedMinutes / DAY_TOTAL_MINUTES) * 100,
    untrackedMinutes,
    untrackedPercentage: (untrackedMinutes / DAY_TOTAL_MINUTES) * 100,
    totalSessions,
    topTask: slices[0] ?? null,
    averageSessionMinutes: totalSessions > 0 ? totalMinutes / totalSessions : 0,
  }
}

export function buildPieChartBackground(history: Pick<DayHistoryStats, 'slices'>) {
  if (history.slices.length === 0) {
    return 'conic-gradient(rgba(71,85,105,0.45) 0deg 360deg)'
  }

  let cursor = 0
  const segments = history.slices.map((slice) => {
    const degrees = (Math.max(0, slice.minutes) / DAY_TOTAL_MINUTES) * 360
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

export function toIsoDateString(date: Date) {
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
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatIsoDateShort(isoDate: string) {
  const date = startOfDayFromIso(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
