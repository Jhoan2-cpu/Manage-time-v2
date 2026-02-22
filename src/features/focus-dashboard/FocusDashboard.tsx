import { useState } from 'react'
import { AmbientSoundPanel } from './components/AmbientSoundPanel'
import { DailyLogPanel } from './components/DailyLogPanel'
import { FocusHeader } from './components/FocusHeader'
import { FocusStatsFooter } from './components/FocusStatsFooter'
import { NewTaskModal, type NewTaskPayload } from './components/tasks/NewTaskModal'
import { TimerPanel } from './components/TimerPanel'
import { TaskCarousel } from './components/tasks/TaskCarousel'
import { dashboardStats, logEntries, soundOptions, tasks, timerPreset } from './data/mockData'
import { useCurrentTime } from './hooks/useCurrentTime'
import type { Task } from './types'

export function FocusDashboard() {
  const [taskList, setTaskList] = useState<Task[]>(tasks)
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [selectedSoundId, setSelectedSoundId] = useState(soundOptions[0]?.id ?? '')
  const [volume, setVolume] = useState(50)

  const { timeLabel, timeZoneName, utcOffsetLabel } = useCurrentTime()

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

  return (
    <div className="min-h-screen bg-[#060e1d] text-slate-100">
      <FocusHeader
        onOpenSettings={handleOpenSettings}
        timeLabel={timeLabel}
        timeZoneName={timeZoneName}
        utcOffsetLabel={utcOffsetLabel}
      />

      <main className="flex h-screen pt-16">
        <section className="app-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full flex-1 flex-col px-4 pb-8 pt-5 md:px-6">
            <TaskCarousel onAddTask={handleAddTask} tasks={taskList} />
            <TimerPanel
              onStartFocus={handleStartFocus}
              progress={timerPreset.progress}
              timeLabel={timerPreset.timeLabel}
            />
            <AmbientSoundPanel
              onSoundSelect={setSelectedSoundId}
              onVolumeChange={setVolume}
              selectedSoundId={selectedSoundId}
              sounds={soundOptions}
              volume={volume}
            />
            <FocusStatsFooter focusTime={dashboardStats.focusTime} sessions={dashboardStats.sessions} />
          </div>
        </section>

        <DailyLogPanel entries={logEntries} totalTracked={dashboardStats.totalTracked} />
      </main>

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={handleCloseNewTaskModal}
        onCreateTask={handleCreateTask}
      />
    </div>
  )
}
