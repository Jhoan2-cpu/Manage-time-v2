import { useCallback, useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { Task } from '../../types'
import { classNames } from '../../utils/classNames'
import { TaskCard } from './TaskCard'

type TaskCarouselProps = {
  tasks: Task[]
  sessionCountByTaskId: Record<string, number>
  onAddTask: () => void
  onPlayTask?: (task: Task) => void
}

export function TaskCarousel({ tasks, sessionCountByTaskId, onAddTask, onPlayTask }: TaskCarouselProps) {
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

  return (
    <div className="mb-8">
      <section className="rounded-[24px] border border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_40%),linear-gradient(180deg,rgba(7,14,29,0.92),rgba(5,11,22,0.94))] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Focus Queue</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-100 sm:text-base">Task Carousel</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                <FontAwesomeIcon className="text-[10px] text-slate-400" icon={faLayerGroup} />
                {tasks.length} tasks
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:inline-flex">
              Scroll horizontally
            </span>

            <button
              aria-label="Scroll tasks left"
              className={classNames(
                'grid h-8 w-8 place-items-center rounded-lg border text-sm transition',
                canScrollLeft
                  ? 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-blue-500/60 hover:bg-slate-800/90 hover:text-blue-300'
                  : 'cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600',
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
                'grid h-8 w-8 place-items-center rounded-lg border text-sm transition',
                canScrollRight
                  ? 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-blue-500/60 hover:bg-slate-800/90 hover:text-blue-300'
                  : 'cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600',
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
            className="task-carousel-scroll overflow-x-auto scroll-smooth rounded-2xl border border-slate-800/70 bg-slate-950/20 px-1.5 pb-2 pt-1.5"
            ref={scrollerRef}
          >
            <div className="flex min-w-max snap-x snap-mandatory gap-4 pr-2">
              <div className="snap-start">
                <button
                  className="group relative flex h-36 w-64 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-slate-600/80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_58%),rgba(15,23,42,0.45)] text-slate-400 transition hover:border-blue-500/60 hover:bg-slate-800/70 hover:text-blue-300"
                  onClick={onAddTask}
                  type="button"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),transparent_55%)] opacity-0 transition group-hover:opacity-100" />
                  <span className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-600/80 bg-slate-800/70 text-base transition group-hover:border-blue-400/50 group-hover:bg-blue-600/20 group-hover:text-blue-100">
                    <FontAwesomeIcon icon={faPlus} />
                  </span>
                  <span className="relative text-sm font-semibold tracking-tight">Add Task</span>
                  <span className="relative text-[10px] uppercase tracking-[0.16em] text-slate-500 group-hover:text-slate-400">
                    Quick create
                  </span>
                </button>
              </div>

              {tasks.map((task) => (
                <div className="snap-start" key={task.id}>
                  <TaskCard
                    onPlayTask={onPlayTask}
                    sessionCount={sessionCountByTaskId[task.id] ?? 0}
                    task={task}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
