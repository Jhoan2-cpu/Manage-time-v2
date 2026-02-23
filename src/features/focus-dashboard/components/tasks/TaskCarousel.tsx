import { useCallback, useEffect, useRef, useState, type WheelEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { Task, TaskColorKey } from '../../types'
import { classNames } from '../../utils/classNames'
import { TaskCard } from './TaskCard'

const carouselAccentClassNameByColor: Record<TaskColorKey, string> = {
  blue: 'bg-[linear-gradient(180deg,rgba(59,130,246,0.03),rgba(7,14,29,0.66)_26%,rgba(5,11,22,0.74))]',
  green:
    'bg-[linear-gradient(180deg,rgba(16,185,129,0.03),rgba(7,14,29,0.66)_26%,rgba(5,11,22,0.74))]',
  amber:
    'bg-[linear-gradient(180deg,rgba(245,158,11,0.03),rgba(7,14,29,0.66)_26%,rgba(5,11,22,0.74))]',
  rose: 'bg-[linear-gradient(180deg,rgba(244,63,94,0.03),rgba(7,14,29,0.66)_26%,rgba(5,11,22,0.74))]',
  violet:
    'bg-[linear-gradient(180deg,rgba(139,92,246,0.03),rgba(7,14,29,0.66)_26%,rgba(5,11,22,0.74))]',
}

type TaskCarouselProps = {
  tasks: Task[]
  sessionCountByTaskId: Record<string, number>
  accentColorTag?: TaskColorKey
  onAddTask: () => void
  onPlayTask?: (task: Task) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
}

export function TaskCarousel({
  tasks,
  sessionCountByTaskId,
  accentColorTag = 'blue',
  onAddTask,
  onPlayTask,
  onEditTask,
  onDeleteTask,
}: TaskCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  const handleScrollBy = (direction: 'left' | 'right') => {
    const element = scrollerRef.current
    if (!element) {
      return
    }

    const step = Math.max(220, Math.floor(element.clientWidth * 0.72))
    element.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    })
  }

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
    <div className="mb-8">
      <section
        className={classNames(
          'rounded-[24px] p-3 shadow-[0_22px_55px_rgba(2,8,20,0.35),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-4',
          carouselAccentClassNameByColor[accentColorTag],
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Focus Queue</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-100 sm:text-base">Task Carousel</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                <FontAwesomeIcon className="text-[10px] text-slate-400" icon={faLayerGroup} />
                {tasks.length} tasks
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600/15 px-3 py-2 text-sm font-medium text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)] transition hover:bg-blue-500/20 hover:text-white"
              onClick={onAddTask}
              type="button"
            >
              <FontAwesomeIcon className="text-[12px]" icon={faPlus} />
              <span className="hidden sm:inline">Add Task</span>
            </button>

            <span className="hidden rounded-full bg-slate-900/45 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:inline-flex">
              Scroll horizontally
            </span>

            <button
              aria-label="Scroll tasks left"
              className={classNames(
                'grid h-8 w-8 place-items-center rounded-xl text-sm transition',
                canScrollLeft
                  ? 'bg-slate-900/75 text-slate-300 shadow-[inset_0_1px_0_rgba(148,163,184,0.04)] hover:bg-slate-800/90 hover:text-blue-300'
                  : 'cursor-not-allowed bg-slate-900/20 text-slate-600',
              )}
              disabled={!canScrollLeft}
              onClick={() => handleScrollBy('left')}
              type="button"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <button
              aria-label="Scroll tasks right"
              className={classNames(
                'grid h-8 w-8 place-items-center rounded-xl text-sm transition',
                canScrollRight
                  ? 'bg-slate-900/75 text-slate-300 shadow-[inset_0_1px_0_rgba(148,163,184,0.04)] hover:bg-slate-800/90 hover:text-blue-300'
                  : 'cursor-not-allowed bg-slate-900/20 text-slate-600',
              )}
              disabled={!canScrollRight}
              onClick={() => handleScrollBy('right')}
              type="button"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
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
            className="task-carousel-scroll overflow-x-auto scroll-smooth rounded-2xl bg-slate-950/5 px-1.5 pb-2 pt-1.5"
            onWheel={handleWheelScroll}
            ref={scrollerRef}
          >
            <div
              className={classNames(
                'gap-4 pr-2',
                tasks.length > 0 ? 'flex min-w-max snap-x snap-mandatory' : 'grid min-w-full',
              )}
            >
              {tasks.length === 0 ? (
                <div className="grid h-36 w-full place-items-center rounded-2xl bg-slate-900/20 px-4 text-center text-sm text-slate-400 shadow-[inset_0_0_0_1px_rgba(30,41,59,0.28)]">
                  No tasks yet. Use the Add Task button to create your first task.
                </div>
              ) : (
                tasks.map((task) => (
                  <div className="snap-start" key={task.id}>
                    <TaskCard
                      onDeleteTask={onDeleteTask}
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
