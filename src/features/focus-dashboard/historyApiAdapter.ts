import { getCurrentIntlLocaleTag } from '../../i18n'
import type {
  CreateTimeEntryPayload,
  HistoryDayDetail,
  HistoryDayRow,
  HistoryDailyLogEntry,
  HistoryOverview,
  HistoryTaskRow,
} from './api'
import type { DashboardStats, TaskColorKey, TaskIconKey } from './types'
import { formatSecondsCompact, formatSecondsHms } from './utils/time'
import {
  DAY_TOTAL_SECONDS,
  buildDayHistoryStatsFromRows,
  formatIsoDateLong,
  type DayHistoryStats,
  type HistoryDaySummary,
  type HistoryRecordRow,
  type HistorySlice,
} from './components/settings/historyUtils'

type HistoryAdapterLabels = {
  untracked: string
  manualAdjustment: string
  otherActivity: string
}

type AdaptHistoryDetailOptions = {
  labels: HistoryAdapterLabels
  timeZone?: string
}

const taskColorFallback: TaskColorKey = 'blue'
const taskIconFallback: TaskIconKey = 'briefcase'

const backendToUiTaskIconMap: Record<string, TaskIconKey> = {
  briefcase: 'briefcase',
  learning: 'learning',
  tools: 'tools',
  code: 'code',
  book: 'book',
  pen: 'pen',
  cart: 'cart',
  game: 'game',
  'graduation-cap': 'learning',
  'screwdriver-wrench': 'tools',
  'book-open': 'book',
  'cart-shopping': 'cart',
  gamepad: 'game',
}

export function adaptHistoryOverviewToUiStats(
  overview: HistoryOverview,
  labels: Pick<HistoryAdapterLabels, 'untracked' | 'otherActivity'>,
) {
  const slices = overview.time_by_task
    .map((row) => adaptHistoryTaskRowToSlice(row, labels))
    .filter((slice): slice is HistorySlice => slice !== null)

  const totalLoggedSeconds = slices.reduce((sum, slice) => sum + Math.max(0, slice.seconds), 0)
  const totalSessions = slices.reduce((sum, slice) => sum + Math.max(0, slice.sessionCount), 0)
  const topTaskSlice =
    overview.top_task !== null
      ? adaptHistoryTaskRowToSlice(overview.top_task, labels)
      : slices.find((slice) => slice.key !== 'untracked') ?? slices[0] ?? null

  const history: DayHistoryStats = {
    slices,
    totalSeconds: totalLoggedSeconds,
    totalMinutes: totalLoggedSeconds / 60,
    trackedSeconds: totalLoggedSeconds,
    trackedMinutes: totalLoggedSeconds / 60,
    trackedPercentage: (Math.min(DAY_TOTAL_SECONDS, totalLoggedSeconds) / DAY_TOTAL_SECONDS) * 100,
    untrackedSeconds: Math.max(0, DAY_TOTAL_SECONDS - Math.min(DAY_TOTAL_SECONDS, totalLoggedSeconds)),
    untrackedMinutes: Math.max(0, DAY_TOTAL_SECONDS - Math.min(DAY_TOTAL_SECONDS, totalLoggedSeconds)) / 60,
    untrackedPercentage:
      (Math.max(0, DAY_TOTAL_SECONDS - Math.min(DAY_TOTAL_SECONDS, totalLoggedSeconds)) / DAY_TOTAL_SECONDS) * 100,
    totalSessions,
    topTask: topTaskSlice,
    averageSessionSeconds: totalSessions > 0 ? totalLoggedSeconds / totalSessions : 0,
    averageSessionMinutes: totalSessions > 0 ? totalLoggedSeconds / totalSessions / 60 : 0,
  }

  const dashboardStats: DashboardStats = {
    sessions: normalizeNonNegativeInt(overview.tracked_sessions_count),
    focusTime: formatSecondsCompact(normalizeNonNegativeInt(overview.tracked_seconds)),
    totalTracked: formatSecondsCompact(normalizeNonNegativeInt(overview.tracked_seconds)),
  }

  return {
    history,
    dashboardStats,
    currentDayLabel: formatIsoDateLong(overview.date_local),
    dailyLogSessionsCount: totalSessions,
    serverNowUtc: overview.server_now_utc,
  }
}

