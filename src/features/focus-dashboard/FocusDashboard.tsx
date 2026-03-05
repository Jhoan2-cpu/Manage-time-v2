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
  type CreateTaskPayload,
  type FocusSessionStateEnvelope,
  type TaskApiItem,
  type UpdatePreferencesPayload,
  type UserPreferences,
} from './api'
import {
  adaptBootstrapDashboardStatsToUi,
  adaptBootstrapDailyLogToUiEntries,
  adaptBootstrapTasksToUi,
  adaptTaskItemToUi,
} from './bootstrapAdapter'
import { buildUntrackedCreateTimeEntryPayloadFromSession } from './historyApiAdapter'
import type { FocusTimerMode, LogEntry, Task, TaskColorKey, TaskIconKey } from './types'
import { classNames } from './utils/classNames'
import { formatSecondsHms, parseDurationLabelToSeconds, toIsoDateStringInTimeZone } from './utils/time'
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
const emptyFallbackTasks: Task[] = []
const emptyFallbackLogEntries: LogEntry[] = []

const FOCUS_DERIVED_BOOTSTRAP_REFRESH_INCLUDES: AppBootstrapInclude[] = [
  'tasks',
  'daily_log',
  'dashboard_stats',
  'active_focus_session',
]
const TASK_START_COOLDOWN_MS = 3000
const TASKS_REALTIME_DEDUP_CAPACITY = 240
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

  return {
    id: serverTask.id,
    userId: serverTask.user_id,
    title:
      typeof serverTask.name === 'string' && serverTask.name.trim()
        ? serverTask.name.trim()
        : existingTask?.title ?? 'Untitled task',
    details: existingTask?.details ?? '',
    statusText: existingTask?.statusText ?? '',
    duration: existingTask?.duration ?? '00:00:00',
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
  const [taskPendingSwitchConfirm, setTaskPendingSwitchConfirm] = useState<PendingTaskSwitchConfirm>(null)
  const {
    isProfileModalOpen,
    isSettingsModalOpen,
    isSignOutConfirmOpen,
    isBackgroundMusicPlaying,
    isTimerAlarmPlaying,
    uiInteractionSfxEnabled,
    backgroundMusicVolume,
    requireTaskSwitchConfirmation,
    setRequireTaskSwitchConfirmation,
    selectedTimeZone,
    autoDetectTimeZone,
    timeZoneOptions,
    effectiveTimeZone,
    isDailyLogOpen,
    isFocusOnlyMode,
    dailyLogTogglePulseKey,
    handleOpenSettings,
    handleCloseSettings,
    handleToggleBackgroundMusic,
    handleToggleUiInteractionSfx,
    handleBackgroundMusicVolumeChange,
    handleToggleAutoDetectTimeZone,
    handleTimeZoneChange,
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
  const taskcardsRealtimeResyncTimerRef = useRef<number | null>(null)
  const timerCompleteStopRequestKeyRef = useRef<string | null>(null)
  const lastHandledCreatedTimeEntryIdRef = useRef<string | null>(null)
  const processedTaskRealtimeEventIdsRef = useRef<string[]>([])
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

  useEffect(() => {
    latestPreferencesRef.current = bootstrapData?.preferences ?? null
  }, [bootstrapData?.preferences])

  useEffect(() => {
    setDailyLogEntries(bootstrapInitialDailyLogEntries)
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
    queuePreferencesPatch({ ui_sounds_enabled: nextValue }, 150)
  }

  const handleBackgroundMusicVolumeChangePersist = (nextValue: number) => {
    handleBackgroundMusicVolumeChange(nextValue)
    const volumePercent = Math.max(0, Math.min(100, Math.round(nextValue * 100)))
    queuePreferencesPatch({ background_music_volume_percent: volumePercent }, 280)
  }

  const handleToggleTaskSwitchConfirmationPersist = (nextValue: boolean) => {
    setRequireTaskSwitchConfirmation(nextValue)
    queuePreferencesPatch({ confirm_task_switch_enabled: nextValue }, 150)
  }

  const handleToggleAutoDetectTimeZonePersist = (nextValue: boolean) => {
    handleToggleAutoDetectTimeZone(nextValue)
    queuePreferencesPatch({ time_zone_auto_detect: nextValue }, 150)
  }

  const handleTimeZoneChangePersist = (nextValue: string) => {
    handleTimeZoneChange(nextValue)
    queuePreferencesPatch({ time_zone_name: nextValue }, 150)
  }

  const buildTasksApiPayloadFromModalPayload = (payload: NewTaskPayload): CreateTaskPayload => {
    const timerInitialSeconds =
      typeof payload.targetDurationMinutes === 'number' && Number.isFinite(payload.targetDurationMinutes)
        ? Math.max(0, Math.round(payload.targetDurationMinutes * 60))
        : 0
    const normalizedTimerInitialSeconds = timerInitialSeconds > 0 ? Math.min(timerInitialSeconds, 24 * 60 * 60) : null

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

  const handleCreateTaskPersist = async (payload: NewTaskPayload) => {
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
          timer_initial_seconds: apiPayload.timer_initial_seconds ?? null,
          target_duration_seconds: apiPayload.target_duration_seconds ?? null,
        })
        if (!updatedTask) {
          onSignOut?.()
          return
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
        return
      }

      const createdTask = await createTaskApi(apiPayload)
      if (!createdTask) {
        onSignOut?.()
        return
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
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 401) {
          onSignOut?.()
          return
        }

        if (error.status === 404 && editingTaskId) {
          applyTaskRemovalFromUi(editingTaskId)
          return
        }

        if (error.status === 409) {
          const conflict = getTaskVersionConflictFromApiError(error)
          console.warn('Task version conflict during create/update. Refreshing tasks from server.', conflict ?? error)
          try {
            await refreshTasksFromServer()
          } catch (refreshError) {
            console.error('Failed to refresh tasks after version conflict', refreshError)
          }
          return
        }
      }

      console.error('Failed to persist task mutation', { editingTaskId, apiPayload }, error)
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
    activeFocusSession.session_state === 'running',
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

  const applyFocusSessionEnvelope = (envelope: FocusSessionStateEnvelope) => {
    applyAuthoritativeFocusSnapshot(envelope.data.server_now_utc, envelope.data.active_focus_session)
    alignActiveTaskState(envelope.data.active_focus_session?.task_id ?? null)
    return envelope
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

      setTaskList((currentTasks) => {
        const currentById = new Map(currentTasks.map((task) => [task.id, task] as const))
        const preferredActiveTaskId =
          activeFocusSession?.task_id ??
          currentTasks.find((task) => task.state === 'active')?.id ??
          currentTasks[0]?.id ??
          null

        const nextTasks = serverTasks.map((serverTask) => {
          const existingTask = currentById.get(serverTask.id)
          const state =
            serverTask.id === preferredActiveTaskId
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
            duration: existingTask.duration,
            // Keep stable order from backend if present; fallback preserves mapped order.
            id: adapted.id,
          } satisfies Task
        })

        if (preferredActiveTaskId && nextTasks.every((task) => task.id !== preferredActiveTaskId) && nextTasks[0]) {
          nextTasks[0] = { ...nextTasks[0], state: 'active' }
        }

        return nextTasks
      })
    } finally {
      tasksRefreshInFlightCountRef.current = Math.max(0, tasksRefreshInFlightCountRef.current - 1)
      if (isMountedRef.current) {
        setIsTasksLoading(tasksRefreshInFlightCountRef.current > 0)
      }
    }
  }

  const refreshBootstrapDerivedDataFromServer = async () => {
    const refreshedBootstrap = await getAppBootstrap({ include: FOCUS_DERIVED_BOOTSTRAP_REFRESH_INCLUDES })
    if (!refreshedBootstrap) {
      onSignOut?.()
      return false
    }

    setDailyLogEntries(
      adaptBootstrapDailyLogToUiEntries(refreshedBootstrap, {
        manualAdjustmentLabel: copy.manualAdjustment,
        timeZone: refreshedBootstrap.preferences?.time_zone_name ?? effectiveTimeZone,
        untrackedLabel: copy.untrackedTime,
      }),
    )
    setDashboardStatsState(adaptBootstrapDashboardStatsToUi(refreshedBootstrap.dashboard_stats))

    applyAuthoritativeFocusSnapshot(refreshedBootstrap.server_now_utc, refreshedBootstrap.active_focus_session)
    alignActiveTaskState(refreshedBootstrap.active_focus_session?.task_id ?? null)

    setTaskList((currentTasks) => {
      const currentById = new Map(currentTasks.map((task) => [task.id, task] as const))
      const preferredActiveTaskId =
        refreshedBootstrap.active_focus_session?.task_id ??
        currentTasks.find((task) => task.state === 'active')?.id ??
        currentTasks[0]?.id ??
        null

      const nextTasks = refreshedBootstrap.tasks.map((serverTask) => {
        const existingTask = currentById.get(serverTask.id)
        const state =
          serverTask.id === preferredActiveTaskId
            ? 'active'
            : existingTask?.state === 'done'
              ? 'done'
              : 'scheduled'

        const adapted = adaptTaskItemToUi(serverTask, { state })
        if (!existingTask) {
          return adapted
        }

        return {
          ...adapted,
          state,
          details: existingTask.details,
          statusText: existingTask.statusText,
          duration: existingTask.duration,
        } satisfies Task
      })

      if (preferredActiveTaskId && nextTasks.every((task) => task.id !== preferredActiveTaskId) && nextTasks[0]) {
        nextTasks[0] = { ...nextTasks[0], state: 'active' }
      }

      return nextTasks
    })

    setSettingsHistoryReloadKey((current) => current + 1)
    return true
  }

  const handleCreatedTimeEntryInvalidation = async (createdTimeEntryId?: string | null) => {
    if (typeof createdTimeEntryId !== 'string' || !createdTimeEntryId.trim()) {
      return
    }

    const normalizedId = createdTimeEntryId.trim()
    if (lastHandledCreatedTimeEntryIdRef.current === normalizedId) {
      return
    }
    lastHandledCreatedTimeEntryIdRef.current = normalizedId

    try {
      await refreshBootstrapDerivedDataFromServer()
    } catch (error) {
      console.error('Failed to refresh bootstrap-derived data after time entry creation', { createdTimeEntryId }, error)
    }
  }

  const syncActiveFocusSession = async () => {
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

      applyFocusSessionEnvelope(snapshot)
    } catch (error) {
      console.error('Failed to sync active focus session', error)
    } finally {
      isFocusSessionSyncInFlightRef.current = false
    }
  }

  const applyRealtimeFocusEvent = (event: FocusRealtimeEvent) => {
    if (!event || !event.data) {
      return
    }

    const expectedUserId = bootstrapData?.user.id
    if (expectedUserId && event.meta?.user_id && `${event.meta.user_id}` !== `${expectedUserId}`) {
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
      return
    }

    applyFocusSessionEnvelope({
      data: {
        server_now_utc: event.data.server_now_utc ?? '',
        active_focus_session: event.data.active_focus_session ?? null,
        stopped_session_summary: event.data.stopped_session_summary ?? null,
        created_time_entry_id: event.data.created_time_entry_id ?? null,
      },
    })

    if (event.type === 'focus_session.stopped') {
      const finalElapsed = event.data.stopped_session_summary?.elapsed_seconds_final
      if (typeof finalElapsed === 'number' && Number.isFinite(finalElapsed)) {
        setSessionElapsedSeconds(Math.max(0, Math.round(finalElapsed)))
      }
      setIsFocusRunning(false)
      setActiveFocusSessionMeta(null)
    }

    if (event.data.created_time_entry_id) {
      void handleCreatedTimeEntryInvalidation(event.data.created_time_entry_id)
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
    const expectedUserId = bootstrapData?.user.id
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
      if (event.event === 'focus.task.deleted') {
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

    if (event.event === 'focus.task.deleted') {
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

    if (event.event === 'focus.task.updated' && !hasRenderableTaskMetadata) {
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

    if (eventId) {
      markTaskRealtimeEventProcessed(eventId)
    }
  }

  useFocusRealtimeChannel({
    userId: bootstrapData?.user.id ?? null,
    enabled: false,
    onEvent: applyRealtimeFocusEvent,
    onReconnectSync: () => {
      void syncActiveFocusSession()
    },
  })

  useTaskcardsRealtimeChannel({
    userId: bootstrapData?.user.id ?? null,
    enabled: Boolean(bootstrapData?.user.id),
    onEvent: applyTaskcardsRealtimeEvent,
    onReconnectSync: () => {
      void refreshTasksFromServer()
    },
  })

  const getPreferredTimerModeForTask = (task: Task): FocusTimerMode =>
    task.targetDurationMinutes && task.targetDurationMinutes > 0 ? 'timer' : 'stopwatch'

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
    return Math.max(0, Math.round(baseValue))
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

  const localizedTaskList = useMemo(() => taskList.map((task) => localizeStaticTaskTitle(task, locale)), [locale, taskList])
  const activeTaskDisplay = useMemo(
    () => (activeTask ? localizeStaticTaskTitle(activeTask, locale) : null),
    [activeTask, locale],
  )
  const isActiveTaskCooldownActive = Boolean(activeTask && isTaskCooldownActive(activeTask.id) && !isFocusRunning)
  const activeWorkspaceAccentColor = activeTask?.colorTag ?? 'blue'
  const workspaceAccentRgb = workspaceAccentRgbByColor[activeWorkspaceAccentColor]
  const carouselTaskList = useMemo(
    () =>
      localizedTaskList.map((task) =>
        activeTask && task.id === activeTask.id
          ? {
            ...task,
            duration: timerDisplayLabel,
          }
          : task,
      ),
    [activeTask, localizedTaskList, timerDisplayLabel],
  )
  const sidebarLogEntries = useMemo(() => {
    if (!activeUntrackedSession) {
      return localizedDailyLogEntries
    }

    try {
      return sortLogEntriesByTime([
        ...localizedDailyLogEntries,
        {
          id: 'log-live-untracked',
          date: activeUntrackedSession.dateKey,
          start: activeUntrackedSession.startLabel,
          duration: formatLogDurationFromSeconds(Math.floor((Date.now() - activeUntrackedSession.startedAtMs) / 1000)),
          activity: copy.untrackedTime,
          tone: 'faded',
        },
      ])
    } catch {
      return localizedDailyLogEntries
    }
  }, [activeUntrackedSession, copy.untrackedTime, localizedDailyLogEntries])

  useEffect(() => {
    void syncActiveFocusSession()
    void refreshTasksFromServer()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncActiveFocusSession()
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
    if (!activeFocusSession) {
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
      const requestKey = `${activeFocusSession.id}:${activeFocusSession.version}`
      if (timerCompleteStopRequestKeyRef.current === requestKey) {
        return
      }

      const elapsedBeforeStop = sessionElapsedSeconds

        ; (async () => {
          if (isFocusCommandInFlightRef.current) {
            return
          }

          timerCompleteStopRequestKeyRef.current = requestKey
          isFocusCommandInFlightRef.current = true
          try {
            const response = await focusSessionCommand('stop', {
              expected_version: activeFocusSession.version,
              stopped_reason: 'timer_complete',
            })

            if (!response) {
              onSignOut?.()
              return
            }

            applyFocusSessionEnvelope(response)
            void handleCreatedTimeEntryInvalidation(response.data.created_time_entry_id ?? null)

            const completedSeconds =
              response.data.stopped_session_summary?.elapsed_seconds_final ??
              Math.min(elapsedBeforeStop, activeTaskTargetSeconds)
            setSessionElapsedSeconds(Math.max(0, completedSeconds))
            setIsFocusRunning(false)
            startTaskCooldown(activeFocusSession.task_id)
            if (!response.data.created_time_entry_id) {
              commitCurrentFocusSession(completedSeconds)
            } else {
              setActiveFocusSessionMeta(null)
            }
            triggerTimerEndAlarm()
          } catch (error) {
            const handled = await handleFocusSessionApiError(error)
            if (!handled.handled) {
              console.error('Failed to stop focus session after timer completion', error)
            }
            timerCompleteStopRequestKeyRef.current = null
          } finally {
            isFocusCommandInFlightRef.current = false
          }
        })()
    }
  }, [
    activeFocusSession,
    activeTaskTargetSeconds,
    handleFocusSessionApiError,
    isFocusRunning,
    onSignOut,
    sessionElapsedSeconds,
    timerMode,
  ])

  const handleConfirmDeleteTask = async () => {
    if (!taskPendingDelete) {
      return
    }

    const deletingTaskId = taskPendingDelete.id
    const deletingTaskVersion =
      typeof taskPendingDelete.version === 'number' && Number.isFinite(taskPendingDelete.version)
        ? Math.max(1, Math.floor(taskPendingDelete.version))
        : 1

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
      return
    }

    const endedAtMs = Date.now()
    const elapsedSeconds = Math.max(0, Math.floor((endedAtMs - currentSession.startedAtMs) / 1000))
    setActiveUntrackedSession(null)

    if (elapsedSeconds <= 0) {
      return
    }

    const nextEntry: LogEntry = {
      id: `log-untracked-${crypto.randomUUID()}`,
      date: currentSession.dateKey,
      start: currentSession.startLabel,
      duration: formatLogDurationFromSeconds(elapsedSeconds),
      activity: copy.untrackedTime,
      tone: 'faded',
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

      const created = await createTimeEntry(payload)
      if (!created) {
        onSignOut?.()
        return
      }

      await handleCreatedTimeEntryInvalidation(created.id)
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 401) {
        onSignOut?.()
        return
      }

      console.error('Failed to persist untracked time entry', error)
    }
  }
  const commitCurrentFocusSession = (elapsedSecondsOverride?: number) => {
    const elapsedSeconds =
      typeof elapsedSecondsOverride === 'number' && Number.isFinite(elapsedSecondsOverride)
        ? Math.max(0, Math.round(elapsedSecondsOverride))
        : sessionElapsedSeconds

    if (!activeTask || elapsedSeconds <= 0) {
      return
    }

    if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
      return
    }

    const durationLabel = formatLogDurationFromSeconds(elapsedSeconds)
    const nextEntry: LogEntry = {
      id: `log-focus-${crypto.randomUUID()}`,
      date: activeFocusSessionMeta.dateKey,
      start: activeFocusSessionMeta.startLabel,
      duration: durationLabel,
      taskId: activeTask.id,
    }

    setDailyLogEntries((currentEntries) => sortLogEntriesByTime([...currentEntries, nextEntry]))
    setTaskList((currentTasks) =>
      currentTasks.map((task) => (task.id === activeTask.id ? { ...task, duration: durationLabel } : task)),
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
  const activateTaskAndStartNewCount = async (selectedTask: Task, requestedMode?: FocusTimerMode) => {
    if (isFocusCommandInFlightRef.current) {
      return
    }

    runNonBlockingFocusSideEffect(stopTimerEndAlarm)
    runNonBlockingFocusSideEffect(handleFinishUntrackedSession)

    const nextMode = resolveTimerModeForTask(selectedTask, requestedMode)
    const nextTargetSeconds = getTargetSecondsForStart(selectedTask, nextMode)
    let nextElapsedSeedSeconds = getElapsedSeedForTaskMode(selectedTask, nextMode)
    if (nextMode === 'timer' && nextTargetSeconds && nextElapsedSeedSeconds >= nextTargetSeconds) {
      nextElapsedSeedSeconds = 0
    }
    const elapsedBeforeSwitch = activeFocusSession ? sessionElapsedSeconds : 0

    setWorkspaceGlowPulseKey((current) => current + 1)

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
      setSessionElapsedSeconds(0)
      setTimerMode(nextMode)

      isFocusCommandInFlightRef.current = true
      try {
        const response = await startFocusSession({
          task_id: selectedTask.id,
          timer_mode: nextMode,
          target_seconds: nextTargetSeconds,
          elapsed_seconds_seed: nextElapsedSeedSeconds,
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
        if (!handled.handled) {
          console.error('Failed to start focus session for selected task', { taskId: selectedTask.id }, error)
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }

      return
    }

    isFocusCommandInFlightRef.current = true
    try {
      const previousSessionTaskId = activeFocusSession.task_id
      const response = await focusSessionCommand('switch-task', {
        expected_version: activeFocusSession.version,
        task_id: selectedTask.id,
        timer_mode: nextMode,
        target_seconds: nextTargetSeconds,
        elapsed_seconds_seed: nextElapsedSeedSeconds,
      })

      if (!response) {
        onSignOut?.()
        return
      }

      if (elapsedBeforeSwitch > 0 && !response.data.created_time_entry_id) {
        runNonBlockingFocusSideEffect(() => commitCurrentFocusSession(elapsedBeforeSwitch))
      } else if (response.data.created_time_entry_id) {
        setActiveFocusSessionMeta(null)
      }

      applyFocusSessionEnvelope(response)
      void handleCreatedTimeEntryInvalidation(response.data.created_time_entry_id ?? null)
      setSessionElapsedSeconds(0)
      setTimerMode(nextMode)
      if (previousSessionTaskId !== selectedTask.id) {
        startTaskCooldown(previousSessionTaskId)
      }
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

    const isSessionCurrentlyRunning = activeFocusSession?.session_state === 'running' || isFocusRunning
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

    if (activeFocusSession) {
      if (activeFocusSession.task_id !== activeTask.id) {
        alignActiveTaskState(activeFocusSession.task_id)
        return
      }

      if (activeFocusSession.session_state === 'running') {
        isFocusCommandInFlightRef.current = true
        try {
          const response = await focusSessionCommand('pause', {
            expected_version: activeFocusSession.version,
          })

          if (!response) {
            onSignOut?.()
            return
          }

          applyFocusSessionEnvelope(response)
          setIsFocusRunning(false)
          startTaskCooldown(activeFocusSession.task_id)
          runNonBlockingFocusSideEffect(handleStartUntrackedSession)
        } catch (error) {
          const handled = await handleFocusSessionApiError(error)
          if (!handled.handled) {
            console.error('Failed to pause focus session', error)
          }
        } finally {
          isFocusCommandInFlightRef.current = false
        }
        return
      }

      const requestedMode = resolveTimerModeForTask(activeTask, requestedStartMode ?? timerMode)
      if (requestedMode !== activeFocusSession.timer_mode) {
        await activateTaskAndStartNewCount(activeTask, requestedMode)
        return
      }

      runNonBlockingFocusSideEffect(handleFinishUntrackedSession)

      isFocusCommandInFlightRef.current = true
      try {
        let response = await focusSessionCommand('resume', {
          expected_version: activeFocusSession.version,
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
        const handled = await handleFocusSessionApiError(error)
        if (!handled.handled) {
          console.error('Failed to resume focus session', error)
        }
      } finally {
        isFocusCommandInFlightRef.current = false
      }
      return
    }

    runNonBlockingFocusSideEffect(handleFinishUntrackedSession)

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
    const nextTargetSeconds =
      nextMode === 'timer'
        ? (normalizedRequestedStartTargetSeconds ?? getTargetSecondsForStart(activeTask, 'timer'))
        : null
    setTimerMode(nextMode)

    isFocusCommandInFlightRef.current = true
    try {
      const response = await startFocusSession({
        task_id: activeTask.id,
        timer_mode: nextMode,
        target_seconds: nextTargetSeconds,
        elapsed_seconds_seed: nextElapsedSeedSeconds,
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
      if (!handled.handled) {
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

    if (!activeFocusSession) {
      setSessionElapsedSeconds(0)
      setIsFocusRunning(false)
      resetCountersAfterStop(activeTask?.id, timerMode)
      startTaskCooldown(activeTask?.id)
      runNonBlockingFocusSideEffect(handleStartUntrackedSession)
      return
    }

    const elapsedBeforeStop = sessionElapsedSeconds
    const activeSessionTaskId = activeFocusSession.task_id
    const activeSessionMode = activeFocusSession.timer_mode

    isFocusCommandInFlightRef.current = true
    try {
      const response = await focusSessionCommand('stop', {
        expected_version: activeFocusSession.version,
        stopped_reason: 'user_stop',
      })

      if (!response) {
        onSignOut?.()
        return
      }

      const stoppedElapsed =
        response.data.stopped_session_summary?.elapsed_seconds_final ??
        Math.max(0, Math.round(elapsedBeforeStop))

      applyFocusSessionEnvelope(response)
      void handleCreatedTimeEntryInvalidation(response.data.created_time_entry_id ?? null)
      setSessionElapsedSeconds(0)
      setIsFocusRunning(false)
      resetCountersAfterStop(activeSessionTaskId, activeSessionMode)
      startTaskCooldown(activeSessionTaskId)

      if (stoppedElapsed > 0 && !response.data.created_time_entry_id) {
        runNonBlockingFocusSideEffect(() => commitCurrentFocusSession(stoppedElapsed))
      } else {
        setActiveFocusSessionMeta(null)
      }

      runNonBlockingFocusSideEffect(handleStartUntrackedSession)
    } catch (error) {
      const handled = await handleFocusSessionApiError(error)
      if (!handled.handled) {
        console.error('Failed to stop focus session', error)
      }
    } finally {
      isFocusCommandInFlightRef.current = false
    }
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
      const nextPreferredMode = timerMode
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
                canStopFocus={Boolean(activeFocusSession) || sessionElapsedSeconds > 0}
                hasActiveSession={Boolean(activeFocusSession)}
                isToggleCooldownActive={isActiveTaskCooldownActive}
                isFocusOnlyMode
                isRunning={isFocusRunning}
                mode={timerMode}
                onChangeMode={handleChangeTimerMode}
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
                onClick={stopTimerEndAlarm}
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
                      canStopFocus={Boolean(activeFocusSession) || sessionElapsedSeconds > 0}
                      hasActiveSession={Boolean(activeFocusSession)}
                      isToggleCooldownActive={isActiveTaskCooldownActive}
                      isRunning={isFocusRunning}
                      mode={timerMode}
                      onChangeMode={handleChangeTimerMode}
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
                onClick={stopTimerEndAlarm}
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
        onClose={handleCloseDeleteTaskModal}
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
        autoDetectTimeZone={autoDetectTimeZone}
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
        onTimeZoneChange={handleTimeZoneChangePersist}
        onToggleAutoDetectTimeZone={handleToggleAutoDetectTimeZonePersist}
        onToggleTaskSwitchConfirmation={handleToggleTaskSwitchConfirmationPersist}
        onToggleUiInteractionSfx={handleToggleUiInteractionSfxPersist}
        requireTaskSwitchConfirmation={requireTaskSwitchConfirmation}
        selectedTimeZone={selectedTimeZone}
        tasks={localizedTaskList}
        timeZoneOptions={timeZoneOptions}
        uiInteractionSfxEnabled={uiInteractionSfxEnabled}
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
    const dateA = a.date ?? '9999-99-99'
    const dateB = b.date ?? '9999-99-99'
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB)
    }

    return parseStartLabelToMinutes(a.start) - parseStartLabelToMinutes(b.start)
  })
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

  const match = normalizedLabel.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }

  const rawHours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3].toUpperCase()
  const normalizedHours = rawHours % 12
  const hour24 = meridiem === 'PM' ? normalizedHours + 12 : normalizedHours

  return hour24 * 60 + minutes
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
