import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { AmbientSoundPanel } from './AmbientSoundPanel'
import { taskIconMap } from '../constants/taskOptions'
import type { LogEntry, LogTone, SoundOption, Task, TaskColorKey } from '../types'
import { classNames } from '../utils/classNames'

type DailyLogPanelProps = {
  entries: LogEntry[]
  tasks: Task[]
  totalTracked: string
  isOpen: boolean
  sounds: SoundOption[]
  selectedSoundId: string
  isAmbientPlaying: boolean
  onSoundSelect: (soundId: string) => void
  onToggleAmbientPlayback: () => void
}

const logToneStyles: Record<LogTone, { row: string; time: string; duration: string; activity: string; icon: string }> = {
  break: {
    row: 'border border-cyan-500/25 bg-cyan-500/10',
    time: 'text-slate-300',
    duration: 'bg-cyan-500/15 text-cyan-300',
    activity: 'text-cyan-100',
    icon: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200',
  },
  warning: {
    row: 'border border-amber-500/25 bg-amber-500/10',
    time: 'text-amber-100',
    duration: 'bg-amber-500/15 text-amber-300',
    activity: 'font-semibold text-amber-100',
    icon: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  },
  active: {
    row: 'border border-emerald-400/45 bg-emerald-500/10 shadow-[inset_3px_0_0_0_rgba(16,185,129,.95)]',
    time: 'font-semibold text-emerald-100',
    duration: 'bg-emerald-500/15 font-semibold text-emerald-200',
    activity: 'font-semibold text-emerald-100',
    icon: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  },
  faded: {
    row: 'border border-dashed border-slate-700/50 opacity-55',
    time: 'text-slate-500',
    duration: 'border border-slate-700 bg-transparent text-slate-500',
    activity: 'italic text-slate-500',
    icon: 'border-slate-700 bg-slate-900/40 text-slate-500',
  },
  default: {
    row: 'border border-transparent hover:border-slate-700 hover:bg-slate-800/65',
    time: 'text-slate-400',
    duration: 'bg-slate-800 text-slate-300',
    activity: 'text-slate-200',
    icon: 'border-slate-700 bg-slate-800 text-slate-300',
  },
}

const taskLogColorStyles: Record<TaskColorKey, { row: string; time: string; duration: string; activity: string; icon: string }> = {
  blue: {
    row: 'border border-blue-500/25 bg-blue-500/8 shadow-[inset_3px_0_0_0_rgba(59,130,246,.85)]',
    time: 'text-blue-100',
    duration: 'bg-blue-500/15 text-blue-200',
    activity: 'font-semibold text-blue-100',
    icon: 'border-blue-400/35 bg-blue-500/15 text-blue-200',
  },
  green: {
    row: 'border border-emerald-500/25 bg-emerald-500/8 shadow-[inset_3px_0_0_0_rgba(16,185,129,.85)]',
    time: 'text-emerald-100',
    duration: 'bg-emerald-500/15 text-emerald-200',
    activity: 'font-semibold text-emerald-100',
    icon: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
  },
  amber: {
    row: 'border border-amber-500/25 bg-amber-500/8 shadow-[inset_3px_0_0_0_rgba(245,158,11,.85)]',
    time: 'text-amber-100',
    duration: 'bg-amber-500/15 text-amber-200',
    activity: 'font-semibold text-amber-100',
    icon: 'border-amber-400/35 bg-amber-500/15 text-amber-200',
  },
  rose: {
    row: 'border border-rose-500/25 bg-rose-500/8 shadow-[inset_3px_0_0_0_rgba(244,63,94,.85)]',
    time: 'text-rose-100',
    duration: 'bg-rose-500/15 text-rose-200',
    activity: 'font-semibold text-rose-100',
    icon: 'border-rose-400/35 bg-rose-500/15 text-rose-200',
  },
  violet: {
    row: 'border border-violet-500/25 bg-violet-500/8 shadow-[inset_3px_0_0_0_rgba(139,92,246,.85)]',
    time: 'text-violet-100',
    duration: 'bg-violet-500/15 text-violet-200',
    activity: 'font-semibold text-violet-100',
    icon: 'border-violet-400/35 bg-violet-500/15 text-violet-200',
  },
}

export function DailyLogPanel({
  entries,
  tasks,
  totalTracked,
  isOpen,
  sounds,
  selectedSoundId,
  isAmbientPlaying,
  onSoundSelect,
  onToggleAmbientPlayback,
}: DailyLogPanelProps) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]))

  return (
    <aside
      className={classNames(
        'hidden shrink-0 overflow-hidden bg-[#050d1d]/85 transition-[width,opacity,transform,border-color] duration-300 ease-out xl:flex xl:flex-col',
        isOpen
          ? 'w-[340px] border-r border-slate-800 opacity-100'
          : 'pointer-events-none w-0 -translate-x-3 border-r border-transparent opacity-0',
      )}
    >
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
          const task = entry.taskId ? taskMap.get(entry.taskId) : undefined
          const styles = task ? taskLogColorStyles[task.colorTag] : logToneStyles[entry.tone ?? 'default']
          const taskIcon = task ? taskIconMap[task.iconTag] : undefined
          const activityLabel = task?.title ?? entry.activity ?? 'Unknown Activity'

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
              <span className={classNames('col-span-6 flex min-w-0 items-center gap-2', styles.activity)}>
                {taskIcon ? (
                  <span
                    className={classNames(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px]',
                      styles.icon,
                    )}
                  >
                    <FontAwesomeIcon icon={taskIcon.icon} />
                  </span>
                ) : null}
                <span className="truncate">{activityLabel}</span>
              </span>
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

      <AmbientSoundPanel
        isPlaying={isAmbientPlaying}
        onSoundSelect={onSoundSelect}
        onTogglePlayback={onToggleAmbientPlayback}
        selectedSoundId={selectedSoundId}
        sounds={sounds}
      />
    </aside>
  )
}
