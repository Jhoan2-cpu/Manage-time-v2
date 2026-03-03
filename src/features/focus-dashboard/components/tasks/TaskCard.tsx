import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faHourglassHalf,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../../i18n'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { FocusTimerMode, Task, TaskState } from '../../types'
import { classNames } from '../../utils/classNames'
import { formatMinutesCompact, formatSecondsHms } from '../../utils/time'

type TaskCardProps = {
  task: Task
  sessionCount: number
  isRunning?: boolean
  isAlarmAttentionActive?: boolean
  onAcknowledgeAlarmAttention?: (task: Task) => void
  onPlayTask?: (task: Task, preferredMode?: FocusTimerMode) => void
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
  isAlarmAttentionActive = false,
  onAcknowledgeAlarmAttention,
  onPlayTask,
  onEditTask,
}: TaskCardProps) {
  const { locale } = useI18n()
  const stateStyles = taskStateStyles[task.state]
  const colorStyles = taskColorMap[task.colorTag]
  const iconOption = taskIconMap[task.iconTag]
  const iconTextClassName = taskCardIconTextClassByColor[task.colorTag]
  const isActive = task.state === 'active'
  const isActiveRunning = isActive && isRunning
  const alarmLabel = typeof task.alarmTime === 'string' && task.alarmTime.trim() ? task.alarmTime.trim() : null
  const timerPresetLabel =
    typeof task.targetDurationMinutes === 'number' && Number.isFinite(task.targetDurationMinutes) && task.targetDurationMinutes > 0
      ? formatTargetTimerChip(task.targetDurationMinutes)
      : null
  const defaultStartMode: FocusTimerMode = timerPresetLabel ? 'timer' : 'stopwatch'
  const cardGlowStyle = { '--task-card-glow-rgb': taskCardGlowRgbByColor[task.colorTag] } as CSSProperties
  const copy =
    locale === 'es'
      ? {
        pause: 'Pausar',
        alarm: 'Alarma',
        startFocus: 'Iniciar enfoque',
        timer: 'Temporizador',
      }
      : {
        pause: 'Pause',
        alarm: 'Alarm',
        startFocus: 'Start focus',
        timer: 'Timer',
      }

  return (
    <article
      className={classNames(
        'flex h-[5rem] w-64 shrink-0 cursor-pointer flex-col rounded-[12px] px-2.5 pb-1.5 pt-1.5 transition duration-200',
        'relative overflow-hidden',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-7 before:bg-gradient-to-b before:from-white/12 before:via-white/[0.04] before:to-transparent before:opacity-70',
        'shadow-[0_14px_28px_rgba(1,8,22,0.34),0_4px_12px_rgba(1,8,22,0.16),inset_0_1px_0_rgba(255,255,255,0.04)]',
        !isActive && 'task-card-hover-glow',
        isActive && 'task-card-focus-ignite',
        isAlarmAttentionActive && 'task-card-scheduled-alarm-alert',
        colorStyles.cardClassName,
        isActive && classNames('ring-2 ring-inset', colorStyles.selectedRingClassName),
        stateStyles.shell,
      )}
      onClick={(event) => {
        onAcknowledgeAlarmAttention?.(task)

        const target = event.target
        if (target instanceof Element && target.closest('button')) {
          return
        }

        onEditTask?.(task)
      }}
      style={cardGlowStyle}
      data-session-count={sessionCount}
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex flex-1 items-start gap-1.5">
          <span
            className={classNames(
              'grid h-6 w-6 shrink-0 place-items-center text-[11px] drop-shadow-[0_1px_0_rgba(255,255,255,0.05)]',
              iconTextClassName,
            )}
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={iconOption.icon} />
          </span>
          <h3 className="line-clamp-2 text-sm font-semibold leading-[1.06rem] text-slate-100">{task.title}</h3>
        </div>
      </div>

      <div className="mt-auto mb-0.5 flex items-center justify-between gap-1.5 ">
        <div className="flex min-w-0 items-center">
          <div
            className={classNames(
              'inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-200',
            )}
          >
            <FontAwesomeIcon className="text-slate-400" icon={faHourglassHalf} />
            <span>{task.duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {alarmLabel ? (
            <span
              aria-label={`${copy.alarm} ${alarmLabel}`}
              className={classNames(
                'pointer-events-none inline-flex h-7 items-center gap-1 px-1 text-[10px] font-medium text-slate-200/90',
              )}
              title={`${copy.alarm} ${alarmLabel}`}
            >
              <FontAwesomeIcon className="text-[9px]" icon={faBell} />
              <span className="font-mono">{alarmLabel}</span>
            </span>
          ) : null}

          {timerPresetLabel ? (
            <span
              aria-label={`${copy.timer} ${timerPresetLabel}`}
              className={classNames(
                'pointer-events-none inline-flex h-7 items-center gap-1 px-1 text-[10px] font-medium text-slate-200/90',
              )}
            >
              <FontAwesomeIcon className="text-[9px]" icon={faHourglassHalf} />
              <span className="font-mono">{timerPresetLabel}</span>
            </span>
          ) : null}

          <button
            aria-label={`${isActiveRunning ? copy.pause : copy.startFocus} ${task.title}`}
            className={classNames(
              'grid h-7 w-7 place-items-center rounded-full border transition shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:brightness-110',
              colorStyles.iconShellClassName,
            )}
            onClick={() => {
              onAcknowledgeAlarmAttention?.(task)
              onPlayTask?.(task, defaultStartMode)
            }}
            type="button"
          >
            <FontAwesomeIcon
              className={classNames(isActiveRunning ? 'text-[10px]' : 'text-[11px]')}
              icon={isActiveRunning ? faPause : faPlay}
            />
          </button>
        </div>
      </div>
    </article>
  )
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
