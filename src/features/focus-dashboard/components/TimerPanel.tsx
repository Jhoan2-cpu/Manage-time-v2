import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLayerGroup,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import { taskIconMap } from '../constants/taskOptions'
import type { FocusTimerMode, Task } from '../types'
import { classNames } from '../utils/classNames'
import { formatSecondsHms } from '../utils/time'
import { FocusOnlyTimerPanel } from './FocusOnlyTimerPanel'
import { TimerModeRail } from './timer-panel/TimerModeRail'
import { TimerPanelFooter } from './timer-panel/TimerPanelFooter'
import { timerAccentStyles, timerPlayGlowRgbByColor } from './timer-panel/timerPanelTheme'
import {
  normalizeStopwatchLabel,
  parseHmsLabelToDraftParts,
  parseTimerDraftPartsToSeconds,
  type TimerDraftParts,
} from './timer-panel/timerPanelUtils'

type TimerPanelProps = {
  timeLabel: string
  onToggleFocus: (mode: FocusTimerMode, requestedStartTargetSeconds?: number) => void
  onStopFocus: () => void
  onResetAfterTimerAlarm: () => void
  onChangeMode: (mode: FocusTimerMode) => void
  onUpdateTimerTargetSeconds?: (targetSeconds: number) => void
  timerTargetSeconds?: number | null
  isTimerAlarmActive?: boolean
  activeTask: Task | null
  totalTaskTimeLabel: string
  mode: FocusTimerMode
  canUseTimerMode: boolean
  timerProgressPercent: number | null
  isRunning: boolean
  hasActiveSession: boolean
  canStopFocus: boolean
  isToggleCooldownActive?: boolean
  isFocusOnlyMode?: boolean
}

const SHOW_STOPWATCH_MILLISECONDS_DEBUG =
  `${import.meta.env.VITE_SHOW_STOPWATCH_MILLISECONDS_DEBUG ?? 'true'}`.toLowerCase() === 'true'

