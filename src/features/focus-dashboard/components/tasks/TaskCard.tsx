import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faHourglassHalf,
  faListOl,
  faPenToSquare,
  faPlay,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { Task, TaskState } from '../../types'
import { classNames } from '../../utils/classNames'
import { formatMinutesCompact } from '../../utils/time'

type TaskCardProps = {
  task: Task
  sessionCount: number
  onPlayTask?: (task: Task) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
}

const taskStateStyles: Record<TaskState, { shell: string }> = {
  active: {
    shell: 'shadow-lg shadow-blue-900/20',
  },
  done: {
    shell: '',
  },
  scheduled: {
    shell: '',
  },
}

export function TaskCard({ task, sessionCount, onPlayTask, onEditTask, onDeleteTask }: TaskCardProps) {
  const stateStyles = taskStateStyles[task.state]
  const colorStyles = taskColorMap[task.colorTag]
  const iconOption = taskIconMap[task.iconTag]
  const hasAdvancedMeta = Boolean(task.targetDurationMinutes || task.alarmTime)

  return (
    <article
      className={classNames(
        'flex h-32 w-64 shrink-0 flex-col justify-between rounded-2xl p-3.5 transition duration-200 hover:-translate-y-0.5',
        colorStyles.cardClassName,
        stateStyles.shell,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex flex-1 items-center gap-2.5">
          <span
            className={classNames(
              'grid h-7 w-7 shrink-0 place-items-center rounded-md border text-[11px]',
              colorStyles.iconShellClassName,
            )}
          >
            <FontAwesomeIcon icon={iconOption.icon} />
          </span>
          <h3 className="truncate text-lg font-semibold leading-tight text-slate-100 sm:text-xl">{task.title}</h3>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-950/18 p-1 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]">
          <button
            aria-label={`Play ${task.title}`}
            className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/14 text-emerald-300 transition hover:bg-emerald-500/24 hover:text-emerald-200"
            onClick={() => onPlayTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon className="text-[11px]" icon={faPlay} />
          </button>
          <button
            aria-label={`Edit ${task.title}`}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800/80 hover:text-blue-300"
            onClick={() => onEditTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon className="text-[11px]" icon={faPenToSquare} />
          </button>
          <button
            aria-label={`Delete ${task.title}`}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800/80 hover:text-red-300"
            onClick={() => onDeleteTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon className="text-[11px]" icon={faTrashCan} />
          </button>
        </div>
      </div>

      <div className="mt-1 min-h-5">
        {hasAdvancedMeta ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {task.targetDurationMinutes ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-950/25 px-1.5 py-0.5 text-[10px] text-slate-300 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.2)]">
                <FontAwesomeIcon className="text-[9px] text-slate-400" icon={faHourglassHalf} />
                <span>{formatMinutesCompact(task.targetDurationMinutes).toUpperCase()}</span>
              </span>
            ) : null}
            {task.alarmTime ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-950/25 px-1.5 py-0.5 text-[10px] text-slate-300 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.2)]">
                <FontAwesomeIcon className="text-[9px] text-slate-400" icon={faBell} />
                <span>{formatAlarmTimeChip(task.alarmTime)}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs tabular-nums',
              colorStyles.badgeClassName,
            )}
          >
            <FontAwesomeIcon icon={faHourglassHalf} />
            <span>{task.duration}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/25 px-2 py-1 text-xs text-slate-300 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]">
            <FontAwesomeIcon className="text-[10px] text-slate-400" icon={faListOl} />
            <span className="font-semibold tabular-nums text-slate-200">{sessionCount}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">sessions</span>
          </div>
        </div>

        {task.state === 'active' ? (
          <span className={classNames('h-2 w-2 animate-pulse rounded-full', colorStyles.pulseClassName)} />
        ) : null}
      </div>
    </article>
  )
}

function formatAlarmTimeChip(alarmTime: string) {
  const [hoursRaw, minutesRaw] = alarmTime.split(':')
  const hours = Number.parseInt(hoursRaw ?? '', 10)
  const minutes = Number.parseInt(minutesRaw ?? '', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return alarmTime
  }

  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}
