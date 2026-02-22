import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHourglassHalf,
  faListOl,
  faPenToSquare,
  faPlay,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { Task, TaskState } from '../../types'
import { classNames } from '../../utils/classNames'

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

  return (
    <article
      className={classNames(
        'group flex h-36 w-64 shrink-0 flex-col justify-between rounded-2xl p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl',
        colorStyles.cardClassName,
        stateStyles.shell,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={classNames(
                'grid h-6 w-6 place-items-center rounded-md border text-[11px]',
                colorStyles.iconShellClassName,
              )}
            >
              <FontAwesomeIcon icon={iconOption.icon} />
            </span>
            <p className="truncate text-[10px] uppercase tracking-[0.15em] text-slate-500">{iconOption.label}</p>
          </div>
          <h3 className="truncate text-xl font-semibold leading-tight text-slate-100">{task.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-400">{task.details}</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-950/25 p-1 ring-1 ring-inset ring-slate-800/45 backdrop-blur-sm">
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

          <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/35 px-2 py-1 text-xs text-slate-300 ring-1 ring-inset ring-slate-800/50">
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