export function adaptHistoryDaysListToUiSummaries(rows: HistoryDayRow[]): HistoryDaySummary[] {
  return rows.map((row) => {
    const visualRows: HistoryRecordRow[] = row.matched_tasks.map((task, index) => ({
      id: `${row.date_local}-matched-${task.task_id ?? index}`,
      dateIso: row.date_local,
      start: '',
      duration: '00:00:00',
      seconds: 0,
      minutes: 0,
      taskId: task.task_id,
      taskTitle: task.title?.trim() || 'Task',
      taskColorTag: normalizeTaskColorTag(task.color_tag),
      taskIconTag: normalizeTaskIconTag(task.icon_tag),
      activityLabel: task.title?.trim() || 'Task',
    }))

    const taskIds = row.matched_tasks
      .map((task) => task.task_id)
      .filter((taskId): taskId is string => typeof taskId === 'string' && taskId.trim().length > 0)

    const paddedTaskIds = [...taskIds]
    while (paddedTaskIds.length < Math.max(0, normalizeNonNegativeInt(row.task_types_count))) {
      paddedTaskIds.push(`__task-type-${row.date_local}-${paddedTaskIds.length}`)
    }

    const totalSeconds =
      normalizeNonNegativeInt(row.tracked_seconds) + normalizeNonNegativeInt(row.untracked_seconds)

    return {
      dateIso: row.date_local,
      rows: visualRows,
      totalSeconds,
      totalMinutes: totalSeconds / 60,
      sessionCount: normalizeNonNegativeInt(row.tracked_sessions_count),
      taskIds: paddedTaskIds,
      iconTags: visualRows
        .map((visualRow) => visualRow.taskIconTag)
        .filter((icon): icon is TaskIconKey => Boolean(icon)),
      searchText: `${row.date_local} ${row.matched_tasks.map((task) => task.title).join(' ')}`.toLowerCase(),
    }
  })
}

export function adaptHistoryDayDetailToUiSummary(
  detail: HistoryDayDetail,
  options: AdaptHistoryDetailOptions,
) {
  const rows = detail.entries
    .map((entry) => adaptHistoryDailyLogEntryToHistoryRow(entry, options))
    .sort(sortHistoryRowsByTimeAsc)

  const summary: HistoryDaySummary = {
    dateIso: detail.date_local,
    rows,
    totalSeconds: rows.reduce((sum, row) => sum + Math.max(0, row.seconds), 0),
    totalMinutes: rows.reduce((sum, row) => sum + Math.max(0, row.minutes), 0),
    sessionCount: rows.length,
    taskIds: Array.from(new Set(rows.map((row) => row.taskId).filter((taskId): taskId is string => Boolean(taskId)))),
    iconTags: Array.from(new Set(rows.map((row) => row.taskIconTag).filter((icon): icon is TaskIconKey => Boolean(icon)))),
    searchText: `${detail.date_local} ${rows.map((row) => `${row.taskTitle} ${row.activityLabel}`).join(' ')}`.toLowerCase(),
  }

  return {
    summary,
    stats: buildDayHistoryStatsFromRows(rows),
    serverNowUtc: detail.server_now_utc,
  }
}

export function buildUntrackedCreateTimeEntryPayloadFromSession(session: {
  startedAtMs: number
  endedAtMs?: number
}): CreateTimeEntryPayload | null {
  const startedAt = new Date(session.startedAtMs)
  const endedAt = new Date(session.endedAtMs ?? Date.now())

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return null
  }

  if (endedAt.getTime() <= startedAt.getTime()) {
    return null
  }

  return {
    entry_type: 'untracked',
    task_id: null,
    started_at_utc: startedAt.toISOString(),
    ended_at_utc: endedAt.toISOString(),
    notes: null,
  }
}

function adaptHistoryTaskRowToSlice(
  row: HistoryTaskRow,
  labels: Pick<HistoryAdapterLabels, 'untracked' | 'otherActivity'>,
): HistorySlice | null {
  const seconds = normalizeNonNegativeInt(row.tracked_seconds)
  if (seconds <= 0) {
    return null
  }

  const isUntrackedRow = row.task_id === null
  const title =
    typeof row.title === 'string' && row.title.trim()
      ? isStaticUntrackedLabel(row.title)
        ? labels.untracked
        : row.title.trim()
      : isUntrackedRow
        ? labels.untracked
        : labels.otherActivity

  const key = isUntrackedRow ? 'untracked' : row.task_id || `task-${title}`

  return {
    key,
    title,
    seconds,
    minutes: seconds / 60,
    percentage: (seconds / DAY_TOTAL_SECONDS) * 100,
    sessionCount: normalizeNonNegativeInt(row.sessions_count),
    colorTag: normalizeTaskColorTag(row.color_tag),
    iconTag: normalizeTaskIconTag(row.icon_tag),
  }
}

