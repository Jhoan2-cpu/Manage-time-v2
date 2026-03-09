import { getCurrentIntlLocaleTag } from '../../i18n'
import type { AppBootstrapDashboardStats, AppBootstrapData, AppBootstrapDailyLogEntry, AppBootstrapTaskItem } from './api'
import type { DashboardStats, LogEntry, LogTone, Task, TaskColorKey, TaskIconKey, TaskState } from './types'
import { formatSecondsCompact, formatSecondsHms, toIsoDateStringInTimeZone } from './utils/time'

type AdaptBootstrapTasksOptions = {
  activeFocusSessionTaskId?: string | null
}

type AdaptBootstrapDailyLogOptions = {
  untrackedLabel: string
  manualAdjustmentLabel: string
  timeZone?: string
}

const taskColorFallback: TaskColorKey = 'blue'
const taskIconFallback: TaskIconKey = 'briefcase'

const backendToUiTaskIconMap: Record<string, TaskIconKey> = {
  briefcase: 'briefcase',
  'graduation-cap': 'learning',
  'screwdriver-wrench': 'tools',
  code: 'code',
  'book-open': 'book',
  pen: 'pen',
  'cart-shopping': 'cart',
  gamepad: 'game',
}

export function adaptBootstrapTasksToUi(
  bootstrap: Pick<AppBootstrapData, 'tasks' | 'active_focus_session'>,
  options: AdaptBootstrapTasksOptions = {},
): Task[] {
  const tasks = Array.isArray((bootstrap as { tasks?: unknown }).tasks)
    ? ((bootstrap as { tasks: AppBootstrapTaskItem[] }).tasks ?? [])
    : []
  const preferredActiveTaskId =
    options.activeFocusSessionTaskId ??
    (bootstrap.active_focus_session?.task_id ?? null) ??
    tasks[0]?.id ??
    null

  return tasks.map((task, index) => {
    const isActive = task.id === preferredActiveTaskId || (preferredActiveTaskId === null && index === 0)
    return adaptTaskItemToUi(task, { state: isActive ? 'active' : 'scheduled' })
  })
}

export function adaptTaskItemToUi(task: AppBootstrapTaskItem, options: { state?: TaskState } = {}): Task {
  return {
    id: task.id,
    title: typeof task.title === 'string' && task.title.trim() ? task.title.trim() : 'Untitled task',
    details: '',
    statusText: '',
    duration: formatSecondsHms(normalizeNonNegativeInt(task.focus_time_total_seconds)),
    state: options.state ?? 'scheduled',
    colorTag: normalizeTaskColorTag(task.color_tag),
    iconTag: normalizeTaskIconTag(task.icon_tag),
    targetDurationMinutes:
      typeof task.target_duration_seconds === 'number' && Number.isFinite(task.target_duration_seconds)
        ? Math.max(0, task.target_duration_seconds) / 60
        : null,
    alarmTime: typeof task.alarm_time_local === 'string' && task.alarm_time_local.trim() ? task.alarm_time_local.trim() : null,
  }
}

export function adaptBootstrapDailyLogToUiEntries(
  bootstrap: Pick<AppBootstrapData, 'daily_log'>,
  options: AdaptBootstrapDailyLogOptions,
): LogEntry[] {
  const dailyLog = (bootstrap as { daily_log?: unknown }).daily_log
  const normalizedEntries = normalizeBootstrapDailyLogEntries(dailyLog)
  const fallbackDate = resolveFallbackDateFromDailyLog(dailyLog)

  return normalizedEntries
    .map((entry) => adaptBootstrapDailyLogEntry(entry, { ...options, fallbackDate }))
    .sort(sortLogEntryByDateTimeLabel)
}

export function adaptBootstrapDashboardStatsToUi(stats: AppBootstrapDashboardStats): DashboardStats {
  const safeStats = (stats ?? {}) as Partial<AppBootstrapDashboardStats>
  return {
    sessions: normalizeNonNegativeInt(safeStats.tracked_sessions_count_today),
    focusTime: formatSecondsCompact(normalizeNonNegativeInt(safeStats.focus_time_total_seconds)),
    totalTracked: formatSecondsCompact(normalizeNonNegativeInt(safeStats.tracked_seconds_today)),
  }
}

function resolveFallbackDateFromDailyLog(dailyLog: unknown) {
  if (!dailyLog || typeof dailyLog !== 'object') {
    return undefined
  }

  const candidate = dailyLog as { date_local?: unknown; date?: unknown }
  if (typeof candidate.date_local === 'string' && candidate.date_local.trim()) {
    return candidate.date_local.trim()
  }

  if (typeof candidate.date === 'string' && candidate.date.trim()) {
    return candidate.date.trim()
  }

  return undefined
}

