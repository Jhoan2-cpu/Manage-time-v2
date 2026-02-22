import { useCallback, useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { Task } from '../../types'
import { classNames } from '../../utils/classNames'
import { TaskCard } from './TaskCard'

type TaskCarouselProps = {
  tasks: Task[]
  onAddTask: () => void
}

export function TaskCarousel({ tasks, onAddTask }: TaskCarouselProps) {
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
      <div className="mb-2 flex items-center justify-end gap-2 pr-1">
        <button
          aria-label="Scroll tasks left"
          className={classNames(
            'grid h-8 w-8 place-items-center rounded-md border text-sm transition',
            canScrollLeft
              ? 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-blue-500/60 hover:text-blue-300'
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
            'grid h-8 w-8 place-items-center rounded-md border text-sm transition',
            canScrollRight
              ? 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-blue-500/60 hover:text-blue-300'
              : 'cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600',
          )}
          disabled={!canScrollRight}
          onClick={() => handleScrollBy('right')}
          type="button"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className="task-carousel-scroll overflow-x-auto pb-2" ref={scrollerRef}>
        <div className="flex min-w-max gap-4 pr-2">
          <button
            className="group flex h-36 w-64 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-600 bg-slate-900/30 text-slate-400 transition hover:border-blue-500/60 hover:bg-slate-800/70 hover:text-blue-300"
            onClick={onAddTask}
            type="button"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-700/80 transition group-hover:bg-blue-600 group-hover:text-white">
              <FontAwesomeIcon icon={faPlus} />
            </span>
            <span className="text-sm font-medium">Add Task</span>
          </button>

          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  )
}
