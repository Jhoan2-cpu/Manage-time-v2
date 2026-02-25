import { useEffect, useMemo, useState } from 'react'
import type { FocusTimerMode, Task } from '../types'
import { formatSecondsHms } from '../utils/time'

type ActiveUntrackedSession = {
  startedAtMs: number
  startLabel: string
  dateKey: string
} | null

type ActiveFocusSessionMeta = {
  taskId: string
  startLabel: string
  dateKey: string
} | null

type UseFocusSessionControllerParams = {
  activeTask: Task | null
  initialTimerMode: FocusTimerMode
  loggedSecondsByTaskId: Record<string, number>
}

export function useFocusSessionController({
  activeTask,
  initialTimerMode,
  loggedSecondsByTaskId,
}: UseFocusSessionControllerParams) {
  const [isFocusRunning, setIsFocusRunning] = useState(false)
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0)
  const [timerMode, setTimerMode] = useState<FocusTimerMode>(initialTimerMode)
  const [activeUntrackedSession, setActiveUntrackedSession] = useState<ActiveUntrackedSession>(null)
  const [activeFocusSessionMeta, setActiveFocusSessionMeta] = useState<ActiveFocusSessionMeta>(null)

  const activeTaskHasLiveSession = Boolean(activeTask && activeFocusSessionMeta?.taskId === activeTask.id)
  const activeTaskTargetSeconds =
    (activeTask?.targetDurationMinutes ?? 0) > 0 ? Math.round((activeTask?.targetDurationMinutes ?? 0) * 60) : null

  const timerProgressPercent =
    timerMode === 'timer' && activeTaskTargetSeconds
      ? Math.max(0, Math.min(100, (sessionElapsedSeconds / activeTaskTargetSeconds) * 100))
      : null

  const timerDisplaySeconds =
    timerMode === 'timer' && activeTaskTargetSeconds
      ? Math.max(0, activeTaskTargetSeconds - sessionElapsedSeconds)
      : sessionElapsedSeconds
  const timerDisplayLabel = useMemo(() => formatSecondsHms(timerDisplaySeconds), [timerDisplaySeconds])

  const isTimerComplete = Boolean(
    timerMode === 'timer' && activeTaskTargetSeconds && sessionElapsedSeconds >= activeTaskTargetSeconds,
  )

  const activeTaskTotalTimeLabel = useMemo(
    () =>
      activeTask
        ? formatSecondsHms((loggedSecondsByTaskId[activeTask.id] ?? 0) + (activeTaskHasLiveSession ? sessionElapsedSeconds : 0))
        : '00:00:00',
    [activeTask, activeTaskHasLiveSession, loggedSecondsByTaskId, sessionElapsedSeconds],
  )

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
    if (timerMode === 'timer' && !activeTaskTargetSeconds) {
      setTimerMode('stopwatch')
      return
    }

    if (timerMode === 'timer' && activeTaskTargetSeconds) {
      setSessionElapsedSeconds((currentSeconds) => Math.min(currentSeconds, activeTaskTargetSeconds))
    }
  }, [activeTaskTargetSeconds, timerMode])

  return {
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
    activeTaskHasLiveSession,
    activeTaskTargetSeconds,
    timerProgressPercent,
    timerDisplayLabel,
    isTimerComplete,
    activeTaskTotalTimeLabel,
  }
}
