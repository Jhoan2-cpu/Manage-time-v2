import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassHalf, faLayerGroup, faPause, faPlay, faStopwatch } from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../constants/taskOptions'
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
}: TimerPanelProps) {
  const activeTaskColor = activeTask ? taskColorMap[activeTask.colorTag] : null
  const activeTaskIcon = activeTask ? taskIconMap[activeTask.iconTag] : null
  const accents = activeTask ? timerAccentStyles[activeTask.colorTag] : timerAccentStyles.blue
  const taskTitle = activeTask?.title ?? 'No Task Selected'
  const stopwatchLabel = normalizeStopwatchLabel(timeLabel)
  const playGlowRgb = timerPlayGlowRgbByColor[activeTask?.colorTag ?? 'blue']
  const playButtonGlowStyle = { '--timer-play-glow-rgb': playGlowRgb } as CSSProperties

  return (
    <>
      <div className="mb-8 flex min-h-0 flex-1 justify-center">
        <div className="flex h-full w-full flex-col px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex justify-center">
            <div className=" flex max-w-full items-center gap-3 sm:gap-4">
              <span
                className={classNames(
                  'grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-lg',
                  activeTaskColor?.iconShellClassName ?? 'border-slate-700 bg-slate-800 text-slate-300',
                  accents.glowClassName,
                )}
              >
                {activeTaskIcon ? <FontAwesomeIcon icon={activeTaskIcon.icon} /> : <FontAwesomeIcon icon={faLayerGroup} />}
              </span>

              <div className="min-w-0">
                <h2 className="truncate text-center text-2xl font-semibold tracking-tight text-slate-100 sm:text-left sm:text-4xl">
                  {taskTitle}
                </h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
                      <span>Cronometro</span>
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
                      <span>Temporizador</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-1 flex-col items-center justify-center py-4 sm:py-6">
            <p
              className={classNames(
                'relative select-none font-mono text-[48px] font-light leading-none tracking-tight text-slate-100 tabular-nums sm:text-[84px]',
                accents.timeGlowClassName,
              )}
            >
              {stopwatchLabel}
            </p>

            {mode === 'timer' && canUseTimerMode ? (
              <div className="mt-4 w-full max-w-[520px] px-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-900/55 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                  <div
                    className={classNames(
                      'h-full rounded-full transition-[width] duration-500 ease-out',
                      activeTaskColor?.swatchClassName ?? 'bg-blue-500',
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, timerProgressPercent ?? 0))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  <span>0%</span>
                  <span className={classNames('font-mono', accents.totalValueClassName)}>
                    {Math.round(timerProgressPercent ?? 0)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className={classNames('mx-auto mt-1 w-full max-w-[460px] border-t pt-4', accents.dividerClassName)}>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Total Task Time:
              <span className={classNames('ml-2 font-mono tracking-[0.16em]', accents.totalValueClassName)}>
                {totalTaskTimeLabel}
              </span>
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              aria-label={isRunning ? 'Pause focus' : 'Start focus'}
              className={classNames(
                'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
                isRunning && 'timer-play-active-glow',
                accents.playButtonClassName,
              )}
              onClick={onStartFocus}
              style={playButtonGlowStyle}
              type="button"
            >
              <FontAwesomeIcon
                className={classNames(isRunning ? 'text-[18px]' : 'translate-x-[1px] text-xl', accents.playIconClassName)}
                icon={isRunning ? faPause : faPlay}
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
