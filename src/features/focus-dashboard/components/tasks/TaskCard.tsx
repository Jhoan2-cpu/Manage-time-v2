import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faEye,
  faHourglassHalf,
  faPlay,
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
}

const taskStateStyles: Record<TaskState, { shell: string }> = {
  active: {
    shell: '',
  },
  done: {
    shell: '',
  },
  scheduled: {
    shell: '',
  },
}

const taskCardIconTextClassByColor: Record<Task['colorTag'], string> = {
  blue: 'text-blue-200',
  green: 'text-emerald-200',
  amber: 'text-amber-200',
  rose: 'text-rose-200',
  violet: 'text-violet-200',
}

const taskCardGlowRgbByColor: Record<Task['colorTag'], string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  violet: '139,92,246',
}

export function TaskCard({ task, sessionCount, onPlayTask, onEditTask }: TaskCardProps) {
  const stateStyles = taskStateStyles[task.state]
  const colorStyles = taskColorMap[task.colorTag]
  const iconOption = taskIconMap[task.iconTag]
  const iconTextClassName = taskCardIconTextClassByColor[task.colorTag]
  const hasAdvancedMeta = Boolean(task.targetDurationMinutes || task.alarmTime)
  const isActive = task.state === 'active'
  const activeCardGlowStyle = isActive
    ? ({ '--task-card-glow-rgb': taskCardGlowRgbByColor[task.colorTag] } as CSSProperties)
    : undefined

  return (
    <article
      className={classNames(
        'flex h-36 w-64 shrink-0 cursor-pointer flex-col justify-between rounded-2xl p-3.5 transition duration-200 hover:-translate-y-0.5',
        'relative overflow-hidden',
        isActive && 'task-card-focus-ignite',
        colorStyles.cardClassName,
        stateStyles.shell,
      )}
      onClick={(event) => {
        const target = event.target
        if (target instanceof Element && target.closest('button')) {
          return
        }

        onEditTask?.(task)
      }}
      style={activeCardGlowStyle}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex flex-1 items-start gap-2.5">
          <span
            className={classNames(
              'grid h-7 w-7 shrink-0 place-items-center text-[12px]',
              iconTextClassName,
            )}
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={iconOption.icon} />
          </span>
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-100">{task.title}</h3>
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

          <span
            aria-label={`${sessionCount} sessions`}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-950/25 px-2 text-xs font-semibold tabular-nums text-slate-200 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]"
            title={`${sessionCount} sessions`}
          >
            {sessionCount > 99 ? '99+' : sessionCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label={`Play ${task.title}`}
            className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/14 text-emerald-300 transition hover:bg-emerald-500/24 hover:text-emerald-200"
            onClick={() => onPlayTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon className="text-[11px]" icon={faPlay} />
          </button>

          <button
            aria-label={`View ${task.title}`}
            className={classNames(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:brightness-110',
              colorStyles.iconShellClassName,
            )}
            onClick={() => onEditTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon className="text-[10px]" icon={faEye} />
            <span>Ver</span>
          </button>
        </div>
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
