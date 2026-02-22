import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { LogEntry, LogTone } from '../types'
import { classNames } from '../utils/classNames'

type DailyLogPanelProps = {
  entries: LogEntry[]
  totalTracked: string
}

const logToneStyles: Record<LogTone, { row: string; time: string; duration: string; activity: string }> = {
  break: {
    row: 'border border-cyan-500/25 bg-cyan-500/10',
    time: 'text-slate-300',
    duration: 'bg-cyan-500/15 text-cyan-300',
    activity: 'text-cyan-100',
  },
  warning: {
    row: 'border border-amber-500/25 bg-amber-500/10',
    time: 'text-amber-100',
    duration: 'bg-amber-500/15 text-amber-300',
    activity: 'font-semibold text-amber-100',
  },
  active: {
    row: 'border border-emerald-400/45 bg-emerald-500/10 shadow-[inset_3px_0_0_0_rgba(16,185,129,.95)]',
    time: 'font-semibold text-emerald-100',
    duration: 'bg-emerald-500/15 font-semibold text-emerald-200',
    activity: 'font-semibold text-emerald-100',
  },
  faded: {
    row: 'border border-dashed border-slate-700/50 opacity-55',
    time: 'text-slate-500',
    duration: 'border border-slate-700 bg-transparent text-slate-500',
    activity: 'italic text-slate-500',
  },
  default: {
    row: 'border border-transparent hover:border-slate-700 hover:bg-slate-800/65',
    time: 'text-slate-400',
    duration: 'bg-slate-800 text-slate-300',
    activity: 'text-slate-200',
  },
}

export function DailyLogPanel({ entries, totalTracked }: DailyLogPanelProps) {
  return (
    <aside className="hidden w-[340px] shrink-0 border-l border-slate-800 bg-[#050d1d]/85 xl:flex xl:flex-col">
      <div className="border-b border-slate-800 px-4 py-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-100">
          <FontAwesomeIcon className="text-slate-300" icon={faClockRotateLeft} />
          Daily Log
        </h2>
        <div className="mt-4 grid grid-cols-12 gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span className="col-span-3">Start</span>
          <span className="col-span-3 text-center">Duration</span>
          <span className="col-span-6">Activity</span>
        </div>
      </div>

      <div className="app-scroll flex-1 space-y-1 overflow-y-auto p-4">
        {entries.map((entry) => {
          const styles = logToneStyles[entry.tone]

          return (
            <article
              className={classNames('grid grid-cols-12 items-center gap-2 rounded-lg p-2 text-xs', styles.row)}
              key={entry.id}
            >
              <span className={classNames('col-span-3 font-mono tabular-nums', styles.time)}>{entry.start}</span>
              <span
                className={classNames(
                  'col-span-3 rounded py-0.5 text-center font-medium tabular-nums',
                  styles.duration,
                )}
              >
                {entry.duration}
              </span>
              <span className={classNames('col-span-6 truncate', styles.activity)}>{entry.activity}</span>
            </article>
          )
        })}
      </div>

      <div className="border-t border-slate-800 bg-[#040b18] px-4 py-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Total Tracked</span>
          <span className="font-mono font-medium tabular-nums text-slate-300">{totalTracked}</span>
        </div>
      </div>
    </aside>
  )
}