export function TimerPanel({
  timeLabel,
  onToggleFocus,
  onStopFocus,
  onResetAfterTimerAlarm,
  onChangeMode,
  onUpdateTimerTargetSeconds,
  timerTargetSeconds = null,
  isTimerAlarmActive = false,
  activeTask,
  totalTaskTimeLabel,
  mode,
  canUseTimerMode,
  timerProgressPercent,
  isRunning,
  hasActiveSession,
  canStopFocus,
  isToggleCooldownActive = false,
  isFocusOnlyMode = false,
}: TimerPanelProps) {
  const { locale } = useI18n()
  const activeTaskIcon = activeTask ? taskIconMap[activeTask.iconTag] : null
  const accents = activeTask ? timerAccentStyles[activeTask.colorTag] : timerAccentStyles.blue
  const copy =
    locale === 'es'
      ? {
        noTaskSelected: 'Sin tarea seleccionada',
        totalTaskTime: 'Tiempo total de tarea:',
        stopFocus: 'Detener enfoque',
        resetTimer: 'Reiniciar temporizador',
        pauseFocus: 'Pausar enfoque',
        resumeFocus: 'Reanudar enfoque',
        startFocus: 'Iniciar enfoque',
        stopwatch: 'Cronometro',
        timer: 'Temporizador',
      }
      : {
        noTaskSelected: 'No Task Selected',
        totalTaskTime: 'Total Task Time:',
        stopFocus: 'Stop focus',
        resetTimer: 'Reset timer',
        pauseFocus: 'Pause focus',
        resumeFocus: 'Resume focus',
        startFocus: 'Start focus',
        stopwatch: 'Stopwatch',
        timer: 'Timer',
      }

  const taskTitle = activeTask?.title ?? copy.noTaskSelected
  const stopwatchLabel = normalizeStopwatchLabel(timeLabel)
  const playGlowRgb = timerPlayGlowRgbByColor[activeTask?.colorTag ?? 'blue']
  const [timerDraftParts, setTimerDraftParts] = useState(() => parseHmsLabelToDraftParts(stopwatchLabel))
  const [isTimerFieldsFocused, setIsTimerFieldsFocused] = useState(false)
  const [hasManualTimerDraftChange, setHasManualTimerDraftChange] = useState(false)
  const timerFieldsRef = useRef<HTMLDivElement>(null)
  const progressAnimationFrameRef = useRef<number | null>(null)
  const stopwatchAnimationFrameRef = useRef<number | null>(null)
  const stopwatchAnchorMsRef = useRef<number | null>(null)
  const timerAnimationFrameRef = useRef<number | null>(null)
  const timerAnchorMsRef = useRef<number | null>(null)
  const previousRunningRef = useRef(isRunning)
  const previousModeRef = useRef(mode)
  const previousTaskIdRef = useRef<string | null>(activeTask?.id ?? null)
  const previousTimerRunningRef = useRef(isRunning)
  const previousTimerModeRef = useRef(mode)
  const previousTimerTaskIdRef = useRef<string | null>(activeTask?.id ?? null)
  const previousTimerWholeSecondsRef = useRef<number | null>(null)
  const previousTimerMillisecondsRef = useRef<number | null>(null)
  const previousTimerWholeSecondsUiRef = useRef<number | null>(null)
  const timerFirstSecondDiagnosticUntilMsRef = useRef(0)
  const lastTimerBacktrackLogAtMsRef = useRef(0)
  const progressAnchorRef = useRef({ percent: 0, startedAtMs: 0 })
  const [smoothedProgressPercent, setSmoothedProgressPercent] = useState(0)
  const [stopwatchWholeSeconds, setStopwatchWholeSeconds] = useState(() => parseStopwatchLabelToSeconds(stopwatchLabel))
  const [stopwatchMilliseconds, setStopwatchMilliseconds] = useState(0)
  const [timerMilliseconds, setTimerMilliseconds] = useState(0)
  const playButtonGlowStyle = { '--timer-play-glow-rgb': playGlowRgb } as CSSProperties
  const toggleFocusAriaLabel = isRunning ? copy.pauseFocus : hasActiveSession ? copy.resumeFocus : copy.startFocus
  const toggleFocusIcon = isRunning ? faPause : faPlay
  const canToggleFocus = Boolean(activeTask) && !isToggleCooldownActive
  const rawProgress = typeof timerProgressPercent === 'number' && Number.isFinite(timerProgressPercent) ? timerProgressPercent : 0
  const progressPercent = Math.max(0, Math.min(100, rawProgress))
  const hasTimerCompleted =
    mode === 'timer' &&
    Boolean(timerTargetSeconds && timerTargetSeconds > 0) &&
    stopwatchLabel === '00:00:00'
  const isTimerCompletionVisual = hasTimerCompleted && isTimerAlarmActive
  const hasAnimatedTimerProgress = Boolean(mode === 'timer' && isRunning && timerTargetSeconds && timerTargetSeconds > 0)
  const effectiveProgressPercent = hasAnimatedTimerProgress ? smoothedProgressPercent : progressPercent
  const renderProgressPercent = isTimerCompletionVisual ? 100 : hasTimerCompleted && !isTimerAlarmActive ? 0 : effectiveProgressPercent
  const progressDegrees = renderProgressPercent * 3.6
  const timerCompletePulseStyle = { '--timer-complete-glow-rgb': playGlowRgb } as CSSProperties
  const timerRingStyle = {
    boxShadow: isTimerCompletionVisual
      ? `0 0 0 1px rgba(255,255,255,0.3), 0 0 34px rgba(${playGlowRgb},0.68), 0 0 86px rgba(${playGlowRgb},0.44), 0 22px 40px rgba(2,6,23,0.56)`
      : `0 0 0 1px rgba(255,255,255,0.2), 0 0 24px rgba(${playGlowRgb},0.42), 0 20px 34px rgba(2,6,23,0.44)`,
    background: `conic-gradient(rgba(${playGlowRgb},0.98) ${progressDegrees}deg, rgba(148,163,184,0.2) ${progressDegrees}deg 360deg)`,
    transition: 'box-shadow 320ms ease-out',
  } as CSSProperties
  const timerMarkerStyle = {
    boxShadow: `0 0 14px rgba(255,255,255,0.98), 0 0 34px rgba(${playGlowRgb},0.92), 0 0 62px rgba(${playGlowRgb},0.62)`,
  } as CSSProperties
  const stopwatchDisplayLabel =
    mode === 'stopwatch' && SHOW_STOPWATCH_MILLISECONDS_DEBUG
      ? `${formatSecondsHms(isRunning ? stopwatchWholeSeconds : parseStopwatchLabelToSeconds(stopwatchLabel))}.${String(Math.max(0, Math.min(999, isRunning ? stopwatchMilliseconds : 0))).padStart(3, '0')}`
      : stopwatchLabel
  const timerMillisecondsLabel = String(
    Math.max(0, Math.min(999, mode === 'timer' && isRunning ? timerMilliseconds : 0)),
  ).padStart(3, '0')

  const canSwitchToStopwatch = !isRunning && Boolean(activeTask)
  const canSwitchToTimer = !isRunning && Boolean(activeTask) && canUseTimerMode
  const canEditTimerTarget =
    mode === 'timer' &&
    !isRunning &&
    !hasActiveSession &&
    Boolean(activeTask) &&
    typeof onUpdateTimerTargetSeconds === 'function'
  const timerEditableFieldClassName = classNames(
    'rounded-xl border border-slate-400/30 bg-[#0a1530]/70 text-center font-mono font-semibold leading-none tracking-tight tabular-nums text-slate-100 outline-none transition',
    'h-12 w-12 text-[30px] sm:h-14 sm:w-14 sm:text-[34px]',
  )
  const timerUnitLabelClassName = classNames(
    'mt-1.5 font-semibold tracking-[0.22em] text-slate-400',
    'text-[10px]',
  )
  const timerSeparatorClassName = classNames(
    'font-mono text-slate-300/85',
    'pt-2 text-2xl sm:pt-2.5 sm:text-[28px]',
  )
  const timerTaskTitleClassName = classNames(
    'line-clamp-2 max-w-[88%] bg-slate-200/8 px-2 py-1 font-medium uppercase tracking-[0.08em] text-slate-300',
    'mt-3 text-[10px]',
  )

  useEffect(() => {
    if (!isTimerFieldsFocused) {
      setTimerDraftParts(parseHmsLabelToDraftParts(stopwatchLabel))
      setHasManualTimerDraftChange(false)
    }
  }, [isTimerFieldsFocused, stopwatchLabel])

  useEffect(() => {
    if (!SHOW_STOPWATCH_MILLISECONDS_DEBUG) {
      stopwatchAnchorMsRef.current = null
      setStopwatchWholeSeconds(parseStopwatchLabelToSeconds(stopwatchLabel))
      setStopwatchMilliseconds(0)
      previousRunningRef.current = isRunning
      previousModeRef.current = mode
      previousTaskIdRef.current = activeTask?.id ?? null
      return
    }

    const activeTaskId = activeTask?.id ?? null
    const wholeSeconds = parseStopwatchLabelToSeconds(stopwatchLabel)
    if (mode !== 'stopwatch' || !isRunning) {
      stopwatchAnchorMsRef.current = null
      setStopwatchWholeSeconds(wholeSeconds)
      setStopwatchMilliseconds(0)
      previousRunningRef.current = isRunning
      previousModeRef.current = mode
      previousTaskIdRef.current = activeTaskId
      return
    }

    const shouldSetAnchor =
      !previousRunningRef.current ||
      previousModeRef.current !== 'stopwatch' ||
      previousTaskIdRef.current !== activeTaskId ||
      stopwatchAnchorMsRef.current === null

    if (shouldSetAnchor) {
      stopwatchAnchorMsRef.current = performance.now() - wholeSeconds * 1000
      setStopwatchWholeSeconds(wholeSeconds)
    } else if (stopwatchAnchorMsRef.current !== null) {
      const derivedWholeSeconds = Math.max(0, Math.floor((performance.now() - stopwatchAnchorMsRef.current) / 1000))
      if (Math.abs(wholeSeconds - derivedWholeSeconds) >= 2) {
        stopwatchAnchorMsRef.current = performance.now() - wholeSeconds * 1000
        setStopwatchWholeSeconds(wholeSeconds)
      }
    }

    previousRunningRef.current = isRunning
    previousModeRef.current = mode
    previousTaskIdRef.current = activeTaskId
  }, [activeTask?.id, isRunning, mode, stopwatchLabel])

  useEffect(() => {
    if (stopwatchAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(stopwatchAnimationFrameRef.current)
      stopwatchAnimationFrameRef.current = null
    }

    if (!SHOW_STOPWATCH_MILLISECONDS_DEBUG || mode !== 'stopwatch' || !isRunning) {
      return
    }

    const animate = () => {
      const anchorMs = stopwatchAnchorMsRef.current
      if (anchorMs === null) {
        setStopwatchWholeSeconds(parseStopwatchLabelToSeconds(stopwatchLabel))
        setStopwatchMilliseconds(0)
      } else {
        const elapsedMs = Math.max(0, performance.now() - anchorMs)
        setStopwatchWholeSeconds(Math.floor(elapsedMs / 1000))
        setStopwatchMilliseconds(Math.floor(elapsedMs % 1000))
      }
      stopwatchAnimationFrameRef.current = window.requestAnimationFrame(animate)
    }

    stopwatchAnimationFrameRef.current = window.requestAnimationFrame(animate)
    return () => {
      if (stopwatchAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(stopwatchAnimationFrameRef.current)
        stopwatchAnimationFrameRef.current = null
      }
    }
  }, [isRunning, mode, stopwatchLabel])

  useEffect(() => {
    if (!SHOW_STOPWATCH_MILLISECONDS_DEBUG) {
      timerAnchorMsRef.current = null
      setTimerMilliseconds(0)
      previousTimerRunningRef.current = isRunning
      previousTimerModeRef.current = mode
      previousTimerTaskIdRef.current = activeTask?.id ?? null
      previousTimerWholeSecondsRef.current = null
      previousTimerMillisecondsRef.current = null
      previousTimerWholeSecondsUiRef.current = null
      timerFirstSecondDiagnosticUntilMsRef.current = 0
      return
    }

    const activeTaskId = activeTask?.id ?? null
    const wholeSeconds = parseStopwatchLabelToSeconds(stopwatchLabel)
    if (mode !== 'timer' || !isRunning) {
      timerAnchorMsRef.current = null
      setTimerMilliseconds(0)
      previousTimerRunningRef.current = isRunning
      previousTimerModeRef.current = mode
      previousTimerTaskIdRef.current = activeTaskId
      previousTimerWholeSecondsRef.current = wholeSeconds
      previousTimerMillisecondsRef.current = null
      previousTimerWholeSecondsUiRef.current = null
      timerFirstSecondDiagnosticUntilMsRef.current = 0
      return
    }

    const shouldSetAnchor =
      !previousTimerRunningRef.current ||
      previousTimerModeRef.current !== 'timer' ||
      previousTimerTaskIdRef.current !== activeTaskId ||
      timerAnchorMsRef.current === null

    if (shouldSetAnchor) {
      const nowMs = performance.now()
      timerAnchorMsRef.current = nowMs + wholeSeconds * 1000
      timerFirstSecondDiagnosticUntilMsRef.current = nowMs + 1500
      previousTimerMillisecondsRef.current = null
      previousTimerWholeSecondsUiRef.current = wholeSeconds
      console.log('[timerpanel:timer-ms] anchor set', {
        taskId: activeTaskId,
        wholeSeconds,
        reason: 'start_or_resume_or_task_change',
        nowMs,
        anchorMs: timerAnchorMsRef.current,
      })
    } else if (timerAnchorMsRef.current !== null) {
      const remainingMs = Math.max(0, timerAnchorMsRef.current - performance.now())
      const derivedWholeSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
      if (Math.abs(wholeSeconds - derivedWholeSeconds) >= 2) {
        const nowMs = performance.now()
        timerAnchorMsRef.current = nowMs + wholeSeconds * 1000
        console.log('[timerpanel:timer-ms] anchor resync', {
          taskId: activeTaskId,
          wholeSeconds,
          derivedWholeSeconds,
          nowMs,
          anchorMs: timerAnchorMsRef.current,
        })
      }
    }

    previousTimerWholeSecondsRef.current = wholeSeconds
    previousTimerRunningRef.current = isRunning
    previousTimerModeRef.current = mode
    previousTimerTaskIdRef.current = activeTaskId
  }, [activeTask?.id, isRunning, mode, stopwatchLabel])

  useEffect(() => {
    if (timerAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(timerAnimationFrameRef.current)
      timerAnimationFrameRef.current = null
    }

    if (!SHOW_STOPWATCH_MILLISECONDS_DEBUG || mode !== 'timer' || !isRunning) {
      return
    }

    const animate = () => {
      const anchorMs = timerAnchorMsRef.current
      if (anchorMs === null) {
        setTimerMilliseconds(0)
      } else {
        const nowMs = performance.now()
        const wholeSecondsUi = parseStopwatchLabelToSeconds(stopwatchLabel)
        const remainingMs = Math.max(0, anchorMs - nowMs)
        // Countdown milliseconds should start at 999 (not 000) right after resume/start.
        const remainingMsCeil = Math.max(0, Math.ceil(remainingMs))
        let nextMilliseconds = remainingMsCeil > 0 ? (remainingMsCeil - 1) % 1000 : 0
        const previousMs = previousTimerMillisecondsRef.current
        const previousWholeSecondsUi = previousTimerWholeSecondsUiRef.current
        const isWithinFirstSecondAfterResume = nowMs <= timerFirstSecondDiagnosticUntilMsRef.current
        const didMillisecondBacktrackWithinSameUiSecond =
          previousMs !== null &&
          previousWholeSecondsUi !== null &&
          previousWholeSecondsUi === wholeSecondsUi &&
          nextMilliseconds > previousMs
        if (isWithinFirstSecondAfterResume && didMillisecondBacktrackWithinSameUiSecond) {
          if (nowMs - lastTimerBacktrackLogAtMsRef.current > 120) {
            console.log('[timerpanel:timer-ms] first-second-backtrack', {
              taskId: activeTask?.id ?? null,
              wholeSecondsUi,
              previousMs,
              nextMs: nextMilliseconds,
              remainingMs,
              anchorMs,
              nowMs,
            })
            lastTimerBacktrackLogAtMsRef.current = nowMs
          }
        }

        if (didMillisecondBacktrackWithinSameUiSecond && previousMs !== null) {
          // Keep countdown monotonic while the authoritative whole-second value catches up.
          nextMilliseconds = Math.max(0, previousMs - 1)
        }
        previousTimerMillisecondsRef.current = nextMilliseconds
        previousTimerWholeSecondsUiRef.current = wholeSecondsUi
        setTimerMilliseconds(nextMilliseconds)
      }
      timerAnimationFrameRef.current = window.requestAnimationFrame(animate)
    }

    timerAnimationFrameRef.current = window.requestAnimationFrame(animate)
    return () => {
      if (timerAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(timerAnimationFrameRef.current)
        timerAnimationFrameRef.current = null
      }
    }
  }, [isRunning, mode, stopwatchLabel])

  useEffect(() => {
    progressAnchorRef.current = {
      percent: progressPercent,
      startedAtMs: performance.now(),
    }

    if (!hasAnimatedTimerProgress) {
      setSmoothedProgressPercent(progressPercent)
    }
  }, [hasAnimatedTimerProgress, progressPercent])

  useEffect(() => {
    if (progressAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(progressAnimationFrameRef.current)
      progressAnimationFrameRef.current = null
    }

    if (!hasAnimatedTimerProgress || !timerTargetSeconds || timerTargetSeconds <= 0) {
      setSmoothedProgressPercent(progressPercent)
      return
    }

    const progressPerMillisecond = 100 / (timerTargetSeconds * 1000)
    const animate = (now: number) => {
      const { percent: anchorPercent, startedAtMs } = progressAnchorRef.current
      const elapsedMs = Math.max(0, now - startedAtMs)
      const nextProgress = Math.max(anchorPercent, Math.min(100, anchorPercent + elapsedMs * progressPerMillisecond))
      setSmoothedProgressPercent(nextProgress)
      progressAnimationFrameRef.current = window.requestAnimationFrame(animate)
    }

    progressAnimationFrameRef.current = window.requestAnimationFrame(animate)
    return () => {
      if (progressAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(progressAnimationFrameRef.current)
        progressAnimationFrameRef.current = null
      }
    }
  }, [hasAnimatedTimerProgress, progressPercent, timerTargetSeconds])

  const cancelTimerEdit = () => {
    setTimerDraftParts(parseHmsLabelToDraftParts(stopwatchLabel))
    setIsTimerFieldsFocused(false)
    setHasManualTimerDraftChange(false)
  }

  const commitTimerEdit = () => {
    if (!canEditTimerTarget) {
      cancelTimerEdit()
      return
    }

    const parsedSeconds = parseTimerDraftPartsToSeconds(timerDraftParts)
    if (parsedSeconds === null) {
      cancelTimerEdit()
      return
    }

    onUpdateTimerTargetSeconds?.(parsedSeconds)
    setTimerDraftParts(parseHmsLabelToDraftParts(formatSecondsHms(parsedSeconds)))
    setIsTimerFieldsFocused(false)
    setHasManualTimerDraftChange(false)
  }

  const handleTimerFieldChange = (field: keyof TimerDraftParts, value: string) => {
    setHasManualTimerDraftChange(true)
    setTimerDraftParts((current) => ({
      ...current,
      [field]: value.replace(/[^\d]/g, '').slice(0, 2),
    }))
  }

  const handleTimerFieldFocus = () => {
    if (!canEditTimerTarget) {
      return
    }

    setIsTimerFieldsFocused(true)
  }

  const handleTimerFieldBlur = () => {
    window.setTimeout(() => {
      const root = timerFieldsRef.current
      if (root && root.contains(document.activeElement)) {
        return
      }

      setIsTimerFieldsFocused(false)
      commitTimerEdit()
    }, 0)
  }

  const handleTimerFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitTimerEdit()
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelTimerEdit()
      event.currentTarget.blur()
    }
  }

  const handleToggleFocusClick = () => {
    const shouldUseDraftStartTarget =
      mode === 'timer' && (isTimerFieldsFocused || hasManualTimerDraftChange)
    const requestedStartTargetSeconds =
      shouldUseDraftStartTarget
        ? parseTimerDraftPartsToSeconds(timerDraftParts) ?? undefined
        : undefined
    onToggleFocus(mode, requestedStartTargetSeconds)
  }

  if (isFocusOnlyMode) {
    return (
        <FocusOnlyTimerPanel
        accentDividerClassName={accents.dividerClassName}
        accentPlayButtonClassName={accents.playButtonClassName}
        accentPlayIconClassName={accents.playIconClassName}
        accentTimeGlowClassName={accents.timeGlowClassName}
        accentTotalValueClassName={accents.totalValueClassName}
        activeTaskIcon={activeTaskIcon?.icon ?? null}
        canEditTimerTarget={canEditTimerTarget}
        canStopFocus={canStopFocus}
        canToggleFocus={canToggleFocus}
        copyResetTimer={copy.resetTimer}
        copyStopFocus={copy.stopFocus}
        copyTotalTaskTime={copy.totalTaskTime}
        isRunning={isRunning}
        isTimerAlarmActive={isTimerAlarmActive}
        isTimerCompletionVisual={isTimerCompletionVisual}
          mode={mode}
          onResetAfterTimerAlarm={onResetAfterTimerAlarm}
          onStopFocus={onStopFocus}
        onTimerFieldBlur={handleTimerFieldBlur}
        onTimerFieldChange={handleTimerFieldChange}
        onTimerFieldFocus={handleTimerFieldFocus}
        onTimerFieldKeyDown={handleTimerFieldKeyDown}
        onToggleFocusClick={handleToggleFocusClick}
        playButtonGlowStyle={playButtonGlowStyle}
          renderProgressPercent={renderProgressPercent}
          stopwatchLabel={stopwatchDisplayLabel}
          timerMillisecondsLabel={timerMillisecondsLabel}
          showMillisecondsDebug={SHOW_STOPWATCH_MILLISECONDS_DEBUG}
          taskTitle={taskTitle}
        timerCompletePulseStyle={timerCompletePulseStyle}
        timerDraftParts={timerDraftParts}
        timerFieldsRef={timerFieldsRef}
        timerMarkerStyle={timerMarkerStyle}
        timerRingStyle={timerRingStyle}
        toggleFocusAriaLabel={toggleFocusAriaLabel}
        toggleFocusIcon={toggleFocusIcon}
        totalTaskTimeLabel={totalTaskTimeLabel}
      />
    )
  }

  return (
    <>
      <div
        className={classNames(
          'mb-2 flex min-h-0 sm:mb-0',
          'justify-start sm:flex-1 sm:justify-center',
        )}
      >
        <div
          className={classNames(
            'flex w-full flex-col px-4 py-2 sm:px-8 sm:py-3',
            'sm:h-full sm:pb-0',
          )}
        >
          <div
            className={classNames(
              'relative mt-0 flex flex-1 flex-col items-center justify-center py-1 sm:py-2',
            )}
          >
            <div className="relative w-full max-w-[min(100%,62rem)] min-h-[13.1rem] sm:min-h-[16.4rem] [perspective:1400px]">
              <div
                className={classNames(
                  'absolute inset-0 flex flex-col items-center justify-start pt-1 sm:pt-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]',
                  mode === 'stopwatch'
                    ? 'opacity-100 [transform:translateX(0%)_rotateY(0deg)]'
                    : 'pointer-events-none opacity-0 [transform:translateX(-18%)_rotateY(34deg)]',
                )}
              >
                <div
                  className={classNames(
                    'flex max-w-[min(100%,58rem)] items-start gap-2.5 sm:gap-4',
                    'w-full justify-center',
                  )}
                >
                  <span
                    className={classNames(
                      'mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center text-lg sm:mt-1.5 sm:h-8 sm:w-8 sm:text-2xl',
                      activeTask ? accents.totalValueClassName : 'text-slate-300',
                    )}
                  >
                    {activeTaskIcon ? <FontAwesomeIcon icon={activeTaskIcon.icon} /> : <FontAwesomeIcon icon={faLayerGroup} />}
                  </span>

                  <div className="min-w-0">
                    <h2
                      className={classNames(
                        'w-full overflow-hidden break-words text-center font-semibold leading-tight tracking-tight text-slate-100 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]',
                        'text-[1.55rem] sm:text-center sm:text-[2rem] md:text-4xl',
                      )}
                    >
                      {taskTitle}
                    </h2>
                  </div>
                </div>

                <p
                  className={classNames(
                    'relative mt-1.5 w-full max-w-full pb-1 text-center select-none font-bold leading-[0.92] tracking-tight text-slate-100 tabular-nums sm:pb-1.5',
                    'text-[clamp(49px,15.2vw,74px)] sm:text-[clamp(64px,9.4vw,116px)] md:text-[clamp(80px,12vw,220px)]',
                    accents.timeGlowClassName,
                  )}
                >
                  {stopwatchDisplayLabel}
                </p>
              </div>

              <div
                className={classNames(
                  'absolute inset-0 flex items-center justify-center pt-1 sm:pt-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]',
                  mode === 'timer'
                    ? 'opacity-100 [transform:translateX(0%)_rotateY(0deg)]'
                    : 'pointer-events-none opacity-0 [transform:translateX(18%)_rotateY(-34deg)]',
                )}
              >
                <div
                  className={classNames(
                    'relative',
                    'h-[min(72vw,17.6rem)] w-[min(72vw,17.6rem)] sm:h-[17.6rem] sm:w-[17.6rem]',
                  )}
                >
                  <div
                    className={classNames('absolute inset-0 rounded-full p-[4px]', isTimerCompletionVisual && 'timer-complete-ring-breathe')}
                    style={isTimerCompletionVisual ? { ...timerRingStyle, ...timerCompletePulseStyle } : timerRingStyle}
                  >
                    {isTimerCompletionVisual ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[-6px] rounded-full timer-complete-aura-breathe"
                        style={timerCompletePulseStyle}
                      />
                    ) : null}
                    <div
                      className={classNames(
                        'flex h-full w-full flex-col items-center justify-center rounded-full border border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),rgba(2,6,23,0.72)_55%,rgba(2,6,23,0.88))] px-5 text-center',
                        isTimerCompletionVisual && 'timer-complete-core-breathe',
                      )}
                      style={isTimerCompletionVisual ? timerCompletePulseStyle : undefined}
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex items-start justify-center gap-1.5 sm:gap-2.5" ref={timerFieldsRef}>
                          <div className="flex flex-col items-center">
                            <input
                              aria-label="HH"
                              className={classNames(
                                timerEditableFieldClassName,
                                canEditTimerTarget
                                  ? 'focus:border-white/55 focus:bg-[#102347]'
                                  : 'cursor-default text-slate-100/90',
                                accents.timeGlowClassName,
                              )}
                              inputMode="numeric"
                              onBlur={handleTimerFieldBlur}
                              onChange={(event) => handleTimerFieldChange('hours', event.target.value)}
                              onFocus={handleTimerFieldFocus}
                              onKeyDown={handleTimerFieldKeyDown}
                              readOnly={!canEditTimerTarget}
                              value={timerDraftParts.hours}
                            />
                            <span className={timerUnitLabelClassName}>HH</span>
                          </div>
                          <span className={timerSeparatorClassName}>:</span>
                          <div className="flex flex-col items-center">
                            <input
                              aria-label="MM"
                              className={classNames(
                                timerEditableFieldClassName,
                                canEditTimerTarget
                                  ? 'focus:border-white/55 focus:bg-[#102347]'
                                  : 'cursor-default text-slate-100/90',
                                accents.timeGlowClassName,
                              )}
                              inputMode="numeric"
                              onBlur={handleTimerFieldBlur}
                              onChange={(event) => handleTimerFieldChange('minutes', event.target.value)}
                              onFocus={handleTimerFieldFocus}
                              onKeyDown={handleTimerFieldKeyDown}
                              readOnly={!canEditTimerTarget}
                              value={timerDraftParts.minutes}
                            />
                            <span className={timerUnitLabelClassName}>MM</span>
                          </div>
                          <span className={timerSeparatorClassName}>:</span>
                          <div className="flex flex-col items-center">
                            <input
                              aria-label="SS"
                              className={classNames(
                                timerEditableFieldClassName,
                                canEditTimerTarget
                                  ? 'focus:border-white/55 focus:bg-[#102347]'
                                  : 'cursor-default text-slate-100/90',
                                accents.timeGlowClassName,
                              )}
                              inputMode="numeric"
                              onBlur={handleTimerFieldBlur}
                              onChange={(event) => handleTimerFieldChange('seconds', event.target.value)}
                              onFocus={handleTimerFieldFocus}
                              onKeyDown={handleTimerFieldKeyDown}
                              readOnly={!canEditTimerTarget}
                              value={timerDraftParts.seconds}
                            />
                            <span className={timerUnitLabelClassName}>SS</span>
                          </div>
                        </div>
                        {SHOW_STOPWATCH_MILLISECONDS_DEBUG ? (
                          <p
                            className={classNames(
                              'mt-1.5 font-mono text-[18px] font-semibold tracking-[0.1em] text-slate-300/90 sm:text-[22px]',
                              accents.timeGlowClassName,
                            )}
                          >
                            .{timerMillisecondsLabel}
                          </p>
                        ) : null}
                      </div>
                      <p className={timerTaskTitleClassName}>
                        {taskTitle}
                      </p>
                    </div>
                  </div>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `rotate(${progressDegrees}deg)` }}
                  >
                    <span
                      className={classNames(
                        'absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55 bg-white',
                        isTimerCompletionVisual && 'timer-complete-marker-breathe',
                      )}
                      style={isTimerCompletionVisual ? { ...timerMarkerStyle, ...timerCompletePulseStyle } : timerMarkerStyle}
                    />
                  </div>
                </div>
              </div>

              <TimerModeRail
                activeChipClassName={accents.chipClassName}
                canSwitchToStopwatch={canSwitchToStopwatch}
                canSwitchToTimer={canSwitchToTimer}
                copyStopwatch={copy.stopwatch}
                copyTimer={copy.timer}
                mode={mode}
                onChangeMode={onChangeMode}
              />
            </div>
          </div>

          <TimerPanelFooter
            accentDividerClassName={accents.dividerClassName}
            accentPlayButtonClassName={accents.playButtonClassName}
            accentPlayIconClassName={accents.playIconClassName}
            accentTotalValueClassName={accents.totalValueClassName}
            canStopFocus={canStopFocus}
            canToggleFocus={canToggleFocus}
            copyResetTimer={copy.resetTimer}
            copyStopFocus={copy.stopFocus}
            copyTotalTaskTime={copy.totalTaskTime}
            isRunning={isRunning}
            isTimerAlarmActive={isTimerAlarmActive}
            onResetAfterTimerAlarm={onResetAfterTimerAlarm}
            onStopFocus={onStopFocus}
            onToggleFocusClick={handleToggleFocusClick}
            playButtonGlowStyle={playButtonGlowStyle}
            shouldBlinkPlayButton={!isRunning && !hasActiveSession}
            toggleFocusAriaLabel={toggleFocusAriaLabel}
            toggleFocusIcon={toggleFocusIcon}
            totalTaskTimeLabel={totalTaskTimeLabel}
          />
        </div>
      </div>
    </>
  )
}

function parseStopwatchLabelToSeconds(label: string) {
  const [hours, minutes, seconds] = normalizeStopwatchLabel(label)
    .split(':')
    .map((value) => Number.parseInt(value, 10))

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return 0
  }

  return Math.max(0, hours * 3600 + minutes * 60 + seconds)
}
