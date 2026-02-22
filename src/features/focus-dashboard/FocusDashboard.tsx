import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { DailyLogPanel } from './components/DailyLogPanel'
import { FocusHeader } from './components/FocusHeader'
import { FocusStatsFooter } from './components/FocusStatsFooter'
import { NewTaskModal, type NewTaskPayload } from './components/tasks/NewTaskModal'
import { TimerPanel } from './components/TimerPanel'
import { TaskCarousel } from './components/tasks/TaskCarousel'
import { dashboardStats, logEntries, soundOptions, tasks, timerPreset } from './data/mockData'
import { useCurrentTime } from './hooks/useCurrentTime'
import type { Task } from './types'
import { formatMinutesCompact, parseDurationLabelToMinutes } from './utils/time'

export function FocusDashboard() {
  const [taskList, setTaskList] = useState<Task[]>(tasks)
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(true)
  const [selectedSoundId, setSelectedSoundId] = useState(soundOptions[0]?.id ?? '')
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(true)

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
    setIsNewTaskModalOpen(true)
  }
  const handleCloseNewTaskModal = () => {
    setIsNewTaskModalOpen(false)
  }
  const handleCreateTask = ({ title, details, colorTag, iconTag }: NewTaskPayload) => {
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
  const handleOpenSettings = () => undefined
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
  const handleToggleAmbientPlayback = () => {
    setIsAmbientPlaying((current) => !current)
  }

  return (
    <div className="min-h-screen bg-[#060e1d] text-slate-100">
      <FocusHeader
        onOpenSettings={handleOpenSettings}
        timeLabel={timeLabel}
        timeZoneName={timeZoneName}
        utcOffsetLabel={utcOffsetLabel}
      />

      <main className="flex h-screen pt-16">
        <DailyLogPanel
          entries={logEntries}
          isAmbientPlaying={isAmbientPlaying}
          isOpen={isDailyLogOpen}
          onSoundSelect={setSelectedSoundId}
          onToggleAmbientPlayback={handleToggleAmbientPlayback}
          selectedSoundId={selectedSoundId}
          sounds={soundOptions}
          tasks={taskList}
          totalTracked={dashboardStats.totalTracked}
        />

        <section className="app-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full flex-1 flex-col px-4 pb-8 pt-5 md:px-6">
            <TaskCarousel
              onAddTask={handleAddTask}
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
            <FocusStatsFooter focusTime={dashboardStats.focusTime} sessions={dashboardStats.sessions} />
          </div>
        </section>
      </main>

      <button
        aria-label={isDailyLogOpen ? 'Close Daily Log' : 'Open Daily Log'}
        className="fixed top-1/2 z-40 hidden h-12 w-9 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-slate-700/80 bg-[#0a1427]/95 text-slate-300 shadow-[0_10px_30px_rgba(1,8,22,0.45)] transition hover:border-blue-500/40 hover:text-blue-300 xl:grid"
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
        isOpen={isNewTaskModalOpen}
        onClose={handleCloseNewTaskModal}
        onCreateTask={handleCreateTask}
      />
    </div>
  )
}
