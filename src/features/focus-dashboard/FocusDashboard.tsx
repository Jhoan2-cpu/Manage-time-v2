import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { DailyLogPanel } from './components/DailyLogPanel'
import { FocusHeader } from './components/FocusHeader'
import { SettingsModal } from './components/SettingsModal'
import { DeleteTaskConfirmModal } from './components/tasks/DeleteTaskConfirmModal'
import { NewTaskModal, type NewTaskPayload } from './components/tasks/NewTaskModal'
import { SwitchTaskConfirmModal } from './components/tasks/SwitchTaskConfirmModal'
import { TimerPanel } from './components/TimerPanel'
import { TaskCarousel } from './components/tasks/TaskCarousel'
import { dashboardStats, historyLogEntries, logEntries as initialLogEntries, tasks } from './data/mockData'
import { useCurrentTime } from './hooks/useCurrentTime'
import type { FocusTimerMode, LogEntry, Task, TaskColorKey } from './types'
import { formatSecondsHms, parseDurationLabelToSeconds } from './utils/time'

const workspaceAccentRgbByColor: Record<TaskColorKey, string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  violet: '139,92,246',
}

export function FocusDashboard() {
  const [taskList, setTaskList] = useState<Task[]>(tasks)
  const [dailyLogEntries, setDailyLogEntries] = useState<LogEntry[]>(initialLogEntries)
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null)
  const [taskPendingSwitchConfirm, setTaskPendingSwitchConfirm] = useState<Task | null>(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true,
  )
  const [isFocusRunning, setIsFocusRunning] = useState(false)
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0)
  const [workspaceGlowPulseKey, setWorkspaceGlowPulseKey] = useState(0)
  const [timerMode, setTimerMode] = useState<FocusTimerMode>(() => {
    const initialActiveTask = tasks.find((task) => task.state === 'active') ?? tasks[0] ?? null
    return initialActiveTask?.targetDurationMinutes ? 'timer' : 'stopwatch'
  })
  const [activeUntrackedSession, setActiveUntrackedSession] = useState<{
    startedAtMs: number
    startLabel: string
    dateKey: string
  } | null>(null)
  const [activeFocusSessionMeta, setActiveFocusSessionMeta] = useState<{
    taskId: string
    startLabel: string
    dateKey: string
  } | null>(null)

  const { timeLabel, timeZoneName, utcOffsetLabel } = useCurrentTime()
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
  const activeTaskHasLiveSession = Boolean(activeTask && activeFocusSessionMeta?.taskId === activeTask.id)
  const activeWorkspaceAccentColor = activeTask?.colorTag ?? 'blue'
  const workspaceAccentRgb = workspaceAccentRgbByColor[activeWorkspaceAccentColor]
  const activeTaskTargetSeconds = (activeTask?.targetDurationMinutes ?? 0) > 0 ? (activeTask?.targetDurationMinutes ?? 0) * 60 : null
  const timerProgressPercent =
    timerMode === 'timer' && activeTaskTargetSeconds
      ? Math.max(0, Math.min(100, (sessionElapsedSeconds / activeTaskTargetSeconds) * 100))
      : null
  const timerDisplaySeconds =
    timerMode === 'timer' && activeTaskTargetSeconds
      ? Math.max(0, activeTaskTargetSeconds - sessionElapsedSeconds)
      : sessionElapsedSeconds
  const timerDisplayLabel = formatSecondsHms(timerDisplaySeconds)
  const activeTaskTotalTimeLabel = activeTask
    ? formatSecondsHms((loggedSecondsByTaskId[activeTask.id] ?? 0) + (activeTaskHasLiveSession ? sessionElapsedSeconds : 0))
    : '00:00:00'
  const carouselTaskList = useMemo(
    () =>
      taskList.map((task) =>
        activeTask && task.id === activeTask.id
          ? {
              ...task,
              duration: timerDisplayLabel,
            }
          : task,
      ),
    [activeTask, taskList, timerDisplayLabel],
  )
  const sidebarLogEntries = activeUntrackedSession
    ? sortLogEntriesByTime([
        ...dailyLogEntries,
        {
          id: 'log-live-untracked',
          date: activeUntrackedSession.dateKey,
          start: activeUntrackedSession.startLabel,
          duration: formatLogDurationFromSeconds(Math.floor((Date.now() - activeUntrackedSession.startedAtMs) / 1000)),
          activity: 'Untracked Time',
          tone: 'faded',
        },
      ])
    : dailyLogEntries
  useEffect(() => {
    if (!isFocusRunning) {
      return
    }

    const intervalId = window.setInterval(() => {
      setSessionElapsedSeconds((currentSeconds) => currentSeconds + 1)
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isFocusRunning])

  useEffect(() => {
    if (timerMode !== 'timer' || !isFocusRunning || !activeTaskTargetSeconds) {
      return
    }

    if (sessionElapsedSeconds >= activeTaskTargetSeconds) {
      setSessionElapsedSeconds(activeTaskTargetSeconds)
      setIsFocusRunning(false)
      commitCurrentFocusSession()
    }
  }, [activeTaskTargetSeconds, isFocusRunning, sessionElapsedSeconds, timerMode])

  useEffect(() => {
    if (timerMode === 'timer' && !activeTaskTargetSeconds) {
      setTimerMode('stopwatch')
      return
    }

    if (timerMode === 'timer' && activeTaskTargetSeconds) {
      setSessionElapsedSeconds((currentSeconds) => Math.min(currentSeconds, activeTaskTargetSeconds))
    }
  }, [activeTaskTargetSeconds, timerMode])

  const handleAddTask = () => {
    setEditingTask(null)
    setIsNewTaskModalOpen(true)
  }
  const handleCloseNewTaskModal = () => {
    setIsNewTaskModalOpen(false)
    setEditingTask(null)
  }
  const handleCreateTask = ({ title, details, colorTag, iconTag, targetDurationMinutes, alarmTime }: NewTaskPayload) => {
    if (editingTask) {
      setTaskList((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title,
                details: details.trim(),
                colorTag,
                iconTag,
                targetDurationMinutes,
                alarmTime,
              }
            : task,
        ),
      )
      return
    }

    const createdAtLabel = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date())

    setTaskList((currentTasks) => [
      {
        id: `task-${crypto.randomUUID()}`,
        title,
        details: details.trim(),
        statusText: `Scheduled: ${createdAtLabel}`,
        duration: '00:00:00',
        state: 'scheduled',
        colorTag,
        iconTag,
        targetDurationMinutes,
        alarmTime,
      },
      ...currentTasks,
    ])
  }
  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsNewTaskModalOpen(true)
  }
  const handleRequestDeleteTask = (task: Task) => {
    setTaskPendingDelete(task)
  }
  const handleRequestDeleteFromTaskModal = (task: Task) => {
    setIsNewTaskModalOpen(false)
    setTaskPendingDelete(task)
  }
  const handleCloseDeleteTaskModal = () => {
    setTaskPendingDelete(null)
  }
  const handleConfirmDeleteTask = () => {
    if (!taskPendingDelete) {
      return
    }
    const deletingActiveTask = activeTask?.id === taskPendingDelete.id

    setTaskList((currentTasks) => {
      const remainingTasks = currentTasks.filter((task) => task.id !== taskPendingDelete.id)

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
      const remainingTasks = taskList.filter((task) => task.id !== taskPendingDelete.id)
      const nextActiveTask = remainingTasks.find((task) => task.state === 'active') ?? remainingTasks[0] ?? null
      setIsFocusRunning(false)
      setSessionElapsedSeconds(0)
      setActiveFocusSessionMeta(null)
      setTimerMode(nextActiveTask?.targetDurationMinutes ? 'timer' : 'stopwatch')
    }

    if (editingTask?.id === taskPendingDelete.id) {
      setIsNewTaskModalOpen(false)
      setEditingTask(null)
    }
    setTaskPendingDelete(null)
    setTaskPendingSwitchConfirm((current) => (current?.id === taskPendingDelete.id ? null : current))
  }
  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true)
  }
  const handleCloseSettings = () => {
    setIsSettingsModalOpen(false)
  }
  const startFocusSessionMeta = (task: Task) => {
    const now = new Date()
    setActiveFocusSessionMeta({
      taskId: task.id,
      startLabel: formatLogStartTime(now),
      dateKey: formatLocalDateKey(now),
    })
  }
  const handleStartUntrackedSession = () => {
    const now = new Date()
    setActiveUntrackedSession((current) =>
      current ?? {
        startedAtMs: now.getTime(),
        startLabel: formatLogStartTime(now),
        dateKey: formatLocalDateKey(now),
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
        activity: 'Untracked Time',
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
    handleFinishUntrackedSession()
    commitCurrentFocusSession()
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
    startFocusSessionMeta(selectedTask)
    setIsFocusRunning(true)
  }
  const handleStartFocus = () => {
    if (!activeTask) {
      return
    }

    if (isFocusRunning) {
      setIsFocusRunning(false)
      handleStartUntrackedSession()
      return
    }

    handleFinishUntrackedSession()

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
      startFocusSessionMeta(activeTask)
    }

    setIsFocusRunning(true)
  }
  const handleChangeTimerMode = (nextMode: FocusTimerMode) => {
    if (nextMode === 'timer' && !activeTaskTargetSeconds) {
      return
    }

    setTimerMode(nextMode)
  }
  const handlePlayTask = (selectedTask: Task) => {
    if (activeTask && selectedTask.id === activeTask.id) {
      handleStartFocus()
      return
    }

    if (isFocusRunning && activeTask && selectedTask.id !== activeTask.id) {
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
  const handleToggleDailyLog = () => {
    setIsDailyLogOpen((current) => !current)
  }

  return (
    <div className="min-h-screen bg-[#060e1d] text-slate-100">
      <FocusHeader
        onOpenSettings={handleOpenSettings}
        timeLabel={timeLabel}
        timeZoneName={timeZoneName}
        utcOffsetLabel={utcOffsetLabel}
      />

      {isDailyLogOpen ? (
        <button
          aria-label="Close Daily Log overlay"
          className="fixed inset-0 top-16 z-30 bg-[#020814]/55 backdrop-blur-[2px] xl:hidden"
          onClick={handleToggleDailyLog}
          type="button"
        />
      ) : null}

      <main className="flex h-[100svh] min-h-[100svh] pt-16">
        <DailyLogPanel
          entries={sidebarLogEntries}
          isOpen={isDailyLogOpen}
          tasks={taskList}
          totalTracked={dashboardStats.totalTracked}
        />

        <section className="app-scroll relative isolate flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
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

          <div className="relative z-10 mx-auto flex w-full flex-1 flex-col px-4 pb-8 pt-5 md:px-6">
            <TaskCarousel
              accentColorTag={activeWorkspaceAccentColor}
              isFocusRunning={isFocusRunning}
              onAddTask={handleAddTask}
              onDeleteTask={handleRequestDeleteTask}
              onEditTask={handleEditTask}
              onPlayTask={handlePlayTask}
              sessionCountByTaskId={sessionCountByTaskId}
              tasks={carouselTaskList}
            />
            <TimerPanel
              activeTask={activeTask}
              canUseTimerMode={Boolean(activeTaskTargetSeconds)}
              isRunning={isFocusRunning}
              mode={timerMode}
              onChangeMode={handleChangeTimerMode}
              onStartFocus={handleStartFocus}
              timeLabel={timerDisplayLabel}
              timerProgressPercent={timerProgressPercent}
              totalTaskTimeLabel={activeTaskTotalTimeLabel}
            />
          </div>
        </section>
      </main>

      <button
        aria-label={isDailyLogOpen ? 'Close Daily Log' : 'Open Daily Log'}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#0a1427]/95 px-3 py-2 text-sm text-slate-200 shadow-[0_12px_30px_rgba(1,8,22,0.45)] ring-1 ring-slate-700/80 transition hover:ring-blue-500/40 xl:hidden"
        onClick={handleToggleDailyLog}
        type="button"
      >
        <FontAwesomeIcon className="text-[12px] text-slate-300" icon={faClockRotateLeft} />
        <span className="font-medium">{isDailyLogOpen ? 'Hide Log' : 'Daily Log'}</span>
        <FontAwesomeIcon className="text-[10px]" icon={isDailyLogOpen ? faChevronLeft : faChevronRight} />
      </button>

      <button
        aria-label={isDailyLogOpen ? 'Close Daily Log' : 'Open Daily Log'}
        className="fixed top-1/2 z-40 hidden h-12 w-9 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-slate-700/80 bg-[#0a1427]/95 text-slate-300 shadow-[0_10px_30px_rgba(1,8,22,0.45)] transition-[left,border-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-blue-500/40 hover:text-blue-300 xl:grid"
        onClick={handleToggleDailyLog}
        style={{ left: isDailyLogOpen ? 340 : 0 }}
        title={isDailyLogOpen ? 'Close Daily Log' : 'Open Daily Log'}
        type="button"
      >
        <span className="flex flex-col items-center gap-0.5">
          <FontAwesomeIcon className="text-[11px]" icon={faClockRotateLeft} />
          <FontAwesomeIcon className="text-[10px]" icon={isDailyLogOpen ? faChevronLeft : faChevronRight} />
        </span>
      </button>

      <NewTaskModal
        editingTask={editingTask}
        isOpen={isNewTaskModalOpen}
        onClose={handleCloseNewTaskModal}
        onCreateTask={handleCreateTask}
        onRequestDeleteTask={handleRequestDeleteFromTaskModal}
      />
      <DeleteTaskConfirmModal
        isOpen={taskPendingDelete !== null}
        onClose={handleCloseDeleteTaskModal}
        onConfirm={handleConfirmDeleteTask}
        task={taskPendingDelete}
      />
      <SwitchTaskConfirmModal
        currentTask={activeTask}
        isOpen={taskPendingSwitchConfirm !== null}
        nextTask={taskPendingSwitchConfirm}
        onClose={handleCloseSwitchTaskConfirm}
        onConfirm={handleConfirmSwitchTask}
      />
      <SettingsModal
        dashboardStats={dashboardStats}
        entries={dailyLogEntries}
        historyEntries={historyLogEntries}
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
        tasks={taskList}
      />
    </div>
  )
}

function formatLogStartTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLogDurationFromSeconds(totalSeconds: number) {
  return formatSecondsHms(totalSeconds)
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
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
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
