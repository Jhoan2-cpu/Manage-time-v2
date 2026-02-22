import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarCheck,
  faCheckCircle,
  faClock,
  faHourglassHalf,
  faPenToSquare,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { Task, TaskState } from '../../types'
import { classNames } from '../../utils/classNames'

type TaskCardProps = {
  task: Task
}

const taskStateStyles: Record<TaskState, { shell: string; status: string }> = {
  active: {
    shell: 'shadow-lg shadow-blue-900/20',
    status: 'text-blue-400',
  },
  done: {
    shell: '',
    status: 'text-slate-400',
  },
  scheduled: {
    shell: '',
    status: 'text-amber-400/80',
  },
}

const taskStateIcons: Record<TaskState, IconDefinition> = {
  active: faClock,
  done: faCheckCircle,
  scheduled: faCalendarCheck,
}

export function TaskCard({ task }: TaskCardProps) {
  const stateStyles = taskStateStyles[task.state]
  const colorStyles = taskColorMap[task.colorTag]
  const iconOption = taskIconMap[task.iconTag]

  return (
    <article
      className={classNames(
        'group flex h-36 w-64 shrink-0 flex-col justify-between rounded-2xl border p-4 transition',
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
          <p
            className={classNames(
              'mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium',
              stateStyles.status,
            )}
          >
            <FontAwesomeIcon icon={taskStateIcons[task.state]} />
            {task.statusText}
          </p>
        </div>

        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            aria-label={`Edit ${task.title}`}
            className="p-1 text-slate-500 transition hover:text-blue-400"
            type="button"
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
          <button
            aria-label={`Delete ${task.title}`}
            className="p-1 text-slate-500 transition hover:text-red-400"
            type="button"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div
          className={classNames(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs tabular-nums',
            colorStyles.badgeClassName,
          )}
        >
          <FontAwesomeIcon icon={faHourglassHalf} />
          <span>{task.duration}</span>
        </div>

        {task.state === 'active' ? (
          <span className={classNames('h-2 w-2 animate-pulse rounded-full', colorStyles.pulseClassName)} />
        ) : null}
      </div>
    </article>
  )
}
