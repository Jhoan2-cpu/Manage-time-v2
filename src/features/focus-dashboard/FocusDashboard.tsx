import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBellSlash,
  faBullseye,
  faChevronLeft,
  faChevronRight,
  faClockRotateLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { DailyLogPanel } from './components/DailyLogPanel'
import { FocusHeader } from './components/FocusHeader'
import { ProfileModal } from './components/ProfileModal'
import { SignOutConfirmModal } from './components/SignOutConfirmModal'
import { SettingsModal } from './components/SettingsModal'
import { DeleteTaskConfirmModal } from './components/tasks/DeleteTaskConfirmModal'
import { NewTaskModal, type NewTaskPayload } from './components/tasks/NewTaskModal'
import { SwitchTaskConfirmModal } from './components/tasks/SwitchTaskConfirmModal'
import { TimerPanel } from './components/TimerPanel'
import { TaskCarousel } from './components/tasks/TaskCarousel'
import { useCurrentTime } from './hooks/useCurrentTime'
import { useFocusSessionController } from './hooks/useFocusSessionController'
import { useFocusRealtimeChannel, type FocusRealtimeEvent } from './hooks/useFocusRealtimeChannel'
import { useFocusDashboardShellState } from './hooks/useFocusDashboardShellState'
import { useTaskcardsRealtimeChannel, type TaskcardsRealtimeEvent } from './hooks/useTaskcardsRealtimeChannel'
import { useTaskManagementState } from './hooks/useTaskManagementState'
import {
  createTask as createTaskApi,
  createTimeEntry,
  deleteTask as deleteTaskApi,
  focusSessionCommand,
  getAppBootstrap,
  getFocusDailyLog,
  getActiveFocusSession,
  getFocusSessionConflictFromApiError,
  getOrCreateOriginDeviceId,
  getTaskVersionConflictFromApiError,
  getTasks as getTasksApi,
  startFocusSession,
  updatePreferences,
  updateTask as updateTaskApi,
  type AppBootstrapData,
  type AppBootstrapInclude,
  type ActiveFocusSession,
  type CreateTaskPayload,
  type FocusSessionStateEnvelope,
  type FocusDailyLogData,
  type FocusDailyLogFocusEntry,
  type FocusDailyLogIdleEntry,
  type TaskApiItem,
  type UpdatePreferencesPayload,
  type UserPreferences,
} from './api'
import {
  adaptBootstrapDashboardStatsToUi,
  adaptBootstrapDailyLogToUiEntries,
  adaptBootstrapTasksToUi,
} from './bootstrapAdapter'
import { buildUntrackedCreateTimeEntryPayloadFromSession } from './historyApiAdapter'
import type { FocusTimerMode, LogEntry, Task, TaskColorKey, TaskIconKey } from './types'
import { classNames } from './utils/classNames'
import {
  formatSecondsCompact,
  formatSecondsHms,
  parseDurationLabelToSeconds,
  roundElapsedSecondsBetweenMs,
  toIsoDateStringInTimeZone,
} from './utils/time'
import { useI18n } from '../../i18n'
import { ApiHttpError } from '../../lib/api/http'
import {
  stopTimerEndAlarm,
  triggerTimerEndAlarm,
} from '../../lib/audio/uiSfx'

const workspaceAccentRgbByColor: Record<TaskColorKey, string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  pink: '236,72,153',
  violet: '139,92,246',
}

type FocusDashboardProps = {
  userName?: string
  userEmail?: string
  onSignOut?: () => void
  bootstrapData?: AppBootstrapData
  onPreferencesUpdated?: (preferences: UserPreferences) => void
}

type PendingTaskSwitchConfirm = {
  task: Task
  preferredMode?: FocusTimerMode
} | null

const fallbackDashboardStats = {
  sessions: 0,
  focusTime: '0m 00s',
  totalTracked: '0m 00s',
}

// Current phase runs TaskCards over plain HTTP without runtime sync polling.
const ENABLE_FOCUS_RUNTIME_HTTP_SYNC =
  `${import.meta.env.VITE_ENABLE_FOCUS_RUNTIME_SYNC ?? 'false'}`.toLowerCase() === 'true'
const ENABLE_TASKS_BACKGROUND_POLLING =
  `${import.meta.env.VITE_ENABLE_TASKS_BACKGROUND_POLLING ?? 'false'}`.toLowerCase() === 'true'
const ENABLE_FOCUS_RUNTIME_HEARTBEAT =
  `${import.meta.env.VITE_ENABLE_FOCUS_RUNTIME_HEARTBEAT ?? 'false'}`.toLowerCase() === 'true'
const ENABLE_UNTRACKED_TIME_ENTRIES_PERSIST =
  `${import.meta.env.VITE_ENABLE_TIME_ENTRIES_PERSIST ?? 'false'}`.toLowerCase() === 'true'
const emptyFallbackTasks: Task[] = []
const emptyFallbackLogEntries: LogEntry[] = []

const FOCUS_DERIVED_BOOTSTRAP_REFRESH_INCLUDES: AppBootstrapInclude[] = [
  'daily_log',
  'dashboard_stats',
  'active_focus_session',
]
const TASK_START_COOLDOWN_MS = 3000
const TASKS_REALTIME_DEDUP_CAPACITY = 240
const FOCUS_REALTIME_DEDUP_CAPACITY = 240
const TASK_COLOR_HEX_BY_KEY: Record<TaskColorKey, string> = {
  blue: '#1A73E8',
  green: '#0F9D58',
  amber: '#F9AB00',
  rose: '#E91E63',
  pink: '#D81B60',
  violet: '#7E57C2',
}
const TASK_ICON_API_BY_KEY: Record<TaskIconKey, string> = {
  briefcase: 'briefcase',
  learning: 'graduation-cap',
  tools: 'screwdriver-wrench',
  code: 'code',
  book: 'book-open',
  pen: 'pen',
  cart: 'cart-shopping',
  game: 'gamepad',
}
const TASK_ICON_KEY_BY_API_TAG: Record<string, TaskIconKey> = {
  briefcase: 'briefcase',
  learning: 'learning',
  'graduation-cap': 'learning',
  tools: 'tools',
  'screwdriver-wrench': 'tools',
  code: 'code',
  book: 'book',
  'book-open': 'book',
  pen: 'pen',
  cart: 'cart',
  'cart-shopping': 'cart',
  game: 'game',
  gamepad: 'game',
}

function normalizeAlarmTimeToHm(value: string | null | undefined) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const normalized = value.trim()
  const withSecondsMatch = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (!withSecondsMatch) {
    return null
  }

  return `${withSecondsMatch[1]}:${withSecondsMatch[2]}`
}

function normalizeTaskApiColorToUi(colorTag: string | null | undefined, fallback: TaskColorKey = 'blue'): TaskColorKey {
  if (typeof colorTag !== 'string' || !colorTag.trim()) {
    return fallback
  }

  const normalized = colorTag.trim().toLowerCase()
  if (
    normalized === 'blue' ||
    normalized === 'green' ||
    normalized === 'amber' ||
    normalized === 'rose' ||
    normalized === 'pink' ||
    normalized === 'violet'
  ) {
    return normalized
  }

  const targetRgb = parseHexColorToRgb(normalized)
  if (!targetRgb) {
    return fallback
  }

  let bestMatch: TaskColorKey = fallback
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [colorKey, colorHex] of Object.entries(TASK_COLOR_HEX_BY_KEY) as [TaskColorKey, string][]) {
    const candidateRgb = parseHexColorToRgb(colorHex)
    if (!candidateRgb) {
      continue
    }

    const distance =
      Math.pow(targetRgb.r - candidateRgb.r, 2) +
      Math.pow(targetRgb.g - candidateRgb.g, 2) +
      Math.pow(targetRgb.b - candidateRgb.b, 2)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = colorKey
    }
  }

  return bestMatch
}

function normalizeTaskApiIconToUi(iconTag: string | null | undefined, fallback: TaskIconKey = 'briefcase'): TaskIconKey {
  if (typeof iconTag !== 'string' || !iconTag.trim()) {
    return fallback
  }

  const normalized = iconTag.trim().toLowerCase()
  return TASK_ICON_KEY_BY_API_TAG[normalized] ?? fallback
}

function parseHexColorToRgb(value: string) {
  const normalized = value.trim()
  const match = normalized.match(/^#?([a-f0-9]{6})$/i)
  if (!match) {
    return null
  }

  const raw = match[1]
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  }
}

function isSessionRunningState(state: string | null | undefined) {
  return state === 'running' || state === 'working'
}

function parseIsoTimestampToMsSafe(value: string | null | undefined) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function hasIsoTimestampSubseconds(value: string | null | undefined) {
  return typeof value === 'string' && /\.\d+(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim())
}

function areLifecycleTimestampsEquivalent(
  currentValue: string | null | undefined,
  incomingValue: string | null | undefined,
) {
  const left = currentValue ?? null
  const right = incomingValue ?? null
  if (left === right) {
    return true
  }

  const leftMs = parseIsoTimestampToMsSafe(left)
  const rightMs = parseIsoTimestampToMsSafe(right)
  if (leftMs === null || rightMs === null) {
    return false
  }

  // Backend can normalize to second precision; treat same-second instants as the same lifecycle edge.
  return Math.floor(leftMs / 1000) === Math.floor(rightMs / 1000)
}

function hasMeaningfulFocusSessionTransition(
  current: ActiveFocusSession | null | undefined,
  incoming: ActiveFocusSession | null | undefined,
) {
  const currentSession = current ?? null
  const incomingSession = incoming ?? null
  if (!currentSession && !incomingSession) {
    return false
  }

  if (!currentSession || !incomingSession) {
    return true
  }

  return (
    currentSession.id !== incomingSession.id ||
    currentSession.task_id !== incomingSession.task_id ||
    currentSession.timer_mode !== incomingSession.timer_mode ||
    currentSession.session_state !== incomingSession.session_state ||
    (currentSession.target_seconds ?? null) !== (incomingSession.target_seconds ?? null) ||
    (currentSession.last_resumed_at_utc ?? null) !== (incomingSession.last_resumed_at_utc ?? null) ||
    (currentSession.last_paused_at_utc ?? null) !== (incomingSession.last_paused_at_utc ?? null)
  )
}

function normalizeIncomingRunningFocusSession(
  current: ActiveFocusSession | null | undefined,
  incoming: ActiveFocusSession | null | undefined,
) {
  const currentSession = current ?? null
  const incomingSession = incoming ?? null
  if (!currentSession || !incomingSession) {
    return incomingSession
  }

  if (!isSessionRunningState(currentSession.session_state) || !isSessionRunningState(incomingSession.session_state)) {
    return incomingSession
  }

  const sameLifecycle =
    currentSession.id === incomingSession.id &&
    currentSession.task_id === incomingSession.task_id &&
    currentSession.timer_mode === incomingSession.timer_mode &&
    areLifecycleTimestampsEquivalent(currentSession.last_resumed_at_utc ?? null, incomingSession.last_resumed_at_utc ?? null) &&
    areLifecycleTimestampsEquivalent(currentSession.last_paused_at_utc ?? null, incomingSession.last_paused_at_utc ?? null)
  if (!sameLifecycle) {
    return incomingSession
  }

  const shouldKeepCurrentResumedAt =
    hasIsoTimestampSubseconds(currentSession.last_resumed_at_utc ?? null) &&
    areLifecycleTimestampsEquivalent(currentSession.last_resumed_at_utc ?? null, incomingSession.last_resumed_at_utc ?? null)
  const shouldKeepCurrentPausedAt =
    hasIsoTimestampSubseconds(currentSession.last_paused_at_utc ?? null) &&
    areLifecycleTimestampsEquivalent(currentSession.last_paused_at_utc ?? null, incomingSession.last_paused_at_utc ?? null)

  return {
    ...incomingSession,
    last_resumed_at_utc: shouldKeepCurrentResumedAt
      ? (currentSession.last_resumed_at_utc ?? incomingSession.last_resumed_at_utc)
      : incomingSession.last_resumed_at_utc,
    last_paused_at_utc: shouldKeepCurrentPausedAt
      ? (currentSession.last_paused_at_utc ?? incomingSession.last_paused_at_utc)
      : incomingSession.last_paused_at_utc,
    elapsed_seconds_total: currentSession.elapsed_seconds_total,
  } satisfies ActiveFocusSession
}

function normalizeTaskRuntimeState(state: unknown): 'idle' | 'working' | 'paused' | null {
  if (state === 'idle' || state === 'working' || state === 'paused') {
    return state
  }

  return null
}

function resolveElapsedFromRuntimeTaskSnapshot(serverTask: TaskApiItem, mode: FocusTimerMode) {
  const runtimeState = normalizeTaskRuntimeState(serverTask.state)
  const isWorking = runtimeState === 'working'

  const parseUtcToMs = (value: string | null | undefined) => {
    if (typeof value !== 'string' || !value.trim()) {
      return null
    }

    const parsed = Date.parse(value)
    if (!Number.isFinite(parsed)) {
      return null
    }

    return parsed
  }

  if (mode === 'timer') {
    const initial =
      typeof serverTask.timer_initial_seconds === 'number' && Number.isFinite(serverTask.timer_initial_seconds)
        ? Math.max(0, Math.floor(serverTask.timer_initial_seconds))
        : null
    const remaining =
      typeof serverTask.timer_remaining_seconds === 'number' && Number.isFinite(serverTask.timer_remaining_seconds)
        ? Math.max(0, Math.floor(serverTask.timer_remaining_seconds))
        : null

    if (initial !== null && remaining !== null) {
      const snapshotElapsed = Math.max(0, initial - remaining)
      if (!isWorking) {
        return snapshotElapsed
      }

      const startedAtMs = parseUtcToMs(serverTask.timer_started_at_utc ?? null)
      if (startedAtMs === null) {
        return snapshotElapsed
      }

      const elapsedSinceLoad = roundElapsedSecondsBetweenMs(startedAtMs, Date.now())
      return Math.min(initial, snapshotElapsed + elapsedSinceLoad)
    }

    return 0
  }

  const snapshotElapsed =
    typeof serverTask.stopwatch_elapsed_seconds === 'number' && Number.isFinite(serverTask.stopwatch_elapsed_seconds)
      ? Math.max(0, Math.floor(serverTask.stopwatch_elapsed_seconds))
      : 0

  if (!isWorking) {
    return snapshotElapsed
  }

  const startedAtMs = parseUtcToMs(serverTask.stopwatch_started_at_utc ?? null)
  if (startedAtMs === null) {
    return snapshotElapsed
  }

  const elapsedSinceLoad = roundElapsedSecondsBetweenMs(startedAtMs, Date.now())
  return snapshotElapsed + elapsedSinceLoad
}

function resolveElapsedBaseFromRuntimeTaskSnapshot(serverTask: TaskApiItem, mode: FocusTimerMode) {
  if (mode === 'timer') {
    const initial =
      typeof serverTask.timer_initial_seconds === 'number' && Number.isFinite(serverTask.timer_initial_seconds)
        ? Math.max(0, Math.floor(serverTask.timer_initial_seconds))
        : typeof serverTask.target_duration_seconds === 'number' && Number.isFinite(serverTask.target_duration_seconds)
          ? Math.max(0, Math.floor(serverTask.target_duration_seconds))
          : 0
    const remaining =
      typeof serverTask.timer_remaining_seconds === 'number' && Number.isFinite(serverTask.timer_remaining_seconds)
        ? Math.max(0, Math.floor(serverTask.timer_remaining_seconds))
        : initial
    return Math.max(0, initial - remaining)
  }

  return typeof serverTask.stopwatch_elapsed_seconds === 'number' && Number.isFinite(serverTask.stopwatch_elapsed_seconds)
    ? Math.max(0, Math.floor(serverTask.stopwatch_elapsed_seconds))
    : 0
}

function buildDerivedFocusSessionFromTask(serverTask: TaskApiItem): ActiveFocusSession | null {
  const runtimeState = normalizeTaskRuntimeState(serverTask.state)
  if (!runtimeState || runtimeState === 'idle') {
    return null
  }

  const timerMode: FocusTimerMode = serverTask.active_mode === 'timer' ? 'timer' : 'stopwatch'
  const elapsedBase = resolveElapsedBaseFromRuntimeTaskSnapshot(serverTask, timerMode)

  const startedAtUtc =
    timerMode === 'timer'
      ? (typeof serverTask.timer_started_at_utc === 'string' && serverTask.timer_started_at_utc.trim()
        ? serverTask.timer_started_at_utc
        : (typeof serverTask.updated_at === 'string' && serverTask.updated_at.trim() ? serverTask.updated_at : new Date().toISOString()))
      : (typeof serverTask.stopwatch_started_at_utc === 'string' && serverTask.stopwatch_started_at_utc.trim()
        ? serverTask.stopwatch_started_at_utc
        : (typeof serverTask.updated_at === 'string' && serverTask.updated_at.trim() ? serverTask.updated_at : new Date().toISOString()))

  const targetSeconds =
    timerMode === 'timer'
      ? (typeof serverTask.timer_initial_seconds === 'number' && Number.isFinite(serverTask.timer_initial_seconds)
        ? Math.max(0, Math.floor(serverTask.timer_initial_seconds))
        : typeof serverTask.target_duration_seconds === 'number' && Number.isFinite(serverTask.target_duration_seconds)
          ? Math.max(0, Math.floor(serverTask.target_duration_seconds))
          : null)
      : null

  const version =
    typeof serverTask.version === 'number' && Number.isFinite(serverTask.version)
      ? Math.max(1, Math.floor(serverTask.version))
      : 1

  return {
    id: `task-runtime:${serverTask.id}`,
    task_id: serverTask.id,
    timer_mode: timerMode,
    session_state: runtimeState,
    target_seconds: targetSeconds,
    started_at_utc: startedAtUtc,
    last_resumed_at_utc: runtimeState === 'working' ? startedAtUtc : null,
    last_paused_at_utc:
      runtimeState === 'paused'
        ? (timerMode === 'timer'
          ? (typeof serverTask.timer_ended_at_utc === 'string' ? serverTask.timer_ended_at_utc : null)
          : (typeof serverTask.stopwatch_ended_at_utc === 'string' ? serverTask.stopwatch_ended_at_utc : null))
        : null,
    elapsed_seconds_total: elapsedBase,
    version,
  } satisfies ActiveFocusSession
}

function pickRuntimeTaskSnapshot(serverTasks: TaskApiItem[]) {
  const workingTask = serverTasks.find((task) => normalizeTaskRuntimeState(task.state) === 'working')
  if (workingTask) {
    return workingTask
  }

  return null
}

function adaptTaskApiItemToUi(
  serverTask: TaskApiItem,
  options: {
    state?: Task['state']
    existingTask?: Task
    localTargetDurationMinutes?: number | null
  } = {},
): Task {
  const existingTask = options.existingTask
  const normalizedTimerInitialSecondsRaw =
    typeof serverTask.timer_initial_seconds === 'number' && Number.isFinite(serverTask.timer_initial_seconds)
      ? serverTask.timer_initial_seconds
      : typeof serverTask.target_duration_seconds === 'number' && Number.isFinite(serverTask.target_duration_seconds)
        ? serverTask.target_duration_seconds
        : null
  const normalizedTimerInitialSeconds =
    normalizedTimerInitialSecondsRaw !== null
      ? Math.max(0, Math.floor(normalizedTimerInitialSecondsRaw))
      : null
  const normalizedTotalTrackedSeconds =
    typeof serverTask.total_tracked_seconds === 'number' && Number.isFinite(serverTask.total_tracked_seconds)
      ? Math.max(0, Math.floor(serverTask.total_tracked_seconds))
      : null
  const existingTrackedSeconds = existingTask ? parseDurationLabelToSeconds(existingTask.duration) : 0
  const resolvedTrackedSeconds =
    normalizedTotalTrackedSeconds !== null
      ? Math.max(normalizedTotalTrackedSeconds, existingTrackedSeconds)
      : existingTrackedSeconds

  return {
    id: serverTask.id,
    userId: serverTask.user_id,
    title:
      typeof serverTask.name === 'string' && serverTask.name.trim()
        ? serverTask.name.trim()
        : existingTask?.title ?? 'Untitled task',
    details: existingTask?.details ?? '',
    statusText: existingTask?.statusText ?? '',
    duration: formatSecondsHms(resolvedTrackedSeconds),
    state: options.state ?? existingTask?.state ?? 'scheduled',
    colorTag: normalizeTaskApiColorToUi(serverTask.color_tag, existingTask?.colorTag ?? 'blue'),
    iconTag: normalizeTaskApiIconToUi(serverTask.icon_tag, existingTask?.iconTag ?? 'briefcase'),
    targetDurationMinutes:
      options.localTargetDurationMinutes !== undefined
        ? options.localTargetDurationMinutes
        : normalizedTimerInitialSeconds !== null
          ? normalizedTimerInitialSeconds / 60
          : (existingTask?.targetDurationMinutes ?? null),
    alarmTime: normalizeAlarmTimeToHm(serverTask.alarm_time_local),
    version:
      typeof serverTask.version === 'number' && Number.isFinite(serverTask.version)
        ? Math.max(1, Math.floor(serverTask.version))
        : existingTask?.version,
    createdAtUtc:
      typeof serverTask.created_at === 'string' && serverTask.created_at.trim()
        ? serverTask.created_at
        : existingTask?.createdAtUtc,
    updatedAtUtc:
      typeof serverTask.updated_at === 'string' && serverTask.updated_at.trim()
        ? serverTask.updated_at
        : existingTask?.updatedAtUtc,
  }
}

function parseIsoTimestampToMs(value: string | null | undefined) {
  if (typeof value !== 'string' || !value.trim()) {
    return Number.NEGATIVE_INFINITY
  }

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return Number.NEGATIVE_INFINITY
  }

  return parsed
}

function getTaskApiRecencyMs(task: TaskApiItem) {
  return Math.max(
    parseIsoTimestampToMs(task.updated_at ?? null),
    parseIsoTimestampToMs(task.created_at ?? null),
  )
}

function sortTaskApiItemsByRecencyDesc(tasks: TaskApiItem[]) {
  return [...tasks].sort((left, right) => {
    const recencyDiff = getTaskApiRecencyMs(right) - getTaskApiRecencyMs(left)
    if (recencyDiff !== 0) {
      return recencyDiff
    }

    return right.id.localeCompare(left.id)
  })
}

