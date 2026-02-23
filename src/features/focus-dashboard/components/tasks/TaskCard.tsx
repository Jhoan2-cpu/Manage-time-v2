import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRotateRight,
  faBell,
  faEye,
  faHourglassHalf,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { Task, TaskState } from '../../types'
import { classNames } from '../../utils/classNames'
import { formatMinutesCompact } from '../../utils/time'

type TaskCardProps = {
  task: Task
  sessionCount: number
  isRunning?: boolean
  showRestartAction?: boolean
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

const taskCardTiltClassByColor: Record<Task['colorTag'], string> = {
  blue: '-rotate-[0.55deg]',
  green: 'rotate-[0.35deg]',
  amber: '-rotate-[0.4deg]',
  rose: 'rotate-[0.5deg]',
  violet: '-rotate-[0.25deg]',
}

export function TaskCard({
  task,
  sessionCount,
  isRunning = false,
  showRestartAction = false,
  onPlayTask,
  onEditTask,
}: TaskCardProps) {
  const stateStyles = taskStateStyles[task.state]
  const colorStyles = taskColorMap[task.colorTag]
  const iconOption = taskIconMap[task.iconTag]
  const iconTextClassName = taskCardIconTextClassByColor[task.colorTag]
  const tiltClassName = taskCardTiltClassByColor[task.colorTag]
  const sessionsLabel = sessionCount > 99 ? '99+' : String(sessionCount)
  const isActive = task.state === 'active'
  const isActiveRunning = isActive && isRunning
  const showRestartIcon = isActive && showRestartAction && !isRunning
  const activeCardGlowStyle = isActive
    ? ({ '--task-card-glow-rgb': taskCardGlowRgbByColor[task.colorTag] } as CSSProperties)
    : undefined

  return (
    <article
      className={classNames(
        'flex h-[7.5rem] w-64 shrink-0 cursor-pointer flex-col rounded-[18px] px-2.5 pb-2.5 pt-3 transition duration-200 hover:-translate-y-0.5',
        'relative overflow-hidden',
        tiltClassName,
        'before:pointer-events-none before:absolute before:left-1/2 before:top-1 before:z-10 before:h-2 before:w-12 before:-translate-x-1/2 before:rotate-[-2deg] before:rounded-[3px] before:bg-white/14 before:shadow-[0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(2,6,23,0.18)]',
        'after:pointer-events-none after:absolute after:right-0 after:top-0 after:z-10 after:h-4 after:w-4 after:bg-white/10 after:[clip-path:polygon(100%_0,0_0,100%_100%)] after:shadow-[-1px_1px_0_rgba(255,255,255,0.08)]',
        'shadow-[0_12px_20px_rgba(1,8,22,0.28),inset_0_1px_0_rgba(255,255,255,0.03)]',
        isActive && 'task-card-focus-ignite',
        colorStyles.cardClassName,
        isActive && classNames('ring-2 ring-inset', colorStyles.selectedRingClassName),
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
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex flex-1 items-start gap-2">
          <span
            className={classNames(
              'grid h-7 w-7 shrink-0 place-items-center text-[12px] drop-shadow-[0_1px_0_rgba(255,255,255,0.05)]',
              iconTextClassName,
            )}
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={iconOption.icon} />
          </span>
          <h3 className="line-clamp-2 text-sm font-semibold leading-4 text-slate-100">{task.title}</h3>
        </div>
      </div>

      <div className="mt-1 min-h-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.targetDurationMinutes ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-950/28 px-1.5 py-0.5 text-[10px] text-slate-200 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]">
              <FontAwesomeIcon className="text-[9px] text-slate-400" icon={faHourglassHalf} />
              <span>{formatMinutesCompact(task.targetDurationMinutes).toUpperCase()}</span>
            </span>
          ) : null}
          {task.alarmTime ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-950/28 px-1.5 py-0.5 text-[10px] text-slate-200 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]">
              <FontAwesomeIcon className="text-[9px] text-slate-400" icon={faBell} />
              <span>{formatAlarmTimeChip(task.alarmTime)}</span>
            </span>
          ) : null}
          <span
            aria-label={`${sessionCount} sessions`}
            className="inline-flex items-center gap-1 rounded-md bg-slate-950/28 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]"
            title={`${sessionCount} sessions`}
          >
            <span className="tabular-nums">{sessionsLabel}</span>
            <span className="tracking-[0.08em] text-slate-400">SESSIONS</span>
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 items-center">
          <div
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs tabular-nums',
              colorStyles.badgeClassName,
            )}
          >
            <FontAwesomeIcon icon={faHourglassHalf} />
            <span>{task.duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label={`${isActiveRunning ? 'Pause' : showRestartIcon ? 'Restart' : 'Play'} ${task.title}`}
            className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/14 text-emerald-300 transition hover:bg-emerald-500/24 hover:text-emerald-200"
            onClick={() => onPlayTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon
              className={classNames(isActiveRunning ? 'text-[10px]' : showRestartIcon ? 'text-[10px]' : 'text-[11px]')}
              icon={isActiveRunning ? faPause : showRestartIcon ? faArrowRotateRight : faPlay}
            />
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
