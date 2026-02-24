import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faClock, faHourglassHalf, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons'
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
  pink: '236,72,153',
  violet: '139,92,246',
}

const modalAccentBorderClassByColor: Record<TaskColorKey, string> = {
  blue: 'border-blue-500/20',
  green: 'border-emerald-500/20',
  amber: 'border-amber-500/20',
  rose: 'border-rose-500/20',
  pink: 'border-pink-500/20',
  violet: 'border-violet-500/20',
}

const modalIconSelectedClassByColor: Record<TaskColorKey, string> = {
  blue: 'border-blue-400/85 bg-blue-500/22 text-blue-100 shadow-[0_0_0_1px_rgba(96,165,250,0.28),0_10px_24px_rgba(59,130,246,0.18)]',
  green:
    'border-emerald-400/85 bg-emerald-500/22 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.22),0_10px_24px_rgba(16,185,129,0.16)]',
  amber: 'border-amber-400/85 bg-amber-500/22 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.22),0_10px_24px_rgba(245,158,11,0.16)]',
  rose: 'border-rose-400/85 bg-rose-500/22 text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.22),0_10px_24px_rgba(244,63,94,0.16)]',
  pink: 'border-pink-400/85 bg-pink-500/22 text-pink-100 shadow-[0_0_0_1px_rgba(244,114,182,0.22),0_10px_24px_rgba(236,72,153,0.16)]',
  violet:
    'border-violet-400/85 bg-violet-500/22 text-violet-100 shadow-[0_0_0_1px_rgba(167,139,250,0.22),0_10px_24px_rgba(139,92,246,0.16)]',
}

const fieldClassName =
  'w-full rounded-lg border border-slate-700/90 bg-slate-900/55 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20'
const compactTimeFieldClassName =
  'h-10 w-10 shrink-0 rounded-lg border border-slate-700/90 bg-slate-900/55 px-1 text-center text-sm font-semibold tabular-nums text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20'
const compactTimeSelectClassName =
  'h-10 w-[4rem] shrink-0 rounded-lg border border-slate-700/90 bg-slate-900/55 px-1 text-center text-xs font-semibold text-slate-100 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20'
const timeUnitFieldClassName =
  'group flex flex-col items-center justify-center px-0.5 py-0 transition'
const timeUnitLabelClassName = 'mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500'

