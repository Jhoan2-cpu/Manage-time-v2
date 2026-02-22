import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faPlay } from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../constants/taskOptions'
import type { Task, TaskColorKey } from '../types'
import { classNames } from '../utils/classNames'

type TimerPanelProps = {
  timeLabel: string
  onStartFocus: () => void
  activeTask: Task | null
  totalTaskTimeLabel: string
}

const timerAccentStyles: Record<
  TaskColorKey,
  {
    glowClassName: string
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

export function TimerPanel({ timeLabel, onStartFocus, activeTask, totalTaskTimeLabel }: TimerPanelProps) {
  const activeTaskColor = activeTask ? taskColorMap[activeTask.colorTag] : null
  const activeTaskIcon = activeTask ? taskIconMap[activeTask.iconTag] : null
  const accents = activeTask ? timerAccentStyles[activeTask.colorTag] : timerAccentStyles.blue
  const taskTitle = activeTask?.title ?? 'No Task Selected'
  const taskSubtitle = activeTask?.details ?? 'Choose a task to start a focus session'
  const stopwatchLabel = normalizeStopwatchLabel(timeLabel)

  return (
    <>
      <div className="mb-8 flex justify-center">
        <div className="w-full max-w-[760px] rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05),transparent_45%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))] px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex justify-center">
            <div className="flex max-w-full items-center gap-3 sm:gap-4">
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
                <div
                  className={classNames(
                    'mt-1 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs',
                    accents.chipClassName,
                  )}
                >
                  <span className={classNames('h-2 w-2 rounded-full', activeTaskColor?.swatchClassName ?? 'bg-slate-500')} />
                  <span className="truncate text-slate-300">{taskSubtitle}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex flex-col items-center justify-center py-6 sm:py-8">
            <div className={classNames('absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-full blur-3xl sm:h-32', accents.blurClassName)} />

            <p
              className={classNames(
                'relative select-none font-mono text-[48px] font-light leading-none tracking-tight text-slate-100 tabular-nums sm:text-[84px]',
                accents.timeGlowClassName,
              )}
            >
              {stopwatchLabel}
            </p>

            <div className="relative mt-4 flex items-center gap-2">
              <span className={classNames('h-2.5 w-2.5 rounded-full', activeTaskColor?.swatchClassName ?? 'bg-blue-500')} />
              <span className="h-2 w-2 rounded-full bg-slate-700" />
              <span className="h-2 w-2 rounded-full bg-slate-700" />
              <span className="h-2 w-2 rounded-full bg-slate-700" />
            </div>
          </div>

          <div className={classNames('mx-auto mt-2 w-full max-w-[460px] border-t pt-4', accents.dividerClassName)}>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Total Task Time:
              <span className={classNames('ml-2 font-mono tracking-[0.16em]', accents.totalValueClassName)}>
                {totalTaskTimeLabel}
              </span>
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              aria-label="Start focus"
              className={classNames(
                'grid h-14 w-14 place-items-center rounded-2xl border transition hover:-translate-y-0.5 active:translate-y-0',
                accents.playButtonClassName,
              )}
              onClick={onStartFocus}
              type="button"
            >
              <FontAwesomeIcon className={classNames('translate-x-[1px] text-xl', accents.playIconClassName)} icon={faPlay} />
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
