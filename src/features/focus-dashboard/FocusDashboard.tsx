import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { DailyLogPanel } from './components/DailyLogPanel'
import { FocusHeader } from './components/FocusHeader'
import { SettingsModal } from './components/SettingsModal'
import { DeleteTaskConfirmModal } from './components/tasks/DeleteTaskConfirmModal'
import { NewTaskModal, type NewTaskPayload } from './components/tasks/NewTaskModal'
import { TimerPanel } from './components/TimerPanel'
import { TaskCarousel } from './components/tasks/TaskCarousel'
import { dashboardStats, historyLogEntries, logEntries, tasks, timerPreset } from './data/mockData'
import { useCurrentTime } from './hooks/useCurrentTime'
import type { Task } from './types'
import { formatMinutesCompact, parseDurationLabelToMinutes } from './utils/time'

export function FocusDashboard() {
  const [taskList, setTaskList] = useState<Task[]>(tasks)
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true,
  )

  const { timeLabel, timeZoneName, utcOffsetLabel } = useCurrentTime()
  const sessionCountByTaskId = useMemo(() => {
    return logEntries.reduce<Record<string, number>>((acc, entry) => {
      if (!entry.taskId) {
        return acc
      }

      acc[entry.taskId] = (acc[entry.taskId] ?? 0) + 1
      return acc
    }, {})
  }, [])
  const loggedMinutesByTaskId = useMemo(() => {
    return logEntries.reduce<Record<string, number>>((acc, entry) => {
      if (!entry.taskId) {
        return acc
      }

      acc[entry.taskId] = (acc[entry.taskId] ?? 0) + parseDurationLabelToMinutes(entry.duration)
      return acc
    }, {})
  }, [])
  const activeTask = useMemo(() => {
    return taskList.find((task) => task.state === 'active') ?? taskList[0] ?? null
  }, [taskList])
  const activeTaskTotalTimeLabel = activeTask
    ? formatMinutesCompact(loggedMinutesByTaskId[activeTask.id] ?? 0).toUpperCase()
    : '0M'

  const handleAddTask = () => {
    setEditingTask(null)
    setIsNewTaskModalOpen(true)
  }
  const handleCloseNewTaskModal = () => {
    setIsNewTaskModalOpen(false)
    setEditingTask(null)
  }
  const handleCreateTask = ({ title, details, colorTag, iconTag }: NewTaskPayload) => {
    if (editingTask) {
      setTaskList((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title,
                details: details || 'No details yet',
                colorTag,
                iconTag,
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
        details: details || 'No details yet',
        statusText: `Scheduled: ${createdAtLabel}`,
        duration: '00:00:00',
        state: 'scheduled',
        colorTag,
        iconTag,
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
  const handleCloseDeleteTaskModal = () => {
    setTaskPendingDelete(null)
  }
  const handleConfirmDeleteTask = () => {
    if (!taskPendingDelete) {
      return
    }

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

    if (editingTask?.id === taskPendingDelete.id) {
      setIsNewTaskModalOpen(false)
      setEditingTask(null)
    }
    setTaskPendingDelete(null)
  }
  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true)
  }
  const handleCloseSettings = () => {
    setIsSettingsModalOpen(false)
  }
  const handleStartFocus = () => undefined
  const handlePlayTask = (selectedTask: Task) => {
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
    handleStartFocus()
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
          entries={logEntries}
          isOpen={isDailyLogOpen}
          tasks={taskList}
          totalTracked={dashboardStats.totalTracked}
        />

        <section className="app-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full flex-1 flex-col px-4 pb-8 pt-5 md:px-6">
            <TaskCarousel
              onAddTask={handleAddTask}
              onDeleteTask={handleRequestDeleteTask}
              onEditTask={handleEditTask}
              onPlayTask={handlePlayTask}
              sessionCountByTaskId={sessionCountByTaskId}
              tasks={taskList}
            />
            <TimerPanel
              activeTask={activeTask}
              onStartFocus={handleStartFocus}
              timeLabel={timerPreset.timeLabel}
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
      />
      <DeleteTaskConfirmModal
        isOpen={taskPendingDelete !== null}
        onClose={handleCloseDeleteTaskModal}
        onConfirm={handleConfirmDeleteTask}
        task={taskPendingDelete}
      />
      <SettingsModal
        dashboardStats={dashboardStats}
        entries={logEntries}
        historyEntries={historyLogEntries}
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
        tasks={taskList}
      />
    </div>
  )
}