export function NewTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  editingTask = null,
  onRequestDeleteTask,
}: NewTaskModalProps) {
  const titleId = useId()
  const targetDurationHoursId = useId()
  const alarmHourId = useId()

  const [title, setTitle] = useState('')
  const [iconTag, setIconTag] = useState<TaskIconKey>(defaultIconTag)
  const [colorTag, setColorTag] = useState<TaskColorKey>(defaultColorTag)
  const [targetDurationHoursInput, setTargetDurationHoursInput] = useState('')
  const [targetDurationMinutesInput, setTargetDurationMinutesInput] = useState('')
  const [targetDurationSecondsInput, setTargetDurationSecondsInput] = useState('')
  const [alarmHourInput, setAlarmHourInput] = useState('')
  const [alarmMinuteInput, setAlarmMinuteInput] = useState('')
  const [alarmSecondInput, setAlarmSecondInput] = useState('')
  const [alarmPeriod, setAlarmPeriod] = useState<'AM' | 'PM'>('AM')
  const [colorGlowOrigin, setColorGlowOrigin] = useState<{ xPercent: number; yPercent: number }>({
    xPercent: 22,
    yPercent: 82,
  })
  const [colorGlowPulseKey, setColorGlowPulseKey] = useState(0)
  const modalCardRef = useRef<HTMLDivElement | null>(null)
  const colorButtonRefs = useRef<Partial<Record<TaskColorKey, HTMLButtonElement | null>>>({})

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
      setTargetDurationHoursInput(targetTotalSeconds > 0 ? `${Math.floor(targetTotalSeconds / 3600)}` : '')
      setTargetDurationMinutesInput(
        targetTotalSeconds > 0 ? `${Math.floor((targetTotalSeconds % 3600) / 60)}`.padStart(2, '0') : '',
      )
      setTargetDurationSecondsInput(targetTotalSeconds > 0 ? `${targetTotalSeconds % 60}`.padStart(2, '0') : '')
      const alarmParts = parseAlarmTimeToFormParts(editingTask.alarmTime)
      setAlarmHourInput(alarmParts.hour)
      setAlarmMinuteInput(alarmParts.minute)
      setAlarmSecondInput(alarmParts.second)
      setAlarmPeriod(alarmParts.period)
      return
    }

    setTitle('')
    setIconTag(defaultIconTag)
    setColorTag(defaultColorTag)
    setTargetDurationHoursInput('')
    setTargetDurationMinutesInput('')
    setTargetDurationSecondsInput('')
    setAlarmHourInput('')
    setAlarmMinuteInput('')
    setAlarmSecondInput('')
    setAlarmPeriod('AM')
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

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const targetButton = colorButtonRefs.current[colorTag]
      if (targetButton) {
        updateColorGlowOriginFromElement(targetButton)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [colorTag, isOpen])

  if (!isOpen) {
    return null
  }

  const isEditing = editingTask !== null
  const canSubmit = title.trim().length > 0
  const modalAccentRgb = modalAccentRgbByColor[colorTag]
  const softAccentBorder = `rgba(${modalAccentRgb},0.18)`
  const softAccentGlow = `rgba(${modalAccentRgb},0.08)`
  const colorOriginLeft = `${colorGlowOrigin.xPercent}%`
  const colorOriginTop = `calc(${colorGlowOrigin.yPercent}% + 12px)`
  const reactiveGlowStyle = {
    left: colorOriginLeft,
    top: colorOriginTop,
    backgroundColor: `rgba(${modalAccentRgb},0.18)`,
    boxShadow: `0 0 80px rgba(${modalAccentRgb},0.14)`,
  } as CSSProperties
  const reactiveGlowPulseStyle = {
    left: colorOriginLeft,
    top: colorOriginTop,
    '--task-modal-color-pulse-rgb': modalAccentRgb,
  } as CSSProperties

  function updateColorGlowOriginFromElement(element: HTMLElement) {
    const modalRect = modalCardRef.current?.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    if (!modalRect || modalRect.width <= 0 || modalRect.height <= 0) {
      return
    }

    const xPercent = Math.min(100, Math.max(0, ((elementRect.left + elementRect.width / 2 - modalRect.left) / modalRect.width) * 100))
    const yPercent = Math.min(
      100,
      Math.max(0, ((elementRect.top + elementRect.height / 2 - modalRect.top) / modalRect.height) * 100),
    )
    setColorGlowOrigin({ xPercent, yPercent })
  }

  function handleColorTagSelect(nextColorTag: TaskColorKey, sourceButton: HTMLButtonElement) {
    updateColorGlowOriginFromElement(sourceButton)
    setColorTag(nextColorTag)
    setColorGlowPulseKey((value) => value + 1)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    const parsedTargetHours = Number.parseInt(targetDurationHoursInput.trim(), 10)
    const parsedTargetMinutes = Number.parseInt(targetDurationMinutesInput.trim(), 10)
    const parsedTargetSeconds = Number.parseInt(targetDurationSecondsInput.trim(), 10)
    const normalizedHours = Number.isFinite(parsedTargetHours) && parsedTargetHours >= 0 ? parsedTargetHours : 0
    const normalizedMinutes = Number.isFinite(parsedTargetMinutes) && parsedTargetMinutes >= 0 ? parsedTargetMinutes : 0
    const normalizedSeconds =
      Number.isFinite(parsedTargetSeconds) && parsedTargetSeconds >= 0 ? Math.min(parsedTargetSeconds, 59) : 0
    const totalTargetSeconds = Math.min(normalizedHours * 3600 + normalizedMinutes * 60 + normalizedSeconds, 24 * 60 * 60)
    const normalizedTargetDuration = totalTargetSeconds > 0 ? totalTargetSeconds / 60 : null
    const hasAlarmInput = [alarmHourInput, alarmMinuteInput, alarmSecondInput].some((value) => value.trim().length > 0)
    const normalizedAlarmTime = hasAlarmInput
      ? buildAlarmTime24hString({
          hourInput: alarmHourInput,
          minuteInput: alarmMinuteInput,
          secondInput: alarmSecondInput,
          period: alarmPeriod,
        })
      : null

    onCreateTask({
      title: title.trim(),
      details: '',
      colorTag,
      iconTag,
      targetDurationMinutes: normalizedTargetDuration,
      alarmTime: normalizedAlarmTime,
    })
    onClose()
  }

  return (
    <div
      className="modal-overlay-animate fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#020a18]/80 px-3 py-4 backdrop-blur-[3px] sm:items-center sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        aria-labelledby="new-task-modal-title"
        aria-modal="true"
        className={classNames(
          'modal-card-animate relative my-auto flex max-h-[calc(100svh-2rem)] w-[min(97vw,840px)] flex-col overflow-hidden rounded-2xl border bg-[#0a1429]/95 shadow-[0_28px_90px_rgba(1,8,22,0.78)] sm:max-h-[92svh]',
          modalAccentBorderClassByColor[colorTag],
        )}
        ref={modalCardRef}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="task-modal-color-origin-base absolute h-52 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-[left,top,background-color,box-shadow] duration-300 ease-out"
            style={reactiveGlowStyle}
          />
          <div
            className="task-modal-color-origin-base absolute h-36 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-[left,top,background-color] duration-300 ease-out"
            style={{
              left: colorOriginLeft,
              top: colorOriginTop,
              backgroundColor: `rgba(${modalAccentRgb},0.14)`,
            }}
          />
          <div
            key={colorGlowPulseKey}
            className="task-modal-color-origin-pulse absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={reactiveGlowPulseStyle}
          />
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

        <form className="relative z-10 flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-5">
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

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  htmlFor={targetDurationHoursId}
                >
                  Timer (Optional)
                </label>
                <div
                  className="relative overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,rgba(2,6,23,0.26),rgba(2,6,23,0.12))] p-2.5"
                  style={{
                    borderColor: softAccentBorder,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px ${softAccentGlow}`,
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full blur-2xl"
                    style={{ backgroundColor: `rgba(${modalAccentRgb},0.12)` }}
                  />
                  <div className="relative mb-2 flex items-center gap-2">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs"
                      style={{
                        borderColor: `rgba(${modalAccentRgb},0.35)`,
                        backgroundColor: `rgba(${modalAccentRgb},0.14)`,
                        color: 'rgba(241,245,249,0.95)',
                      }}
                    >
                      <FontAwesomeIcon icon={faHourglassHalf} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Countdown Time</p>
                      <p className="text-[11px] text-slate-500">Set target duration for timer mode</p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-1">
                    <div className={timeUnitFieldClassName}>
                      <input
                        className={compactTimeFieldClassName}
                        id={targetDurationHoursId}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => setTargetDurationHoursInput(sanitizeTwoDigitInput(event.target.value))}
                        placeholder="00"
                        type="text"
                        value={targetDurationHoursInput}
                      />
                      <span className={timeUnitLabelClassName}>HH</span>
                    </div>
                    <span className="pb-4 text-sm font-semibold text-slate-500">:</span>
                    <div className={timeUnitFieldClassName}>
                      <input
                        aria-label="Timer minutes"
                        className={compactTimeFieldClassName}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => setTargetDurationMinutesInput(sanitizeTwoDigitInput(event.target.value))}
                        placeholder="00"
                        type="text"
                        value={targetDurationMinutesInput}
                      />
                      <span className={timeUnitLabelClassName}>MM</span>
                    </div>
                    <span className="pb-4 text-sm font-semibold text-slate-500">:</span>
                    <div className={timeUnitFieldClassName}>
                      <input
                        aria-label="Timer seconds"
                        className={compactTimeFieldClassName}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => setTargetDurationSecondsInput(sanitizeTwoDigitInput(event.target.value))}
                        placeholder="00"
                        type="text"
                        value={targetDurationSecondsInput}
                      />
                      <span className={timeUnitLabelClassName}>SS</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">Hours, minutes and seconds for countdown mode (e.g. 00:25:30).</p>
              </div>

              <div>
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  htmlFor={alarmHourId}
                >
                  Alarm (Optional)
                </label>
                <div
                  className="relative overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,rgba(2,6,23,0.26),rgba(2,6,23,0.12))] p-2.5"
                  style={{
                    borderColor: softAccentBorder,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px ${softAccentGlow}`,
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 h-16 w-16 translate-x-3 -translate-y-3 rounded-full blur-2xl"
                    style={{ backgroundColor: `rgba(${modalAccentRgb},0.10)` }}
                  />

                  <div className="relative mb-2 flex items-center gap-2">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs"
                      style={{
                        borderColor: `rgba(${modalAccentRgb},0.35)`,
                        backgroundColor: `rgba(${modalAccentRgb},0.14)`,
                        color: 'rgba(241,245,249,0.95)',
                      }}
                    >
                      <FontAwesomeIcon icon={faClock} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Start Alarm</p>
                      <p className="text-[11px] text-slate-500">Optional reminder time</p>
                    </div>
                  </div>

                  <div className="relative flex flex-wrap items-center gap-x-1 gap-y-2 md:flex-nowrap">
                    <div className={timeUnitFieldClassName}>
                      <input
                        className={compactTimeFieldClassName}
                        id={alarmHourId}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => setAlarmHourInput(sanitizeTwoDigitInput(event.target.value))}
                        placeholder="08"
                        type="text"
                        value={alarmHourInput}
                      />
                      <span className={timeUnitLabelClassName}>HH</span>
                    </div>
                    <span className="pb-4 text-sm font-semibold text-slate-500">:</span>
                    <div className={timeUnitFieldClassName}>
                      <input
                        aria-label="Alarm minutes"
                        className={compactTimeFieldClassName}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => setAlarmMinuteInput(sanitizeTwoDigitInput(event.target.value))}
                        placeholder="00"
                        type="text"
                        value={alarmMinuteInput}
                      />
                      <span className={timeUnitLabelClassName}>MM</span>
                    </div>
                    <span className="pb-4 text-sm font-semibold text-slate-500">:</span>
                    <div className={timeUnitFieldClassName}>
                      <input
                        aria-label="Alarm seconds"
                        className={compactTimeFieldClassName}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(event) => setAlarmSecondInput(sanitizeTwoDigitInput(event.target.value))}
                        placeholder="00"
                        type="text"
                        value={alarmSecondInput}
                      />
                      <span className={timeUnitLabelClassName}>SS</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-0.5 py-0">
                      <select
                        aria-label="Alarm period"
                        className={classNames(compactTimeSelectClassName, 'w-[4.2rem]')}
                        onChange={(event) => setAlarmPeriod(event.target.value as 'AM' | 'PM')}
                        value={alarmPeriod}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <span className={timeUnitLabelClassName}>AM/PM</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">Suggested time to start this task.</p>
              </div>
            </div>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Icon</p>
              <div className="flex flex-wrap gap-2.5">
                {taskIconOptions.map((option) => {
                  const isSelected = option.id === iconTag

                  return (
                    <button
                      aria-label={`Choose ${option.label} icon`}
                      className={classNames(
                        'grid h-10 w-10 place-items-center rounded-full border text-sm transition',
                        isSelected
                          ? modalIconSelectedClassByColor[colorTag]
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
              <div className="flex items-center gap-2.5">
                {taskColorOptions.map((option) => {
                  const isSelected = option.id === colorTag

                  return (
                    <button
                      aria-label={`Choose ${option.label} color`}
                        className={classNames(
                          'relative h-8 w-8 rounded-full ring-1 ring-slate-700/80 transition',
                          option.swatchClassName,
                          isSelected && classNames('ring-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]', option.selectedRingClassName),
                        )}
                      key={option.id}
                      onClick={(event) => handleColorTagSelect(option.id, event.currentTarget)}
                      ref={(element) => {
                        colorButtonRefs.current[option.id] = element
                      }}
                      type="button"
                    >
                      {isSelected ? (
                        <span className="absolute inset-0 grid place-items-center rounded-full bg-white/10 text-[11px] text-white">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-[#081226]/90 px-6 py-4 sm:flex-nowrap sm:py-5">
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

function sanitizeTwoDigitInput(value: string) {
  return value.replace(/[^\d]/g, '').slice(0, 2)
}

function parseAlarmTimeToFormParts(alarmTime: string | null): {
  hour: string
  minute: string
  second: string
  period: 'AM' | 'PM'
} {
  if (!alarmTime) {
    return { hour: '', minute: '', second: '', period: 'AM' }
  }

  const raw = alarmTime.trim()
  const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (twelveHourMatch) {
    return {
      hour: `${Number.parseInt(twelveHourMatch[1], 10)}`.padStart(2, '0'),
      minute: twelveHourMatch[2],
      second: (twelveHourMatch[3] ?? '00').padStart(2, '0'),
      period: twelveHourMatch[4].toUpperCase() === 'PM' ? 'PM' : 'AM',
    }
  }

  const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!twentyFourHourMatch) {
    return { hour: '', minute: '', second: '', period: 'AM' }
  }

  const hours24 = Number.parseInt(twentyFourHourMatch[1], 10)
  const minutes = twentyFourHourMatch[2]
  const seconds = (twentyFourHourMatch[3] ?? '00').padStart(2, '0')
  if (!Number.isFinite(hours24)) {
    return { hour: '', minute: '', second: '', period: 'AM' }
  }

  const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return {
    hour: `${hours12}`.padStart(2, '0'),
    minute: minutes,
    second: seconds,
    period,
  }
}

function buildAlarmTime24hString({
  hourInput,
  minuteInput,
  secondInput,
  period,
}: {
  hourInput: string
  minuteInput: string
  secondInput: string
  period: 'AM' | 'PM'
}) {
  const hour12 = Number.parseInt(hourInput.trim(), 10)
  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12) {
    return null
  }

  const minuteValue = Number.parseInt(minuteInput.trim(), 10)
  const secondValue = Number.parseInt(secondInput.trim(), 10)
  const minute = Number.isFinite(minuteValue) && minuteValue >= 0 ? Math.min(minuteValue, 59) : 0
  const second = Number.isFinite(secondValue) && secondValue >= 0 ? Math.min(secondValue, 59) : 0

  let hour24 = hour12 % 12
  if (period === 'PM') {
    hour24 += 12
  }

  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}
