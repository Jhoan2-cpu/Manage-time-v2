import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHourglassHalf,
  faLayerGroup,
  faPause,
  faPlay,
  faStop,
  faStopwatch,
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import { taskIconMap } from '../constants/taskOptions'
import type { FocusTimerMode, Task, TaskColorKey } from '../types'
import { classNames } from '../utils/classNames'

type TimerPanelProps = {
  timeLabel: string
  onToggleFocus: () => void
  onStopFocus: () => void
  onChangeMode: (mode: FocusTimerMode) => void
  activeTask: Task | null
  totalTaskTimeLabel: string
  mode: FocusTimerMode
  canUseTimerMode: boolean
  timerProgressPercent: number | null
  isRunning: boolean
  hasActiveSession: boolean
  canStopFocus: boolean
  isFocusOnlyMode?: boolean
}

const timerAccentStyles: Record<
  TaskColorKey,
  {
    glowClassName: string
    panelBackgroundClassName: string
    timeGlowClassName: string
    dividerClassName: string
    totalValueClassName: string
    chipClassName: string
    blurClassName: string
    playButtonClassName: string
    playIconClassName: string
  }
> = {
  blue: {
    glowClassName: 'shadow-[0_0_40px_rgba(59,130,246,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(59,130,246,0.18)]',
    dividerClassName: 'border-blue-500/15',
    totalValueClassName: 'text-blue-200',
    chipClassName: 'border-blue-500/20 bg-blue-500/8 text-blue-100',
    blurClassName: 'bg-blue-500/18',
    playButtonClassName:
      'border-blue-500/35 bg-blue-500/15 text-blue-100 shadow-[0_10px_28px_rgba(59,130,246,0.22)] hover:border-blue-400/50 hover:bg-blue-500/25',
    playIconClassName: 'text-blue-100',
  },
  green: {
    glowClassName: 'shadow-[0_0_40px_rgba(16,185,129,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(16,185,129,0.18)]',
    dividerClassName: 'border-emerald-500/15',
    totalValueClassName: 'text-emerald-200',
    chipClassName: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-100',
    blurClassName: 'bg-emerald-500/18',
    playButtonClassName:
      'border-emerald-500/35 bg-emerald-500/15 text-emerald-100 shadow-[0_10px_28px_rgba(16,185,129,0.2)] hover:border-emerald-400/50 hover:bg-emerald-500/25',
    playIconClassName: 'text-emerald-100',
  },
  amber: {
    glowClassName: 'shadow-[0_0_40px_rgba(245,158,11,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(245,158,11,0.18)]',
    dividerClassName: 'border-amber-500/15',
    totalValueClassName: 'text-amber-200',
    chipClassName: 'border-amber-500/20 bg-amber-500/8 text-amber-100',
    blurClassName: 'bg-amber-500/18',
    playButtonClassName:
      'border-amber-500/35 bg-amber-500/15 text-amber-100 shadow-[0_10px_28px_rgba(245,158,11,0.2)] hover:border-amber-400/50 hover:bg-amber-500/25',
    playIconClassName: 'text-amber-100',
  },
  rose: {
    glowClassName: 'shadow-[0_0_40px_rgba(244,63,94,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(244,63,94,0.18)]',
    dividerClassName: 'border-rose-500/15',
    totalValueClassName: 'text-rose-200',
    chipClassName: 'border-rose-500/20 bg-rose-500/8 text-rose-100',
    blurClassName: 'bg-rose-500/18',
    playButtonClassName:
      'border-rose-500/35 bg-rose-500/15 text-rose-100 shadow-[0_10px_28px_rgba(244,63,94,0.2)] hover:border-rose-400/50 hover:bg-rose-500/25',
    playIconClassName: 'text-rose-100',
  },
  pink: {
    glowClassName: 'shadow-[0_0_40px_rgba(236,72,153,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(236,72,153,0.18)]',
    dividerClassName: 'border-pink-500/15',
    totalValueClassName: 'text-pink-200',
    chipClassName: 'border-pink-500/20 bg-pink-500/8 text-pink-100',
    blurClassName: 'bg-pink-500/18',
    playButtonClassName:
      'border-pink-500/35 bg-pink-500/15 text-pink-100 shadow-[0_10px_28px_rgba(236,72,153,0.2)] hover:border-pink-400/50 hover:bg-pink-500/25',
    playIconClassName: 'text-pink-100',
  },
  violet: {
    glowClassName: 'shadow-[0_0_40px_rgba(139,92,246,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(139,92,246,0.18)]',
    dividerClassName: 'border-violet-500/15',
    totalValueClassName: 'text-violet-200',
    chipClassName: 'border-violet-500/20 bg-violet-500/8 text-violet-100',
    blurClassName: 'bg-violet-500/18',
    playButtonClassName:
      'border-violet-500/35 bg-violet-500/15 text-violet-100 shadow-[0_10px_28px_rgba(139,92,246,0.2)] hover:border-violet-400/50 hover:bg-violet-500/25',
    playIconClassName: 'text-violet-100',
  },
}