function adaptFocusDailyLogToUiEntries(
  dailyLog: FocusDailyLogData,
  options: { timeZone: string; untrackedLabel: string },
) {
  const focusEntries = dailyLog.focus_time_entries.map((entry) => {
    const startedAt = new Date(entry.started_at_utc)
    const safeDate = Number.isFinite(startedAt.getTime()) ? startedAt : new Date()
    const startedAtMs = Number.isFinite(startedAt.getTime()) ? startedAt.getTime() : Number.NEGATIVE_INFINITY
    const endedAtMs =
      typeof entry.ended_at_utc === 'string' && entry.ended_at_utc.trim()
        ? (() => {
          const parsed = Date.parse(entry.ended_at_utc)
          return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
        })()
        : Number.POSITIVE_INFINITY
    const elapsedSeconds =
      typeof entry.elapsed_seconds === 'number' && Number.isFinite(entry.elapsed_seconds)
        ? Math.max(0, Math.floor(entry.elapsed_seconds))
        : 0
    const normalizedTaskId =
      typeof entry.focus_task_id_nullable === 'string' && entry.focus_task_id_nullable.trim()
        ? entry.focus_task_id_nullable.trim()
        : undefined

    return {
      startedAtMs,
      endedAtMs,
      entry: {
        id: `focus-${entry.id}`,
        date: formatLocalDateKey(safeDate, options.timeZone),
        start: formatLogStartTime(safeDate, options.timeZone),
        duration: formatLogDurationFromSeconds(elapsedSeconds),
        taskId: normalizedTaskId,
        activity: normalizedTaskId ? undefined : options.untrackedLabel,
        tone: normalizedTaskId ? undefined : 'default',
        startedAtMs,
        endedAtMs,
      } satisfies LogEntry,
    }
  })

  const idleEntries = dailyLog.idle_time_entries.map((entry) => {
    const startedAt = new Date(entry.started_at_utc)
    const safeDate = Number.isFinite(startedAt.getTime()) ? startedAt : new Date()
    const startedAtMs = Number.isFinite(startedAt.getTime()) ? startedAt.getTime() : Number.NEGATIVE_INFINITY
    const endedAtMs =
      typeof entry.ended_at_utc === 'string' && entry.ended_at_utc.trim()
        ? (() => {
          const parsed = Date.parse(entry.ended_at_utc)
          return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
        })()
        : Number.POSITIVE_INFINITY
    const elapsedSeconds =
      typeof entry.elapsed_seconds === 'number' && Number.isFinite(entry.elapsed_seconds)
        ? Math.max(0, Math.floor(entry.elapsed_seconds))
        : 0

    return {
      startedAtMs,
      endedAtMs,
      entry: {
        id: `idle-${entry.id}`,
        date: formatLocalDateKey(safeDate, options.timeZone),
        start: formatLogStartTime(safeDate, options.timeZone),
        duration: formatLogDurationFromSeconds(elapsedSeconds),
        activity: options.untrackedLabel,
        tone: 'faded',
        startedAtMs,
        endedAtMs,
      } satisfies LogEntry,
    }
  })

  return [...focusEntries, ...idleEntries]
    .sort((left, right) => {
      if (left.startedAtMs !== right.startedAtMs) {
        return left.startedAtMs - right.startedAtMs
      }
      if (left.endedAtMs !== right.endedAtMs) {
        return left.endedAtMs - right.endedAtMs
      }
      return left.entry.id.localeCompare(right.entry.id)
    })
    .map((item) => item.entry)
}

function normalizeRuntimeDateLocal(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
}