function normalizeBootstrapDailyLogEntries(dailyLog: unknown): AppBootstrapDailyLogEntry[] {
  if (!dailyLog || typeof dailyLog !== 'object') {
    return []
  }

  const source = dailyLog as {
    entries?: unknown
    focus_time_entries?: unknown
    idle_time_entries?: unknown
  }

  if (Array.isArray(source.entries)) {
    return source.entries
      .map(normalizeExistingBootstrapEntry)
      .filter((entry): entry is AppBootstrapDailyLogEntry => entry !== null)
  }

  const focusEntries = Array.isArray(source.focus_time_entries) ? source.focus_time_entries : []
  const idleEntries = Array.isArray(source.idle_time_entries) ? source.idle_time_entries : []
  if (focusEntries.length === 0 && idleEntries.length === 0) {
    return []
  }

  const normalizedFocus = focusEntries
    .map(normalizeFocusTimeEntryToBootstrapEntry)
    .filter((entry): entry is AppBootstrapDailyLogEntry => entry !== null)
  const normalizedIdle = idleEntries
    .map(normalizeIdleTimeEntryToBootstrapEntry)
    .filter((entry): entry is AppBootstrapDailyLogEntry => entry !== null)

  return [...normalizedFocus, ...normalizedIdle]
}

function normalizeExistingBootstrapEntry(raw: unknown): AppBootstrapDailyLogEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Partial<AppBootstrapDailyLogEntry> & { id?: unknown }
  const id = normalizeId(source.id)
  const startedAtUtc = typeof source.started_at_utc === 'string' ? source.started_at_utc : ''
  if (!id || !startedAtUtc) {
    return null
  }

  return {
    id,
    entry_type: normalizeEntryType(source.entry_type),
    task_id: typeof source.task_id === 'string' && source.task_id.trim() ? source.task_id.trim() : null,
    task_title: typeof source.task_title === 'string' ? source.task_title : null,
    task_color_tag: typeof source.task_color_tag === 'string' ? source.task_color_tag : null,
    task_icon_tag: typeof source.task_icon_tag === 'string' ? source.task_icon_tag : null,
    started_at_utc: startedAtUtc,
    ended_at_utc: typeof source.ended_at_utc === 'string' ? source.ended_at_utc : startedAtUtc,
    duration_seconds: normalizeNonNegativeInt(source.duration_seconds),
    started_at_local_label: typeof source.started_at_local_label === 'string' ? source.started_at_local_label : null,
  }
}

function normalizeFocusTimeEntryToBootstrapEntry(raw: unknown): AppBootstrapDailyLogEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as {
    id?: unknown
    focus_task_id_nullable?: unknown
    task_title_snapshot?: unknown
    task_color_snapshot?: unknown
    task_icon_snapshot?: unknown
    started_at_utc?: unknown
    ended_at_utc?: unknown
    elapsed_seconds?: unknown
  }
  const id = normalizeId(source.id)
  const startedAtUtc = typeof source.started_at_utc === 'string' ? source.started_at_utc : null
  if (!id || !startedAtUtc) {
    return null
  }

  return {
    id,
    entry_type: 'focus',
    task_id: normalizeOptionalId(source.focus_task_id_nullable),
    task_title: typeof source.task_title_snapshot === 'string' ? source.task_title_snapshot : null,
    task_color_tag: typeof source.task_color_snapshot === 'string' ? source.task_color_snapshot : null,
    task_icon_tag: typeof source.task_icon_snapshot === 'string' ? source.task_icon_snapshot : null,
    started_at_utc: startedAtUtc,
    ended_at_utc: typeof source.ended_at_utc === 'string' ? source.ended_at_utc : startedAtUtc,
    duration_seconds: normalizeNonNegativeInt(source.elapsed_seconds),
    started_at_local_label: null,
  }
}

function normalizeIdleTimeEntryToBootstrapEntry(raw: unknown): AppBootstrapDailyLogEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as {
    id?: unknown
    started_at_utc?: unknown
    ended_at_utc?: unknown
    elapsed_seconds?: unknown
  }
  const id = normalizeId(source.id)
  const startedAtUtc = typeof source.started_at_utc === 'string' ? source.started_at_utc : null
  if (!id || !startedAtUtc) {
    return null
  }

  return {
    id,
    entry_type: 'untracked',
    task_id: null,
    task_title: null,
    task_color_tag: null,
    task_icon_tag: null,
    started_at_utc: startedAtUtc,
    ended_at_utc: typeof source.ended_at_utc === 'string' ? source.ended_at_utc : startedAtUtc,
    duration_seconds: normalizeNonNegativeInt(source.elapsed_seconds),
    started_at_local_label: null,
  }
}

