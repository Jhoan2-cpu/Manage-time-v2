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

export function TimerPanel({
  timeLabel,
  onToggleFocus,
  onStopFocus,
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
  const progressAnchorRef = useRef({ percent: 0, startedAtMs: 0 })
  const [smoothedProgressPercent, setSmoothedProgressPercent] = useState(0)
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
        copyStopFocus={copy.stopFocus}
        copyTotalTaskTime={copy.totalTaskTime}
        isRunning={isRunning}
        isTimerCompletionVisual={isTimerCompletionVisual}
        mode={mode}
        onStopFocus={onStopFocus}
        onTimerFieldBlur={handleTimerFieldBlur}
        onTimerFieldChange={handleTimerFieldChange}
        onTimerFieldFocus={handleTimerFieldFocus}
        onTimerFieldKeyDown={handleTimerFieldKeyDown}
        onToggleFocusClick={handleToggleFocusClick}
        playButtonGlowStyle={playButtonGlowStyle}
        renderProgressPercent={renderProgressPercent}
        stopwatchLabel={stopwatchLabel}
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
                  {stopwatchLabel}
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
            copyStopFocus={copy.stopFocus}
            copyTotalTaskTime={copy.totalTaskTime}
            isRunning={isRunning}
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
