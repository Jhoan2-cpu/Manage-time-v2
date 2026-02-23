import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCirclePause, faPlay, faRepeat, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { Task } from '../../types'

type SwitchTaskConfirmModalProps = {
  isOpen: boolean
  currentTask: Task | null
  nextTask: Task | null
  onClose: () => void
  onConfirm: () => void
}

export function SwitchTaskConfirmModal({
  isOpen,
  currentTask,
  nextTask,
  onClose,
  onConfirm,
}: SwitchTaskConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !currentTask || !nextTask) {
    return null
  }

  return (
    <div
      className="modal-overlay-animate fixed inset-0 z-[82] flex items-center justify-center bg-[#020a18]/82 px-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        aria-labelledby="switch-task-modal-title"
        aria-modal="true"
        className="modal-card-animate w-[min(92vw,480px)] rounded-2xl border border-blue-500/18 bg-[#0a1429]/95 shadow-[0_28px_90px_rgba(1,8,22,0.78)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
              <FontAwesomeIcon icon={faRepeat} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100" id="switch-task-modal-title">
              Switch Active Task
            </h2>
          </div>
          <button
            aria-label="Close switch task confirmation"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            onClick={onClose}
            type="button"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="space-y-3 px-5 py-5 text-sm text-slate-300">
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-100">"{currentTask.title}"</span> is currently running.
          </p>
          <p className="leading-relaxed text-slate-400">
            Switching to <span className="font-semibold text-slate-100">"{nextTask.title}"</span> will pause the current
            task and start a new timer count for the selected one.
          </p>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2 text-slate-300">
                <FontAwesomeIcon className="text-amber-300" icon={faCirclePause} />
                <span className="truncate">Pause current</span>
              </div>
              <span className="truncate font-medium text-slate-100">{currentTask.title}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2 text-slate-300">
                <FontAwesomeIcon className="text-emerald-300" icon={faPlay} />
                <span className="truncate">Start new count</span>
              </div>
              <span className="truncate font-medium text-slate-100">{nextTask.title}</span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-800/80 px-5 py-4">
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            onClick={onConfirm}
            type="button"
          >
            <FontAwesomeIcon icon={faRepeat} />
            Switch Task
          </button>
        </footer>
      </div>
    </div>
  )
}