const timerPlayGlowRgbByColor: Record<TaskColorKey, string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  pink: '236,72,153',
  violet: '139,92,246',
}

export function TimerPanel({
  timeLabel,
  onToggleFocus,
  onStopFocus,
  onChangeMode,
  activeTask,
  totalTaskTimeLabel,
  mode,
  canUseTimerMode,
  timerProgressPercent,
  isRunning,
  hasActiveSession,
  canStopFocus,
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
  const playButtonGlowStyle = { '--timer-play-glow-rgb': playGlowRgb } as CSSProperties
  const toggleFocusAriaLabel = isRunning ? copy.pauseFocus : hasActiveSession ? copy.resumeFocus : copy.startFocus
  const toggleFocusIcon = isRunning ? faPause : faPlay
  const canToggleFocus = Boolean(activeTask)
  const rawProgress = typeof timerProgressPercent === 'number' && Number.isFinite(timerProgressPercent) ? timerProgressPercent : 0
  const progressPercent = Math.max(0, Math.min(100, rawProgress))
  const progressDegrees = progressPercent * 3.6
  const timerRingStyle = {
    background: `conic-gradient(rgba(${playGlowRgb},0.98) ${progressDegrees}deg, rgba(148,163,184,0.2) ${progressDegrees}deg 360deg)`,
  } as CSSProperties

  const canSwitchToStopwatch = !hasActiveSession && Boolean(activeTask)
  const canSwitchToTimer = !hasActiveSession && Boolean(activeTask) && canUseTimerMode

  return (
    <>
      <div
        className={classNames(
          'mb-2 flex min-h-0 sm:mb-0',
          isFocusOnlyMode
            ? 'flex-1 justify-center [@media(max-height:840px)]:justify-start'
            : 'justify-start sm:flex-1 sm:justify-center',
        )}
      >
        <div
          className={classNames(
            'flex w-full flex-col px-4 py-2 sm:px-8 sm:py-3',
            isFocusOnlyMode
              ? 'h-full justify-center py-4 sm:py-6 [@media(max-height:840px)]:h-auto [@media(max-height:840px)]:justify-start'
              : 'sm:h-full sm:pb-0',
          )}
        >
          <div
            className={classNames(
              'relative mt-0 flex flex-1 flex-col items-center justify-center py-1 sm:py-2',
              isFocusOnlyMode && 'mt-4 sm:mt-6',
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
                    isFocusOnlyMode ? 'w-auto justify-center' : 'w-full justify-center',
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
                        isFocusOnlyMode
                          ? 'text-[clamp(1.36rem,6.6vw,1.8rem)] sm:text-center sm:text-[clamp(1.9rem,5.4vw,2.5rem)] md:text-4xl'
                          : 'text-[1.55rem] sm:text-center sm:text-[2rem] md:text-4xl',
                      )}
                    >
                      {taskTitle}
                    </h2>
                  </div>
                </div>

                <p
                  className={classNames(
                    'relative mt-1.5 w-full max-w-full overflow-hidden text-center select-none font-bold leading-none tracking-tight text-slate-100 tabular-nums',
                    isFocusOnlyMode
                      ? 'text-[clamp(48px,18vw,80px)] sm:text-[clamp(62px,9.8vw,120px)] md:text-[clamp(96px,14vw,260px)]'
                      : 'text-[clamp(49px,15.2vw,74px)] sm:text-[clamp(64px,9.4vw,116px)] md:text-[clamp(80px,12vw,220px)]',
                    accents.timeGlowClassName,
                  )}
                >
                  {stopwatchLabel}
                </p>
              </div>

              <div
                className={classNames(
                  'absolute inset-0 flex items-center justify-start pt-1 sm:pt-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]',
                  mode === 'timer'
                    ? 'opacity-100 [transform:translateX(0%)_rotateY(0deg)]'
                    : 'pointer-events-none opacity-0 [transform:translateX(18%)_rotateY(-34deg)]',
                )}
              >
                <div className="relative h-[min(72vw,17.6rem)] w-[min(72vw,17.6rem)] sm:h-[17.6rem] sm:w-[17.6rem]">
                  <div className="absolute inset-0 rounded-full p-[4px] shadow-[0_18px_34px_rgba(2,6,23,0.44)]" style={timerRingStyle}>
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-slate-200/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(2,6,23,0.72)_55%,rgba(2,6,23,0.88))] px-5 text-center">
                      <p
                        className={classNames(
                          'font-mono text-[clamp(40px,11.6vw,68px)] font-semibold leading-none tracking-tight tabular-nums text-slate-100',
                          accents.timeGlowClassName,
                        )}
                      >
                        {stopwatchLabel}
                      </p>
                      <p className="mt-3 line-clamp-2 max-w-[86%] bg-slate-200/8 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-300">
                        {taskTitle}
                      </p>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0" style={{ transform: `rotate(${progressDegrees}deg)` }}>
                    <span className="absolute left-1/2 top-[2px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white/40 bg-white/95 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2">
                <div className="pointer-events-auto flex flex-col gap-1.5">
                  <button
                    aria-label={copy.stopwatch}
                    className={classNames(
                      'inline-flex h-10 items-center gap-1.5 rounded-r-xl border border-l-0 px-2.5 text-[11px] font-semibold backdrop-blur transition',
                      mode === 'stopwatch'
                        ? classNames('text-slate-100', accents.chipClassName, 'border-slate-400/70')
                        : canSwitchToStopwatch
                          ? 'border-slate-500/60 bg-slate-900/55 text-slate-100 hover:border-blue-400/55 hover:text-blue-200'
                          : 'cursor-not-allowed border-slate-700/50 bg-slate-900/35 text-slate-600',
                    )}
                    disabled={!canSwitchToStopwatch || mode === 'stopwatch'}
                    onClick={() => onChangeMode('stopwatch')}
                    type="button"
                  >
                    <FontAwesomeIcon className="text-[11px]" icon={faStopwatch} />
                    <span className="hidden sm:inline">{copy.stopwatch}</span>
                  </button>
                  <button
                    aria-label={copy.timer}
                    className={classNames(
                      'inline-flex h-10 items-center gap-1.5 rounded-r-xl border border-l-0 px-2.5 text-[11px] font-semibold backdrop-blur transition',
                      mode === 'timer'
                        ? classNames('text-slate-100', accents.chipClassName, 'border-slate-400/70')
                        : canSwitchToTimer
                          ? 'border-slate-500/60 bg-slate-900/55 text-slate-100 hover:border-blue-400/55 hover:text-blue-200'
                          : 'cursor-not-allowed border-slate-700/50 bg-slate-900/35 text-slate-600',
                    )}
                    disabled={!canSwitchToTimer || mode === 'timer'}
                    onClick={() => onChangeMode('timer')}
                    type="button"
                  >
                    <FontAwesomeIcon className="text-[11px]" icon={faHourglassHalf} />
                    <span className="hidden sm:inline">{copy.timer}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className={classNames(
              'mx-auto w-full max-w-[460px] border-t',
              isFocusOnlyMode ? 'mt-1 pt-4 sm:mt-2' : 'mt-0.5 pt-3 sm:mt-auto sm:pt-4',
              '[@media(max-height:840px)]:mt-2 [@media(max-height:840px)]:pt-3',
              accents.dividerClassName,
            )}
          >
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              {copy.totalTaskTime}
              <span className={classNames('ml-2 font-mono tracking-[0.16em]', accents.totalValueClassName)}>
                {totalTaskTimeLabel}
              </span>
            </p>
          </div>

          <div className={classNames('flex items-center justify-center gap-3', isFocusOnlyMode ? 'mt-5' : 'mt-3')}>
            <button
              aria-label={copy.stopFocus}
              className={classNames(
                'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
                canStopFocus
                  ? 'border-slate-600/80 bg-slate-900/45 text-slate-100 shadow-[0_8px_20px_rgba(2,6,23,0.38)] hover:border-slate-500/85 hover:bg-slate-800/55'
                  : 'cursor-not-allowed border-slate-800/70 bg-slate-900/20 text-slate-600',
              )}
              disabled={!canStopFocus}
              onClick={onStopFocus}
              type="button"
            >
              <FontAwesomeIcon className="text-[14px]" icon={faStop} />
            </button>

            <button
              aria-label={toggleFocusAriaLabel}
              className={classNames(
                'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
                canToggleFocus
                  ? classNames(!isRunning && !hasActiveSession && 'timer-play-paused-blink', accents.playButtonClassName)
                  : 'cursor-not-allowed border-slate-800/70 bg-slate-900/20 text-slate-600',
              )}
              disabled={!canToggleFocus}
              onClick={onToggleFocus}
              style={canToggleFocus ? playButtonGlowStyle : undefined}
              type="button"
            >
              <FontAwesomeIcon
                className={classNames(
                  isRunning ? 'text-[18px]' : 'translate-x-[1px] text-xl',
                  accents.playIconClassName,
                )}
                icon={toggleFocusIcon}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function normalizeStopwatchLabel(timeLabel: string) {
  const parts = timeLabel.trim().split(':').filter(Boolean)

  if (parts.length === 3) {
    return parts.map((part) => part.padStart(2, '0')).join(':')
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return ['00', minutes.padStart(2, '0'), seconds.padStart(2, '0')].join(':')
  }

  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    return ['00', parts[0].padStart(2, '0'), '00'].join(':')
  }

  return '00:00:00'
}
