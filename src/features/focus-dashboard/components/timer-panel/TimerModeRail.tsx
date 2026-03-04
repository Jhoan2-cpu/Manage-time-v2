import { faHourglassHalf, faStopwatch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FocusTimerMode } from '../../types'
import { classNames } from '../../utils/classNames'

type TimerModeRailProps = {
  mode: FocusTimerMode
  canSwitchToStopwatch: boolean
  canSwitchToTimer: boolean
  copyStopwatch: string
  copyTimer: string
  activeChipClassName: string
  onChangeMode: (mode: FocusTimerMode) => void
}

export function TimerModeRail({
  mode,
  canSwitchToStopwatch,
  canSwitchToTimer,
  copyStopwatch,
  copyTimer,
  activeChipClassName,
  onChangeMode,
}: TimerModeRailProps) {
  return (
    <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2">
      <div className="pointer-events-auto flex flex-col gap-1.5">
        <button
          aria-label={copyStopwatch}
          className={classNames(
            'inline-flex h-10 items-center gap-1.5 rounded-r-xl border border-l-0 px-2.5 text-[11px] font-semibold backdrop-blur transition',
            mode === 'stopwatch'
              ? classNames('text-slate-100', activeChipClassName, 'border-slate-400/70')
              : canSwitchToStopwatch
                ? 'border-slate-500/60 bg-slate-900/55 text-slate-100 hover:border-blue-400/55 hover:text-blue-200'
                : 'cursor-not-allowed border-slate-700/50 bg-slate-900/35 text-slate-600',
          )}
          disabled={!canSwitchToStopwatch || mode === 'stopwatch'}
          onClick={() => onChangeMode('stopwatch')}
          type="button"
        >
          <FontAwesomeIcon className="text-[11px]" icon={faStopwatch} />
          <span className="hidden sm:inline">{copyStopwatch}</span>
        </button>
        <button
          aria-label={copyTimer}
          className={classNames(
            'inline-flex h-10 items-center gap-1.5 rounded-r-xl border border-l-0 px-2.5 text-[11px] font-semibold backdrop-blur transition',
            mode === 'timer'
              ? classNames('text-slate-100', activeChipClassName, 'border-slate-400/70')
              : canSwitchToTimer
                ? 'border-slate-500/60 bg-slate-900/55 text-slate-100 hover:border-blue-400/55 hover:text-blue-200'
                : 'cursor-not-allowed border-slate-700/50 bg-slate-900/35 text-slate-600',
          )}
          disabled={!canSwitchToTimer || mode === 'timer'}
          onClick={() => onChangeMode('timer')}
          type="button"
        >
          <FontAwesomeIcon className="text-[11px]" icon={faHourglassHalf} />
          <span className="hidden sm:inline">{copyTimer}</span>
        </button>
      </div>
    </div>
  )
}
