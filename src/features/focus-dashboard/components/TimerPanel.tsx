import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRotateRight, faHourglassHalf, faLayerGroup, faPause, faPlay, faStopwatch } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import { taskIconMap } from '../constants/taskOptions'
import type { FocusTimerMode, Task, TaskColorKey } from '../types'
import { classNames } from '../utils/classNames'

type TimerPanelProps = {
  timeLabel: string
  onStartFocus: () => void
  onChangeMode: (mode: FocusTimerMode) => void
  activeTask: Task | null
  totalTaskTimeLabel: string
  mode: FocusTimerMode
  canUseTimerMode: boolean
  timerProgressPercent: number | null
  isRunning: boolean
  isFocusOnlyMode?: boolean
  isTimerComplete?: boolean
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
  onStartFocus,
  onChangeMode,
  activeTask,
  totalTaskTimeLabel,
  mode,
  canUseTimerMode,
  timerProgressPercent,
  isRunning,
  isFocusOnlyMode = false,
  isTimerComplete = false,
}: TimerPanelProps) {
  const { locale } = useI18n()
  const activeTaskIcon = activeTask ? taskIconMap[activeTask.iconTag] : null
  const accents = activeTask ? timerAccentStyles[activeTask.colorTag] : timerAccentStyles.blue
  const copy =
    locale === 'es'
      ? {
        noTaskSelected: 'Sin tarea seleccionada',
        stopwatch: 'Cronometro',
        timer: 'Temporizador',
        totalTaskTime: 'Tiempo total de tarea:',
        restartTimer: 'Reiniciar temporizador',
        pauseFocus: 'Pausar enfoque',
        startFocus: 'Iniciar enfoque',
      }
      : {
        noTaskSelected: 'No Task Selected',
        stopwatch: 'Stopwatch',
        timer: 'Timer',
        totalTaskTime: 'Total Task Time:',
        restartTimer: 'Restart timer',
        pauseFocus: 'Pause focus',
        startFocus: 'Start focus',
      }
  const taskTitle = activeTask?.title ?? copy.noTaskSelected
  const stopwatchLabel = normalizeStopwatchLabel(timeLabel)
  const playGlowRgb = timerPlayGlowRgbByColor[activeTask?.colorTag ?? 'blue']
  const playButtonGlowStyle = { '--timer-play-glow-rgb': playGlowRgb } as CSSProperties
  const showRestartAction = mode === 'timer' && isTimerComplete && !isRunning

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
          <div className="flex w-full justify-center">
            <div className="flex w-full max-w-[min(100%,58rem)] items-start justify-center gap-3 sm:gap-4">
              <span
                className={classNames(
                  'mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center text-xl sm:mt-1.5 sm:h-8 sm:w-8 sm:text-2xl',
                  activeTask ? accents.totalValueClassName : 'text-slate-300',
                )}
              >
                {activeTaskIcon ? <FontAwesomeIcon icon={activeTaskIcon.icon} /> : <FontAwesomeIcon icon={faLayerGroup} />}
              </span>

              <div className="min-w-0 flex-1">
                <h2
                  className={classNames(
                    'w-full overflow-hidden break-words text-center font-semibold leading-tight tracking-tight text-slate-100 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]',
                    isFocusOnlyMode
                      ? 'text-[clamp(1.7rem,8vw,2.4rem)] sm:text-center sm:text-4xl'
                      : 'text-2xl sm:text-left sm:text-4xl',
                  )}
                >
                  {taskTitle}
                </h2>
                <div
                  className={classNames(
                    'mt-2 flex flex-wrap items-center justify-center gap-2',
                    isFocusOnlyMode ? 'sm:justify-center' : 'sm:justify-start',
                  )}
                >
                  <div className="inline-flex items-center rounded-xl bg-slate-950/25 p-1 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
                    <button
                      className={classNames(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition',
                        mode === 'stopwatch'
                          ? classNames('text-slate-100', accents.chipClassName)
                          : 'text-slate-400 hover:text-slate-200',
                      )}
                      onClick={() => onChangeMode('stopwatch')}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faStopwatch} />
                      <span>{copy.stopwatch}</span>
                    </button>
                    <button
                      className={classNames(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition',
                        mode === 'timer'
                          ? classNames('text-slate-100', accents.chipClassName)
                          : canUseTimerMode
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'cursor-not-allowed text-slate-600',
                      )}
                      disabled={!canUseTimerMode}
                      onClick={() => onChangeMode('timer')}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faHourglassHalf} />
                      <span>{copy.timer}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={classNames(
              'relative mt-2 flex flex-1 flex-col items-center justify-center py-1 sm:py-2',
              isFocusOnlyMode && 'mt-4 sm:mt-6',
            )}
          >
            <p
              className={classNames(
                'relative w-full max-w-full overflow-hidden text-center select-none font-bold leading-none tracking-tight text-slate-100 tabular-nums',
                isFocusOnlyMode
                  ? 'text-[clamp(58px,22vw,112px)] sm:text-[clamp(96px,14vw,260px)]'
                  : 'text-[clamp(60px,18vw,96px)] sm:text-[clamp(80px,12vw,220px)]',
                accents.timeGlowClassName,
              )}
            >
              {stopwatchLabel}
            </p>
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

          <div className={classNames('flex justify-center', isFocusOnlyMode ? 'mt-5' : 'mt-3')}>
            <button
              aria-label={showRestartAction ? copy.restartTimer : isRunning ? copy.pauseFocus : copy.startFocus}
              className={classNames(
                'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
                !isRunning && !showRestartAction && 'timer-play-paused-blink',
                accents.playButtonClassName,
              )}
              onClick={onStartFocus}
              style={playButtonGlowStyle}
              type="button"
            >
              <FontAwesomeIcon
                className={classNames(
                  isRunning ? 'text-[18px]' : showRestartAction ? 'text-[17px]' : 'translate-x-[1px] text-xl',
                  accents.playIconClassName,
                )}
                icon={isRunning ? faPause : showRestartAction ? faArrowRotateRight : faPlay}
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
