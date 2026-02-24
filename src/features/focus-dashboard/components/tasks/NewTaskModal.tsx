import { useEffect, useId, useState, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons'
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
  onRequestDeleteTask?: (task: Task) => void
}

const defaultColorTag: TaskColorKey = taskColorOptions[0]?.id ?? 'blue'
const defaultIconTag: TaskIconKey = taskIconOptions[0]?.id ?? 'briefcase'

const modalAccentRgbByColor: Record<TaskColorKey, string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  violet: '139,92,246',
}

const modalAccentBorderClassByColor: Record<TaskColorKey, string> = {
  blue: 'border-blue-500/20',
  green: 'border-emerald-500/20',
  amber: 'border-amber-500/20',
  rose: 'border-rose-500/20',
  violet: 'border-violet-500/20',
}

const fieldClassName =
  'w-full rounded-lg border border-slate-700/90 bg-slate-900/55 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20'

export function NewTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  editingTask = null,
  onRequestDeleteTask,
}: NewTaskModalProps) {
  const titleId = useId()
  const targetDurationId = useId()
  const alarmTimeId = useId()

  const [title, setTitle] = useState('')
  const [iconTag, setIconTag] = useState<TaskIconKey>(defaultIconTag)
  const [colorTag, setColorTag] = useState<TaskColorKey>(defaultColorTag)
  const [targetDurationMinutesInput, setTargetDurationMinutesInput] = useState('')
  const [targetDurationSecondsInput, setTargetDurationSecondsInput] = useState('')
  const [alarmTime, setAlarmTime] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (editingTask) {
      setTitle(editingTask.title)
      setIconTag(editingTask.iconTag)
      setColorTag(editingTask.colorTag)
      const targetTotalSeconds =
        editingTask.targetDurationMinutes && editingTask.targetDurationMinutes > 0
          ? Math.max(0, Math.round(editingTask.targetDurationMinutes * 60))
          : 0
      setTargetDurationMinutesInput(targetTotalSeconds > 0 ? `${Math.floor(targetTotalSeconds / 60)}` : '')
      setTargetDurationSecondsInput(targetTotalSeconds > 0 ? `${targetTotalSeconds % 60}`.padStart(2, '0') : '')
      setAlarmTime(editingTask.alarmTime ?? '')
      return
    }

    setTitle('')
    setIconTag(defaultIconTag)
    setColorTag(defaultColorTag)
    setTargetDurationMinutesInput('')
    setTargetDurationSecondsInput('')
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
  const modalAccentRgb = modalAccentRgbByColor[colorTag]
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    const parsedTargetMinutes = Number.parseInt(targetDurationMinutesInput.trim(), 10)
    const parsedTargetSeconds = Number.parseInt(targetDurationSecondsInput.trim(), 10)
    const normalizedMinutes = Number.isFinite(parsedTargetMinutes) && parsedTargetMinutes >= 0 ? parsedTargetMinutes : 0
    const normalizedSeconds = Number.isFinite(parsedTargetSeconds) && parsedTargetSeconds >= 0 ? Math.min(parsedTargetSeconds, 59) : 0
    const totalTargetSeconds = Math.min(normalizedMinutes * 60 + normalizedSeconds, 24 * 60 * 60)
    const normalizedTargetDuration = totalTargetSeconds > 0 ? totalTargetSeconds / 60 : null

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
        className={classNames(
          'modal-card-animate relative w-[min(92vw,500px)] overflow-hidden rounded-2xl border bg-[#0a1429]/95 shadow-[0_28px_90px_rgba(1,8,22,0.78)]',
          modalAccentBorderClassByColor[colorTag],
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(82% 66% at 18% 78%, rgba(${modalAccentRgb},0.22), transparent 72%), radial-gradient(58% 44% at 88% 8%, rgba(${modalAccentRgb},0.07), transparent 78%)`,
            }}
          />
          <div
            className="absolute -bottom-4 left-8 h-28 w-56 rounded-full blur-3xl"
            style={{ backgroundColor: `rgba(${modalAccentRgb},0.18)` }}
          />
        </div>

        <form className="relative z-10" onSubmit={handleSubmit}>
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
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <input
                      className={fieldClassName}
                      id={targetDurationId}
                      inputMode="numeric"
                      onChange={(event) => setTargetDurationMinutesInput(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                      placeholder="Min"
                      type="text"
                      value={targetDurationMinutesInput}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">:</span>
                  <div>
                    <input
                      aria-label="Timer seconds"
                      className={fieldClassName}
                      inputMode="numeric"
                      onChange={(event) => setTargetDurationSecondsInput(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                      placeholder="Sec"
                      type="text"
                      value={targetDurationSecondsInput}
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Minutes and seconds for countdown mode (e.g. 25:30).</p>
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

          <footer className="flex items-center justify-between gap-2 border-t border-slate-800/80 px-5 py-4">
            <div>
              {isEditing && editingTask && onRequestDeleteTask ? (
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.25)] transition hover:bg-rose-500/15"
                  onClick={() => {
                    onClose()
                    onRequestDeleteTask(editingTask)
                  }}
                  type="button"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                  <span>Eliminar</span>
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}
