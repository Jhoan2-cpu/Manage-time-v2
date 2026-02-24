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
import { getCurrentIntlLocaleTag, useI18n } from '../../../../i18n'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { Task, TaskState } from '../../types'
import { classNames } from '../../utils/classNames'
import { formatMinutesCompact, formatSecondsHms } from '../../utils/time'

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
  pink: 'text-pink-200',
  violet: 'text-violet-200',
}

const taskCardGlowRgbByColor: Record<Task['colorTag'], string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  pink: '236,72,153',
  violet: '139,92,246',
}

const taskCardTiltClassByColor: Record<Task['colorTag'], string> = {
  blue: '-rotate-[0.55deg]',
  green: 'rotate-[0.35deg]',
  amber: '-rotate-[0.4deg]',
  rose: 'rotate-[0.5deg]',
  pink: 'rotate-[0.2deg]',
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
  const { locale } = useI18n()
  const stateStyles = taskStateStyles[task.state]
  const colorStyles = taskColorMap[task.colorTag]
  const iconOption = taskIconMap[task.iconTag]
  const iconTextClassName = taskCardIconTextClassByColor[task.colorTag]
  const sessionsLabel = sessionCount > 99 ? '99+' : String(sessionCount)
  const isActive = task.state === 'active'
  const isActiveRunning = isActive && isRunning
  const showRestartIcon = isActive && showRestartAction && !isRunning
  const cardGlowStyle = { '--task-card-glow-rgb': taskCardGlowRgbByColor[task.colorTag] } as CSSProperties
  const copy =
    locale === 'es'
      ? {
          sessionsWord: 'sesiones',
          sessionsCaps: 'SESIONES',
          pause: 'Pausar',
          restart: 'Reiniciar',
          play: 'Iniciar',
          view: 'Ver',
          viewTask: 'Ver',
        }
      : {
          sessionsWord: 'sessions',
          sessionsCaps: 'SESSIONS',
          pause: 'Pause',
          restart: 'Restart',
          play: 'Play',
          view: 'View',
          viewTask: 'View',
        }

  return (
    <article
      className={classNames(
        'flex h-[7.5rem] w-64 shrink-0 cursor-pointer flex-col rounded-[12px] px-2.5 pb-2.5 pt-2.5 transition duration-200',
        'relative overflow-hidden',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-7 before:bg-gradient-to-b before:from-white/12 before:via-white/[0.04] before:to-transparent before:opacity-70',
        'shadow-[0_14px_28px_rgba(1,8,22,0.34),0_4px_12px_rgba(1,8,22,0.16),inset_0_1px_0_rgba(255,255,255,0.04)]',
        !isActive && 'task-card-hover-glow',
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
      style={cardGlowStyle}
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
              <span>{formatTargetTimerChip(task.targetDurationMinutes).toUpperCase()}</span>
            </span>
          ) : null}
          {task.alarmTime ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-950/28 px-1.5 py-0.5 text-[10px] text-slate-200 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]">
              <FontAwesomeIcon className="text-[9px] text-slate-400" icon={faBell} />
              <span>{formatAlarmTimeChip(task.alarmTime)}</span>
            </span>
          ) : null}
          <span
            aria-label={`${sessionCount} ${copy.sessionsWord}`}
            className="inline-flex items-center gap-1 rounded-md bg-slate-950/28 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.22)]"
            title={`${sessionCount} ${copy.sessionsWord}`}
          >
            <span className="tabular-nums">{sessionsLabel}</span>
            <span className="tracking-[0.08em] text-slate-400">{copy.sessionsCaps}</span>
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
            aria-label={`${isActiveRunning ? copy.pause : showRestartIcon ? copy.restart : copy.play} ${task.title}`}
            className={classNames(
              'grid h-7 w-7 place-items-center rounded-full border transition shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:brightness-110',
              colorStyles.iconShellClassName,
            )}
            onClick={() => onPlayTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon
              className={classNames(isActiveRunning ? 'text-[10px]' : showRestartIcon ? 'text-[10px]' : 'text-[11px]')}
              icon={isActiveRunning ? faPause : showRestartIcon ? faArrowRotateRight : faPlay}
            />
          </button>

          <button
            aria-label={`${copy.viewTask} ${task.title}`}
            className={classNames(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:brightness-110',
              colorStyles.iconShellClassName,
            )}
            onClick={() => onEditTask?.(task)}
            type="button"
          >
            <FontAwesomeIcon className="text-[10px]" icon={faEye} />
            <span>{copy.view}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

function formatAlarmTimeChip(alarmTime: string) {
  const raw = alarmTime.trim()
  const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (twelveHourMatch) {
    const hours12 = Number.parseInt(twelveHourMatch[1] ?? '', 10)
    const minutes = Number.parseInt(twelveHourMatch[2] ?? '', 10)
    const seconds = Number.parseInt(twelveHourMatch[3] ?? '0', 10)
    if (!Number.isFinite(hours12) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return alarmTime
    }

    const date = new Date()
    const period = (twelveHourMatch[4] ?? 'AM').toUpperCase()
    let hours24 = hours12 % 12
    if (period === 'PM') {
      hours24 += 12
    }
    date.setHours(hours24, minutes, seconds, 0)
    return new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(date)
  }

  const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!twentyFourHourMatch) {
    return alarmTime
  }

  const hours = Number.parseInt(twentyFourHourMatch[1] ?? '', 10)
  const minutes = Number.parseInt(twentyFourHourMatch[2] ?? '', 10)
  const seconds = Number.parseInt(twentyFourHourMatch[3] ?? '0', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return alarmTime
  }

  const date = new Date()
  date.setHours(hours, minutes, seconds, 0)
  return new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(date)
}

function formatTargetTimerChip(totalMinutes: number) {
  const totalSeconds = Math.max(0, Math.round(totalMinutes * 60))
  if (totalSeconds <= 0) {
    return '0m'
  }

  if (totalSeconds % 60 === 0) {
    return formatMinutesCompact(totalMinutes)
  }

  const hms = formatSecondsHms(totalSeconds)
  const [hours, minutes, seconds] = hms.split(':').map((part) => Number(part))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return formatMinutesCompact(totalMinutes)
  }

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}
