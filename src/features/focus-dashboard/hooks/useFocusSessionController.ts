import { useEffect, useMemo, useState } from 'react'
import type { ActiveFocusSession } from '../api'
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
  initialAuthoritativeFocusSession?: ActiveFocusSession | null
  initialServerNowUtc?: string | null
}

export function useFocusSessionController({
  activeTask,
  initialTimerMode,
  loggedSecondsByTaskId,
  initialAuthoritativeFocusSession = null,
  initialServerNowUtc = null,
}: UseFocusSessionControllerParams) {
  const [isFocusRunningLocal, setIsFocusRunning] = useState(false)
  const [sessionElapsedSecondsLocal, setSessionElapsedSeconds] = useState(0)
  const [timerModeLocal, setTimerMode] = useState<FocusTimerMode>(initialTimerMode)
  const [activeUntrackedSession, setActiveUntrackedSession] = useState<ActiveUntrackedSession>(null)
  const [activeFocusSessionMeta, setActiveFocusSessionMeta] = useState<ActiveFocusSessionMeta>(null)
  const [authoritativeFocusSession, setAuthoritativeFocusSession] = useState<ActiveFocusSession | null>(
    initialAuthoritativeFocusSession,
  )
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(() => getServerOffsetMs(initialServerNowUtc))
  const [lastServerNowUtc, setLastServerNowUtc] = useState<string | null>(initialServerNowUtc ?? null)
  const [serverTickKey, setServerTickKey] = useState(0)

  const timerMode =
    authoritativeFocusSession?.session_state === 'running' ? authoritativeFocusSession.timer_mode : timerModeLocal
  const isFocusRunning = authoritativeFocusSession
    ? authoritativeFocusSession.session_state === 'running'
    : isFocusRunningLocal
  const sessionElapsedSeconds = useMemo(
    () => computeDisplayElapsedSeconds(authoritativeFocusSession, serverClockOffsetMs, serverTickKey, sessionElapsedSecondsLocal),
    [authoritativeFocusSession, serverClockOffsetMs, serverTickKey, sessionElapsedSecondsLocal],
  )

  const activeTaskHasLiveSession = Boolean(
    activeTask &&
    (authoritativeFocusSession
      ? authoritativeFocusSession.task_id === activeTask.id
      : activeFocusSessionMeta?.taskId === activeTask.id),
  )

  const localActiveTaskTargetSeconds =
    (activeTask?.targetDurationMinutes ?? 0) > 0 ? Math.round((activeTask?.targetDurationMinutes ?? 0) * 60) : null
  const authoritativeActiveTaskTargetSeconds =
    authoritativeFocusSession &&
      activeTask &&
      authoritativeFocusSession.task_id === activeTask.id &&
      authoritativeFocusSession.timer_mode === 'timer'
      ? normalizePositiveSeconds(authoritativeFocusSession.target_seconds)
      : null
  const activeTaskTargetSeconds =
    authoritativeFocusSession &&
    activeTask &&
    authoritativeFocusSession.task_id === activeTask.id &&
    authoritativeFocusSession.timer_mode === 'timer'
      // Running session should trust its own target; paused/idle can prefer the locally edited target.
      ? authoritativeFocusSession.session_state === 'running'
        ? (authoritativeActiveTaskTargetSeconds ?? localActiveTaskTargetSeconds)
        : (localActiveTaskTargetSeconds ?? authoritativeActiveTaskTargetSeconds)
      : localActiveTaskTargetSeconds

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
    if (authoritativeFocusSession || !isFocusRunningLocal) {
      return
    }

    const intervalId = window.setInterval(() => {
      setSessionElapsedSeconds((currentSeconds) => currentSeconds + 1)
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [authoritativeFocusSession, isFocusRunningLocal])

  useEffect(() => {
    if (authoritativeFocusSession) {
      return
    }

    if (timerModeLocal === 'timer' && !activeTaskTargetSeconds) {
      setTimerMode('stopwatch')
      return
    }

    if (timerModeLocal === 'timer' && activeTaskTargetSeconds) {
      setSessionElapsedSeconds((currentSeconds) => Math.min(currentSeconds, activeTaskTargetSeconds))
    }
  }, [activeTaskTargetSeconds, authoritativeFocusSession, timerModeLocal])

  useEffect(() => {
    if (authoritativeFocusSession?.session_state !== 'running') {
      return
    }

    const intervalId = window.setInterval(() => {
      setServerTickKey((current) => current + 1)
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [authoritativeFocusSession?.id, authoritativeFocusSession?.last_resumed_at_utc, authoritativeFocusSession?.session_state])

  const applyAuthoritativeFocusSnapshot = (serverNowUtc: string | null | undefined, nextSession: ActiveFocusSession | null) => {
    const normalizedServerNowUtc = typeof serverNowUtc === 'string' && serverNowUtc.trim() ? serverNowUtc : null
    if (normalizedServerNowUtc) {
      setLastServerNowUtc(normalizedServerNowUtc)
      setServerClockOffsetMs(getServerOffsetMs(normalizedServerNowUtc))
    }

    setAuthoritativeFocusSession(nextSession)
    setServerTickKey((current) => current + 1)

    if (nextSession) {
      setTimerMode(nextSession.timer_mode)
      setIsFocusRunning(nextSession.session_state === 'running')
      setSessionElapsedSeconds(Math.max(0, nextSession.elapsed_seconds_total))
    }
  }

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
    authoritativeFocusSession,
    applyAuthoritativeFocusSnapshot,
    serverClockOffsetMs,
    lastServerNowUtc,
    activeTaskHasLiveSession,
    activeTaskTargetSeconds,
    timerProgressPercent,
    timerDisplayLabel,
    isTimerComplete,
    activeTaskTotalTimeLabel,
  }
}

function normalizePositiveSeconds(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.round(value)
}

function getServerOffsetMs(serverNowUtc: string | null | undefined) {
  if (typeof serverNowUtc !== 'string' || !serverNowUtc.trim()) {
    return 0
  }

  const parsed = Date.parse(serverNowUtc)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return parsed - Date.now()
}

function computeDisplayElapsedSeconds(
  authoritativeFocusSession: ActiveFocusSession | null,
  serverClockOffsetMs: number,
  _serverTickKey: number,
  localFallbackElapsedSeconds: number,
) {
  if (!authoritativeFocusSession) {
    return Math.max(0, localFallbackElapsedSeconds)
  }

  const base = Math.max(0, authoritativeFocusSession.elapsed_seconds_total)

  if (authoritativeFocusSession.session_state !== 'running' || !authoritativeFocusSession.last_resumed_at_utc) {
    return base
  }

  const resumedAtMs = Date.parse(authoritativeFocusSession.last_resumed_at_utc)
  if (!Number.isFinite(resumedAtMs)) {
    return base
  }

  const currentServerMs = Date.now() + serverClockOffsetMs
  const deltaSeconds = Math.max(0, Math.floor((currentServerMs - resumedAtMs) / 1000))
  return base + deltaSeconds
}
