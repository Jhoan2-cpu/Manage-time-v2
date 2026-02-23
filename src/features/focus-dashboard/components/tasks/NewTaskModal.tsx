import { useEffect, useId, useState, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { taskColorOptions, taskIconOptions } from '../../constants/taskOptions'
import type { Task, TaskColorKey, TaskIconKey } from '../../types'
import { classNames } from '../../utils/classNames'

export type NewTaskPayload = {
  title: string
  details: string
  colorTag: TaskColorKey
  iconTag: TaskIconKey
  targetDurationMinutes: number | null
  alarmTime: string | null
}

type NewTaskModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreateTask: (payload: NewTaskPayload) => void
  editingTask?: Task | null
}

const defaultColorTag: TaskColorKey = taskColorOptions[0]?.id ?? 'blue'
const defaultIconTag: TaskIconKey = taskIconOptions[0]?.id ?? 'briefcase'

const fieldClassName =
  'w-full rounded-lg border border-slate-700/90 bg-slate-900/55 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20'

export function NewTaskModal({ isOpen, onClose, onCreateTask, editingTask = null }: NewTaskModalProps) {
  const titleId = useId()
  const targetDurationId = useId()
  const alarmTimeId = useId()

  const [title, setTitle] = useState('')
  const [iconTag, setIconTag] = useState<TaskIconKey>(defaultIconTag)
  const [colorTag, setColorTag] = useState<TaskColorKey>(defaultColorTag)
  const [targetDurationMinutesInput, setTargetDurationMinutesInput] = useState('')
  const [alarmTime, setAlarmTime] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (editingTask) {
      setTitle(editingTask.title)
      setIconTag(editingTask.iconTag)
      setColorTag(editingTask.colorTag)
      setTargetDurationMinutesInput(
        editingTask.targetDurationMinutes && editingTask.targetDurationMinutes > 0
          ? `${editingTask.targetDurationMinutes}`
          : '',
      )
      setAlarmTime(editingTask.alarmTime ?? '')
      return
    }

    setTitle('')
    setIconTag(defaultIconTag)
    setColorTag(defaultColorTag)
    setTargetDurationMinutesInput('')
    setAlarmTime('')
  }, [editingTask, isOpen])

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

  if (!isOpen) {
    return null
  }

  const isEditing = editingTask !== null
  const canSubmit = title.trim().length > 0
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    const parsedTargetDuration = Number.parseInt(targetDurationMinutesInput.trim(), 10)
    const normalizedTargetDuration =
      Number.isFinite(parsedTargetDuration) && parsedTargetDuration > 0 ? Math.min(parsedTargetDuration, 24 * 60) : null

    onCreateTask({
      title: title.trim(),
      details: '',
      colorTag,
      iconTag,
      targetDurationMinutes: normalizedTargetDuration,
      alarmTime: alarmTime.trim() ? alarmTime : null,
    })
    onClose()
  }

  return (
    <div
      className="modal-overlay-animate fixed inset-0 z-[70] flex items-center justify-center bg-[#020a18]/80 px-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        aria-labelledby="new-task-modal-title"
        aria-modal="true"
        className="modal-card-animate w-[min(92vw,500px)] rounded-2xl border border-blue-500/20 bg-[#0a1429]/95 shadow-[0_28px_90px_rgba(1,8,22,0.78)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <form onSubmit={handleSubmit}>
          <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100" id="new-task-modal-title">
              {isEditing ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              aria-label="Close modal"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
              onClick={onClose}
              type="button"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </header>

          <div className="space-y-5 px-5 py-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor={titleId}>
                Tarea
              </label>
              <input
                autoFocus
                className={fieldClassName}
                id={titleId}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Estudiar algebra"
                value={title}
              />
              <p className="mt-1 text-[11px] text-slate-500">Nombre simple de la tarea.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  htmlFor={targetDurationId}
                >
                  Timer (Optional)
                </label>
                <input
                  className={fieldClassName}
                  id={targetDurationId}
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setTargetDurationMinutesInput(event.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Minutes (e.g. 25)"
                  type="text"
                  value={targetDurationMinutesInput}
                />
                <p className="mt-1 text-[11px] text-slate-500">If set, the task can use countdown mode.</p>
              </div>

              <div>
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  htmlFor={alarmTimeId}
                >
                  Alarm (Optional)
                </label>
                <input
                  className={fieldClassName}
                  id={alarmTimeId}
                  onChange={(event) => setAlarmTime(event.target.value)}
                  type="time"
                  value={alarmTime}
                />
                <p className="mt-1 text-[11px] text-slate-500">Suggested time to start this task.</p>
              </div>
            </div>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Icon</p>
              <div className="flex flex-wrap gap-2">
                {taskIconOptions.map((option) => {
                  const isSelected = option.id === iconTag

                  return (
                    <button
                      aria-label={`Choose ${option.label} icon`}
                      className={classNames(
                        'grid h-10 w-10 place-items-center rounded-lg border text-sm transition',
                        isSelected
                          ? 'border-blue-400/80 bg-blue-500/20 text-blue-100 shadow-[0_0_0_1px_rgba(96,165,250,0.35)]'
                          : 'border-slate-700/80 bg-slate-800/70 text-slate-400 hover:border-slate-600 hover:text-slate-200',
                      )}
                      key={option.id}
                      onClick={() => setIconTag(option.id)}
                      title={option.label}
                      type="button"
                    >
                      <FontAwesomeIcon icon={option.icon} />
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Color Tag</p>
              <div className="flex items-center gap-2">
                {taskColorOptions.map((option) => {
                  const isSelected = option.id === colorTag

                  return (
                    <button
                      aria-label={`Choose ${option.label} color`}
                      className={classNames(
                        'relative h-8 w-8 rounded-full ring-1 ring-slate-700/80 transition',
                        option.swatchClassName,
                        isSelected && classNames('ring-2 ring-offset-2 ring-offset-[#0a1429]', option.selectedRingClassName),
                      )}
                      key={option.id}
                      onClick={() => setColorTag(option.id)}
                      type="button"
                    >
                      {isSelected ? (
                        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/10 text-[11px] text-white">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