function adaptHistoryDailyLogEntryToHistoryRow(
  entry: HistoryDailyLogEntry,
  options: AdaptHistoryDetailOptions,
): HistoryRecordRow {
  const seconds = normalizeNonNegativeInt(entry.duration_seconds)
  const isTask = typeof entry.task_id === 'string' && entry.task_id.trim().length > 0
  const taskTitle = resolveHistoryEntryTitle(entry, options.labels)
  const startLabel = resolveHistoryStartLabel(entry, options.timeZone)

  return {
    id: entry.id,
    dateIso: resolveHistoryDateIso(entry.started_at_utc, options.timeZone),
    start: startLabel,
    duration: formatSecondsHms(seconds),
    seconds,
    minutes: seconds / 60,
    taskId: isTask ? entry.task_id!.trim() : undefined,
    taskTitle,
    taskColorTag: isTask ? normalizeTaskColorTag(entry.task_color_tag) : undefined,
    taskIconTag: isTask ? normalizeTaskIconTag(entry.task_icon_tag) : undefined,
    activityLabel: taskTitle,
  }
}

function resolveHistoryEntryTitle(entry: HistoryDailyLogEntry, labels: HistoryAdapterLabels) {
  if (entry.entry_type === 'manual_adjustment') {
    if (typeof entry.task_title === 'string' && entry.task_title.trim()) {
      return entry.task_title.trim()
    }
    return labels.manualAdjustment
  }

  if (entry.entry_type === 'untracked') {
    if (typeof entry.task_title === 'string' && entry.task_title.trim() && !isStaticUntrackedLabel(entry.task_title)) {
      return entry.task_title.trim()
    }
    return labels.untracked
  }

  if (typeof entry.task_title === 'string' && entry.task_title.trim()) {
    return entry.task_title.trim()
  }

  return labels.otherActivity
}

function resolveHistoryStartLabel(entry: HistoryDailyLogEntry, timeZone?: string) {
  if (typeof entry.started_at_local_label === 'string' && entry.started_at_local_label.trim()) {
    return entry.started_at_local_label.trim()
  }

  if (!entry.started_at_utc) {
    return ''
  }

  const date = new Date(entry.started_at_utc)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }
}

function resolveHistoryDateIso(startedAtUtc: string, timeZone?: string) {
  const date = new Date(startedAtUtc)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }
}

function sortHistoryRowsByTimeAsc(a: HistoryRecordRow, b: HistoryRecordRow) {
  if (a.dateIso !== b.dateIso) {
    return a.dateIso.localeCompare(b.dateIso)
  }

  return parseStartLabelToMinutes(a.start) - parseStartLabelToMinutes(b.start)
}

function parseStartLabelToMinutes(label: string) {
  if (typeof label !== 'string') {
    return Number.MAX_SAFE_INTEGER
  }

  const normalizedLabel = label
    .trim()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(a)\s*m\b/i, 'AM')
    .replace(/\b(p)\s*m\b/i, 'PM')
    .toUpperCase()

  const withMeridiemMatch = normalizedLabel.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)$/i)
  if (withMeridiemMatch) {
    const rawHours = Number(withMeridiemMatch[1])
    const minutes = Number(withMeridiemMatch[2])
    const meridiem = withMeridiemMatch[3].toUpperCase()
    if (!Number.isFinite(rawHours) || !Number.isFinite(minutes)) {
      return Number.MAX_SAFE_INTEGER
    }

    const normalizedHours = rawHours % 12
    const hour24 = meridiem === 'PM' ? normalizedHours + 12 : normalizedHours
    return hour24 * 60 + minutes
  }

  const twentyFourHourMatch = normalizedLabel.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!twentyFourHourMatch) {
    return Number.MAX_SAFE_INTEGER
  }

  const hours = Number(twentyFourHourMatch[1])
  const minutes = Number(twentyFourHourMatch[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.MAX_SAFE_INTEGER
  }

  return hours * 60 + minutes
}

function normalizeTaskColorTag(value: string | null): TaskColorKey | undefined {
  if (
    value === 'blue' ||
    value === 'green' ||
    value === 'amber' ||
    value === 'rose' ||
    value === 'pink' ||
    value === 'violet'
  ) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    return taskColorFallback
  }

  return undefined
}

function normalizeTaskIconTag(value: string | null): TaskIconKey | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  return backendToUiTaskIconMap[value] ?? taskIconFallback
}

function normalizeNonNegativeInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.floor(value))
}

function isStaticUntrackedLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === 'untracked time' || normalized === 'tiempo no registrado'
}