function normalizeId(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.trunc(value)}`
  }

  return null
}

function normalizeOptionalId(value: unknown) {
  const normalized = normalizeId(value)
  return normalized ?? null
}

function adaptBootstrapDailyLogEntry(
  entry: AppBootstrapDailyLogEntry,
  options: AdaptBootstrapDailyLogOptions & { fallbackDate?: string },
): LogEntry {
  const hasTaskId = typeof entry.task_id === 'string' && entry.task_id.trim().length > 0
  const entryType = normalizeEntryType(entry.entry_type)
  const tone: LogTone | undefined = entryType === 'untracked' ? 'faded' : entryType === 'manual_adjustment' ? 'warning' : undefined
  const activity =
    hasTaskId
      ? undefined
      : typeof entry.task_title === 'string' && entry.task_title.trim()
        ? entry.task_title.trim()
        : entryType === 'manual_adjustment'
          ? options.manualAdjustmentLabel
          : options.untrackedLabel

  const startedAtMs = Number.isFinite(Date.parse(entry.started_at_utc))
    ? Date.parse(entry.started_at_utc)
    : Number.NEGATIVE_INFINITY
  const endedAtMs = Number.isFinite(Date.parse(entry.ended_at_utc))
    ? Date.parse(entry.ended_at_utc)
    : Number.POSITIVE_INFINITY

  return {
    id: entry.id,
    date: resolveEntryDate(entry.started_at_utc, options.fallbackDate, options.timeZone),
    start: resolveStartLabel(entry, options.timeZone),
    duration: formatSecondsHms(normalizeNonNegativeInt(entry.duration_seconds)),
    taskId: hasTaskId ? entry.task_id!.trim() : undefined,
    activity,
    tone,
    startedAtMs,
    endedAtMs,
  }
}

function resolveStartLabel(entry: AppBootstrapDailyLogEntry, timeZone?: string) {
  if (typeof entry.started_at_local_label === 'string' && entry.started_at_local_label.trim()) {
    return entry.started_at_local_label.trim()
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

function resolveEntryDate(startedAtUtc: string, fallbackDate: string | undefined, timeZone?: string) {
  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return fallbackDate
  }

  const date = new Date(startedAtUtc)
  if (Number.isNaN(date.getTime())) {
    return fallbackDate
  }

  if (timeZone) {
    return toIsoDateStringInTimeZone(date, timeZone)
  }

  return toIsoDateStringInTimeZone(date, 'UTC')
}

function sortLogEntryByDateTimeLabel(a: LogEntry, b: LogEntry) {
  const dateA = a.date ?? ''
  const dateB = b.date ?? ''
  if (dateA !== dateB) {
    // Oldest date first.
    return dateA.localeCompare(dateB)
  }

  // Oldest time first.
  return parseStartLabelToSecondsOfDay(a.start) - parseStartLabelToSecondsOfDay(b.start)
}

function parseStartLabelToSecondsOfDay(label: string) {
  if (typeof label !== 'string') {
    return Number.NEGATIVE_INFINITY
  }

  const normalizedLabel = label
    .trim()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(a)\s*m\b/i, 'AM')
    .replace(/\b(p)\s*m\b/i, 'PM')
    .toUpperCase()

  const withMeridiemMatch = normalizedLabel.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i)
  if (withMeridiemMatch) {
    const rawHours = Number(withMeridiemMatch[1])
    const minutes = Number(withMeridiemMatch[2])
    const seconds = Number(withMeridiemMatch[3] ?? '0')
    const meridiem = withMeridiemMatch[4].toUpperCase()
    if (!Number.isFinite(rawHours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return Number.NEGATIVE_INFINITY
    }

    const normalizedHours = rawHours % 12
    const hour24 = meridiem === 'PM' ? normalizedHours + 12 : normalizedHours
    return hour24 * 3600 + minutes * 60 + seconds
  }

  const twentyFourHourMatch = normalizedLabel.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!twentyFourHourMatch) {
    return Number.NEGATIVE_INFINITY
  }

  const hours = Number(twentyFourHourMatch[1])
  const minutes = Number(twentyFourHourMatch[2])
  const seconds = Number(twentyFourHourMatch[3] ?? '0')
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return Number.NEGATIVE_INFINITY
  }

  return hours * 3600 + minutes * 60 + seconds
}

function normalizeEntryType(value: AppBootstrapDailyLogEntry['entry_type']) {
  return value === 'focus' || value === 'manual_adjustment' ? value : 'untracked'
}

function normalizeTaskColorTag(value: string): TaskColorKey {
  return value === 'blue' || value === 'green' || value === 'amber' || value === 'rose' || value === 'pink' || value === 'violet'
    ? value
    : taskColorFallback
}

function normalizeTaskIconTag(value: string): TaskIconKey {
  const normalized = backendToUiTaskIconMap[value]
  return normalized ?? taskIconFallback
}

function normalizeNonNegativeInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.floor(value))
}
