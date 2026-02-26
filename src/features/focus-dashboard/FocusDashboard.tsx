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
import { historyLogEntries, logEntries as initialLogEntries, tasks } from './data/mockData'
import { useCurrentTime } from './hooks/useCurrentTime'
import { useFocusSessionController } from './hooks/useFocusSessionController'
import { useFocusDashboardShellState } from './hooks/useFocusDashboardShellState'
import { useTaskManagementState } from './hooks/useTaskManagementState'
import {
  createTask as createTaskApi,
  deleteTask as deleteTaskApi,
  updatePreferences,
  updateTask as updateTaskApi,
  type AppBootstrapData,
  type CreateTaskPayload,
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
import type { FocusTimerMode, LogEntry, Task, TaskColorKey } from './types'
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

const fallbackDashboardStats = {
  sessions: 0,
  focusTime: '0m 00s',
  totalTracked: '0m 00s',
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
        : tasks,
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
        : initialLogEntries,
    [bootstrapData, copy.manualAdjustment, copy.untrackedTime],
  )
  const bootstrapDashboardStats = useMemo(
    () => (bootstrapData ? adaptBootstrapDashboardStatsToUi(bootstrapData.dashboard_stats) : fallbackDashboardStats),
    [bootstrapData],
  )
  const [dailyLogEntries, setDailyLogEntries] = useState<LogEntry[]>(bootstrapInitialDailyLogEntries)
  const [taskPendingSwitchConfirm, setTaskPendingSwitchConfirm] = useState<Task | null>(null)
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
  const latestPreferencesRef = useRef<UserPreferences | null>(bootstrapData?.preferences ?? null)
  const pendingPreferencesPatchRef = useRef<UpdatePreferencesPayload>({})
  const preferencesPatchTimerRef = useRef<number | null>(null)
  const isPreferencesPatchInFlightRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (preferencesPatchTimerRef.current !== null) {
        window.clearTimeout(preferencesPatchTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    latestPreferencesRef.current = bootstrapData?.preferences ?? null
  }, [bootstrapData?.preferences])
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

  const { timeLabel, timeZoneName, utcOffsetLabel } = useCurrentTime(
    effectiveTimeZone,
    bootstrapData?.server_now_utc ?? null,
  )

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

  const mergeServerTaskIntoUiTask = (serverTask: TaskApiItem, existingTask: Task) => {
    const adapted = adaptTaskItemToUi(serverTask, { state: existingTask.state })
    return {
      ...adapted,
      state: existingTask.state,
      details: existingTask.details,
      statusText: existingTask.statusText,
      // Keep the local duration label to avoid regressing UI when local session/runtime has newer values than M4 backend.
      duration: existingTask.duration,
    } satisfies Task
  }

  const buildTasksApiPayloadFromModalPayload = (payload: NewTaskPayload): CreateTaskPayload => {
    const totalSeconds =
      typeof payload.targetDurationMinutes === 'number' && Number.isFinite(payload.targetDurationMinutes)
        ? Math.max(0, Math.round(payload.targetDurationMinutes * 60))
        : 0

    return {
      title: payload.title.trim(),
      color_tag: payload.colorTag,
      icon_tag: payload.iconTag,
      target_duration_seconds: totalSeconds > 0 ? Math.min(totalSeconds, 24 * 60 * 60) : null,
      alarm_time_local: payload.alarmTime?.trim() ? payload.alarmTime.trim() : null,
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
    setTaskPendingSwitchConfirm((current) => (current?.id === deletedTaskId ? null : current))
  }

  const handleCreateTaskPersist = async (payload: NewTaskPayload) => {
    const apiPayload = buildTasksApiPayloadFromModalPayload(payload)
    const editingTaskId = editingTask?.id ?? null

    try {
      if (editingTaskId) {
        const updatedTask = await updateTaskApi(editingTaskId, apiPayload)
        if (!updatedTask) {
          onSignOut?.()
          return
        }

        setTaskList((currentTasks) =>
          currentTasks.map((task) => (task.id === editingTaskId ? mergeServerTaskIntoUiTask(updatedTask, task) : task)),
        )
        return
      }

      const createdTask = await createTaskApi(apiPayload)
      if (!createdTask) {
        onSignOut?.()
        return
      }

      setTaskList((currentTasks) => {
        const nextState = currentTasks.length === 0 ? 'active' : 'scheduled'
        const uiTask = adaptTaskItemToUi(createdTask, { state: nextState })
        return [...currentTasks, uiTask]
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
        bootstrapData ? dailyLogEntries : historyLogEntries,
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
    activeTaskTargetSeconds,
    timerProgressPercent,
    timerDisplayLabel,
    isTimerComplete,
    activeTaskTotalTimeLabel,
  } = useFocusSessionController({
    activeTask,
    initialTimerMode,
    loggedSecondsByTaskId,
  })
  const localizedTaskList = useMemo(() => taskList.map((task) => localizeStaticTaskTitle(task, locale)), [locale, taskList])
  const activeTaskDisplay = useMemo(
    () => (activeTask ? localizeStaticTaskTitle(activeTask, locale) : null),
    [activeTask, locale],
  )
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
    if (timerMode !== 'timer' || !isFocusRunning || !activeTaskTargetSeconds) {
      return
    }

    if (sessionElapsedSeconds >= activeTaskTargetSeconds) {
      setSessionElapsedSeconds(activeTaskTargetSeconds)
      setIsFocusRunning(false)
      commitCurrentFocusSession()
      triggerTimerEndAlarm()
    }
  }, [activeTaskTargetSeconds, isFocusRunning, sessionElapsedSeconds, timerMode])

  const handleConfirmDeleteTask = async () => {
    if (!taskPendingDelete) {
      return
    }

    const deletingTaskId = taskPendingDelete.id

    try {
      const result = await deleteTaskApi(deletingTaskId)
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
  const handleFinishUntrackedSession = () => {
    setActiveUntrackedSession((currentSession) => {
      if (!currentSession) {
        return null
      }

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - currentSession.startedAtMs) / 1000))
      if (elapsedSeconds <= 0) {
        return null
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
      return null
    })
  }
  const commitCurrentFocusSession = () => {
    if (!activeTask || sessionElapsedSeconds <= 0) {
      return
    }

    if (!activeFocusSessionMeta || activeFocusSessionMeta.taskId !== activeTask.id) {
      return
    }

    const durationLabel = formatLogDurationFromSeconds(sessionElapsedSeconds)
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
  const activateTaskAndStartNewCount = (selectedTask: Task) => {
    runNonBlockingFocusSideEffect(stopTimerEndAlarm)
    runNonBlockingFocusSideEffect(handleFinishUntrackedSession)
    runNonBlockingFocusSideEffect(commitCurrentFocusSession)
    setWorkspaceGlowPulseKey((current) => current + 1)
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
    setTimerMode(selectedTask.targetDurationMinutes ? 'timer' : 'stopwatch')
    runNonBlockingFocusSideEffect(() => startFocusSessionMeta(selectedTask))
    setIsFocusRunning(true)
  }
  const handleStartFocus = () => {
    if (!activeTask) {
      return
    }

    runNonBlockingFocusSideEffect(stopTimerEndAlarm)

    if (isFocusRunning) {
      setIsFocusRunning(false)
      runNonBlockingFocusSideEffect(handleStartUntrackedSession)
      return
    }

    runNonBlockingFocusSideEffect(handleFinishUntrackedSession)

    const willResetCompletedTimer = Boolean(
      timerMode === 'timer' && activeTaskTargetSeconds && sessionElapsedSeconds >= activeTaskTargetSeconds,
    )
    if (willResetCompletedTimer) {
      setSessionElapsedSeconds(0)
    }

    const shouldStartNewFocusSession =
      willResetCompletedTimer ||
      sessionElapsedSeconds === 0 ||
      !activeFocusSessionMeta ||
      activeFocusSessionMeta.taskId !== activeTask.id

    if (shouldStartNewFocusSession) {
      runNonBlockingFocusSideEffect(() => startFocusSessionMeta(activeTask))
    }

    setIsFocusRunning(true)
  }
  const handleChangeTimerMode = (nextMode: FocusTimerMode) => {
    if (nextMode === 'timer' && !activeTaskTargetSeconds) {
      return
    }

    runNonBlockingFocusSideEffect(stopTimerEndAlarm)
    setTimerMode(nextMode)
  }
  const handlePlayTask = (selectedTask: Task) => {
    if (activeTask && selectedTask.id === activeTask.id) {
      handleStartFocus()
      return
    }

    if (requireTaskSwitchConfirmation && isFocusRunning && activeTask && selectedTask.id !== activeTask.id) {
      setTaskPendingSwitchConfirm(selectedTask)
      return
    }

    activateTaskAndStartNewCount(selectedTask)
  }
  const handleCloseSwitchTaskConfirm = () => {
    setTaskPendingSwitchConfirm(null)
  }
  const handleConfirmSwitchTask = () => {
    if (!taskPendingSwitchConfirm) {
      return
    }

    activateTaskAndStartNewCount(taskPendingSwitchConfirm)
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
          <section className="focus-only-overlay-enter app-scroll relative h-[100svh] overflow-x-hidden overflow-y-auto sm:overflow-y-hidden [@media(max-height:840px)]:overflow-y-auto">
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

            <div className="focus-only-content-enter relative z-10 mx-auto flex min-h-full w-full max-w-[1600px] items-center px-3 py-4 sm:px-8 sm:py-8 [@media(max-height:840px)]:items-start">
              <TimerPanel
                activeTask={activeTask}
                canUseTimerMode={Boolean(activeTaskTargetSeconds)}
                isFocusOnlyMode
                isRunning={isFocusRunning}
                isTimerComplete={isTimerComplete}
                mode={timerMode}
                onChangeMode={handleChangeTimerMode}
                onStartFocus={handleStartFocus}
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
                totalTracked={bootstrapDashboardStats.totalTracked}
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
                       isActiveTaskTimerComplete={isTimerComplete}
                       isFocusRunning={isFocusRunning}
                      onAddTask={handleAddTask}
                      onDeleteTask={handleRequestDeleteTask}
                      onEditTask={handleEditTask}
                      onPlayTask={handlePlayTask}
                      sessionCountByTaskId={sessionCountByTaskId}
                      tasks={carouselTaskList}
                    />
                    <TimerPanel
                      activeTask={activeTaskDisplay}
                      canUseTimerMode={Boolean(activeTaskTargetSeconds)}
                      isRunning={isFocusRunning}
                      isTimerComplete={isTimerComplete}
                      mode={timerMode}
                      onChangeMode={handleChangeTimerMode}
                      onStartFocus={handleStartFocus}
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
        nextTask={taskPendingSwitchConfirm ? localizeStaticTaskTitle(taskPendingSwitchConfirm, locale) : null}
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
        dashboardStats={bootstrapDashboardStats}
        effectiveTimeZone={effectiveTimeZone}
        entries={localizedDailyLogEntries}
        historyEntries={localizedHistoryEntries}
        isOpen={isSettingsModalOpen}
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

function runNonBlockingFocusSideEffect(action: () => void) {
  try {
    action()
  } catch {
    // Audio/log side effects should not block timer controls.
  }
}
