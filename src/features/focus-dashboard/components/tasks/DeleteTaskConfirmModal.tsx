import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faTrashCan, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../../i18n'
import type { Task } from '../../types'

type DeleteTaskConfirmModalProps = {
  isOpen: boolean
  task: Task | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function DeleteTaskConfirmModal({ isOpen, task, isSubmitting = false, onClose, onConfirm }: DeleteTaskConfirmModalProps) {
  const { locale } = useI18n()
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !task) {
    return null
  }

  const copy =
    locale === 'es'
      ? {
          title: 'Eliminar tarea',
          close: 'Cerrar confirmacion de eliminacion',
          bodyPrefix: 'Seguro que quieres eliminar',
          bodySuffix: '?',
          note: 'Esta accion no se puede deshacer.',
          cancel: 'Cancelar',
          confirm: 'Eliminar',
          submitting: 'Eliminando...',
        }
      : {
          title: 'Delete Task',
          close: 'Close delete confirmation',
          bodyPrefix: 'Are you sure you want to delete',
          bodySuffix: '?',
          note: 'This action cannot be undone.',
          cancel: 'Cancel',
          confirm: 'Delete',
          submitting: 'Deleting...',
        }

  return (
    <div
      className="modal-overlay-animate fixed inset-0 z-[80] flex items-center justify-center bg-[#020a18]/82 px-4 backdrop-blur-[3px]"
      onClick={() => {
        if (isSubmitting) {
          return
        }
        onClose()
      }}
    >
      <div
        aria-labelledby="delete-task-modal-title"
        aria-modal="true"
        className="modal-card-animate w-[min(92vw,420px)] rounded-2xl border border-rose-500/20 bg-[#0a1429]/95 shadow-[0_28px_90px_rgba(1,8,22,0.78)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-200">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100" id="delete-task-modal-title">
              {copy.title}
            </h2>
          </div>
          <button
            aria-label={copy.close}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="px-5 py-5 text-sm text-slate-300">
          <p className="leading-relaxed">
            {copy.bodyPrefix} <span className="font-semibold text-slate-100">"{task.title}"</span>
            {copy.bodySuffix}
          </p>
          <p className="mt-2 text-xs text-slate-500">{copy.note}</p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-800/80 px-5 py-4">
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            {copy.cancel}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? <FontAwesomeIcon className="animate-spin" icon={faSpinner} /> : <FontAwesomeIcon icon={faTrashCan} />}
            {isSubmitting ? copy.submitting : copy.confirm}
          </button>
        </footer>
      </div>
    </div>
  )
}