function normalizeRuntimeIdentifier(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.trunc(value)}`
  }
  return null
}

function normalizeRuntimeModeSnapshot(value: unknown) {
  return value === 'timer' || value === 'stopwatch' ? value : null
}

function normalizeRuntimeUtcTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  return value.trim()
}

function normalizeRuntimeElapsedSeconds(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return Math.max(0, Math.floor(value))
}

function normalizeFocusTimeEntryFromDailyLogTodayEntry(entry: unknown): FocusDailyLogFocusEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }
  const source = entry as {
    time_entry_id?: unknown
    task_id?: unknown
    activity_title?: unknown
    activity_icon?: unknown
    activity_color?: unknown
    mode?: unknown
    started_at_utc?: unknown
    ended_at_utc?: unknown
    duration_seconds?: unknown
  }

  const id = normalizeRuntimeIdentifier(source.time_entry_id)
  const startedAtUtc = normalizeRuntimeUtcTimestamp(source.started_at_utc)
  if (!id || !startedAtUtc) {
    return null
  }

  return {
    id,
    focus_task_id_nullable: normalizeRuntimeIdentifier(source.task_id),
    task_title_snapshot: typeof source.activity_title === 'string' ? source.activity_title : null,
    task_icon_snapshot: typeof source.activity_icon === 'string' ? source.activity_icon : null,
    task_color_snapshot: typeof source.activity_color === 'string' ? source.activity_color : null,
    mode_snapshot: normalizeRuntimeModeSnapshot(source.mode),
    started_at_utc: startedAtUtc,
    ended_at_utc: normalizeRuntimeUtcTimestamp(source.ended_at_utc),
    elapsed_seconds: normalizeRuntimeElapsedSeconds(source.duration_seconds),
  }
}

function normalizeFocusTimeEntryFromRuntimeDailyLog(entry: unknown): FocusDailyLogFocusEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }
  const source = entry as {
    id?: unknown
    focus_task_id_nullable?: unknown
    task_title_snapshot?: unknown
    task_icon_snapshot?: unknown
    task_color_snapshot?: unknown
    mode_snapshot?: unknown
    started_at_utc?: unknown
    ended_at_utc?: unknown
    elapsed_seconds?: unknown
    stop_reason?: unknown
  }

  const id = normalizeRuntimeIdentifier(source.id)
  const startedAtUtc = normalizeRuntimeUtcTimestamp(source.started_at_utc)
  if (!id || !startedAtUtc) {
    return null
  }

  return {
    id,
    focus_task_id_nullable: normalizeRuntimeIdentifier(source.focus_task_id_nullable),
    task_title_snapshot: typeof source.task_title_snapshot === 'string' ? source.task_title_snapshot : null,
    task_icon_snapshot: typeof source.task_icon_snapshot === 'string' ? source.task_icon_snapshot : null,
    task_color_snapshot: typeof source.task_color_snapshot === 'string' ? source.task_color_snapshot : null,
    mode_snapshot: normalizeRuntimeModeSnapshot(source.mode_snapshot),
    started_at_utc: startedAtUtc,
    ended_at_utc: normalizeRuntimeUtcTimestamp(source.ended_at_utc),
    elapsed_seconds: normalizeRuntimeElapsedSeconds(source.elapsed_seconds),
    stop_reason: typeof source.stop_reason === 'string' ? source.stop_reason : null,
  }
}

function normalizeIdleTimeEntryFromRuntimeDailyLog(entry: unknown): FocusDailyLogIdleEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }
  const source = entry as {
    id?: unknown
    started_at_utc?: unknown
    ended_at_utc?: unknown
    elapsed_seconds?: unknown
    reason?: unknown
  }
  const id = normalizeRuntimeIdentifier(source.id)
  const startedAtUtc = normalizeRuntimeUtcTimestamp(source.started_at_utc)
  if (!id || !startedAtUtc) {
    return null
  }

  return {
    id,
    started_at_utc: startedAtUtc,
    ended_at_utc: normalizeRuntimeUtcTimestamp(source.ended_at_utc),
    elapsed_seconds: normalizeRuntimeElapsedSeconds(source.elapsed_seconds),
    reason: typeof source.reason === 'string' ? source.reason : null,
  }
}

type RuntimeDailyLogTodayNormalized = {
  dailyLog: FocusDailyLogData
  trackedSeconds: number | null
}

function normalizeRuntimeDailyLogTodayPayload(payload: unknown): RuntimeDailyLogTodayNormalized | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const source = payload as {
    date_local?: unknown
    date?: unknown
    time_zone_name?: unknown
    entries?: unknown
    focus_time_entries?: unknown
    idle_time_entries?: unknown
    tracked_seconds?: unknown
  }

  const timeZoneName =
    typeof source.time_zone_name === 'string' && source.time_zone_name.trim()
      ? source.time_zone_name.trim()
      : 'UTC'
  const dateLocal =
    normalizeRuntimeDateLocal(source.date_local) ??
    normalizeRuntimeDateLocal(source.date) ??
    toIsoDateStringInTimeZone(new Date(), timeZoneName)

  if (Array.isArray(source.entries)) {
    const focusEntries = source.entries
      .map((entry) => normalizeFocusTimeEntryFromDailyLogTodayEntry(entry))
      .filter((entry): entry is FocusDailyLogFocusEntry => entry !== null)

    return {
      dailyLog: {
        date: dateLocal,
        time_zone_name: timeZoneName,
        focus_time_entries: focusEntries,
        idle_time_entries: [],
      },
      trackedSeconds: normalizeRuntimeElapsedSeconds(source.tracked_seconds),
    }
  }

  if (Array.isArray(source.focus_time_entries)) {
    const focusEntries = source.focus_time_entries
      .map((entry) => normalizeFocusTimeEntryFromRuntimeDailyLog(entry))
      .filter((entry): entry is FocusDailyLogFocusEntry => entry !== null)
    const idleEntries = Array.isArray(source.idle_time_entries)
      ? source.idle_time_entries
        .map((entry) => normalizeIdleTimeEntryFromRuntimeDailyLog(entry))
        .filter((entry): entry is FocusDailyLogIdleEntry => entry !== null)
      : []

    return {
      dailyLog: {
        date: dateLocal,
        time_zone_name: timeZoneName,
        focus_time_entries: focusEntries,
        idle_time_entries: idleEntries,
      },
      trackedSeconds: normalizeRuntimeElapsedSeconds(source.tracked_seconds),
    }
  }

  return null
}

export function FocusDashboard({
  userName,
  userEmail,
  onSignOut,
  bootstrapData,
  onPreferencesUpdated,
}: FocusDashboardProps = {}) {
  const { locale, setLocale } = useI18n()
  const copy =
    locale === 'es'
      ? {
        exitFocusOnlyMode: 'Salir del modo solo enfoque',
        exitFocusOnlyShort: 'Salir de Solo enfoque',
        silenceTimerAlarm: 'Silenciar alarma del temporizador',
        silenceAlarmShort: 'Silenciar alarma',
        closeDailyLogOverlay: 'Cerrar overlay del registro diario',
        closeDailyLog: 'Cerrar registro diario',
        openDailyLog: 'Abrir registro diario',
        untrackedTime: 'Tiempo no registrado',
        manualAdjustment: 'Ajuste manual',
        scheduledPrefix: 'Programado',
      }
      : {
        exitFocusOnlyMode: 'Exit Focus Only mode',
        exitFocusOnlyShort: 'Exit Focus Only',
        silenceTimerAlarm: 'Silence timer alarm',
        silenceAlarmShort: 'Silence Alarm',
        closeDailyLogOverlay: 'Close Daily Log overlay',
        closeDailyLog: 'Close Daily Log',
        openDailyLog: 'Open Daily Log',
        untrackedTime: 'Untracked Time',
        manualAdjustment: 'Manual adjustment',
        scheduledPrefix: 'Scheduled',
      }
  const bootstrapInitialTasks = useMemo(
    () =>
      bootstrapData
        ? adaptBootstrapTasksToUi(bootstrapData, {
          activeFocusSessionTaskId: bootstrapData.active_focus_session?.task_id ?? null,
        })
        : emptyFallbackTasks,
    [bootstrapData],
  )
  const bootstrapInitialDailyLogEntries = useMemo(
    () =>
      bootstrapData
        ? adaptBootstrapDailyLogToUiEntries(bootstrapData, {
          manualAdjustmentLabel: copy.manualAdjustment,
          timeZone: bootstrapData.preferences?.time_zone_name,
          untrackedLabel: copy.untrackedTime,
        })
        : emptyFallbackLogEntries,
    [bootstrapData, copy.manualAdjustment, copy.untrackedTime],
  )
  const bootstrapDashboardStats = useMemo(
    () => (bootstrapData ? adaptBootstrapDashboardStatsToUi(bootstrapData.dashboard_stats) : fallbackDashboardStats),
    [bootstrapData],
  )
  const [dailyLogEntries, setDailyLogEntries] = useState<LogEntry[]>(bootstrapInitialDailyLogEntries)
  const [dashboardStatsState, setDashboardStatsState] = useState(bootstrapDashboardStats)
  const [settingsHistoryReloadKey, setSettingsHistoryReloadKey] = useState(0)
  const [isTasksLoading, setIsTasksLoading] = useState(false)
  const [isDeleteTaskSubmitting, setIsDeleteTaskSubmitting] = useState(false)
  const [taskPendingSwitchConfirm, setTaskPendingSwitchConfirm] = useState<PendingTaskSwitchConfirm>(null)
  const {
    isProfileModalOpen,
    isSettingsModalOpen,
    isSignOutConfirmOpen,
    isBackgroundMusicPlaying,
    isTimerAlarmPlaying,
    uiInteractionSfxEnabled,
    uiInteractionSfxVolume,
    backgroundMusicVolume,
    timerAlarmVolume,
    requireTaskSwitchConfirmation,
    setRequireTaskSwitchConfirmation,
    effectiveTimeZone,
    isDailyLogOpen,
    isFocusOnlyMode,
    dailyLogTogglePulseKey,
    handleOpenSettings,
    handleCloseSettings,
    handleToggleBackgroundMusic,
    handleToggleUiInteractionSfx,
    handleUiInteractionSfxVolumeChange,
    handleBackgroundMusicVolumeChange,
    handleTimerAlarmVolumeChange,
    handleOpenProfile,
    handleCloseProfile,
    handleRequestSignOut,
    handleCloseSignOutConfirm,
    handleConfirmSignOut,
    handleToggleDailyLog,
    handleEnterFocusOnlyMode,
    handleExitFocusOnlyMode,
  } = useFocusDashboardShellState({
    initialPreferences: bootstrapData?.preferences ?? null,
    onSignOut,
  })
  const [workspaceGlowPulseKey, setWorkspaceGlowPulseKey] = useState(0)
  const [taskCooldownEndsAtByTaskId, setTaskCooldownEndsAtByTaskId] = useState<Record<string, number>>({})
  const latestPreferencesRef = useRef<UserPreferences | null>(bootstrapData?.preferences ?? null)
  const pendingPreferencesPatchRef = useRef<UpdatePreferencesPayload>({})
  const preferencesPatchTimerRef = useRef<number | null>(null)
  const isPreferencesPatchInFlightRef = useRef(false)
  const isMountedRef = useRef(true)
  const isFocusCommandInFlightRef = useRef(false)
  const isFocusSessionSyncInFlightRef = useRef(false)
  const tasksRefreshInFlightCountRef = useRef(0)
  const tasksRefreshRequestInFlightRef = useRef<Promise<void> | null>(null)
  const latestServerTasksByIdRef = useRef<Record<string, TaskApiItem>>({})
  const taskcardsRealtimeResyncTimerRef = useRef<number | null>(null)
  const timerCompleteStopRequestKeyRef = useRef<string | null>(null)
  const lastHandledCreatedTimeEntryIdRef = useRef<string | null>(null)
  const bootstrapDerivedRefreshRequestInFlightRef = useRef<Promise<boolean> | null>(null)
  const lastDailyLogOrderedSignatureRef = useRef<string | null>(null)
  const shouldAwaitBackendUntrackedCloseRef = useRef(false)
  const shouldSyncDailyLogAfterIdleCloseRef = useRef(false)
  const processedTaskRealtimeEventIdsRef = useRef<string[]>([])
  const processedFocusRealtimeEventIdsRef = useRef<string[]>([])
  const focusActiveEndpointMissingRef = useRef(false)
  const hasLoggedMissingFocusActiveEndpointRef = useRef(false)
  const timeEntriesEndpointMissingRef = useRef(false)
  const hasLoggedMissingTimeEntriesEndpointRef = useRef(false)
  const localOriginDeviceId = useMemo(() => getOrCreateOriginDeviceId(), [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (preferencesPatchTimerRef.current !== null) {
        window.clearTimeout(preferencesPatchTimerRef.current)
      }
      if (taskcardsRealtimeResyncTimerRef.current !== null) {
        window.clearTimeout(taskcardsRealtimeResyncTimerRef.current)
        taskcardsRealtimeResyncTimerRef.current = null
      }
      tasksRefreshInFlightCountRef.current = 0
      tasksRefreshRequestInFlightRef.current = null
    }
  }, [])

  const scheduleTaskcardsRealtimeResync = () => {
    if (taskcardsRealtimeResyncTimerRef.current !== null) {
      return
    }

    taskcardsRealtimeResyncTimerRef.current = window.setTimeout(() => {
      taskcardsRealtimeResyncTimerRef.current = null
      void refreshTasksFromServer()
    }, 120)
  }

  const applyOrderedDailyLogEntriesFromBackend = (
    source:
      | 'bootstrap_initial'
      | 'runtime_daily_log_today'
      | 'get_focus_daily_log'
      | 'bootstrap_fallback',
    entries: LogEntry[],
  ) => {
    const orderedEntries = sortLogEntriesByTime(entries)
    setDailyLogEntries(orderedEntries)

    const preview = orderedEntries.map((entry, index) => ({
      position: index + 1,
      id: entry.id,
      date: entry.date,
      start: entry.start,
      duration: entry.duration,
      taskId: entry.taskId ?? null,
      activity: entry.activity ?? null,
      tone: entry.tone ?? null,
    }))
    const signature = JSON.stringify(preview)
    if (lastDailyLogOrderedSignatureRef.current === signature) {
      return
    }
    lastDailyLogOrderedSignatureRef.current = signature

    console.log('[daily-log:ordered] backend -> ui', {
      source,
      count: orderedEntries.length,
      entries: preview,
    })
  }

  useEffect(() => {
    latestPreferencesRef.current = bootstrapData?.preferences ?? null
  }, [bootstrapData?.preferences])

  useEffect(() => {
    applyOrderedDailyLogEntriesFromBackend('bootstrap_initial', bootstrapInitialDailyLogEntries)
  }, [bootstrapInitialDailyLogEntries])

  useEffect(() => {
    setDashboardStatsState(bootstrapDashboardStats)
  }, [bootstrapDashboardStats])
  const {
    taskList,
    setTaskList,
    isNewTaskModalOpen,
    editingTask,
    taskPendingDelete,
    handleAddTask,
    handleCloseNewTaskModal,
    handleEditTask,
    handleRequestDeleteTask,
    handleRequestDeleteFromTaskModal,
    handleCloseDeleteTaskModal,
    cleanupTaskUiStateAfterDelete,
  } = useTaskManagementState({
    initialTasks: bootstrapInitialTasks,
    scheduledPrefixLabel: copy.scheduledPrefix,
  })

  const flushQueuedPreferencesPatch = async () => {
    if (isPreferencesPatchInFlightRef.current) {
      return
    }

    const queuedPatch = pendingPreferencesPatchRef.current
    if (!queuedPatch || Object.keys(queuedPatch).length === 0) {
      return
    }

    pendingPreferencesPatchRef.current = {}
    isPreferencesPatchInFlightRef.current = true

    try {
      const updated = await updatePreferences(queuedPatch)
      if (!updated) {
        onSignOut?.()
        return
      }

      latestPreferencesRef.current = updated
      onPreferencesUpdated?.(updated)
      setLocale(updated.locale === 'en' ? 'en' : 'es')
    } catch (error) {
      console.error('Failed to persist preferences patch', queuedPatch, error)
    } finally {
      isPreferencesPatchInFlightRef.current = false

      if (!isMountedRef.current) {
        return
      }

      if (Object.keys(pendingPreferencesPatchRef.current).length > 0) {
        if (preferencesPatchTimerRef.current !== null) {
          window.clearTimeout(preferencesPatchTimerRef.current)
        }

        preferencesPatchTimerRef.current = window.setTimeout(() => {
          void flushQueuedPreferencesPatch()
        }, 50)
      }
    }
  }

  const queuePreferencesPatch = (partial: UpdatePreferencesPayload, debounceMs = 220) => {
    const entries = Object.entries(partial).filter(([, value]) => value !== undefined)
    if (entries.length === 0) {
      return
    }

    pendingPreferencesPatchRef.current = {
      ...pendingPreferencesPatchRef.current,
      ...Object.fromEntries(entries),
    }

    if (preferencesPatchTimerRef.current !== null) {
      window.clearTimeout(preferencesPatchTimerRef.current)
    }

    preferencesPatchTimerRef.current = window.setTimeout(() => {
      void flushQueuedPreferencesPatch()
    }, debounceMs)
  }

  const startTaskCooldown = (taskId: string | null | undefined) => {
    if (!taskId) {
      return
    }

    setTaskCooldownEndsAtByTaskId((current) => ({
      ...current,
      [taskId]: Date.now() + TASK_START_COOLDOWN_MS,
    }))
  }

  const clearTaskCooldown = (taskId: string | null | undefined) => {
    if (!taskId) {
      return
    }

    setTaskCooldownEndsAtByTaskId((current) => {
      if (!(taskId in current)) {
        return current
      }

      const next = { ...current }
      delete next[taskId]
      return next
    })
  }

  const isTaskCooldownActive = (taskId: string | null | undefined) => {
    if (!taskId) {
      return false
    }

    const cooldownEndsAt = taskCooldownEndsAtByTaskId[taskId]
    return typeof cooldownEndsAt === 'number' && cooldownEndsAt > Date.now()
  }

  useEffect(() => {
    if (Object.keys(taskCooldownEndsAtByTaskId).length === 0) {
      return
    }

    const pruneIntervalId = window.setInterval(() => {
      setTaskCooldownEndsAtByTaskId((current) => {
        const nowMs = Date.now()
        const nextEntries = Object.entries(current).filter(([, endsAt]) => endsAt > nowMs)
        if (nextEntries.length === Object.keys(current).length) {
          return current
        }

        return Object.fromEntries(nextEntries)
      })
    }, 300)

    return () => {
      window.clearInterval(pruneIntervalId)
    }
  }, [taskCooldownEndsAtByTaskId])

  const handleToggleBackgroundMusicPersist = () => {
    const nextValue = !isBackgroundMusicPlaying
    handleToggleBackgroundMusic()
    queuePreferencesPatch({ background_music_enabled: nextValue }, 150)
  }

  const handleLocaleChangePersist = (nextLocale: 'es' | 'en') => {
    setLocale(nextLocale)
    queuePreferencesPatch({ locale: nextLocale }, 150)
  }

  const handleToggleUiInteractionSfxPersist = (nextValue: boolean) => {
    handleToggleUiInteractionSfx(nextValue)
  }

  const handleBackgroundMusicVolumeChangePersist = (nextValue: number) => {
    handleBackgroundMusicVolumeChange(nextValue)
  }

  const handleUiInteractionSfxVolumeChangePersist = (nextValue: number) => {
    handleUiInteractionSfxVolumeChange(nextValue)
  }

  const handleTimerAlarmVolumeChangePersist = (nextValue: number) => {
    handleTimerAlarmVolumeChange(nextValue)
  }

  const handleToggleTaskSwitchConfirmationPersist = (nextValue: boolean) => {
    setRequireTaskSwitchConfirmation(nextValue)
    queuePreferencesPatch({ confirm_task_switch_enabled: nextValue }, 150)
  }

  const buildTasksApiPayloadFromModalPayload = (payload: NewTaskPayload): CreateTaskPayload => {
    const timerInitialSeconds =
      typeof payload.targetDurationMinutes === 'number' && Number.isFinite(payload.targetDurationMinutes)
        ? Math.max(0, Math.round(payload.targetDurationMinutes * 60))
        : 0
    const normalizedTimerInitialSeconds = timerInitialSeconds > 0 ? Math.min(timerInitialSeconds, 24 * 60 * 60) : 0

    return {
      name: payload.title.trim(),
      color_tag: TASK_COLOR_HEX_BY_KEY[payload.colorTag] ?? payload.colorTag,
      icon_tag: TASK_ICON_API_BY_KEY[payload.iconTag] ?? payload.iconTag,
      alarm_time_local: normalizeAlarmTimeToHm(payload.alarmTime),
      timer_initial_seconds: normalizedTimerInitialSeconds,
      target_duration_seconds: normalizedTimerInitialSeconds,
    }
  }

  const applyTaskRemovalFromUi = (deletedTaskId: string) => {
    const deletingActiveTask = activeTask?.id === deletedTaskId

    setTaskList((currentTasks) => {
      const remainingTasks = currentTasks.filter((task) => task.id !== deletedTaskId)

      if (remainingTasks.length === 0) {
        return remainingTasks
      }

      const hasActiveTask = remainingTasks.some((task) => task.state === 'active')
      if (hasActiveTask) {
        return remainingTasks
      }

      const [firstTask, ...rest] = remainingTasks
      return [{ ...firstTask, state: 'active' }, ...rest]
    })

    if (deletingActiveTask) {
      const remainingTasks = taskList.filter((task) => task.id !== deletedTaskId)
      const nextActiveTask = remainingTasks.find((task) => task.state === 'active') ?? remainingTasks[0] ?? null
      setIsFocusRunning(false)
      setSessionElapsedSeconds(0)
      setActiveFocusSessionMeta(null)
      setTimerMode(nextActiveTask?.targetDurationMinutes ? 'timer' : 'stopwatch')
    }

    cleanupTaskUiStateAfterDelete(deletedTaskId)
    setTaskCooldownEndsAtByTaskId((current) => {
      if (!(deletedTaskId in current)) {
        return current
      }

      const next = { ...current }
      delete next[deletedTaskId]
      return next
    })
    setTaskPendingSwitchConfirm((current) => (current?.task.id === deletedTaskId ? null : current))
  }

  const handleCreateTaskPersist = async (payload: NewTaskPayload): Promise<boolean> => {
    const apiPayload = buildTasksApiPayloadFromModalPayload(payload)
    const editingTaskId = editingTask?.id ?? null

    try {
      if (editingTaskId) {
        const ifVersion =
          typeof editingTask?.version === 'number' && Number.isFinite(editingTask.version)
            ? Math.max(1, Math.floor(editingTask.version))
            : 1

        const updatedTask = await updateTaskApi(editingTaskId, {
          ...apiPayload,
          if_version: ifVersion,
          timer_initial_seconds: apiPayload.timer_initial_seconds ?? 0,
          target_duration_seconds: apiPayload.target_duration_seconds ?? 0,
        })
        if (!updatedTask) {
          onSignOut?.()
          return false
        }

        setTaskList((currentTasks) =>
          currentTasks.map((task) =>
            task.id === editingTaskId
              ? adaptTaskApiItemToUi(updatedTask, {
                existingTask: task,
                state: task.state,
              })
              : task,
          ),
        )
        return true
      }

      const createdTask = await createTaskApi(apiPayload)
      if (!createdTask) {
        onSignOut?.()
        return false
      }

      setTaskList((currentTasks) => {
        const existingTask = currentTasks.find((task) => task.id === createdTask.id)
        const nextState = currentTasks.length === 0 ? 'active' : 'scheduled'
        const uiTask = adaptTaskApiItemToUi(createdTask, {
          existingTask,
          state: existingTask?.state ?? nextState,
        })

        if (!existingTask) {
          return [...currentTasks, uiTask]
        }

        return currentTasks.map((task) => (task.id === uiTask.id ? uiTask : task))
      })
      return true
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 401) {
          onSignOut?.()
          return false
        }

        if (error.status === 404 && editingTaskId) {
          applyTaskRemovalFromUi(editingTaskId)
          return false
        }

        if (error.status === 409) {
          const conflict = getTaskVersionConflictFromApiError(error)
          console.warn('Task version conflict during create/update. Refreshing tasks from server.', conflict ?? error)
          try {
            await refreshTasksFromServer()
          } catch (refreshError) {
            console.error('Failed to refresh tasks after version conflict', refreshError)
          }
          return false
        }
      }

      if (error instanceof ApiHttpError) {
        console.error('Failed to persist task mutation', { editingTaskId, apiPayload, status: error.status, body: error.body }, error)
        return false
      }
      console.error('Failed to persist task mutation', { editingTaskId, apiPayload }, error)
      return false
    }
  }

  const localizedDailyLogEntries = useMemo(
    () => localizeStaticLogActivities(dailyLogEntries, copy.untrackedTime),
    [copy.untrackedTime, dailyLogEntries],
  )
  const localizedHistoryEntries = useMemo(
    () =>
      localizeStaticLogActivities(
        bootstrapData ? dailyLogEntries : emptyFallbackLogEntries,
        copy.untrackedTime,
      ),
    [bootstrapData, copy.untrackedTime, dailyLogEntries],
  )
  const sessionCountByTaskId = useMemo(() => {
    return dailyLogEntries.reduce<Record<string, number>>((acc, entry) => {
      if (!entry.taskId) {
        return acc
      }

      acc[entry.taskId] = (acc[entry.taskId] ?? 0) + 1
      return acc
    }, {})
  }, [dailyLogEntries])
  const loggedSecondsByTaskId = useMemo(() => {
    return dailyLogEntries.reduce<Record<string, number>>((acc, entry) => {
      if (!entry.taskId) {
        return acc
      }

      acc[entry.taskId] = (acc[entry.taskId] ?? 0) + parseDurationLabelToSeconds(entry.duration)
      return acc
    }, {})
  }, [dailyLogEntries])
  const activeTask = useMemo(() => {
    return taskList.find((task) => task.state === 'active') ?? taskList[0] ?? null
  }, [taskList])
  const initialTimerMode = useMemo<FocusTimerMode>(
    () => {
      const preferredTask =
        bootstrapInitialTasks.find((task) => task.state === 'active') ??
        bootstrapInitialTasks[0] ??
        null

      if (bootstrapData?.active_focus_session?.timer_mode) {
        return bootstrapData.active_focus_session.timer_mode
      }

      return preferredTask?.targetDurationMinutes ? 'timer' : 'stopwatch'
    },
    [bootstrapData, bootstrapInitialTasks],
  )
  const {
    isFocusRunning,
    setIsFocusRunning,
    sessionElapsedSeconds,
    setSessionElapsedSeconds,
    timerMode,
    setTimerMode,
    activeUntrackedSession,
    setActiveUntrackedSession,
    activeFocusSessionMeta,
    setActiveFocusSessionMeta,
    authoritativeFocusSession: activeFocusSession,
    applyAuthoritativeFocusSnapshot,
    lastServerNowUtc,
    activeTaskTargetSeconds,
    elapsedSnapshotsByTaskId,
    resetElapsedSnapshotsForTaskModes,
    seedElapsedSnapshotForTaskMode,
    timerProgressPercent,
    timerDisplayLabel,
    isTimerComplete,
    activeTaskTotalTimeLabel,
  } = useFocusSessionController({
    activeTask,
    initialTimerMode,
    loggedSecondsByTaskId,
    initialAuthoritativeFocusSession: bootstrapData?.active_focus_session ?? null,
    initialServerNowUtc: bootstrapData?.server_now_utc ?? null,
  })
  const { timeLabel, timeZoneName, utcOffsetLabel } = useCurrentTime(
    effectiveTimeZone,
    lastServerNowUtc ?? bootstrapData?.server_now_utc ?? null,
  )
  const isEditingRunningTask = Boolean(
    editingTask &&
    activeFocusSession &&
    activeFocusSession.task_id === editingTask.id &&
    isSessionRunningState(activeFocusSession.session_state),
  )

  const alignActiveTaskState = (nextActiveTaskId: string | null) => {
    if (!nextActiveTaskId) {
      return
    }

    setTaskList((currentTasks) => {
      if (currentTasks.length === 0 || !currentTasks.some((task) => task.id === nextActiveTaskId)) {
        return currentTasks
      }

      let changed = false
      const nextTasks = currentTasks.map((task) => {
        const shouldBeActive = task.id === nextActiveTaskId
        const nextState = shouldBeActive ? 'active' : task.state === 'active' ? 'scheduled' : task.state
        if (nextState !== task.state) {
          changed = true
          return { ...task, state: nextState }
        }

        return task
      })

      return changed ? nextTasks : currentTasks
    })
  }

  const syncTaskVersionFromRuntimeEnvelope = (envelope: FocusSessionStateEnvelope) => {
    const runtimeTask = ((envelope.data as { task?: unknown } | null)?.task ?? null) as
      | Partial<TaskApiItem>
      | null
    if (!runtimeTask || typeof runtimeTask !== 'object') {
      return
    }

    const runtimeTaskId = typeof runtimeTask.id === 'string' && runtimeTask.id.trim() ? runtimeTask.id : null
    const runtimeTaskVersion =
      typeof runtimeTask.version === 'number' && Number.isFinite(runtimeTask.version)
        ? Math.max(1, Math.floor(runtimeTask.version))
        : null
    const runtimeState = normalizeTaskRuntimeState(runtimeTask.state)
    if (!runtimeTaskId || runtimeTaskVersion === null) {
      return
    }

    setTaskList((currentTasks) => {
      if (currentTasks.length === 0 || !currentTasks.some((task) => task.id === runtimeTaskId)) {
        return currentTasks
      }

      let changed = false
      const nextTasks = currentTasks.map((task) => {
        if (task.id === runtimeTaskId) {
          const nextState =
            runtimeState === 'working'
              ? 'active'
              : task.state
          if (task.version !== runtimeTaskVersion || task.state !== nextState) {
            changed = true
            return {
              ...task,
              version: runtimeTaskVersion,
              state: nextState,
            }
          }
          return task
        }

        if (runtimeState === 'working' && task.state === 'active') {
          changed = true
          return { ...task, state: 'scheduled' }
        }

        return task
      })

      return changed ? nextTasks : currentTasks
    })
  }

  const applyRuntimeFromTaskSnapshot = (serverTask: TaskApiItem | null) => {
    if (!serverTask) {
      return
    }

    const runtimeState = normalizeTaskRuntimeState(serverTask.state)
    if (!runtimeState) {
      return
    }

    const nextMode: FocusTimerMode = serverTask.active_mode === 'timer' ? 'timer' : 'stopwatch'
    const elapsedSeconds = resolveElapsedFromRuntimeTaskSnapshot(serverTask, nextMode)
    const localSeedFromSnapshot =
      nextMode === 'timer'
        ? elapsedSnapshotsByTaskId[serverTask.id]?.timer ?? 0
        : elapsedSnapshotsByTaskId[serverTask.id]?.stopwatch ?? 0
    const localSeedFromActiveTask =
      activeTask?.id === serverTask.id ? Math.max(0, Math.floor(sessionElapsedSeconds)) : 0
    const safeElapsedSeconds = Math.max(elapsedSeconds, localSeedFromSnapshot, localSeedFromActiveTask)
    seedElapsedSnapshotForTaskMode(serverTask.id, nextMode, safeElapsedSeconds)

    if (runtimeState === 'idle') {
      if (activeTask?.id === serverTask.id) {
        if (!activeFocusSession || !isSessionRunningState(activeFocusSession.session_state)) {
          setIsFocusRunning(false)
        }
      }
      return
    }

    // Paused snapshots should not steal active-card focus in TimerPanel,
    // but they must hydrate elapsed seed for reload continuity.
    if (runtimeState === 'paused') {
      if (activeFocusSession && isSessionRunningState(activeFocusSession.session_state)) {
        return
      }
      if (activeTask?.id === serverTask.id) {
        setTimerMode(nextMode)
        setSessionElapsedSeconds(safeElapsedSeconds)
        setIsFocusRunning(false)
      }
      return
    }

    const derivedSession = buildDerivedFocusSessionFromTask(serverTask)

    alignActiveTaskState(serverTask.id)
    if (derivedSession) {
      const normalizedElapsedTotal =
        nextMode === 'timer' && typeof derivedSession.target_seconds === 'number' && Number.isFinite(derivedSession.target_seconds)
          ? Math.max(0, Math.min(Math.floor(derivedSession.target_seconds), Math.floor(safeElapsedSeconds)))
          : Math.max(0, Math.floor(safeElapsedSeconds))
      const snapshotObservedAtUtc = new Date().toISOString()
      applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? new Date().toISOString(), {
        ...derivedSession,
        elapsed_seconds_total: Math.max(derivedSession.elapsed_seconds_total, normalizedElapsedTotal),
        // For runtime rehydration from /focus/tasks, treat elapsed as a current snapshot
        // and anchor future ticking from "now" to avoid double-counting from task started_at_utc.
        last_resumed_at_utc: snapshotObservedAtUtc,
      })
    } else {
      setTimerMode(nextMode)
      setSessionElapsedSeconds(safeElapsedSeconds)
      setIsFocusRunning(runtimeState === 'working')
    }
  }

  const applyRuntimeFromTaskCollection = (serverTasks: TaskApiItem[]) => {
    serverTasks.forEach((serverTask) => {
      if (normalizeTaskRuntimeState(serverTask.state) !== 'idle') {
        applyRuntimeFromTaskSnapshot(serverTask)
      }
    })

    const runtimeTask = pickRuntimeTaskSnapshot(serverTasks)
    if (!runtimeTask) {
      if (!activeFocusSession || !isSessionRunningState(activeFocusSession.session_state)) {
        setIsFocusRunning(false)
      }
      return
    }

    applyRuntimeFromTaskSnapshot(runtimeTask)
  }

  const applyFocusSessionEnvelope = (envelope: FocusSessionStateEnvelope) => {
    syncTaskVersionFromRuntimeEnvelope(envelope)
    const normalizedActiveSession = normalizeIncomingRunningFocusSession(
      activeFocusSession,
      envelope.data.active_focus_session ?? null,
    )
    const normalizedEnvelope = {
      ...envelope,
      data: {
        ...envelope.data,
        active_focus_session: normalizedActiveSession,
      },
    } satisfies FocusSessionStateEnvelope

    const runtimeDailyLogRaw = (normalizedEnvelope.data as { daily_log_today?: unknown }).daily_log_today
    const runtimeDailyLogPayload = normalizeRuntimeDailyLogTodayPayload(runtimeDailyLogRaw)
    if (runtimeDailyLogPayload) {
      const runtimeDailyLog = runtimeDailyLogPayload.dailyLog
      const timeZoneForDailyLog =
        typeof runtimeDailyLog.time_zone_name === 'string' && runtimeDailyLog.time_zone_name.trim()
          ? runtimeDailyLog.time_zone_name.trim()
          : effectiveTimeZone
      applyOrderedDailyLogEntriesFromBackend(
        'runtime_daily_log_today',
        adaptFocusDailyLogToUiEntries(runtimeDailyLog, {
          timeZone: timeZoneForDailyLog,
          untrackedLabel: copy.untrackedTime,
        }),
      )
      const trackedSeconds =
        runtimeDailyLogPayload.trackedSeconds ??
        runtimeDailyLog.focus_time_entries.reduce((total, entry) => {
          if (typeof entry.elapsed_seconds !== 'number' || !Number.isFinite(entry.elapsed_seconds)) {
            return total
          }
          return total + Math.max(0, Math.floor(entry.elapsed_seconds))
        }, 0)
      setDashboardStatsState((current) => ({
        ...current,
        sessions: runtimeDailyLog.focus_time_entries.length,
        totalTracked: formatSecondsCompact(trackedSeconds),
      }))
    }

    applyAuthoritativeFocusSnapshot(normalizedEnvelope.data.server_now_utc, normalizedEnvelope.data.active_focus_session)
    if (
      shouldSyncDailyLogAfterIdleCloseRef.current &&
      normalizedEnvelope.data.active_focus_session &&
      isSessionRunningState(normalizedEnvelope.data.active_focus_session.session_state)
    ) {
      shouldSyncDailyLogAfterIdleCloseRef.current = false
      runNonBlockingFocusSideEffect(async () => {
        try {
          await refreshBootstrapDerivedDataFromServer({ preserveRuntimeSession: true })
        } catch (error) {
          console.error('Failed to synchronize daily log after idle->working response', error)
        }
      })
    }
    alignActiveTaskState(normalizedEnvelope.data.active_focus_session?.task_id ?? null)
    return normalizedEnvelope
  }

  const applyFocusSessionConflictSnapshot = (error: unknown) => {
    const conflict = getFocusSessionConflictFromApiError(error)
    if (!conflict) {
      return null
    }

    applyAuthoritativeFocusSnapshot(conflict.data.server_now_utc, conflict.data.active_focus_session)
    alignActiveTaskState(conflict.data.active_focus_session?.task_id ?? null)
    return conflict
  }

  const refreshTasksFromServer = async () => {
    if (tasksRefreshRequestInFlightRef.current) {
      return tasksRefreshRequestInFlightRef.current
    }

    const request = (async () => {
      tasksRefreshInFlightCountRef.current += 1
      if (isMountedRef.current) {
        setIsTasksLoading(true)
      }

      try {
        const serverTasks = await getTasksApi()
        if (!serverTasks) {
          onSignOut?.()
          return
        }
        const sortedServerTasks = sortTaskApiItemsByRecencyDesc(serverTasks)
        latestServerTasksByIdRef.current = Object.fromEntries(sortedServerTasks.map((task) => [task.id, task]))

        setTaskList((currentTasks) => {
          const currentById = new Map(currentTasks.map((task) => [task.id, task] as const))
          const currentActiveTaskId = currentTasks.find((task) => task.state === 'active')?.id ?? null
          const runtimeWorkingTaskId =
            sortedServerTasks.find((task) => normalizeTaskRuntimeState(task.state) === 'working')?.id ?? null
          const runtimePausedTaskId =
            sortedServerTasks.find((task) => normalizeTaskRuntimeState(task.state) === 'paused')?.id ?? null
          const preferredActiveTaskId =
            runtimeWorkingTaskId ??
            currentActiveTaskId ??
            activeFocusSession?.task_id ??
            sortedServerTasks[0]?.id ??
            null

          const nextTasks = sortedServerTasks.map((serverTask) => {
            const existingTask = currentById.get(serverTask.id)
            const runtimeState = normalizeTaskRuntimeState(serverTask.state)
            const state =
              runtimeState === 'working'
                ? 'active'
                : serverTask.id === preferredActiveTaskId
                  ? 'active'
                  : existingTask?.state === 'done'
                    ? 'done'
                    : 'scheduled'

            const adapted = adaptTaskApiItemToUi(serverTask, {
              existingTask,
              state,
            })
            if (!existingTask) {
              return adapted
            }

            return {
              ...adapted,
              state,
              details: existingTask.details,
              statusText: existingTask.statusText,
              // Keep stable order from backend if present; fallback preserves mapped order.
              id: adapted.id,
            } satisfies Task
          })

          if (preferredActiveTaskId && nextTasks.every((task) => task.id !== preferredActiveTaskId) && nextTasks[0]) {
            nextTasks[0] = { ...nextTasks[0], state: 'active' }
          }

          return nextTasks
        })
        applyRuntimeFromTaskCollection(sortedServerTasks)
      } finally {
        tasksRefreshInFlightCountRef.current = Math.max(0, tasksRefreshInFlightCountRef.current - 1)
        if (isMountedRef.current) {
          setIsTasksLoading(tasksRefreshInFlightCountRef.current > 0)
        }
      }
    })()

    tasksRefreshRequestInFlightRef.current = request.finally(() => {
      tasksRefreshRequestInFlightRef.current = null
    })

    return tasksRefreshRequestInFlightRef.current
  }

  const refreshBootstrapDerivedDataFromServer = async (
    options: { preserveRuntimeSession?: boolean } = {},
  ) => {
    if (bootstrapDerivedRefreshRequestInFlightRef.current) {
      return bootstrapDerivedRefreshRequestInFlightRef.current
    }

    const request = (async () => {
      const refreshDailyLogFromServer = async () => {
        const dateLocal = toIsoDateStringInTimeZone(new Date(), effectiveTimeZone)

        try {
          const dailyLog = await getFocusDailyLog({
            date: dateLocal,
            time_zone_name: effectiveTimeZone,
          })
          if (!dailyLog) {
            onSignOut?.()
            return false
          }

          applyOrderedDailyLogEntriesFromBackend(
            'get_focus_daily_log',
            adaptFocusDailyLogToUiEntries(dailyLog, {
              timeZone: dailyLog.time_zone_name || effectiveTimeZone,
              untrackedLabel: copy.untrackedTime,
            }),
          )

          const trackedSeconds = dailyLog.focus_time_entries.reduce((total, entry) => {
            if (typeof entry.elapsed_seconds !== 'number' || !Number.isFinite(entry.elapsed_seconds)) {
              return total
            }
            return total + Math.max(0, Math.floor(entry.elapsed_seconds))
          }, 0)

          setDashboardStatsState((current) => ({
            ...current,
            sessions: dailyLog.focus_time_entries.length,
            totalTracked: formatSecondsCompact(trackedSeconds),
          }))

          return true
        } catch (error) {
          if (error instanceof ApiHttpError && error.status === 404) {
            return false
          }

          throw error
        }
      }

      const didRefreshDailyLog = await refreshDailyLogFromServer()
      if (didRefreshDailyLog) {
        if (!options.preserveRuntimeSession) {
          await Promise.all([refreshTasksFromServer(), syncActiveFocusSession()])
        }
        setSettingsHistoryReloadKey((current) => current + 1)
        return true
      }

      if (options.preserveRuntimeSession) {
        return false
      }

      let refreshedBootstrap: Awaited<ReturnType<typeof getAppBootstrap>>
      try {
        refreshedBootstrap = await getAppBootstrap({ include: FOCUS_DERIVED_BOOTSTRAP_REFRESH_INCLUDES })
      } catch (error) {
        if (error instanceof ApiHttpError && error.status === 404) {
          return false
        }
        throw error
      }
      if (!refreshedBootstrap) {
        onSignOut?.()
        return false
      }

      applyOrderedDailyLogEntriesFromBackend(
        'bootstrap_fallback',
        adaptBootstrapDailyLogToUiEntries(refreshedBootstrap, {
          manualAdjustmentLabel: copy.manualAdjustment,
          timeZone: refreshedBootstrap.preferences?.time_zone_name ?? effectiveTimeZone,
          untrackedLabel: copy.untrackedTime,
        }),
      )
      setDashboardStatsState(adaptBootstrapDashboardStatsToUi(refreshedBootstrap.dashboard_stats))

      const hasLocalRunningSession = Boolean(activeFocusSession && isSessionRunningState(activeFocusSession.session_state))
      const bootstrapSessionIsRunning = Boolean(
        refreshedBootstrap.active_focus_session &&
        isSessionRunningState(refreshedBootstrap.active_focus_session.session_state),
      )
      // Avoid transient panel-mode flips: while local session is running, do not downgrade it from
      // bootstrap fallback snapshots that are null/paused/stale.
      const shouldPreserveLocalRunningSession = hasLocalRunningSession && !bootstrapSessionIsRunning
      if (!shouldPreserveLocalRunningSession) {
        applyAuthoritativeFocusSnapshot(refreshedBootstrap.server_now_utc, refreshedBootstrap.active_focus_session)
      }
      alignActiveTaskState(
        (shouldPreserveLocalRunningSession
          ? activeFocusSession?.task_id
          : refreshedBootstrap.active_focus_session?.task_id) ?? null,
      )
      await refreshTasksFromServer()

      setSettingsHistoryReloadKey((current) => current + 1)
      return true
    })()

    bootstrapDerivedRefreshRequestInFlightRef.current = request.finally(() => {
      bootstrapDerivedRefreshRequestInFlightRef.current = null
    })

    return bootstrapDerivedRefreshRequestInFlightRef.current
  }

  const ensureDailyLogSnapshotFromPauseResponse = async (response: FocusSessionStateEnvelope) => {
    const dailyLogTodayRaw = (response.data as { daily_log_today?: unknown }).daily_log_today
    const hasUsableDailyLogToday = normalizeRuntimeDailyLogTodayPayload(dailyLogTodayRaw) !== null
    if (hasUsableDailyLogToday) {
      return true
    }

    console.warn('[daily-log:pause] pause response missing/invalid daily_log_today, refreshing from server', {
      daily_log_today: dailyLogTodayRaw ?? null,
    })

    try {
      return await refreshBootstrapDerivedDataFromServer()
    } catch (error) {
      console.error('Failed to hydrate daily log after pause response without daily_log_today', error)
      return false
    }
  }

  const handleCreatedTimeEntryInvalidation = async (createdTimeEntryId?: string | null) => {
    if (typeof createdTimeEntryId !== 'string' || !createdTimeEntryId.trim()) {
      return false
    }

    const normalizedId = createdTimeEntryId.trim()
    if (lastHandledCreatedTimeEntryIdRef.current === normalizedId) {
      return true
    }
    lastHandledCreatedTimeEntryIdRef.current = normalizedId

    try {
      return await refreshBootstrapDerivedDataFromServer()
    } catch (error) {
      console.error('Failed to refresh bootstrap-derived data after time entry creation', { createdTimeEntryId }, error)
      return false
    }
  }

  const syncActiveFocusSession = async () => {
    if (!ENABLE_FOCUS_RUNTIME_HTTP_SYNC) {
      return
    }

    if (focusActiveEndpointMissingRef.current) {
      return
    }

    if (isFocusSessionSyncInFlightRef.current) {
      return
    }

    isFocusSessionSyncInFlightRef.current = true
    try {
      const snapshot = await getActiveFocusSession()
      if (!snapshot) {
        onSignOut?.()
        return
      }

      const incomingActiveSession = normalizeIncomingRunningFocusSession(
        activeFocusSession,
        snapshot.data.active_focus_session ?? null,
      )
      const shouldApplySnapshot =
        hasMeaningfulFocusSessionTransition(activeFocusSession, incomingActiveSession) ||
        Boolean(snapshot.data.stopped_session_summary) ||
        Boolean(snapshot.data.created_time_entry_id)

      if (!shouldApplySnapshot) {
        return
      }

      applyFocusSessionEnvelope({
        ...snapshot,
        data: {
          ...snapshot.data,
          active_focus_session: incomingActiveSession,
        },
      })
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 404) {
        focusActiveEndpointMissingRef.current = true
        if (!hasLoggedMissingFocusActiveEndpointRef.current) {
          hasLoggedMissingFocusActiveEndpointRef.current = true
          console.warn('Focus runtime active endpoint unavailable; disabling active-session sync polling.')
        }
        return
      }

      console.error('Failed to sync active focus session', error)
    } finally {
      isFocusSessionSyncInFlightRef.current = false
    }
  }

  const ensureAuthoritativeSessionForCommand = async () => {
    if (activeFocusSession) {
      return activeFocusSession
    }

    const snapshot = await getActiveFocusSession()
    if (!snapshot) {
      onSignOut?.()
      return null
    }

    const incomingActiveSession = normalizeIncomingRunningFocusSession(
      activeFocusSession,
      snapshot.data.active_focus_session ?? null,
    )
    if (!incomingActiveSession) {
      return null
    }

    const hydratedEnvelope = applyFocusSessionEnvelope({
      ...snapshot,
      data: {
        ...snapshot.data,
        active_focus_session: incomingActiveSession,
      },
    })

    return hydratedEnvelope.data.active_focus_session
  }

  const hasProcessedFocusRealtimeEvent = (eventId: string) => {
    return processedFocusRealtimeEventIdsRef.current.includes(eventId)
  }

  const markFocusRealtimeEventProcessed = (eventId: string) => {
    const queue = processedFocusRealtimeEventIdsRef.current
    queue.push(eventId)
    if (queue.length > FOCUS_REALTIME_DEDUP_CAPACITY) {
      queue.splice(0, queue.length - FOCUS_REALTIME_DEDUP_CAPACITY)
    }
  }

  const applyRealtimeFocusEvent = (event: FocusRealtimeEvent) => {
    if (!event || !event.data) {
      return
    }

    const expectedUserId = bootstrapData?.user?.id
    if (expectedUserId && event.meta?.user_id && `${event.meta.user_id}` !== `${expectedUserId}`) {
      return
    }

    const eventId =
      typeof event.meta?.event_id === 'string' && event.meta.event_id.trim()
        ? event.meta.event_id.trim()
        : null
    if (eventId && hasProcessedFocusRealtimeEvent(eventId)) {
      return
    }

    const incomingOriginDeviceId =
      typeof event.meta?.origin_device_id === 'string' && event.meta.origin_device_id.trim()
        ? event.meta.origin_device_id.trim()
        : null
    if (incomingOriginDeviceId && incomingOriginDeviceId === localOriginDeviceId) {
      if (eventId) {
        markFocusRealtimeEventProcessed(eventId)
      }
      return
    }

    const incomingVersion = event.data.active_focus_session?.version ?? null
    const localVersion = activeFocusSession?.version ?? null

    if (
      event.type === 'focus_session.updated' &&
      incomingVersion !== null &&
      localVersion !== null &&
      incomingVersion < localVersion
    ) {
      if (eventId) {
        markFocusRealtimeEventProcessed(eventId)
      }
      return
    }

    const normalizedIncomingActiveSession = normalizeIncomingRunningFocusSession(
      activeFocusSession,
      event.data.active_focus_session ?? null,
    )
    const shouldApplyRealtimeEnvelope =
      hasMeaningfulFocusSessionTransition(activeFocusSession, normalizedIncomingActiveSession) ||
      Boolean(event.data.stopped_session_summary) ||
      Boolean(event.data.created_time_entry_id)
    if (!shouldApplyRealtimeEnvelope) {
      if (eventId) {
        markFocusRealtimeEventProcessed(eventId)
      }
      return
    }

    applyFocusSessionEnvelope({
      data: {
        server_now_utc: event.data.server_now_utc ?? '',
        active_focus_session: normalizedIncomingActiveSession,
        stopped_session_summary: event.data.stopped_session_summary ?? null,
        created_time_entry_id: event.data.created_time_entry_id ?? null,
      },
    })

    if (event.type === 'focus_session.stopped') {
      const finalElapsed = event.data.stopped_session_summary?.elapsed_seconds_final
      if (typeof finalElapsed === 'number' && Number.isFinite(finalElapsed)) {
        setSessionElapsedSeconds(Math.max(0, Math.floor(finalElapsed)))
      }
      setIsFocusRunning(false)
      setActiveFocusSessionMeta(null)
    }

    if (event.data.created_time_entry_id) {
      void handleCreatedTimeEntryInvalidation(event.data.created_time_entry_id)
    }

    if (eventId) {
      markFocusRealtimeEventProcessed(eventId)
    }
  }

  const hasProcessedTaskRealtimeEvent = (eventId: string) => {
    return processedTaskRealtimeEventIdsRef.current.includes(eventId)
  }

  const markTaskRealtimeEventProcessed = (eventId: string) => {
    const queue = processedTaskRealtimeEventIdsRef.current
    queue.push(eventId)
    if (queue.length > TASKS_REALTIME_DEDUP_CAPACITY) {
      queue.splice(0, queue.length - TASKS_REALTIME_DEDUP_CAPACITY)
    }
  }

  const applyTaskcardsRealtimeEvent = (event: TaskcardsRealtimeEvent) => {
    const expectedUserId = bootstrapData?.user?.id
    const incomingTask = event?.task
    const incomingTaskId =
      typeof incomingTask?.id === 'string' && incomingTask.id.trim()
        ? incomingTask.id.trim()
        : typeof incomingTask?.task_id === 'string' && incomingTask.task_id.trim()
          ? incomingTask.task_id.trim()
          : null
    if (!incomingTask || !incomingTaskId) {
      return
    }

    const incomingUserId =
      typeof incomingTask.user_id === 'string' && incomingTask.user_id.trim()
        ? incomingTask.user_id.trim()
        : typeof event.user_id === 'string' && event.user_id.trim()
          ? event.user_id.trim()
          : null

    if (
      expectedUserId &&
      incomingUserId &&
      incomingUserId !== expectedUserId
    ) {
      return
    }

    const eventId = typeof event.event_id === 'string' && event.event_id.trim() ? event.event_id.trim() : null
    if (eventId && hasProcessedTaskRealtimeEvent(eventId)) {
      return
    }

    const incomingOriginDeviceId =
      typeof event.origin_device_id === 'string' && event.origin_device_id.trim()
        ? event.origin_device_id.trim()
        : null
    if (incomingOriginDeviceId && incomingOriginDeviceId === localOriginDeviceId) {
      if (eventId) {
        markTaskRealtimeEventProcessed(eventId)
      }
      return
    }

    const incomingVersion =
      typeof incomingTask.version === 'number' && Number.isFinite(incomingTask.version)
        ? Math.max(1, Math.floor(incomingTask.version))
        : null

    if (incomingVersion === null) {
      if (event.event === 'taskcard.deleted') {
        applyTaskRemovalFromUi(incomingTaskId)
        if (eventId) {
          markTaskRealtimeEventProcessed(eventId)
        }
        return
      }

      scheduleTaskcardsRealtimeResync()
      if (eventId) {
        markTaskRealtimeEventProcessed(eventId)
      }
      return
    }

    if (event.event === 'taskcard.deleted') {
      const localTask = taskList.find((task) => task.id === incomingTaskId)
      const localVersion =
        localTask && typeof localTask.version === 'number' && Number.isFinite(localTask.version)
          ? Math.max(1, Math.floor(localTask.version))
          : null
      if (localVersion !== null && incomingVersion < localVersion) {
        return
      }

      if (localTask) {
        applyTaskRemovalFromUi(incomingTaskId)
      }
      if (eventId) {
        markTaskRealtimeEventProcessed(eventId)
      }
      return
    }

    const localTaskForUpsert = taskList.find((task) => task.id === incomingTaskId)
    if (!localTaskForUpsert && (typeof incomingTask.name !== 'string' || !incomingTask.name.trim())) {
      scheduleTaskcardsRealtimeResync()
      if (eventId) {
        markTaskRealtimeEventProcessed(eventId)
      }
      return
    }

    const hasRenderableTaskMetadata =
      (typeof incomingTask.name === 'string' && incomingTask.name.trim().length > 0) ||
      (typeof incomingTask.icon_tag === 'string' && incomingTask.icon_tag.trim().length > 0) ||
      incomingTask.icon_tag === null ||
      (typeof incomingTask.color_tag === 'string' && incomingTask.color_tag.trim().length > 0) ||
      incomingTask.color_tag === null ||
      (typeof incomingTask.alarm_time_local === 'string' && incomingTask.alarm_time_local.trim().length > 0) ||
      incomingTask.alarm_time_local === null ||
      typeof incomingTask.timer_initial_seconds === 'number' ||
      incomingTask.timer_initial_seconds === null
    const hasRuntimeTaskState =
      normalizeTaskRuntimeState(incomingTask.state) !== null ||
      incomingTask.active_mode === 'timer' ||
      incomingTask.active_mode === 'stopwatch' ||
      typeof incomingTask.timer_remaining_seconds === 'number' ||
      typeof incomingTask.stopwatch_elapsed_seconds === 'number'
    const incomingRuntimeState = normalizeTaskRuntimeState(incomingTask.state)
    const isRunningRuntimeOnlyTick =
      event.event === 'taskcard.updated' &&
      !hasRenderableTaskMetadata &&
      hasRuntimeTaskState &&
      incomingRuntimeState === 'working'

    // Runtime ticking while session is running should stay local and smooth in UI.
    // Realtime should only drive control transitions (pause/resume/stop/switch/reset).
    if (isRunningRuntimeOnlyTick) {
      if (eventId) {
        markTaskRealtimeEventProcessed(eventId)
      }
      return
    }

    if (event.event === 'taskcard.updated' && !hasRenderableTaskMetadata && !hasRuntimeTaskState) {
      scheduleTaskcardsRealtimeResync()
      if (eventId) {
        markTaskRealtimeEventProcessed(eventId)
      }
      return
    }

    setTaskList((currentTasks) => {
      const currentIndex = currentTasks.findIndex((task) => task.id === incomingTaskId)
      const currentTask = currentIndex >= 0 ? currentTasks[currentIndex] : null
      const currentVersion =
        currentTask && typeof currentTask.version === 'number' && Number.isFinite(currentTask.version)
          ? Math.max(1, Math.floor(currentTask.version))
          : null

      if (currentVersion !== null && incomingVersion < currentVersion) {
        return currentTasks
      }

      if (currentVersion !== null && incomingVersion === currentVersion) {
        return currentTasks
      }

      const taskForUi = adaptTaskApiItemToUi(
        {
          id: incomingTaskId,
          user_id: incomingTask.user_id ?? currentTask?.userId ?? expectedUserId ?? '',
          name:
            typeof incomingTask.name === 'string' && incomingTask.name.trim()
              ? incomingTask.name
              : currentTask?.title ?? 'Untitled task',
          icon_tag: incomingTask.icon_tag ?? null,
          color_tag: incomingTask.color_tag ?? null,
          alarm_time_local: incomingTask.alarm_time_local ?? null,
          timer_initial_seconds:
            typeof incomingTask.timer_initial_seconds === 'number' && Number.isFinite(incomingTask.timer_initial_seconds)
              ? Math.max(0, Math.floor(incomingTask.timer_initial_seconds))
              : null,
          timer_remaining_seconds:
            typeof incomingTask.timer_remaining_seconds === 'number' && Number.isFinite(incomingTask.timer_remaining_seconds)
              ? Math.max(0, Math.floor(incomingTask.timer_remaining_seconds))
              : null,
          timer_started_at_utc:
            typeof incomingTask.timer_started_at_utc === 'string' ? incomingTask.timer_started_at_utc : null,
          stopwatch_elapsed_seconds:
            typeof incomingTask.stopwatch_elapsed_seconds === 'number' && Number.isFinite(incomingTask.stopwatch_elapsed_seconds)
              ? Math.max(0, Math.floor(incomingTask.stopwatch_elapsed_seconds))
              : null,
          stopwatch_started_at_utc:
            typeof incomingTask.stopwatch_started_at_utc === 'string' ? incomingTask.stopwatch_started_at_utc : null,
          active_mode:
            incomingTask.active_mode === 'timer' || incomingTask.active_mode === 'stopwatch'
              ? incomingTask.active_mode
              : undefined,
          state: normalizeTaskRuntimeState(incomingTask.state) ?? undefined,
          version: incomingVersion,
          created_at:
            typeof incomingTask.created_at === 'string' && incomingTask.created_at.trim()
              ? incomingTask.created_at
              : currentTask?.createdAtUtc ?? '',
          updated_at:
            typeof incomingTask.updated_at === 'string' && incomingTask.updated_at.trim()
              ? incomingTask.updated_at
              : currentTask?.updatedAtUtc ?? '',
        },
        {
          existingTask: currentTask ?? undefined,
          state: currentTask?.state ?? (currentTasks.length === 0 ? 'active' : 'scheduled'),
          localTargetDurationMinutes:
            typeof incomingTask.timer_initial_seconds === 'number' && Number.isFinite(incomingTask.timer_initial_seconds)
              ? Math.max(0, Math.floor(incomingTask.timer_initial_seconds)) / 60
              : undefined,
        },
      )

      if (currentIndex < 0) {
        return [...currentTasks, taskForUi]
      }

      const nextTasks = [...currentTasks]
      nextTasks[currentIndex] = taskForUi
      return nextTasks
    })

    const runtimeState = normalizeTaskRuntimeState(incomingTask.state)
    if (event.event === 'taskcard.updated' && runtimeState) {
      const runtimeSnapshot: TaskApiItem = {
        id: incomingTaskId,
        user_id: incomingTask.user_id ?? expectedUserId ?? '',
        name:
          typeof incomingTask.name === 'string' && incomingTask.name.trim()
            ? incomingTask.name
            : localTaskForUpsert?.title ?? 'Untitled task',
        icon_tag:
          typeof incomingTask.icon_tag === 'string'
            ? incomingTask.icon_tag
            : localTaskForUpsert
              ? TASK_ICON_API_BY_KEY[localTaskForUpsert.iconTag]
              : null,
        color_tag:
          typeof incomingTask.color_tag === 'string'
            ? incomingTask.color_tag
            : localTaskForUpsert
              ? TASK_COLOR_HEX_BY_KEY[localTaskForUpsert.colorTag]
              : null,
        alarm_time_local:
          typeof incomingTask.alarm_time_local === 'string' ? incomingTask.alarm_time_local : localTaskForUpsert?.alarmTime ?? null,
        timer_initial_seconds:
          typeof incomingTask.timer_initial_seconds === 'number' && Number.isFinite(incomingTask.timer_initial_seconds)
            ? Math.max(0, Math.floor(incomingTask.timer_initial_seconds))
            : localTaskForUpsert && typeof localTaskForUpsert.targetDurationMinutes === 'number'
              ? Math.max(0, Math.round(localTaskForUpsert.targetDurationMinutes * 60))
              : null,
        timer_remaining_seconds:
          typeof incomingTask.timer_remaining_seconds === 'number' && Number.isFinite(incomingTask.timer_remaining_seconds)
            ? Math.max(0, Math.floor(incomingTask.timer_remaining_seconds))
            : null,
        timer_started_at_utc:
          typeof incomingTask.timer_started_at_utc === 'string' ? incomingTask.timer_started_at_utc : null,
        stopwatch_elapsed_seconds:
          typeof incomingTask.stopwatch_elapsed_seconds === 'number' && Number.isFinite(incomingTask.stopwatch_elapsed_seconds)
            ? Math.max(0, Math.floor(incomingTask.stopwatch_elapsed_seconds))
            : null,
        stopwatch_started_at_utc:
          typeof incomingTask.stopwatch_started_at_utc === 'string' ? incomingTask.stopwatch_started_at_utc : null,
        active_mode:
          incomingTask.active_mode === 'timer' || incomingTask.active_mode === 'stopwatch'
            ? incomingTask.active_mode
            : undefined,
        state: runtimeState,
        target_duration_seconds: null,
        version: incomingVersion,
        created_at: typeof incomingTask.created_at === 'string' ? incomingTask.created_at : localTaskForUpsert?.createdAtUtc ?? '',
        updated_at: typeof incomingTask.updated_at === 'string' ? incomingTask.updated_at : localTaskForUpsert?.updatedAtUtc ?? '',
      }
      applyRuntimeFromTaskSnapshot(runtimeSnapshot)
      if ((runtimeState === 'working' || runtimeState === 'paused') && !activeFocusSession) {
        void syncActiveFocusSession()
      }
    }

    if (eventId) {
      markTaskRealtimeEventProcessed(eventId)
    }
  }

  const { connectionState: focusRealtimeConnectionState } = useFocusRealtimeChannel({
    userId: bootstrapData?.user?.id ?? null,
    enabled: false,
    onEvent: applyRealtimeFocusEvent,
    onReconnectSync: () => {
      void syncActiveFocusSession()
    },
  })

  const { connectionState: taskcardsRealtimeConnectionState } = useTaskcardsRealtimeChannel({
    userId: bootstrapData?.user?.id ?? null,
    enabled: false,
    onEvent: applyTaskcardsRealtimeEvent,
    onReconnectSync: () => {
      void refreshTasksFromServer()
    },
  })

  const syncActiveFocusSessionRef = useRef(syncActiveFocusSession)
  const refreshTasksFromServerRef = useRef(refreshTasksFromServer)
  syncActiveFocusSessionRef.current = syncActiveFocusSession
  refreshTasksFromServerRef.current = refreshTasksFromServer

  useEffect(() => {
    if (!ENABLE_FOCUS_RUNTIME_HTTP_SYNC) {
      return
    }

    if (focusRealtimeConnectionState === 'connected') {
      return
    }

    const pollingIntervalMs = isSessionRunningState(activeFocusSession?.session_state) ? 3200 : 5000
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return
      }

      void syncActiveFocusSessionRef.current()
    }, pollingIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeFocusSession?.id, activeFocusSession?.session_state, focusRealtimeConnectionState])

  useEffect(() => {
    if (!ENABLE_TASKS_BACKGROUND_POLLING) {
      return
    }

    if (taskcardsRealtimeConnectionState === 'connected') {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return
      }

      void refreshTasksFromServerRef.current()
    }, 2600)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [taskcardsRealtimeConnectionState])

  const getPreferredTimerModeForTask = (task: Task): FocusTimerMode =>
    task.targetDurationMinutes && task.targetDurationMinutes > 0 ? 'timer' : 'stopwatch'

  const previousDisplayedTaskIdRef = useRef<string | null>(activeTask?.id ?? null)
  useEffect(() => {
    const currentTaskId = activeTask?.id ?? null
    if (currentTaskId === previousDisplayedTaskIdRef.current) {
      return
    }

    previousDisplayedTaskIdRef.current = currentTaskId

    if (!activeTask) {
      return
    }

    // Default TimePanel mode by selected task only when there is no authoritative session running/paused.
    if (activeFocusSession || isFocusRunning) {
      return
    }

    const preferredMode = getPreferredTimerModeForTask(activeTask)
    setTimerMode(preferredMode)
  }, [activeFocusSession, activeTask, isFocusRunning, setTimerMode])

  const getTargetSecondsForStart = (task: Task, mode: FocusTimerMode) => {
    if (mode !== 'timer') {
      return null
    }

    const totalSeconds =
      typeof task.targetDurationMinutes === 'number' && Number.isFinite(task.targetDurationMinutes)
        ? Math.round(task.targetDurationMinutes * 60)
        : 0

    return totalSeconds > 0 ? Math.min(totalSeconds, 24 * 60 * 60) : null
  }

  const getElapsedSeedForTaskMode = (task: Task, mode: FocusTimerMode) => {
    const snapshotByMode = elapsedSnapshotsByTaskId[task.id]
    const seededFromSnapshot = mode === 'timer' ? snapshotByMode?.timer : snapshotByMode?.stopwatch
    const seededFromLiveSession =
      activeFocusSession &&
        activeFocusSession.task_id === task.id &&
        activeFocusSession.timer_mode === mode
        ? sessionElapsedSeconds
        : null

    const baseValue = seededFromLiveSession ?? seededFromSnapshot ?? 0
    return Math.max(0, Math.floor(baseValue))
  }
  const getElapsedSecondsAtClientEvent = (
    session: ActiveFocusSession | null | undefined,
    eventAtUtc: string,
    fallbackElapsedSeconds: number,
  ) => {
    const fallback = Math.max(0, Math.floor(fallbackElapsedSeconds))
    if (!session) {
      return fallback
    }

    const baseElapsedSeconds =
      typeof session.elapsed_seconds_total === 'number' && Number.isFinite(session.elapsed_seconds_total)
        ? Math.max(0, Math.floor(session.elapsed_seconds_total))
        : 0
    if (!isSessionRunningState(session.session_state)) {
      return Math.max(baseElapsedSeconds, fallback)
    }

    const runningAnchorUtc = session.last_resumed_at_utc ?? session.started_at_utc
    if (typeof runningAnchorUtc !== 'string' || !runningAnchorUtc.trim()) {
      return Math.max(baseElapsedSeconds, fallback)
    }

    const eventAtMs = Date.parse(eventAtUtc)
    const runningAnchorMs = Date.parse(runningAnchorUtc)
    if (!Number.isFinite(eventAtMs) || !Number.isFinite(runningAnchorMs)) {
      return Math.max(baseElapsedSeconds, fallback)
    }

    const deltaSeconds = roundElapsedSecondsBetweenMs(runningAnchorMs, eventAtMs)
    const elapsedAtEvent = Math.max(baseElapsedSeconds + deltaSeconds, fallback)
    if (
      session.timer_mode === 'timer' &&
      typeof session.target_seconds === 'number' &&
      Number.isFinite(session.target_seconds)
    ) {
      return Math.max(0, Math.min(Math.max(0, Math.floor(session.target_seconds)), elapsedAtEvent))
    }

    return elapsedAtEvent
  }

  const resetCountersAfterStop = (taskId: string | null | undefined, sessionMode?: FocusTimerMode | null) => {
    if (!taskId) {
      return
    }

    const modes = new Set<FocusTimerMode>([timerMode])
    if (sessionMode === 'timer' || sessionMode === 'stopwatch') {
      modes.add(sessionMode)
    }

    resetElapsedSnapshotsForTaskModes(taskId, Array.from(modes))
  }

  const getTaskTrackedSecondsSnapshot = (taskId: string | null | undefined) => {
    if (!taskId) {
      return 0
    }

    const snapshotTask = taskList.find((task) => task.id === taskId)
    if (!snapshotTask) {
      return 0
    }

    return parseDurationLabelToSeconds(snapshotTask.duration)
  }

  const getLiveTrackedDeltaSecondsForTask = (
    taskId: string | null | undefined,
    options: {
      session?: ActiveFocusSession | null
      elapsedSeconds?: number
      includeLocalFallback?: boolean
    } = {},
  ) => {
    if (!taskId) {
      return 0
    }

    const normalizedElapsedSeconds =
      typeof options.elapsedSeconds === 'number' && Number.isFinite(options.elapsedSeconds)
        ? Math.max(0, Math.floor(options.elapsedSeconds))
        : Math.max(0, Math.floor(sessionElapsedSeconds))

    const session = options.session ?? activeFocusSession
    if (session && session.task_id === taskId && isSessionRunningState(session.session_state)) {
      return normalizedElapsedSeconds
    }

    if (options.includeLocalFallback) {
      return normalizedElapsedSeconds
    }

    return 0
  }

  const getOptimisticTrackedSecondsAfterFreeze = (
    taskId: string | null | undefined,
    options: {
      session?: ActiveFocusSession | null
      elapsedSeconds?: number
      includeLocalFallback?: boolean
    } = {},
  ) => {
    if (!taskId) {
      return 0
    }

    const trackedBeforeFreezeSeconds = getTaskTrackedSecondsSnapshot(taskId)
    const normalizedElapsedSeconds =
      typeof options.elapsedSeconds === 'number' && Number.isFinite(options.elapsedSeconds)
        ? Math.max(0, Math.floor(options.elapsedSeconds))
        : Math.max(0, Math.floor(sessionElapsedSeconds))
    const liveTrackedDeltaSeconds = getLiveTrackedDeltaSecondsForTask(taskId, {
      session: options.session,
      elapsedSeconds: normalizedElapsedSeconds,
      includeLocalFallback: options.includeLocalFallback ?? false,
    })

    return Math.max(
      trackedBeforeFreezeSeconds,
      trackedBeforeFreezeSeconds + liveTrackedDeltaSeconds,
      normalizedElapsedSeconds,
    )
  }

  const ensureTaskTrackedDurationAtLeast = (taskId: string | null | undefined, minimumTrackedSeconds: number) => {
    if (!taskId || !Number.isFinite(minimumTrackedSeconds)) {
      return
    }

    const normalizedMinimumTrackedSeconds = Math.max(0, Math.floor(minimumTrackedSeconds))
    setTaskList((currentTasks) => {
      let changed = false
      const nextTasks = currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        const currentTrackedSeconds = parseDurationLabelToSeconds(task.duration)
        if (currentTrackedSeconds >= normalizedMinimumTrackedSeconds) {
          return task
        }

        changed = true
        return {
          ...task,
          duration: formatSecondsHms(normalizedMinimumTrackedSeconds),
        }
      })

      return changed ? nextTasks : currentTasks
    })
  }

  const syncTaskVersionFromConflict = (taskId: string | null | undefined, version: number | null | undefined) => {
    if (!taskId || typeof version !== 'number' || !Number.isFinite(version)) {
      return
    }

    const normalizedVersion = Math.max(1, Math.floor(version))
    setTaskList((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, version: normalizedVersion } : task)),
    )

    const snapshot = latestServerTasksByIdRef.current[taskId]
    if (snapshot) {
      latestServerTasksByIdRef.current = {
        ...latestServerTasksByIdRef.current,
        [taskId]: {
          ...snapshot,
          version: normalizedVersion,
        },
      }
    }
  }

  const handleFocusSessionApiError = async (
    error: unknown,
    options: { refreshTasksOnNotFound?: boolean } = {},
  ) => {
    if (error instanceof ApiHttpError) {
      if (error.status === 401) {
        onSignOut?.()
        return { handled: true, kind: 'unauthenticated' as const }
      }

      if (error.status === 404 && options.refreshTasksOnNotFound) {
        try {
          await refreshTasksFromServer()
        } catch (refreshError) {
          console.error('Failed to refresh tasks after focus session 404', refreshError)
        }
        return { handled: true, kind: 'not_found' as const }
      }
    }

    const conflict = applyFocusSessionConflictSnapshot(error)
    if (conflict) {
      return { handled: true, kind: 'conflict' as const, conflict }
    }

    return { handled: false }
  }

  const recoverFromStartConflict = async (session: ActiveFocusSession | null, taskToStart: Task) => {
    let sessionToRecover = session
    if (!sessionToRecover) {
      try {
        sessionToRecover = await ensureAuthoritativeSessionForCommand()
      } catch (hydrateError) {
        const hydrateHandled = await handleFocusSessionApiError(hydrateError, { refreshTasksOnNotFound: true })
        if (!hydrateHandled.handled) {
          console.error('Failed to hydrate active focus session while recovering start conflict', hydrateError)
        }
        return hydrateHandled.handled
      }
    }

    if (!sessionToRecover) {
      const fallbackExpectedVersion =
        typeof taskToStart.version === 'number' && Number.isFinite(taskToStart.version)
          ? Math.max(1, Math.floor(taskToStart.version))
          : null
      if (fallbackExpectedVersion !== null) {
        try {
          const resumeEventAtUtc = new Date().toISOString()
          const resumeResponse = await focusSessionCommand('resume', {
            task_id: taskToStart.id,
            expected_version: fallbackExpectedVersion,
            event_at_utc: resumeEventAtUtc,
          })
          if (!resumeResponse) {
            onSignOut?.()
            return true
          }

          applyFocusSessionEnvelope(resumeResponse)
          setIsFocusRunning(true)
          if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== taskToStart.id) {
            runNonBlockingFocusSideEffect(() => startFocusSessionMeta(taskToStart))
          }
          return true
        } catch (resumeFallbackError) {
          const resumeFallbackHandled = await handleFocusSessionApiError(resumeFallbackError, { refreshTasksOnNotFound: true })
          if (!resumeFallbackHandled.handled) {
            console.error(
              'Failed fallback resume while recovering start conflict',
              { taskId: taskToStart.id, fallbackExpectedVersion },
              resumeFallbackError,
            )
          }
          if (resumeFallbackHandled.handled && resumeFallbackHandled.kind === 'conflict') {
            const conflictSession = resumeFallbackHandled.conflict.data.active_focus_session
            if (conflictSession) {
              applyFocusSessionEnvelope({
                data: {
                  server_now_utc: resumeFallbackHandled.conflict.data.server_now_utc || new Date().toISOString(),
                  active_focus_session: conflictSession,
                },
              })
              alignActiveTaskState(conflictSession.task_id)
              return true
            }
          }
        }
      }
    }

    if (!sessionToRecover) {
      return false
    }

    if (sessionToRecover.task_id !== taskToStart.id) {
      alignActiveTaskState(sessionToRecover.task_id)
      return true
    }

    setTimerMode(sessionToRecover.timer_mode)
    if (isSessionRunningState(sessionToRecover.session_state)) {
      setIsFocusRunning(true)
      if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== taskToStart.id) {
        runNonBlockingFocusSideEffect(() => startFocusSessionMeta(taskToStart))
      }
      return true
    }

    try {
      const resumeEventAtUtc = new Date().toISOString()
      const resumeResponse = await focusSessionCommand('resume', {
        task_id: sessionToRecover.task_id,
        expected_version: Math.max(1, Math.floor(sessionToRecover.version)),
        event_at_utc: resumeEventAtUtc,
      })
      if (!resumeResponse) {
        onSignOut?.()
        return true
      }

      applyFocusSessionEnvelope(resumeResponse)
      setIsFocusRunning(true)
      if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== taskToStart.id) {
        runNonBlockingFocusSideEffect(() => startFocusSessionMeta(taskToStart))
      }
      return true
    } catch (resumeError) {
      const resumeHandled = await handleFocusSessionApiError(resumeError, { refreshTasksOnNotFound: true })
      if (!resumeHandled.handled) {
        console.error('Failed to recover start conflict via resume', { taskId: taskToStart.id }, resumeError)
      }
      return true
    }
  }

  const localizedTaskList = useMemo(() => taskList.map((task) => localizeStaticTaskTitle(task, locale)), [locale, taskList])
  const activeTaskDisplay = useMemo(
    () => (activeTask ? localizeStaticTaskTitle(activeTask, locale) : null),
    [activeTask, locale],
  )
  const canStopWithoutAuthoritativeSession = useMemo(() => {
    if (!activeTask) {
      return false
    }

    const runtimeSnapshot = latestServerTasksByIdRef.current[activeTask.id] ?? null
    const runtimeState = normalizeTaskRuntimeState(runtimeSnapshot?.state)
    return runtimeState === 'working' || runtimeState === 'paused'
  }, [activeTask, taskList])
  const canStopFocus =
    Boolean(activeFocusSession) || sessionElapsedSeconds > 0 || canStopWithoutAuthoritativeSession
  const isActiveTaskCooldownActive = Boolean(activeTask && isTaskCooldownActive(activeTask.id) && !isFocusRunning)
  const activeWorkspaceAccentColor = activeTask?.colorTag ?? 'blue'
  const workspaceAccentRgb = workspaceAccentRgbByColor[activeWorkspaceAccentColor]
  const carouselTaskList = useMemo(
    () =>
      localizedTaskList.map((task) => {
        const isSelectedTask = Boolean(activeTask && task.id === activeTask.id)
        const baseTrackedSeconds = parseDurationLabelToSeconds(task.duration)
        const liveTrackedSeconds =
          isSelectedTask && isFocusRunning
            ? getLiveTrackedDeltaSecondsForTask(task.id, { includeLocalFallback: true })
            : 0
        const nextTrackedSeconds = baseTrackedSeconds + liveTrackedSeconds
        const nextDurationLabel = formatSecondsHms(nextTrackedSeconds)

        if (nextDurationLabel === task.duration) {
          return task
        }

        return {
          ...task,
          duration: nextDurationLabel,
        }
      }),
    [
      activeFocusSession?.elapsed_seconds_total,
      activeFocusSession?.id,
      activeFocusSession?.session_state,
      activeFocusSession?.task_id,
      activeTask,
      isFocusRunning,
      localizedTaskList,
      sessionElapsedSeconds,
    ],
  )
  const sidebarLogEntries = useMemo(() => {
    if (!activeUntrackedSession) {
      return localizedDailyLogEntries
    }

    try {
      const liveUntrackedDuration = formatLogDurationFromSeconds(
        Math.max(0, Math.floor((Date.now() - activeUntrackedSession.startedAtMs) / 1000)),
      )
      const matchingBackendUntrackedEntryIndex = localizedDailyLogEntries.findIndex(
        (entry) =>
          !entry.taskId &&
          entry.date === activeUntrackedSession.dateKey &&
          entry.start === activeUntrackedSession.startLabel,
      )

      if (matchingBackendUntrackedEntryIndex >= 0) {
        return sortLogEntriesByTime(
          localizedDailyLogEntries.map((entry, index) =>
            index === matchingBackendUntrackedEntryIndex
              ? {
                ...entry,
                duration: liveUntrackedDuration,
                activity: copy.untrackedTime,
                tone: 'faded',
                endedAtMs: Date.now(),
              }
              : entry,
          ),
        )
      }

      return sortLogEntriesByTime([
        ...localizedDailyLogEntries,
        {
          id: 'log-live-untracked',
          date: activeUntrackedSession.dateKey,
          start: activeUntrackedSession.startLabel,
          duration: liveUntrackedDuration,
          activity: copy.untrackedTime,
          tone: 'faded',
          startedAtMs: activeUntrackedSession.startedAtMs,
          endedAtMs: Date.now(),
        },
      ])
    } catch {
      return localizedDailyLogEntries
    }
  }, [activeUntrackedSession, copy.untrackedTime, localizedDailyLogEntries])

  useEffect(() => {
    if (ENABLE_FOCUS_RUNTIME_HTTP_SYNC) {
      void syncActiveFocusSession()
    }
    void refreshTasksFromServer()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (ENABLE_FOCUS_RUNTIME_HTTP_SYNC) {
          void syncActiveFocusSession()
        }
        void refreshTasksFromServer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // Mount-only subscription for M5 sync; callback reads latest refs/state via closures on re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeFocusSession) {
      timerCompleteStopRequestKeyRef.current = null
      return
    }

    setActiveFocusSessionMeta((current) => {
      if (current && current.taskId === activeFocusSession.task_id) {
        return current
      }

      const snapshotDate = new Date(activeFocusSession.started_at_utc)
      const fallbackDate = Number.isFinite(snapshotDate.getTime()) ? snapshotDate : new Date()

      return {
        taskId: activeFocusSession.task_id,
        startLabel: formatLogStartTime(fallbackDate, effectiveTimeZone),
        dateKey: formatLocalDateKey(fallbackDate, effectiveTimeZone),
      }
    })
  }, [activeFocusSession, effectiveTimeZone, setActiveFocusSessionMeta])

  useEffect(() => {
    if (!ENABLE_FOCUS_RUNTIME_HEARTBEAT) {
      return
    }

    if (!activeFocusSession || !isSessionRunningState(activeFocusSession.session_state)) {
      return
    }

    const intervalId = window.setInterval(async () => {
      if (isFocusCommandInFlightRef.current) {
        return
      }

      try {
        const response = await focusSessionCommand('heartbeat', {
          expected_version: activeFocusSession.version,
        })
        if (!response) {
          onSignOut?.()
          return
        }

        applyFocusSessionEnvelope(response)
      } catch (error) {
        const handled = await handleFocusSessionApiError(error)
        if (!handled.handled) {
          console.error('Focus session heartbeat failed', error)
        }
      }
    }, 20000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeFocusSession, onSignOut])

  useEffect(() => {
    if (timerMode !== 'timer' || !isFocusRunning || !activeTaskTargetSeconds || !activeFocusSession) {
      return
    }

    if (sessionElapsedSeconds >= activeTaskTargetSeconds) {
      const sessionTaskId = activeFocusSession.task_id
      const requestKey = `${sessionTaskId}:${Math.max(1, Math.floor(activeFocusSession.version))}`
      if (timerCompleteStopRequestKeyRef.current === requestKey) {
        return
      }

      const elapsedBeforeStop = sessionElapsedSeconds
      const trackedBeforeStopSeconds = getTaskTrackedSecondsSnapshot(sessionTaskId)
      const elapsedAtTimerCompletionSeconds = Math.max(0, Math.floor(activeTaskTargetSeconds))
      const optimisticTrackedAfterStopSeconds = getOptimisticTrackedSecondsAfterFreeze(sessionTaskId, {
        session: activeFocusSession,
        elapsedSeconds: elapsedAtTimerCompletionSeconds,
      })
      const rollbackSession = activeFocusSession

        ; (async () => {
          if (isFocusCommandInFlightRef.current) {
            return
          }

          timerCompleteStopRequestKeyRef.current = requestKey
          isFocusCommandInFlightRef.current = true
          try {
            // If the effect runs late, backdate by the whole-second overrun so backend closes at timer-complete instant.
            const overrunSeconds = Math.max(0, sessionElapsedSeconds - activeTaskTargetSeconds)
            const timerCompletedAtMs = Date.now() - overrunSeconds * 1000
            const timerCompletedStopEventAtUtc = new Date(timerCompletedAtMs).toISOString()
            ensureTaskTrackedDurationAtLeast(sessionTaskId, optimisticTrackedAfterStopSeconds)
            seedElapsedSnapshotForTaskMode(sessionTaskId, 'timer', elapsedAtTimerCompletionSeconds)
            applyAuthoritativeFocusSnapshot(timerCompletedStopEventAtUtc, {
              ...activeFocusSession,
              session_state: 'paused',
              elapsed_seconds_total: elapsedAtTimerCompletionSeconds,
              last_paused_at_utc: timerCompletedStopEventAtUtc,
            })
            setSessionElapsedSeconds(elapsedAtTimerCompletionSeconds)
            setIsFocusRunning(false)
            startTaskCooldown(sessionTaskId)
            triggerTimerEndAlarm()
            const response = await focusSessionCommand('stop', {
              task_id: sessionTaskId,
              expected_version: activeFocusSession.version,
              event_at_utc: timerCompletedStopEventAtUtc,
              stop_reason: 'stopped',
            })

            if (!response) {
              onSignOut?.()
              return
            }

            const createdTimeEntryId = response.data.created_time_entry_id ?? null
            const didRefreshFromServer = await handleCreatedTimeEntryInvalidation(createdTimeEntryId)
            applyFocusSessionEnvelope(response)

            const completedSeconds =
              response.data.stopped_session_summary?.elapsed_seconds_final ??
              Math.min(elapsedBeforeStop, activeTaskTargetSeconds)
            setSessionElapsedSeconds(Math.max(0, completedSeconds))
            setIsFocusRunning(false)
            ensureTaskTrackedDurationAtLeast(
              sessionTaskId,
              Math.max(
                optimisticTrackedAfterStopSeconds,
                trackedBeforeStopSeconds,
                trackedBeforeStopSeconds + Math.max(0, Math.floor(completedSeconds)),
              ),
            )
            if (!createdTimeEntryId || !didRefreshFromServer) {
              commitCurrentFocusSession(completedSeconds, { baselineTrackedSeconds: trackedBeforeStopSeconds })
            } else {
              setActiveFocusSessionMeta(null)
            }
          } catch (error) {
            const handled = await handleFocusSessionApiError(error)
            if (!handled.handled) {
              if (error instanceof ApiHttpError && error.status === 422) {
                console.warn('Auto timer-complete stop was rejected by backend; skipping further automatic retries for this session version.', {
                  status: error.status,
                  body: error.body,
                })
              } else {
                console.error('Failed to stop focus session after timer completion', error)
                clearTaskCooldown(sessionTaskId)
                applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? new Date().toISOString(), rollbackSession)
                setSessionElapsedSeconds(Math.max(0, Math.floor(elapsedBeforeStop)))
                // Allow retry for transient/non-validation failures.
                timerCompleteStopRequestKeyRef.current = null
              }
            }
          } finally {
            isFocusCommandInFlightRef.current = false
          }
        })()
    }
  }, [
    activeFocusSession,
    activeTaskTargetSeconds,
    handleFocusSessionApiError,
    lastServerNowUtc,
    isFocusRunning,
    onSignOut,
    applyAuthoritativeFocusSnapshot,
    clearTaskCooldown,
    ensureTaskTrackedDurationAtLeast,
    getOptimisticTrackedSecondsAfterFreeze,
    getTaskTrackedSecondsSnapshot,
    seedElapsedSnapshotForTaskMode,
    sessionElapsedSeconds,
    timerMode,
  ])

  const handleConfirmDeleteTask = async () => {
    if (!taskPendingDelete || isDeleteTaskSubmitting) {
      return
    }

    const deletingTaskId = taskPendingDelete.id
    const deletingTaskVersion =
      typeof taskPendingDelete.version === 'number' && Number.isFinite(taskPendingDelete.version)
        ? Math.max(1, Math.floor(taskPendingDelete.version))
        : 1

    setIsDeleteTaskSubmitting(true)
    try {
      const result = await deleteTaskApi(deletingTaskId, { ifVersion: deletingTaskVersion })
      if (!result) {
        onSignOut?.()
        return
      }

      applyTaskRemovalFromUi(deletingTaskId)
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 401) {
          onSignOut?.()
          return
        }

        if (error.status === 404) {
          applyTaskRemovalFromUi(deletingTaskId)
          return
        }

        if (error.status === 409) {
          const conflict = getTaskVersionConflictFromApiError(error)
          console.warn('Task version conflict during delete. Refreshing tasks from server.', conflict ?? error)
          try {
            await refreshTasksFromServer()
          } catch (refreshError) {
            console.error('Failed to refresh tasks after delete conflict', refreshError)
          }
          return
        }
      }

      console.error('Failed to delete task', { taskId: deletingTaskId }, error)
    } finally {
      if (isMountedRef.current) {
        setIsDeleteTaskSubmitting(false)
      }
    }
  }
  const startFocusSessionMeta = (task: Task) => {
    const now = new Date()
    setActiveFocusSessionMeta({
      taskId: task.id,
      startLabel: formatLogStartTime(now, effectiveTimeZone),
      dateKey: formatLocalDateKey(now, effectiveTimeZone),
    })
  }
  const handleStartUntrackedSession = () => {
    const now = new Date()
    setActiveUntrackedSession((current) =>
      current ?? {
        startedAtMs: now.getTime(),
        startLabel: formatLogStartTime(now, effectiveTimeZone),
        dateKey: formatLocalDateKey(now, effectiveTimeZone),
      },
    )
  }
  const handleFinishUntrackedSession = async () => {
    const currentSession = activeUntrackedSession
    if (!currentSession) {
      shouldAwaitBackendUntrackedCloseRef.current = false
      return
    }

    const endedAtMs = Date.now()
    const elapsedSeconds = Math.max(0, Math.floor((endedAtMs - currentSession.startedAtMs) / 1000))
    setActiveUntrackedSession(null)
    const shouldAwaitBackendUntrackedClose = shouldAwaitBackendUntrackedCloseRef.current
    shouldAwaitBackendUntrackedCloseRef.current = false

    if (elapsedSeconds <= 0) {
      return
    }

    if (shouldAwaitBackendUntrackedClose) {
      shouldSyncDailyLogAfterIdleCloseRef.current = true
      return
    }

    const nextEntry: LogEntry = {
      id: `log-untracked-${crypto.randomUUID()}`,
      date: currentSession.dateKey,
      start: currentSession.startLabel,
      duration: formatLogDurationFromSeconds(elapsedSeconds),
      activity: copy.untrackedTime,
      tone: 'faded',
      startedAtMs: currentSession.startedAtMs,
      endedAtMs,
    }

    setDailyLogEntries((currentEntries) => sortLogEntriesByTime([...currentEntries, nextEntry]))

    try {
      const payload = buildUntrackedCreateTimeEntryPayloadFromSession({
        startedAtMs: currentSession.startedAtMs,
        endedAtMs,
      })
      if (!payload) {
        return
      }

      if (!ENABLE_UNTRACKED_TIME_ENTRIES_PERSIST || timeEntriesEndpointMissingRef.current) {
        return
      }

      const created = await createTimeEntry(payload)
      if (!created) {
        onSignOut?.()
        return
      }

      await handleCreatedTimeEntryInvalidation(created.id)
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 401) {
          onSignOut?.()
          return
        }

        if (error.status === 404) {
          timeEntriesEndpointMissingRef.current = true
          if (!hasLoggedMissingTimeEntriesEndpointRef.current) {
            hasLoggedMissingTimeEntriesEndpointRef.current = true
            console.warn(
              '[focus-untracked] Skipping /api/v1/time-entries persistence because endpoint is unavailable (404).',
            )
          }
          return
        }
      }

      console.error('Failed to persist untracked time entry', error)
    }
  }
  const scheduleFinishUntrackedSession = () => {
    shouldAwaitBackendUntrackedCloseRef.current = true
    window.setTimeout(() => {
      runNonBlockingFocusSideEffect(handleFinishUntrackedSession)
    }, 0)
  }
  const commitCurrentFocusSession = (
    elapsedSecondsOverride?: number,
    options: { baselineTrackedSeconds?: number } = {},
  ) => {
    const elapsedSeconds =
      typeof elapsedSecondsOverride === 'number' && Number.isFinite(elapsedSecondsOverride)
        ? Math.max(0, Math.floor(elapsedSecondsOverride))
        : sessionElapsedSeconds
    const baselineTrackedSeconds =
      typeof options.baselineTrackedSeconds === 'number' && Number.isFinite(options.baselineTrackedSeconds)
        ? Math.max(0, Math.floor(options.baselineTrackedSeconds))
        : null

    if (!activeTask || elapsedSeconds <= 0) {
      return
    }

    if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
      return
    }

    const durationLabel = formatLogDurationFromSeconds(elapsedSeconds)
    const endedAtMs = Date.now()
    const startedAtMs = Math.max(0, endedAtMs - elapsedSeconds * 1000)
    const nextEntry: LogEntry = {
      id: `log-focus-${crypto.randomUUID()}`,
      date: activeFocusSessionMeta.dateKey,
      start: activeFocusSessionMeta.startLabel,
      duration: durationLabel,
      taskId: activeTask.id,
      startedAtMs,
      endedAtMs,
    }

    setDailyLogEntries((currentEntries) => sortLogEntriesByTime([...currentEntries, nextEntry]))
    setTaskList((currentTasks) =>
      currentTasks.map((task) =>
        task.id === activeTask.id
          ? (() => {
            const currentTrackedSeconds = parseDurationLabelToSeconds(task.duration)
            const proposedTrackedSeconds =
              baselineTrackedSeconds === null
                ? currentTrackedSeconds + elapsedSeconds
                : Math.max(currentTrackedSeconds, baselineTrackedSeconds + elapsedSeconds)
            const safeTrackedSeconds = Math.max(currentTrackedSeconds, proposedTrackedSeconds)
            return {
              ...task,
              duration: formatSecondsHms(safeTrackedSeconds),
            }
          })()
          : task,
      ),
    )
    setActiveFocusSessionMeta(null)
  }
  const resolveTimerModeForTask = (task: Task, requestedMode?: FocusTimerMode): FocusTimerMode => {
    const fallbackMode = getPreferredTimerModeForTask(task)
    const candidateMode = requestedMode ?? fallbackMode

    if (candidateMode === 'timer' && !getTargetSecondsForStart(task, 'timer')) {
      return 'stopwatch'
    }

    return candidateMode
  }
  const activateTaskAndStartNewCount = async (
    selectedTask: Task,
    requestedMode?: FocusTimerMode,
    requestedStartTargetSeconds?: number | null,
  ) => {
    if (isFocusCommandInFlightRef.current) {
      return
    }

    runNonBlockingFocusSideEffect(stopTimerEndAlarm)
    scheduleFinishUntrackedSession()

    const selectedTaskRuntimeSnapshot = latestServerTasksByIdRef.current[selectedTask.id] ?? null
    const selectedTaskRuntimeState = normalizeTaskRuntimeState(selectedTaskRuntimeSnapshot?.state)
    const selectedTaskRuntimeMode: FocusTimerMode =
      selectedTaskRuntimeSnapshot?.active_mode === 'timer' ? 'timer' : 'stopwatch'
    const selectedTaskVersionForRuntimeCommand =
      activeFocusSession && activeFocusSession.task_id === selectedTask.id
        ? Math.max(1, Math.floor(activeFocusSession.version))
        : typeof selectedTaskRuntimeSnapshot?.version === 'number' && Number.isFinite(selectedTaskRuntimeSnapshot.version)
          ? Math.max(1, Math.floor(selectedTaskRuntimeSnapshot.version))
          : typeof selectedTask.version === 'number' && Number.isFinite(selectedTask.version)
            ? Math.max(1, Math.floor(selectedTask.version))
            : null

    let nextMode = resolveTimerModeForTask(
      selectedTask,
      selectedTaskRuntimeState && selectedTaskRuntimeState !== 'idle' ? selectedTaskRuntimeMode : requestedMode,
    )
    const normalizedRequestedStartTargetSeconds =
      typeof requestedStartTargetSeconds === 'number' &&
        Number.isFinite(requestedStartTargetSeconds) &&
        requestedStartTargetSeconds > 0
        ? Math.min(24 * 60 * 60, Math.floor(requestedStartTargetSeconds))
        : null
    const nextTargetSeconds =
      nextMode === 'timer'
        ? (normalizedRequestedStartTargetSeconds ?? getTargetSecondsForStart(selectedTask, 'timer'))
        : null
    let nextElapsedSeedSeconds = getElapsedSeedForTaskMode(selectedTask, nextMode)
    if (selectedTaskRuntimeSnapshot) {
      const runtimeSnapshotElapsed = resolveElapsedFromRuntimeTaskSnapshot(selectedTaskRuntimeSnapshot, nextMode)
      if (selectedTaskRuntimeState && selectedTaskRuntimeState !== 'idle') {
        nextElapsedSeedSeconds = Math.max(nextElapsedSeedSeconds, runtimeSnapshotElapsed)
      }
    }
    if (nextMode === 'timer' && nextTargetSeconds && nextElapsedSeedSeconds >= nextTargetSeconds) {
      nextElapsedSeedSeconds = 0
    }
    const elapsedBeforeSwitch = activeFocusSession ? sessionElapsedSeconds : 0

    const shouldResumeSelectedTask =
      selectedTaskRuntimeState === 'paused' ||
      Boolean(
        activeFocusSession &&
        activeFocusSession.task_id === selectedTask.id &&
        !isSessionRunningState(activeFocusSession.session_state),
      )
    if (!shouldResumeSelectedTask) {
      setWorkspaceGlowPulseKey((current) => current + 1)
    }
    if (shouldResumeSelectedTask && selectedTaskVersionForRuntimeCommand !== null) {
      isFocusCommandInFlightRef.current = true
      const resumeEventAtUtc = new Date().toISOString()
      const rollbackWasRunning = isFocusRunning
      const rollbackElapsedSeconds = sessionElapsedSeconds
      const rollbackTimerMode = timerMode
      const rollbackSession =
        (activeFocusSession && activeFocusSession.task_id === selectedTask.id ? activeFocusSession : null) ??
        (selectedTaskRuntimeSnapshot ? buildDerivedFocusSessionFromTask(selectedTaskRuntimeSnapshot) : null)
      const rollbackElapsedFromPausedSession =
        rollbackSession &&
          rollbackSession.task_id === selectedTask.id &&
          !isSessionRunningState(rollbackSession.session_state)
          ? Math.max(0, Math.floor(rollbackSession.elapsed_seconds_total))
          : null
      const optimisticResumeElapsedSeed =
        rollbackElapsedFromPausedSession !== null ? rollbackElapsedFromPausedSession : nextElapsedSeedSeconds
      const optimisticResumeElapsedSeconds =
        nextMode === 'timer' && nextTargetSeconds
          ? Math.max(0, Math.min(Math.floor(nextTargetSeconds), Math.floor(optimisticResumeElapsedSeed)))
          : Math.max(0, Math.floor(optimisticResumeElapsedSeed))

      alignActiveTaskState(selectedTask.id)
      if (rollbackSession) {
        applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? resumeEventAtUtc, {
          ...rollbackSession,
          timer_mode: nextMode,
          target_seconds: nextMode === 'timer' ? (nextTargetSeconds ?? rollbackSession.target_seconds ?? null) : null,
          session_state: 'working',
          last_resumed_at_utc: resumeEventAtUtc,
          last_paused_at_utc: null,
          elapsed_seconds_total: optimisticResumeElapsedSeconds,
        })
      } else {
        setTimerMode(nextMode)
        setSessionElapsedSeconds(optimisticResumeElapsedSeconds)
        setIsFocusRunning(true)
      }
      if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
        runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
      }

      try {
        const resumeResponse = await focusSessionCommand('resume', {
          task_id: selectedTask.id,
          expected_version: selectedTaskVersionForRuntimeCommand,
          event_at_utc: resumeEventAtUtc,
        })
        if (!resumeResponse) {
          onSignOut?.()
          return
        }

        applyFocusSessionEnvelope(resumeResponse)
        setIsFocusRunning(true)
        if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
          runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
        }
      } catch (error) {
        if (error instanceof ApiHttpError && error.status === 409) {
          console.warn('[diagnostic:taskcard-play] resume conflict', {
            taskId: selectedTask.id,
            expectedVersion: selectedTaskVersionForRuntimeCommand,
            status: error.status,
            body: error.body,
          })
        }
        const versionConflict = getTaskVersionConflictFromApiError(error)
        const conflictTaskId =
          typeof versionConflict?.data.current.id === 'string' && versionConflict.data.current.id.trim()
            ? versionConflict.data.current.id
            : selectedTask.id
        const conflictVersion =
          typeof versionConflict?.data.current.version === 'number' && Number.isFinite(versionConflict.data.current.version)
            ? Math.max(1, Math.floor(versionConflict.data.current.version))
            : null
        if (conflictVersion !== null && conflictTaskId === selectedTask.id) {
          syncTaskVersionFromConflict(selectedTask.id, conflictVersion)
          try {
            const retryResumeAtUtc = new Date().toISOString()
            const retryResponse = await focusSessionCommand('resume', {
              task_id: selectedTask.id,
              expected_version: conflictVersion,
              event_at_utc: retryResumeAtUtc,
            })
            if (!retryResponse) {
              onSignOut?.()
              return
            }

            applyFocusSessionEnvelope(retryResponse)
            setIsFocusRunning(true)
            if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
              runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
            }
            return
          } catch (retryError) {
            error = retryError
          }
        }

        const handled = await handleFocusSessionApiError(error, { refreshTasksOnNotFound: true })
        if (handled.handled && handled.kind === 'conflict') {
          const conflictSession = handled.conflict.data.active_focus_session
          if (
            conflictSession &&
            conflictSession.task_id === selectedTask.id &&
            !isSessionRunningState(conflictSession.session_state)
          ) {
            try {
              const retryResumeAtUtc = new Date().toISOString()
              const retryResponse = await focusSessionCommand('resume', {
                task_id: selectedTask.id,
                expected_version: Math.max(1, Math.floor(conflictSession.version)),
                event_at_utc: retryResumeAtUtc,
              })
              if (!retryResponse) {
                onSignOut?.()
                return
              }

              applyFocusSessionEnvelope(retryResponse)
              setIsFocusRunning(true)
              if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
                runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
              }
              return
            } catch (retryConflictError) {
              if (retryConflictError instanceof ApiHttpError && retryConflictError.status === 409) {
                console.warn('[diagnostic:taskcard-play] resume conflict(retry_from_conflict)', {
                  taskId: selectedTask.id,
                  status: retryConflictError.status,
                  body: retryConflictError.body,
                })
              }
              error = retryConflictError
            }
          }
          if (!conflictSession) {
            setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
            setTimerMode(rollbackTimerMode)
            setIsFocusRunning(rollbackWasRunning)
          }
          return
        }
        if (!handled.handled) {
          if (rollbackSession) {
            applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? resumeEventAtUtc, {
              ...rollbackSession,
              elapsed_seconds_total: Math.max(0, Math.floor(rollbackElapsedSeconds)),
            })
          }
          setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
          setTimerMode(rollbackTimerMode)
          setIsFocusRunning(rollbackWasRunning)
          console.error('Failed to resume selected paused task before start flow', { taskId: selectedTask.id }, error)
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }
      return
    }

    if (!activeFocusSession) {
      setTaskList((currentTasks) =>
        currentTasks.map((task) => {
          if (task.id === selectedTask.id) {
            return { ...task, state: 'active' }
          }

          if (task.state === 'active') {
            return { ...task, state: 'scheduled' }
          }

          return task
        }),
      )
      const rollbackWasRunning = isFocusRunning
      const rollbackElapsedSeconds = sessionElapsedSeconds
      const rollbackTimerMode = timerMode
      setSessionElapsedSeconds(nextElapsedSeedSeconds)
      setTimerMode(nextMode)
      setIsFocusRunning(true)
      if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
        runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
      }

      isFocusCommandInFlightRef.current = true
      try {
        const startEventAtUtc = new Date().toISOString()
        const response = await startFocusSession({
          task_id: selectedTask.id,
          timer_mode: nextMode,
          elapsed_seconds_seed: nextElapsedSeedSeconds,
          event_at_utc: startEventAtUtc,
        })

        if (!response) {
          onSignOut?.()
          return
        }

        applyFocusSessionEnvelope(response)
        runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
        setIsFocusRunning(true)
      } catch (error) {
        const handled = await handleFocusSessionApiError(error, { refreshTasksOnNotFound: true })
        if (handled.handled && handled.kind === 'conflict') {
          const recovered = await recoverFromStartConflict(handled.conflict.data.active_focus_session, selectedTask)
          if (recovered) {
            return
          }
        }

        if (!handled.handled) {
          setIsFocusRunning(rollbackWasRunning)
          setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
          setTimerMode(rollbackTimerMode)
          console.error('Failed to start focus session for selected task', { taskId: selectedTask.id }, error)
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }

      return
    }

    if (!isSessionRunningState(activeFocusSession.session_state)) {
      if (activeFocusSession.task_id !== selectedTask.id) {
        isFocusCommandInFlightRef.current = true
        const rollbackWasRunning = isFocusRunning
        const rollbackElapsedSeconds = sessionElapsedSeconds
        const rollbackTimerMode = timerMode
        const rollbackSession = activeFocusSession

        setTaskList((currentTasks) =>
          currentTasks.map((task) => {
            if (task.id === selectedTask.id) {
              return { ...task, state: 'active' }
            }

            if (task.state === 'active') {
              return { ...task, state: 'scheduled' }
            }

            return task
          }),
        )
        setSessionElapsedSeconds(nextElapsedSeedSeconds)
        setTimerMode(nextMode)
        setIsFocusRunning(true)
        if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
          runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
        }

        try {
          const startEventAtUtc = new Date().toISOString()
          const response = await startFocusSession({
            task_id: selectedTask.id,
            timer_mode: nextMode,
            elapsed_seconds_seed: nextElapsedSeedSeconds,
            event_at_utc: startEventAtUtc,
          })

          if (!response) {
            onSignOut?.()
            return
          }

          applyFocusSessionEnvelope(response)
          runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
          setIsFocusRunning(true)
        } catch (error) {
          const handled = await handleFocusSessionApiError(error, { refreshTasksOnNotFound: true })
          if (handled.handled && handled.kind === 'conflict') {
            const recovered = await recoverFromStartConflict(handled.conflict.data.active_focus_session, selectedTask)
            if (recovered) {
              return
            }
          }

          if (!handled.handled) {
            applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? new Date().toISOString(), rollbackSession)
            alignActiveTaskState(rollbackSession.task_id)
            setIsFocusRunning(rollbackWasRunning)
            setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
            setTimerMode(rollbackTimerMode)
            console.error('Failed to start focus session from paused different task', { taskId: selectedTask.id }, error)
          }
        } finally {
          isFocusCommandInFlightRef.current = false
        }

        return
      }

      isFocusCommandInFlightRef.current = true
      const resumeEventAtUtc = new Date().toISOString()
      const rollbackWasRunning = isFocusRunning
      const rollbackElapsedSeconds = sessionElapsedSeconds
      const rollbackTimerMode = timerMode
      const rollbackSession = activeFocusSession
      const resumeExpectedVersion =
        typeof selectedTask.version === 'number' && Number.isFinite(selectedTask.version)
          ? Math.max(1, Math.floor(selectedTask.version))
          : Math.max(1, Math.floor(activeFocusSession.version))

      alignActiveTaskState(selectedTask.id)
      setTimerMode(nextMode)
      setSessionElapsedSeconds(Math.max(0, Math.floor(nextElapsedSeedSeconds)))
      setIsFocusRunning(true)
      if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
        runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
      }

      try {
        const resumeResponse = await focusSessionCommand('resume', {
          task_id: selectedTask.id,
          expected_version: resumeExpectedVersion,
          event_at_utc: resumeEventAtUtc,
        })
        if (!resumeResponse) {
          onSignOut?.()
          return
        }

        applyFocusSessionEnvelope(resumeResponse)
        setIsFocusRunning(true)
        if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== selectedTask.id) {
          runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
        }
      } catch (error) {
        const handled = await handleFocusSessionApiError(error, { refreshTasksOnNotFound: true })
        if (!handled.handled) {
          applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? resumeEventAtUtc, {
            ...rollbackSession,
            elapsed_seconds_total: Math.max(0, Math.floor(rollbackElapsedSeconds)),
          })
          alignActiveTaskState(rollbackSession.task_id)
          setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
          setTimerMode(rollbackTimerMode)
          setIsFocusRunning(rollbackWasRunning)
          console.error('Failed to resume paused focus session while activating task', { taskId: selectedTask.id }, error)
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }

      return
    }

    isFocusCommandInFlightRef.current = true
    try {
      const previousSessionTaskId = activeFocusSession.task_id
      const previousSessionMode = activeFocusSession.timer_mode
      const switchStopEventAtUtc = new Date().toISOString()
      const stopResponse = await focusSessionCommand('stop', {
        task_id: previousSessionTaskId,
        expected_version: activeFocusSession.version,
        event_at_utc: switchStopEventAtUtc,
        stop_reason: 'task_switch',
      })

      if (!stopResponse) {
        onSignOut?.()
        return
      }

      const stopCreatedTimeEntryId = stopResponse.data.created_time_entry_id ?? null
      const stopDidRefreshFromServer = stopCreatedTimeEntryId
        ? await handleCreatedTimeEntryInvalidation(stopCreatedTimeEntryId)
        : false

      if (elapsedBeforeSwitch > 0 && (!stopCreatedTimeEntryId || !stopDidRefreshFromServer)) {
        runNonBlockingFocusSideEffect(() => commitCurrentFocusSession(elapsedBeforeSwitch))
      } else if (stopCreatedTimeEntryId) {
        setActiveFocusSessionMeta(null)
      }

      applyFocusSessionEnvelope(stopResponse)
      setSessionElapsedSeconds(0)
      setIsFocusRunning(false)
      resetCountersAfterStop(previousSessionTaskId, previousSessionMode)
      if (previousSessionTaskId !== selectedTask.id && previousSessionMode === 'stopwatch') {
        startTaskCooldown(previousSessionTaskId)
      }

      const startEventAtUtc = new Date().toISOString()
      const startResponse = await startFocusSession({
        task_id: selectedTask.id,
        timer_mode: nextMode,
        elapsed_seconds_seed: nextElapsedSeedSeconds,
        event_at_utc: startEventAtUtc,
      })
      if (!startResponse) {
        onSignOut?.()
        return
      }

      applyFocusSessionEnvelope(startResponse)
      setSessionElapsedSeconds(0)
      setTimerMode(nextMode)
      runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
      setIsFocusRunning(true)
    } catch (error) {
      const handled = await handleFocusSessionApiError(error, { refreshTasksOnNotFound: true })
      if (!handled.handled) {
        console.error('Failed to switch active focus session task', { taskId: selectedTask.id }, error)
      }
    } finally {
      isFocusCommandInFlightRef.current = false
    }
  }
  const handleToggleFocus = async (
    requestedStartMode?: FocusTimerMode,
    requestedStartTargetSeconds?: number,
  ) => {
    if (!activeTask) {
      return
    }

    const isSessionCurrentlyRunning = isSessionRunningState(activeFocusSession?.session_state) || isFocusRunning
    if (!isSessionCurrentlyRunning && isTaskCooldownActive(activeTask.id)) {
      return
    }

    const normalizedRequestedStartTargetSeconds =
      typeof requestedStartTargetSeconds === 'number' &&
        Number.isFinite(requestedStartTargetSeconds) &&
        requestedStartTargetSeconds > 0
        ? Math.min(24 * 60 * 60, Math.round(requestedStartTargetSeconds))
        : null

    runNonBlockingFocusSideEffect(stopTimerEndAlarm)

    if (isFocusCommandInFlightRef.current) {
      return
    }

    // Local-first play/resume path: do not wait for a backend preflight lookup when no session is running.
    if (!isSessionCurrentlyRunning) {
      await activateTaskAndStartNewCount(activeTask, requestedStartMode, normalizedRequestedStartTargetSeconds)
      return
    }

    let activeSessionForCommand = activeFocusSession
    const fallbackRuntimeSnapshotForActiveTask = latestServerTasksByIdRef.current[activeTask.id] ?? null
    const fallbackRuntimeStateForActiveTask = normalizeTaskRuntimeState(fallbackRuntimeSnapshotForActiveTask?.state)
    const shouldBypassAuthoritativeLookupForIdleStart =
      !activeSessionForCommand &&
      !isFocusRunning &&
      (!fallbackRuntimeStateForActiveTask || fallbackRuntimeStateForActiveTask === 'idle')
    if (!activeSessionForCommand) {
      if (!shouldBypassAuthoritativeLookupForIdleStart) {
        try {
          activeSessionForCommand = await ensureAuthoritativeSessionForCommand()
        } catch (error) {
          const handled = await handleFocusSessionApiError(error)
          if (handled.handled && handled.kind === 'conflict') {
            activeSessionForCommand = handled.conflict.data.active_focus_session
          } else if (!handled.handled) {
            console.error('Failed to hydrate active focus session before runtime command', error)
            return
          }
        }
      }

      if (!activeSessionForCommand) {
        const fallbackExpectedVersion =
          typeof activeTask.version === 'number' && Number.isFinite(activeTask.version)
            ? Math.max(1, Math.floor(activeTask.version))
            : null

        if (isFocusRunning && fallbackExpectedVersion !== null) {
          isFocusCommandInFlightRef.current = true
          const pauseEventAtUtc = new Date().toISOString()
          const previousLocalRunningState = isFocusRunning
          const optimisticTrackedAfterPauseSeconds = getOptimisticTrackedSecondsAfterFreeze(activeTask.id, {
            session: null,
            elapsedSeconds: sessionElapsedSeconds,
            includeLocalFallback: true,
          })
          ensureTaskTrackedDurationAtLeast(activeTask.id, optimisticTrackedAfterPauseSeconds)
          setIsFocusRunning(false)
          try {
            const response = await focusSessionCommand('pause', {
              expected_version: fallbackExpectedVersion,
              event_at_utc: pauseEventAtUtc,
              time_zone_name: effectiveTimeZone,
            })

            if (!response) {
              onSignOut?.()
              return
            }

            applyFocusSessionEnvelope(response)
            await ensureDailyLogSnapshotFromPauseResponse(response)
            setIsFocusRunning(false)
            if ((activeSessionForCommand?.timer_mode ?? fallbackRuntimeModeForActiveTask) === 'stopwatch') {
              startTaskCooldown(activeTask.id)
            }
            runNonBlockingFocusSideEffect(handleStartUntrackedSession)
          } catch (error) {
            const handled = await handleFocusSessionApiError(error)
            if (!handled.handled) {
              setIsFocusRunning(previousLocalRunningState)
              console.error(
                'Failed to pause focus session using task version fallback',
                { taskId: activeTask.id, fallbackExpectedVersion },
                error,
              )
            }
          } finally {
            isFocusCommandInFlightRef.current = false
          }
          return
        }

        const shouldAttemptFallbackResume =
          !isFocusRunning &&
          fallbackExpectedVersion !== null &&
          fallbackRuntimeStateForActiveTask === 'paused'
        if (shouldAttemptFallbackResume) {
          isFocusCommandInFlightRef.current = true
          const previousLocalRunningState = isFocusRunning
          setIsFocusRunning(true)
          let didRecoverViaResume = false
          try {
            const resumeEventAtUtc = new Date().toISOString()
            const response = await focusSessionCommand('resume', {
              task_id: activeTask.id,
              expected_version: fallbackExpectedVersion,
              event_at_utc: resumeEventAtUtc,
            })

            if (!response) {
              onSignOut?.()
              return
            }

            applyFocusSessionEnvelope(response)
            setIsFocusRunning(true)
            didRecoverViaResume = true
            if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
              runNonBlockingFocusSideEffect(() => startFocusSessionMeta(activeTask))
            }
          } catch (error) {
            const handled = await handleFocusSessionApiError(error)
            if (handled.handled && handled.kind === 'conflict') {
              const conflictSession = handled.conflict.data.active_focus_session
              if (conflictSession) {
                if (conflictSession.task_id === activeTask.id) {
                  setTimerMode(conflictSession.timer_mode)
                  setIsFocusRunning(isSessionRunningState(conflictSession.session_state))
                } else {
                  alignActiveTaskState(conflictSession.task_id)
                }
                didRecoverViaResume = true
              } else {
                setIsFocusRunning(previousLocalRunningState)
              }
            }

            if (!handled.handled) {
              setIsFocusRunning(previousLocalRunningState)
              console.error(
                'Failed to resume focus session using task version fallback',
                { taskId: activeTask.id, fallbackExpectedVersion },
                error,
              )
            }
          } finally {
            isFocusCommandInFlightRef.current = false
          }
          if (didRecoverViaResume) {
            return
          }
        }

        if (isFocusRunning) {
          console.warn('No authoritative focus session available for runtime control command.')
          return
        }
      }
    }

    if (activeSessionForCommand) {
      if (activeSessionForCommand.task_id !== activeTask.id) {
        alignActiveTaskState(activeSessionForCommand.task_id)
        return
      }

      const activeTaskVersionForCommand =
        typeof activeTask.version === 'number' && Number.isFinite(activeTask.version)
          ? Math.max(1, Math.floor(activeTask.version))
          : null
      const resolveExpectedVersionForCommand = (sessionVersion: number) =>
        activeTaskVersionForCommand !== null
          ? Math.max(Math.max(1, Math.floor(sessionVersion)), activeTaskVersionForCommand)
          : Math.max(1, Math.floor(sessionVersion))

      if (isSessionRunningState(activeSessionForCommand.session_state)) {
        isFocusCommandInFlightRef.current = true
        const optimisticPausedAtUtc = new Date().toISOString()
        const rollbackSession = activeSessionForCommand
        const rollbackElapsedSeconds = sessionElapsedSeconds
        const optimisticPausedElapsedSeconds = getElapsedSecondsAtClientEvent(
          activeSessionForCommand,
          optimisticPausedAtUtc,
          sessionElapsedSeconds,
        )
        const optimisticPausedSession: ActiveFocusSession = {
          ...activeSessionForCommand,
          session_state: 'paused',
          last_paused_at_utc: optimisticPausedAtUtc,
          elapsed_seconds_total: optimisticPausedElapsedSeconds,
        }
        const optimisticTrackedAfterPauseSeconds = getOptimisticTrackedSecondsAfterFreeze(
          activeSessionForCommand.task_id,
          {
            session: activeSessionForCommand,
            elapsedSeconds: optimisticPausedElapsedSeconds,
          },
        )
        ensureTaskTrackedDurationAtLeast(activeSessionForCommand.task_id, optimisticTrackedAfterPauseSeconds)
        applyAuthoritativeFocusSnapshot(optimisticPausedAtUtc, optimisticPausedSession)
        setSessionElapsedSeconds(optimisticPausedSession.elapsed_seconds_total)
        setIsFocusRunning(false)
        try {
          const pauseExpectedVersion = Math.max(1, Math.floor(activeSessionForCommand.version))
          let response = await focusSessionCommand('pause', {
            expected_version: pauseExpectedVersion,
            event_at_utc: optimisticPausedAtUtc,
            time_zone_name: effectiveTimeZone,
          })

          if (!response) {
            onSignOut?.()
            return
          }

          if (response.data.active_focus_session && activeSessionForCommand.timer_mode === 'stopwatch') {
            response = {
              ...response,
              data: {
                ...response.data,
                active_focus_session: {
                  ...response.data.active_focus_session,
                  // Keep pause frozen at click-time value; never drift backward on async response.
                  elapsed_seconds_total: optimisticPausedElapsedSeconds,
                },
              },
            }
          }

          applyFocusSessionEnvelope(response)
          await ensureDailyLogSnapshotFromPauseResponse(response)
          const pausedElapsedSeconds =
            response.data.active_focus_session &&
              typeof response.data.active_focus_session.elapsed_seconds_total === 'number' &&
              Number.isFinite(response.data.active_focus_session.elapsed_seconds_total)
              ? Math.max(0, Math.floor(response.data.active_focus_session.elapsed_seconds_total))
              : optimisticPausedSession.elapsed_seconds_total
          ensureTaskTrackedDurationAtLeast(
            activeSessionForCommand.task_id,
            Math.max(optimisticTrackedAfterPauseSeconds, pausedElapsedSeconds),
          )
          setIsFocusRunning(false)
          if (activeSessionForCommand.timer_mode === 'stopwatch') {
            startTaskCooldown(activeSessionForCommand.task_id)
          } else {
            clearTaskCooldown(activeSessionForCommand.task_id)
          }
          runNonBlockingFocusSideEffect(handleStartUntrackedSession)
        } catch (error) {
          const handled = await handleFocusSessionApiError(error)
          if (!handled.handled) {
            applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? optimisticPausedAtUtc, {
              ...rollbackSession,
              elapsed_seconds_total: Math.max(0, Math.floor(rollbackElapsedSeconds)),
            })
            setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
            setIsFocusRunning(isSessionRunningState(rollbackSession.session_state))
            console.error('Failed to pause focus session', error)
          }
        } finally {
          isFocusCommandInFlightRef.current = false
        }
        return
      }

      const requestedMode = resolveTimerModeForTask(activeTask, requestedStartMode ?? timerMode)
      if (requestedMode !== activeSessionForCommand.timer_mode) {
        await activateTaskAndStartNewCount(activeTask, requestedMode)
        return
      }

      scheduleFinishUntrackedSession()

      isFocusCommandInFlightRef.current = true
      const optimisticResumedAtUtc = new Date().toISOString()
      const rollbackSession = activeSessionForCommand
      const rollbackElapsedSeconds = sessionElapsedSeconds
      const optimisticWorkingSession: ActiveFocusSession = {
        ...activeSessionForCommand,
        session_state: 'working',
        last_resumed_at_utc: optimisticResumedAtUtc,
        last_paused_at_utc: null,
        elapsed_seconds_total: Math.max(0, Math.floor(sessionElapsedSeconds)),
      }
      applyAuthoritativeFocusSnapshot(optimisticResumedAtUtc, optimisticWorkingSession)
      setSessionElapsedSeconds(optimisticWorkingSession.elapsed_seconds_total)
      setIsFocusRunning(true)
      try {
        let response = await focusSessionCommand('resume', {
          task_id: activeTask.id,
          expected_version: resolveExpectedVersionForCommand(activeSessionForCommand.version),
          event_at_utc: optimisticResumedAtUtc,
        })

        if (!response) {
          onSignOut?.()
          return
        }

        if (requestedMode === 'timer' && response.data.active_focus_session) {
          const desiredTargetSeconds = normalizedRequestedStartTargetSeconds ?? getTargetSecondsForStart(activeTask, 'timer')
          if (
            desiredTargetSeconds &&
            response.data.active_focus_session.timer_mode === 'timer' &&
            response.data.active_focus_session.target_seconds !== desiredTargetSeconds
          ) {
            response = {
              ...response,
              data: {
                ...response.data,
                active_focus_session: {
                  ...response.data.active_focus_session,
                  target_seconds: desiredTargetSeconds,
                  elapsed_seconds_total: Math.min(response.data.active_focus_session.elapsed_seconds_total, desiredTargetSeconds),
                },
              },
            }
          }
        }

        applyFocusSessionEnvelope(response)
        setIsFocusRunning(true)

        if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
          runNonBlockingFocusSideEffect(() => startFocusSessionMeta(activeTask))
        }
      } catch (error) {
        let resumeError: unknown = error

        if (error instanceof ApiHttpError && error.status === 409) {
          try {
            const refreshedSession = await ensureAuthoritativeSessionForCommand()
            if (
              refreshedSession &&
              refreshedSession.task_id === activeTask.id &&
              !isSessionRunningState(refreshedSession.session_state)
            ) {
              const retryResponse = await focusSessionCommand('resume', {
                task_id: activeTask.id,
                expected_version: resolveExpectedVersionForCommand(refreshedSession.version),
                event_at_utc: optimisticResumedAtUtc,
              })
              if (!retryResponse) {
                onSignOut?.()
                return
              }

              applyFocusSessionEnvelope(retryResponse)
              setIsFocusRunning(true)

              if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
                runNonBlockingFocusSideEffect(() => startFocusSessionMeta(activeTask))
              }
              return
            }
          } catch (retryError) {
            resumeError = retryError
          }
        }

        const handled = await handleFocusSessionApiError(resumeError)
        if (!handled.handled) {
          applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? optimisticResumedAtUtc, {
            ...rollbackSession,
            elapsed_seconds_total: Math.max(0, Math.floor(rollbackElapsedSeconds)),
          })
          setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
          setIsFocusRunning(isSessionRunningState(rollbackSession.session_state))
          console.error('Failed to resume focus session', resumeError)
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }
      return
    }

    scheduleFinishUntrackedSession()

    const willResetCompletedTimer = Boolean(
      timerMode === 'timer' && activeTaskTargetSeconds && sessionElapsedSeconds >= activeTaskTargetSeconds,
    )
    if (willResetCompletedTimer) {
      setSessionElapsedSeconds(0)
    }

    const requestedMode = requestedStartMode ?? timerMode
    const nextMode = resolveTimerModeForTask(activeTask, requestedMode)
    let nextElapsedSeedSeconds = getElapsedSeedForTaskMode(activeTask, nextMode)
    if (nextMode === 'timer' && activeTaskTargetSeconds && willResetCompletedTimer) {
      nextElapsedSeedSeconds = 0
    }
    if (nextMode === 'timer' && activeTaskTargetSeconds && nextElapsedSeedSeconds >= activeTaskTargetSeconds) {
      nextElapsedSeedSeconds = 0
    }
    const rollbackWasRunning = isFocusRunning
    const rollbackElapsedSeconds = sessionElapsedSeconds
    const rollbackTimerMode = timerMode
    setSessionElapsedSeconds(nextElapsedSeedSeconds)
    setTimerMode(nextMode)
    setIsFocusRunning(true)
    if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
      runNonBlockingFocusSideEffect(() => startFocusSessionMeta(activeTask))
    }

    isFocusCommandInFlightRef.current = true
    try {
      const startEventAtUtc = new Date().toISOString()
      const response = await startFocusSession({
        task_id: activeTask.id,
        timer_mode: nextMode,
        elapsed_seconds_seed: nextElapsedSeedSeconds,
        event_at_utc: startEventAtUtc,
      })

      if (!response) {
        onSignOut?.()
        return
      }

      applyFocusSessionEnvelope(response)
      runNonBlockingFocusSideEffect(() => startFocusSessionMeta(activeTask))
      setIsFocusRunning(true)
    } catch (error) {
      const handled = await handleFocusSessionApiError(error, { refreshTasksOnNotFound: true })
      if (handled.handled && handled.kind === 'conflict') {
        const recovered = await recoverFromStartConflict(handled.conflict.data.active_focus_session, activeTask)
        if (recovered) {
          return
        }
      }

      if (!handled.handled) {
        setIsFocusRunning(rollbackWasRunning)
        setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
        setTimerMode(rollbackTimerMode)
        console.error('Failed to start focus session', { taskId: activeTask.id, timerMode: nextMode }, error)
      }
    } finally {
      isFocusCommandInFlightRef.current = false
    }
  }
  const handleStopFocus = async () => {
    runNonBlockingFocusSideEffect(stopTimerEndAlarm)

    if (isFocusCommandInFlightRef.current) {
      return
    }

    let activeSessionForStop = activeFocusSession
    if (!activeSessionForStop) {
      try {
        activeSessionForStop = await ensureAuthoritativeSessionForCommand()
      } catch (error) {
        const handled = await handleFocusSessionApiError(error)
        if (!handled.handled) {
          console.error('Failed to hydrate active focus session before stop command', error)
        }
        return
      }
    }

    if (!activeSessionForStop) {
      const fallbackExpectedVersion =
        activeTask && typeof activeTask.version === 'number' && Number.isFinite(activeTask.version)
          ? Math.max(1, Math.floor(activeTask.version))
          : null
      const fallbackTaskId = activeTask?.id ?? null
      const fallbackMode = timerMode
      if (fallbackExpectedVersion === null || !fallbackTaskId) {
        console.warn('Stop ignored because no active authoritative focus session is available.')
        return
      }

      const fallbackRuntimeSnapshot = latestServerTasksByIdRef.current[fallbackTaskId] ?? null
      const fallbackRuntimeState = normalizeTaskRuntimeState(fallbackRuntimeSnapshot?.state)
      const fallbackRuntimeMode: FocusTimerMode =
        fallbackRuntimeSnapshot?.active_mode === 'timer' ? 'timer' : fallbackMode
      const fallbackTrackedBeforeStopSeconds = getTaskTrackedSecondsSnapshot(fallbackTaskId)
      const optimisticTrackedAfterStopSeconds = getOptimisticTrackedSecondsAfterFreeze(fallbackTaskId, {
        elapsedSeconds: sessionElapsedSeconds,
        includeLocalFallback: true,
      })
      const rollbackLocalRunningState = isFocusRunning
      const fallbackStopReason = fallbackRuntimeState === 'paused' ? 'stopped_from_paused' : 'stopped'
      isFocusCommandInFlightRef.current = true
      const optimisticStoppedAtUtc = new Date().toISOString()
      const rollbackElapsedSeconds = sessionElapsedSeconds
      ensureTaskTrackedDurationAtLeast(fallbackTaskId, optimisticTrackedAfterStopSeconds)
      setSessionElapsedSeconds(0)
      setIsFocusRunning(false)
      resetCountersAfterStop(fallbackTaskId, fallbackMode)
      if (fallbackMode === 'stopwatch') {
        startTaskCooldown(fallbackTaskId)
      }
      try {
        const response = await focusSessionCommand('stop', {
          task_id: fallbackTaskId,
          expected_version: fallbackExpectedVersion,
          event_at_utc: optimisticStoppedAtUtc,
          stop_reason: fallbackStopReason,
        })

        if (!response) {
          onSignOut?.()
          return
        }

        const stoppedElapsed =
          response.data.stopped_session_summary?.elapsed_seconds_final ??
          Math.max(0, Math.floor(sessionElapsedSeconds))
        const createdTimeEntryId = response.data.created_time_entry_id ?? null
        if (createdTimeEntryId) {
          await handleCreatedTimeEntryInvalidation(createdTimeEntryId)
        }

        applyFocusSessionEnvelope(response)
        setSessionElapsedSeconds(0)
        setIsFocusRunning(false)
        resetCountersAfterStop(fallbackTaskId, fallbackMode)
        ensureTaskTrackedDurationAtLeast(
          fallbackTaskId,
          Math.max(
            optimisticTrackedAfterStopSeconds,
            fallbackTrackedBeforeStopSeconds,
            Math.max(0, Math.floor(stoppedElapsed)),
          ),
        )
        setActiveFocusSessionMeta(null)

        runNonBlockingFocusSideEffect(handleStartUntrackedSession)
      } catch (error) {
        const handled = await handleFocusSessionApiError(error)
        if (!handled.handled) {
          clearTaskCooldown(fallbackTaskId)
          setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
          setIsFocusRunning(rollbackLocalRunningState)
          console.error(
            'Failed to stop focus session using task version fallback',
            {
              taskId: fallbackTaskId,
              fallbackExpectedVersion,
              fallbackRuntimeState,
              fallbackRuntimeMode,
              rollbackLocalRunningState,
              apiErrorStatus: error instanceof ApiHttpError ? error.status : null,
              apiErrorBody: error instanceof ApiHttpError ? error.body : null,
            },
            error,
          )
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }
      return
    }

    const elapsedBeforeStop = sessionElapsedSeconds
    const activeSessionTaskId = activeSessionForStop.task_id
    const activeSessionMode = activeSessionForStop.timer_mode
    const trackedBeforeStopSeconds = getTaskTrackedSecondsSnapshot(activeSessionTaskId)
    const optimisticTrackedAfterStopSeconds = getOptimisticTrackedSecondsAfterFreeze(activeSessionTaskId, {
      session: activeSessionForStop,
      elapsedSeconds: elapsedBeforeStop,
    })
    const wasRunningLocallyBeforeStop = isFocusRunning

    isFocusCommandInFlightRef.current = true
    const optimisticStoppedAtUtc = new Date().toISOString()
    const rollbackSession = activeSessionForStop
    const rollbackElapsedSeconds = sessionElapsedSeconds
    const activeStopReason = activeSessionForStop.session_state === 'paused' ? 'stopped_from_paused' : 'stopped'
    ensureTaskTrackedDurationAtLeast(activeSessionTaskId, optimisticTrackedAfterStopSeconds)
    applyAuthoritativeFocusSnapshot(optimisticStoppedAtUtc, null)
    setSessionElapsedSeconds(0)
    setIsFocusRunning(false)
    resetCountersAfterStop(activeSessionTaskId, activeSessionMode)
    if (activeSessionMode === 'stopwatch') {
      startTaskCooldown(activeSessionTaskId)
    }
    try {
      const response = await focusSessionCommand('stop', {
        task_id: activeSessionTaskId,
        expected_version: activeSessionForStop.version,
        event_at_utc: optimisticStoppedAtUtc,
        stop_reason: activeStopReason,
      })

      if (!response) {
        onSignOut?.()
        return
      }

      const stoppedElapsed =
        response.data.stopped_session_summary?.elapsed_seconds_final ??
        Math.max(0, Math.floor(elapsedBeforeStop))
      const createdTimeEntryId = response.data.created_time_entry_id ?? null
      if (createdTimeEntryId) {
        await handleCreatedTimeEntryInvalidation(createdTimeEntryId)
      }

      applyFocusSessionEnvelope(response)
      setSessionElapsedSeconds(0)
      setIsFocusRunning(false)
      resetCountersAfterStop(activeSessionTaskId, activeSessionMode)
      ensureTaskTrackedDurationAtLeast(
        activeSessionTaskId,
        Math.max(
          optimisticTrackedAfterStopSeconds,
          trackedBeforeStopSeconds,
          Math.max(0, Math.floor(stoppedElapsed)),
        ),
      )
      setActiveFocusSessionMeta(null)

      runNonBlockingFocusSideEffect(handleStartUntrackedSession)
    } catch (error) {
      const handled = await handleFocusSessionApiError(error)
      if (!handled.handled) {
        clearTaskCooldown(activeSessionTaskId)
        applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? optimisticStoppedAtUtc, {
          ...rollbackSession,
          elapsed_seconds_total: Math.max(0, Math.floor(rollbackElapsedSeconds)),
        })
        setSessionElapsedSeconds(Math.max(0, Math.floor(rollbackElapsedSeconds)))
        setIsFocusRunning(isSessionRunningState(rollbackSession.session_state))
        console.error(
          'Failed to stop focus session',
          {
            taskId: activeSessionTaskId,
            activeSessionState: activeSessionForStop.session_state,
            activeSessionMode,
            wasRunningLocallyBeforeStop,
            apiErrorStatus: error instanceof ApiHttpError ? error.status : null,
            apiErrorBody: error instanceof ApiHttpError ? error.body : null,
          },
          error,
        )
      }
    } finally {
      isFocusCommandInFlightRef.current = false
    }
  }
  const handleResetAfterTimerAlarm = () => {
    runNonBlockingFocusSideEffect(stopTimerEndAlarm)

    if (!activeTask || timerMode !== 'timer') {
      return
    }

    setIsFocusRunning(false)
    setSessionElapsedSeconds(0)
    resetCountersAfterStop(activeTask.id, 'timer')
  }
  const handleChangeTimerMode = (nextMode: FocusTimerMode) => {
    if (!activeTask || isFocusRunning) {
      return
    }

    if (nextMode === 'timer' && !getTargetSecondsForStart(activeTask, 'timer')) {
      return
    }

    runNonBlockingFocusSideEffect(stopTimerEndAlarm)
    setTimerMode(nextMode)
  }
  const handleUpdateTimerTargetSeconds = (nextTargetSeconds: number) => {
    if (!activeTask || !Number.isFinite(nextTargetSeconds)) {
      return
    }

    const activeTaskId = activeTask.id
    const boundedSeconds = Math.max(1, Math.min(24 * 60 * 60, Math.round(nextTargetSeconds)))
    const nextTargetDurationMinutes = boundedSeconds / 60

    setTaskList((currentTasks) =>
      currentTasks.map((task) =>
        task.id === activeTaskId
          ? {
            ...task,
            targetDurationMinutes: nextTargetDurationMinutes,
          }
          : task,
      ),
    )

    if (
      activeFocusSession &&
      activeFocusSession.task_id === activeTask.id &&
      activeFocusSession.session_state === 'paused' &&
      activeFocusSession.timer_mode === 'timer'
    ) {
      applyAuthoritativeFocusSnapshot(lastServerNowUtc ?? new Date().toISOString(), {
        ...activeFocusSession,
        target_seconds: boundedSeconds,
        elapsed_seconds_total: Math.min(activeFocusSession.elapsed_seconds_total, boundedSeconds),
      })
    }

    setSessionElapsedSeconds((currentSeconds) => Math.min(currentSeconds, boundedSeconds))
    setTimerMode('timer')

    // Taskcards CRUD endpoint is metadata-only; timer runtime stays local until focus runtime endpoints are integrated.
  }
  const handlePlayTask = async (selectedTask: Task, preferredMode?: FocusTimerMode) => {
    if (isTaskCooldownActive(selectedTask.id)) {
      return
    }

    if (activeTask && selectedTask.id === activeTask.id) {
      const nextPreferredMode = resolveTimerModeForTask(selectedTask, preferredMode ?? timerMode)
      await handleToggleFocus(nextPreferredMode)
      return
    }

    if (requireTaskSwitchConfirmation && isFocusRunning && activeTask && selectedTask.id !== activeTask.id) {
      setTaskPendingSwitchConfirm({
        task: selectedTask,
        preferredMode,
      })
      return
    }

    await activateTaskAndStartNewCount(selectedTask, preferredMode)
  }
  const handleCloseSwitchTaskConfirm = () => {
    setTaskPendingSwitchConfirm(null)
  }
  const handleConfirmSwitchTask = async () => {
    if (!taskPendingSwitchConfirm) {
      return
    }

    await activateTaskAndStartNewCount(taskPendingSwitchConfirm.task, taskPendingSwitchConfirm.preferredMode)
    setTaskPendingSwitchConfirm(null)
  }
  return (
    // <div className="min-h-screen bg-[#060e1d] text-slate-100">
    <div className="h-full absolute w-full p-0 m-0 text-slate-100">
      {
        !isFocusOnlyMode ? (
          <FocusHeader
            isBackgroundMusicPlaying={isBackgroundMusicPlaying}
            onEnterFocusOnlyMode={handleEnterFocusOnlyMode}
            onOpenProfile={handleOpenProfile}
            onSignOut={handleRequestSignOut}
            onOpenSettings={handleOpenSettings}
            onToggleBackgroundMusic={handleToggleBackgroundMusicPersist}
            timeLabel={timeLabel}
            timeZoneName={timeZoneName}
            utcOffsetLabel={utcOffsetLabel}
            userEmail={userEmail}
            userName={userName}
          />
        ) : null
      }

      {
        isFocusOnlyMode ? (
          <section className="focus-only-overlay-enter app-scroll relative h-[100svh] overflow-x-hidden overflow-y-auto sm:overflow-y-hidden [@media(max-height:620px)]:overflow-y-auto">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#040a16_0%,#030814_100%)]" />
              <div
                className="workspace-glow-ignite absolute inset-0"
                key={`focus-only-glow-${workspaceGlowPulseKey}`}
                style={{
                  backgroundImage: `radial-gradient(88% 72% at 50% 58%, rgba(${workspaceAccentRgb},0.28), transparent 74%)`,
                }}
              />
              <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(148,163,184,0.02)]" />
            </div>

            <button
              aria-label={copy.exitFocusOnlyMode}
              className="focus-only-controls-enter focus-only-mobile-toggle-morph absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#0a1427]/90 px-2.5 py-2 text-sm text-slate-200 shadow-[0_12px_30px_rgba(1,8,22,0.45)] transition hover:border-blue-500/40 hover:text-slate-100 sm:right-5 sm:top-5 sm:px-3"
              onClick={handleExitFocusOnlyMode}
              type="button"
            >
              <span className="relative grid h-4 w-4 place-items-center sm:hidden" aria-hidden="true">
                <FontAwesomeIcon className="focus-only-mobile-toggle-icon-bullseye absolute text-[12px]" icon={faBullseye} />
                <FontAwesomeIcon className="focus-only-mobile-toggle-icon-x absolute text-[12px]" icon={faXmark} />
              </span>
              <span className="hidden sm:grid sm:h-4 sm:w-4 sm:place-items-center" aria-hidden="true">
                <FontAwesomeIcon className="text-[12px]" icon={faXmark} />
              </span>
              <span className="hidden font-medium sm:inline">{copy.exitFocusOnlyShort}</span>
            </button>

            <div className="focus-only-content-enter relative z-10 mx-auto flex min-h-full w-full max-w-[1600px] items-center px-3 py-2 sm:px-7 sm:py-3 [@media(max-height:620px)]:items-start">
              <TimerPanel
                activeTask={activeTask}
                canUseTimerMode={Boolean(activeTaskTargetSeconds)}
                canStopFocus={canStopFocus}
                hasActiveSession={Boolean(activeFocusSession)}
                isToggleCooldownActive={isActiveTaskCooldownActive}
                isFocusOnlyMode
                isRunning={isFocusRunning}
                mode={timerMode}
                onChangeMode={handleChangeTimerMode}
                onResetAfterTimerAlarm={handleResetAfterTimerAlarm}
                onStopFocus={handleStopFocus}
                onToggleFocus={handleToggleFocus}
                onUpdateTimerTargetSeconds={handleUpdateTimerTargetSeconds}
                timerTargetSeconds={activeTaskTargetSeconds}
                isTimerAlarmActive={isTimerAlarmPlaying}
                timeLabel={timerDisplayLabel}
                timerProgressPercent={timerProgressPercent}
                totalTaskTimeLabel={activeTaskTotalTimeLabel}
              />
            </div>

            {isTimerAlarmPlaying ? (
              <button
                aria-label={copy.silenceTimerAlarm}
                className="timer-alarm-stop-glow fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-rose-300/55 bg-rose-500/18 px-3 py-2 text-sm text-rose-50 ring-1 ring-rose-300/45 backdrop-blur-md transition hover:border-rose-200/70 hover:bg-rose-500/24 hover:ring-rose-200/60"
                onClick={handleResetAfterTimerAlarm}
                type="button"
              >
                <FontAwesomeIcon className="text-[12px] drop-shadow-[0_0_8px_rgba(251,113,133,0.35)]" icon={faBellSlash} />
                <span className="hidden font-medium sm:inline">{copy.silenceAlarmShort}</span>
              </button>
            ) : null}
          </section>
        ) : (
          <>
            {isDailyLogOpen ? (
              <button
                aria-label={copy.closeDailyLogOverlay}
                className="fixed inset-0 top-16 z-30 bg-[#020814]/55 backdrop-blur-[2px] xl:hidden"
                onClick={handleToggleDailyLog}
                type="button"
              />
            ) : null}

            <main className="mt-16 flex min-h-[calc(100svh-4rem)] sm:h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-4rem)]">
              <DailyLogPanel
                entries={sidebarLogEntries}
                isOpen={isDailyLogOpen}
                tasks={localizedTaskList}
                totalTracked={dashboardStatsState.totalTracked}
              />

              <section className="app-scroll relative isolate flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-visible sm:overflow-y-auto">
                <div className="relative flex min-h-[calc(100svh-4rem)] flex-col pb-8 sm:h-full sm:min-h-full [@media(max-height:840px)]:h-auto">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,#040a16_0%,#030814_100%)]" />
                    <div
                      className="workspace-glow-ignite absolute inset-0"
                      key={workspaceGlowPulseKey}
                      style={{
                        backgroundImage: `radial-gradient(88% 72% at 50% 60%, rgba(${workspaceAccentRgb},0.28), transparent 74%)`,
                      }}
                    />
                    <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(148,163,184,0.02)]" />
                  </div>

                  <div className="relative z-10 mx-auto flex min-h-full w-full flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-4 sm:h-full sm:flex-1 sm:pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:px-6 md:pb-0 [@media(max-height:840px)]:h-auto [@media(max-height:840px)]:pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
                    <TaskCarousel
                      accentColorTag={activeWorkspaceAccentColor}
                      effectiveTimeZone={effectiveTimeZone}
                      isFocusRunning={isFocusRunning}
                      isLoading={isTasksLoading}
                      onAddTask={handleAddTask}
                      onDeleteTask={handleRequestDeleteTask}
                      onEditTask={handleEditTask}
                      onPlayTask={handlePlayTask}
                      sessionCountByTaskId={sessionCountByTaskId}
                      taskCooldownEndsAtMsByTaskId={taskCooldownEndsAtByTaskId}
                      tasks={carouselTaskList}
                    />
                    <TimerPanel
                      activeTask={activeTaskDisplay}
                      canUseTimerMode={Boolean(activeTaskTargetSeconds)}
                      canStopFocus={canStopFocus}
                      hasActiveSession={Boolean(activeFocusSession)}
                      isToggleCooldownActive={isActiveTaskCooldownActive}
                      isRunning={isFocusRunning}
                      mode={timerMode}
                      onChangeMode={handleChangeTimerMode}
                      onResetAfterTimerAlarm={handleResetAfterTimerAlarm}
                      onStopFocus={handleStopFocus}
                      onToggleFocus={handleToggleFocus}
                      onUpdateTimerTargetSeconds={handleUpdateTimerTargetSeconds}
                      timerTargetSeconds={activeTaskTargetSeconds}
                      isTimerAlarmActive={isTimerAlarmPlaying}
                      timeLabel={timerDisplayLabel}
                      timerProgressPercent={timerProgressPercent}
                      totalTaskTimeLabel={activeTaskTotalTimeLabel}
                    />
                  </div>
                </div>
              </section>
            </main>
            <button
              key={`daily-log-toggle-mobile-${dailyLogTogglePulseKey}`}
              aria-label={isDailyLogOpen ? copy.closeDailyLog : copy.openDailyLog}
              className={classNames(
                'fixed bottom-4 left-4 z-40 grid h-11 w-11 place-items-center rounded-full text-slate-200 transition xl:hidden',
                isDailyLogOpen
                  ? 'daily-log-mobile-close-glow border border-rose-300/55 bg-rose-500/18 text-rose-50 ring-1 ring-rose-300/45 hover:border-rose-200/70 hover:ring-rose-200/60'
                  : 'bg-[#0a1427]/95 shadow-[0_12px_30px_rgba(1,8,22,0.45)] ring-1 ring-slate-700/80 hover:ring-blue-500/40',
                dailyLogTogglePulseKey > 0 && 'daily-log-toggle-ignite',
              )}
              onClick={handleToggleDailyLog}
              type="button"
            >
              <FontAwesomeIcon
                className={classNames(isDailyLogOpen ? 'text-[14px] text-rose-100 drop-shadow-[0_0_10px_rgba(251,113,133,0.42)]' : 'text-[13px] text-slate-300')}
                icon={isDailyLogOpen ? faXmark : faClockRotateLeft}
              />
            </button>

            <button
              key={`daily-log-toggle-desktop-${dailyLogTogglePulseKey}`}
              aria-label={isDailyLogOpen ? copy.closeDailyLog : copy.openDailyLog}
              className={classNames(
                'fixed top-1/2 z-40 hidden h-12 w-9 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-slate-700/80 bg-[#0a1427]/95 text-slate-300 shadow-[0_10px_30px_rgba(1,8,22,0.45)] transition-[left,border-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-blue-500/40 hover:text-blue-300 xl:grid',
                dailyLogTogglePulseKey > 0 && 'daily-log-toggle-ignite',
              )}
              onClick={handleToggleDailyLog}
              style={{ left: isDailyLogOpen ? 456 : 0 }}
              title={isDailyLogOpen ? copy.closeDailyLog : copy.openDailyLog}
              type="button"
            >
              <span className="flex flex-col items-center gap-0.5">
                <FontAwesomeIcon className="text-[11px]" icon={faClockRotateLeft} />
                <FontAwesomeIcon className="text-[10px]" icon={isDailyLogOpen ? faChevronLeft : faChevronRight} />
              </span>
            </button>

            {isTimerAlarmPlaying ? (
              <button
                aria-label={copy.silenceTimerAlarm}
                className="timer-alarm-stop-glow fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-rose-300/55 bg-rose-500/18 px-3 py-2 text-sm text-rose-50 ring-1 ring-rose-300/45 backdrop-blur-md transition hover:border-rose-200/70 hover:bg-rose-500/24 hover:ring-rose-200/60"
                onClick={handleResetAfterTimerAlarm}
                type="button"
              >
                <FontAwesomeIcon className="text-[12px] drop-shadow-[0_0_8px_rgba(251,113,133,0.35)]" icon={faBellSlash} />
                <span className="hidden font-medium sm:inline">{copy.silenceAlarmShort}</span>
              </button>
            ) : null}
          </>
        )
      }

      <NewTaskModal
        editingTask={editingTask}
        isOpen={isNewTaskModalOpen}
        lockNonAlarmFields={isEditingRunningTask}
        onClose={handleCloseNewTaskModal}
        onCreateTask={handleCreateTaskPersist}
        onRequestDeleteTask={handleRequestDeleteFromTaskModal}
      />
      <DeleteTaskConfirmModal
        isOpen={taskPendingDelete !== null}
        isSubmitting={isDeleteTaskSubmitting}
        onClose={() => {
          if (isDeleteTaskSubmitting) {
            return
          }
          handleCloseDeleteTaskModal()
        }}
        onConfirm={handleConfirmDeleteTask}
        task={taskPendingDelete ? localizeStaticTaskTitle(taskPendingDelete, locale) : null}
      />
      <SwitchTaskConfirmModal
        currentTask={activeTaskDisplay}
        isOpen={taskPendingSwitchConfirm !== null}
        nextTask={taskPendingSwitchConfirm ? localizeStaticTaskTitle(taskPendingSwitchConfirm.task, locale) : null}
        onClose={handleCloseSwitchTaskConfirm}
        onConfirm={handleConfirmSwitchTask}
      />
      <ProfileModal isOpen={isProfileModalOpen} onClose={handleCloseProfile} userEmail={userEmail} userName={userName} />
      <SignOutConfirmModal
        isOpen={isSignOutConfirmOpen}
        onClose={handleCloseSignOutConfirm}
        onConfirm={handleConfirmSignOut}
      />
      <SettingsModal
        backgroundMusicVolume={backgroundMusicVolume}
        dashboardStats={dashboardStatsState}
        effectiveTimeZone={effectiveTimeZone}
        entries={localizedDailyLogEntries}
        historyEntries={localizedHistoryEntries}
        historyReloadKey={settingsHistoryReloadKey}
        isOpen={isSettingsModalOpen}
        onAuthExpired={onSignOut}
        onBackgroundMusicVolumeChange={handleBackgroundMusicVolumeChangePersist}
        onClose={handleCloseSettings}
        onLocaleChange={handleLocaleChangePersist}
        onTimerAlarmVolumeChange={handleTimerAlarmVolumeChangePersist}
        onToggleTaskSwitchConfirmation={handleToggleTaskSwitchConfirmationPersist}
        onToggleUiInteractionSfx={handleToggleUiInteractionSfxPersist}
        onUiInteractionSfxVolumeChange={handleUiInteractionSfxVolumeChangePersist}
        requireTaskSwitchConfirmation={requireTaskSwitchConfirmation}
        tasks={localizedTaskList}
        timerAlarmVolume={timerAlarmVolume}
        uiInteractionSfxEnabled={uiInteractionSfxEnabled}
        uiInteractionSfxVolume={uiInteractionSfxVolume}
      />
    </div >
  )
}

function formatLogStartTime(date: Date, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }
}

function formatLocalDateKey(date: Date, timeZone?: string) {
  if (timeZone) {
    return toIsoDateStringInTimeZone(date, timeZone)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLogDurationFromSeconds(totalSeconds: number) {
  return formatSecondsHms(totalSeconds)
}

function localizeStaticLogActivities(entries: LogEntry[], untrackedLabel: string) {
  return entries.map((entry) => {
    if (!entry.activity) {
      return entry
    }

    if (!isStaticUntrackedActivity(entry.activity)) {
      return entry
    }

    if (entry.activity === untrackedLabel) {
      return entry
    }

    return {
      ...entry,
      activity: untrackedLabel,
    }
  })
}

function isStaticUntrackedActivity(activity: string) {
  const normalized = activity.trim().toLowerCase()
  return normalized === 'untracked time' || normalized === 'tiempo no registrado'
}

function localizeStaticTaskTitle(task: Task, locale: 'es' | 'en'): Task {
  const titleByTaskId: Partial<Record<Task['id'], { es: string; en: string }>> = {
    'task-q3-report': {
      es: 'Redaccion de reporte Q3',
      en: 'Q3 Report Writing',
    },
    'task-email-cleanup': {
      es: 'Limpieza de correos',
      en: 'Email Cleanup',
    },
    'task-design-review': {
      es: 'Revision de diseno',
      en: 'Design Review',
    },
  }

  const localized = titleByTaskId[task.id]
  if (!localized) {
    return task
  }

  if (task.title !== localized.es && task.title !== localized.en) {
    return task
  }

  const nextTitle = localized[locale]
  if (task.title === nextTitle) {
    return task
  }

  return {
    ...task,
    title: nextTitle,
  }
}

function sortLogEntriesByTime(entries: LogEntry[]) {
  return [...entries].sort((a, b) => {
    const startedAtMsA =
      typeof a.startedAtMs === 'number' && Number.isFinite(a.startedAtMs) ? a.startedAtMs : Number.NaN
    const startedAtMsB =
      typeof b.startedAtMs === 'number' && Number.isFinite(b.startedAtMs) ? b.startedAtMs : Number.NaN
    const hasPreciseStartedAtA = Number.isFinite(startedAtMsA)
    const hasPreciseStartedAtB = Number.isFinite(startedAtMsB)
    if (hasPreciseStartedAtA && hasPreciseStartedAtB && startedAtMsA !== startedAtMsB) {
      return startedAtMsA - startedAtMsB
    }

    const endedAtMsA = typeof a.endedAtMs === 'number' && Number.isFinite(a.endedAtMs) ? a.endedAtMs : Number.NaN
    const endedAtMsB = typeof b.endedAtMs === 'number' && Number.isFinite(b.endedAtMs) ? b.endedAtMs : Number.NaN
    const hasPreciseEndedAtA = Number.isFinite(endedAtMsA)
    const hasPreciseEndedAtB = Number.isFinite(endedAtMsB)
    if (hasPreciseEndedAtA && hasPreciseEndedAtB && endedAtMsA !== endedAtMsB) {
      return endedAtMsA - endedAtMsB
    }

    const dateA = a.date ?? ''
    const dateB = b.date ?? ''
    if (dateA !== dateB) {
      // Oldest date first.
      return dateA.localeCompare(dateB)
    }

    // Oldest time first (supports HH:MM:SS).
    const timeDiff = parseStartLabelToSecondsOfDay(a.start) - parseStartLabelToSecondsOfDay(b.start)
    if (timeDiff !== 0) {
      return timeDiff
    }

    // Stable deterministic order when date+time labels are equal.
    return (a.id ?? '').localeCompare(b.id ?? '')
  })
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

function runNonBlockingFocusSideEffect(action: () => void | Promise<void>) {
  try {
    const result = action()
    if (result && typeof (result as Promise<void>).catch === 'function') {
      void (result as Promise<void>).catch(() => {
        // Async side effects should also not block timer controls.
      })
    }
  } catch {
    // Audio/log side effects should not block timer controls.
  }
}
