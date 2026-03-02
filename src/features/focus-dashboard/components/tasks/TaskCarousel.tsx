import { useCallback, useEffect, useRef, useState, type CSSProperties, type WheelEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../../i18n'
import type { FocusTimerMode, Task, TaskColorKey } from '../../types'
import { classNames } from '../../utils/classNames'
import { toIsoDateStringInTimeZone } from '../../utils/time'
import { TaskCard } from './TaskCard'

type TaskCarouselProps = {
  tasks: Task[]
  sessionCountByTaskId: Record<string, number>
  isFocusRunning?: boolean
  accentColorTag?: TaskColorKey
  effectiveTimeZone?: string
  onAddTask: () => void
  onPlayTask?: (task: Task, preferredMode?: FocusTimerMode) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
}

const carouselScrollbarStyleByColor: Record<TaskColorKey, CSSProperties> = {
  blue: {
    ['--task-carousel-scrollbar-track' as string]: 'rgba(9,20,38,0.72)',
    ['--task-carousel-scrollbar-thumb' as string]: '#2f62b8',
    ['--task-carousel-scrollbar-thumb-start' as string]: '#24457a',
    ['--task-carousel-scrollbar-thumb-end' as string]: '#3779f1',
    ['--task-carousel-scrollbar-thumb-hover-start' as string]: '#2f5ba0',
    ['--task-carousel-scrollbar-thumb-hover-end' as string]: '#4f8fff',
  },
  green: {
    ['--task-carousel-scrollbar-track' as string]: 'rgba(9,20,38,0.72)',
    ['--task-carousel-scrollbar-thumb' as string]: '#168a67',
    ['--task-carousel-scrollbar-thumb-start' as string]: '#0f5f49',
    ['--task-carousel-scrollbar-thumb-end' as string]: '#1fc993',
    ['--task-carousel-scrollbar-thumb-hover-start' as string]: '#13735a',
    ['--task-carousel-scrollbar-thumb-hover-end' as string]: '#34d7a3',
  },
  amber: {
    ['--task-carousel-scrollbar-track' as string]: 'rgba(9,20,38,0.72)',
    ['--task-carousel-scrollbar-thumb' as string]: '#b87413',
    ['--task-carousel-scrollbar-thumb-start' as string]: '#7a4b0c',
    ['--task-carousel-scrollbar-thumb-end' as string]: '#f59e0b',
    ['--task-carousel-scrollbar-thumb-hover-start' as string]: '#9d6010',
    ['--task-carousel-scrollbar-thumb-hover-end' as string]: '#ffb22d',
  },
  rose: {
    ['--task-carousel-scrollbar-track' as string]: 'rgba(9,20,38,0.72)',
    ['--task-carousel-scrollbar-thumb' as string]: '#b83456',
    ['--task-carousel-scrollbar-thumb-start' as string]: '#7d233a',
    ['--task-carousel-scrollbar-thumb-end' as string]: '#f43f5e',
    ['--task-carousel-scrollbar-thumb-hover-start' as string]: '#9e2b48',
    ['--task-carousel-scrollbar-thumb-hover-end' as string]: '#ff6580',
  },
  pink: {
    ['--task-carousel-scrollbar-track' as string]: 'rgba(9,20,38,0.72)',
    ['--task-carousel-scrollbar-thumb' as string]: '#c23786',
    ['--task-carousel-scrollbar-thumb-start' as string]: '#842359',
    ['--task-carousel-scrollbar-thumb-end' as string]: '#ec4899',
    ['--task-carousel-scrollbar-thumb-hover-start' as string]: '#a72f73',
    ['--task-carousel-scrollbar-thumb-hover-end' as string]: '#f472b6',
  },
  violet: {
    ['--task-carousel-scrollbar-track' as string]: 'rgba(9,20,38,0.72)',
    ['--task-carousel-scrollbar-thumb' as string]: '#6e46c8',
    ['--task-carousel-scrollbar-thumb-start' as string]: '#4e2f94',
    ['--task-carousel-scrollbar-thumb-end' as string]: '#8b5cf6',
    ['--task-carousel-scrollbar-thumb-hover-start' as string]: '#5c39af',
    ['--task-carousel-scrollbar-thumb-hover-end' as string]: '#a37aff',
  },
}

export function TaskCarousel({
  tasks,
  sessionCountByTaskId,
  isFocusRunning = false,
  accentColorTag = 'blue',
  effectiveTimeZone,
  onAddTask,
  onPlayTask,
  onEditTask,
  onDeleteTask,
}: TaskCarouselProps) {
  const { locale } = useI18n()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [alarmAttentionByTaskId, setAlarmAttentionByTaskId] = useState<Record<string, boolean>>({})
  const [lastAlarmTriggerKeyByTaskId, setLastAlarmTriggerKeyByTaskId] = useState<Record<string, string>>({})
  const copy =
    locale === 'es'
      ? {
        taskCarousel: 'Registro de tareas',
        tasks: 'tareas',
        addTask: 'Agregar tarea',
        emptyState: 'Aun no hay tareas. Usa el boton Agregar tarea para crear la primera.',
      }
      : {
        taskCarousel: 'Task Carousel',
        tasks: 'tasks',
        addTask: 'Add Task',
        emptyState: 'No tasks yet. Use the Add Task button to create your first task.',
      }

  const updateScrollButtons = useCallback(() => {
    const element = scrollerRef.current
    if (!element) {
      return
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth
    setCanScrollLeft(element.scrollLeft > 4)
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 4)
  }, [])

  useEffect(() => {
    const element = scrollerRef.current
    if (!element) {
      return
    }

    updateScrollButtons()
    const handleScroll = () => updateScrollButtons()

    element.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      element.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [tasks.length, updateScrollButtons])

  useEffect(() => {
    const taskIds = new Set(tasks.map((task) => task.id))
    setAlarmAttentionByTaskId((current) => {
      let changed = false
      const nextEntries = Object.entries(current).filter(([taskId, isActive]) => {
        const keep = taskIds.has(taskId) && isActive
        if (!keep) {
          changed = true
        }
        return keep
      })
      return changed ? Object.fromEntries(nextEntries) : current
    })
    setLastAlarmTriggerKeyByTaskId((current) => {
      let changed = false
      const nextEntries = Object.entries(current).filter(([taskId]) => {
        const keep = taskIds.has(taskId)
        if (!keep) {
          changed = true
        }
        return keep
      })
      return changed ? Object.fromEntries(nextEntries) : current
    })
  }, [tasks])

  useEffect(() => {
    const checkDueTaskAlarms = () => {
      const now = new Date()
      const currentMinuteKey = getTimeKeyForAlarmTrigger(now, effectiveTimeZone)
      if (!currentMinuteKey) {
        return
      }
      const currentDateKey = getDateKeyForAlarmTrigger(now, effectiveTimeZone)
      if (!currentDateKey) {
        return
      }

      const dueTriggers = tasks.flatMap((task) => {
        if (!task.alarmTime) {
          return []
        }

        const normalizedAlarmTime = normalizeAlarmTimeForTrigger(task.alarmTime)
        if (!normalizedAlarmTime || normalizedAlarmTime !== currentMinuteKey) {
          return []
        }

        const triggerKey = `${currentDateKey}|${normalizedAlarmTime}`
        if (lastAlarmTriggerKeyByTaskId[task.id] === triggerKey) {
          return []
        }

        return [{ taskId: task.id, triggerKey }]
      })

      if (dueTriggers.length === 0) {
        return
      }

      setLastAlarmTriggerKeyByTaskId((current) => {
        const next = { ...current }
        dueTriggers.forEach(({ taskId, triggerKey }) => {
          next[taskId] = triggerKey
        })
        return next
      })

      setAlarmAttentionByTaskId((current) => {
        const next = { ...current }
        dueTriggers.forEach(({ taskId }) => {
          next[taskId] = true
        })
        return next
      })
    }

    checkDueTaskAlarms()
    const intervalId = window.setInterval(checkDueTaskAlarms, 1000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [effectiveTimeZone, lastAlarmTriggerKeyByTaskId, tasks])

  const handleAcknowledgeAlarmAttention = useCallback((task: Task) => {
    setAlarmAttentionByTaskId((current) => {
      if (!current[task.id]) {
        return current
      }

      return {
        ...current,
        [task.id]: false,
      }
    })
  }, [])

  const handleWheelScroll = (event: WheelEvent<HTMLDivElement>) => {
    const element = scrollerRef.current
    if (!element) {
      return
    }

    const hasOverflow = element.scrollWidth > element.clientWidth + 1
    if (!hasOverflow) {
      return
    }

    const primaryDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    if (primaryDelta === 0) {
      return
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth
    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, element.scrollLeft + primaryDelta))

    if (nextScrollLeft === element.scrollLeft) {
      return
    }

    event.preventDefault()
    element.scrollLeft = nextScrollLeft
    updateScrollButtons()
  }

  return (
    <div className="mb-4 sm:mb-0">
      <section
        className={classNames(
          'rounded-[24px] bg-transparent px-3 pt-3 pb-1 shadow-none sm:px-3 sm:pt-3 sm:pb-1',
        )}
      >
        <div className="mb-1.5 flex items-center justify-start gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-100 sm:text-base">{copy.taskCarousel}</h2>
            <span
              aria-label={`${tasks.length} ${copy.tasks}`}
              className="hidden items-center gap-1 rounded-full bg-slate-900/60 px-2 py-0.5 text-[11px] font-medium text-slate-300 [@media(min-width:380px)]:inline-flex"
              title={`${tasks.length} ${copy.tasks}`}
            >
              <FontAwesomeIcon className="text-[10px] text-slate-400" icon={faLayerGroup} />
              <span className="tabular-nums">{tasks.length}</span>
              <span>{copy.tasks}</span>
            </span>
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-400/35 bg-[#0a1833]/88 px-2.5 py-1.5 text-xs font-semibold text-blue-100 shadow-[0_8px_18px_rgba(2,8,24,0.45),inset_0_0_0_1px_rgba(59,130,246,0.18)] backdrop-blur transition hover:border-blue-300/55 hover:bg-[#112349] hover:text-white"
            onClick={onAddTask}
            type="button"
          >
            <FontAwesomeIcon className="text-[11px]" icon={faPlus} />
            <span className="hidden sm:inline">{copy.addTask}</span>
          </button>
        </div>

        <div className="relative">
          <div
            className={classNames(
              'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 rounded-l-2xl bg-gradient-to-r from-[#07101f] via-[#07101f]/70 to-transparent transition-opacity',
              canScrollLeft ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            className={classNames(
              'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rounded-r-2xl bg-gradient-to-l from-[#07101f] via-[#07101f]/70 to-transparent transition-opacity',
              canScrollRight ? 'opacity-100' : 'opacity-0',
            )}
          />

          <div
            className="task-carousel-scroll relative z-10 mt-0 overflow-x-auto scroll-smooth rounded-2xl bg-transparent px-1.5 pb-0.5 pt-2 sm:pb-1 sm:pt-2.5"
            onWheel={handleWheelScroll}
            ref={scrollerRef}
            style={carouselScrollbarStyleByColor[accentColorTag]}
          >
            <div
              className={classNames(
                'gap-4 pr-2',
                tasks.length > 0 ? 'flex min-w-max snap-x snap-mandatory' : 'grid min-w-full',
              )}
            >
              {tasks.length === 0 ? (
                <div className="grid h-36 w-full place-items-center rounded-2xl bg-slate-900/20 px-4 text-center text-sm text-slate-400 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.28)]">
                  {copy.emptyState}
                </div>
              ) : (
                tasks.map((task) => (
                  <div className="snap-start" key={task.id}>
                    <TaskCard
                      isAlarmAttentionActive={Boolean(alarmAttentionByTaskId[task.id])}
                      isRunning={isFocusRunning}
                      onAcknowledgeAlarmAttention={handleAcknowledgeAlarmAttention}
                      onEditTask={onEditTask}
                      onPlayTask={onPlayTask}
                      sessionCount={sessionCountByTaskId[task.id] ?? 0}
                      task={task}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function normalizeAlarmTimeForTrigger(alarmTime: string) {
  const raw = alarmTime.trim()
  if (!raw) {
    return null
  }

  const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i)
  if (twelveHourMatch) {
    const hours12 = Number.parseInt(twelveHourMatch[1] ?? '', 10)
    const minutes = Number.parseInt(twelveHourMatch[2] ?? '', 10)
    if (!Number.isFinite(hours12) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
      return null
    }

    let hours24 = hours12 % 12
    if ((twelveHourMatch[3] ?? '').toUpperCase() === 'PM') {
      hours24 += 12
    }
    return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!twentyFourHourMatch) {
    return null
  }

  const hours = Number.parseInt(twentyFourHourMatch[1] ?? '', 10)
  const minutes = Number.parseInt(twentyFourHourMatch[2] ?? '', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getTimeKeyForAlarmTrigger(date: Date, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || undefined,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
}

function getDateKeyForAlarmTrigger(date: Date, timeZone?: string) {
  try {
    return timeZone ? toIsoDateStringInTimeZone(date, timeZone) : toIsoDateStringInTimeZone(date, Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
