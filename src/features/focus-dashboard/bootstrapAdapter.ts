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
  const preferredActiveTaskId =
    options.activeFocusSessionTaskId ??
    bootstrap.active_focus_session?.task_id ??
    bootstrap.tasks[0]?.id ??
    null

  return bootstrap.tasks.map((task, index) => {
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
  const fallbackDate = typeof bootstrap.daily_log.date_local === 'string' ? bootstrap.daily_log.date_local : undefined

  return [...bootstrap.daily_log.entries]
    .map((entry) => adaptBootstrapDailyLogEntry(entry, { ...options, fallbackDate }))
    .sort(sortLogEntryByDateTimeLabel)
}

export function adaptBootstrapDashboardStatsToUi(stats: AppBootstrapDashboardStats): DashboardStats {
  return {
    sessions: normalizeNonNegativeInt(stats.tracked_sessions_count_today),
    focusTime: formatSecondsCompact(normalizeNonNegativeInt(stats.focus_time_total_seconds)),
    totalTracked: formatSecondsCompact(normalizeNonNegativeInt(stats.tracked_seconds_today)),
  }
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

  return {
    id: entry.id,
    date: resolveEntryDate(entry.started_at_utc, options.fallbackDate, options.timeZone),
    start: resolveStartLabel(entry, options.timeZone),
    duration: formatSecondsHms(normalizeNonNegativeInt(entry.duration_seconds)),
    taskId: hasTaskId ? entry.task_id!.trim() : undefined,
    activity,
    tone,
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
  const dateA = a.date ?? '9999-99-99'
  const dateB = b.date ?? '9999-99-99'
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB)
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
