import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay } from '@fortawesome/free-solid-svg-icons'

type TimerPanelProps = {
  timeLabel: string
  progress: number
  onStartFocus: () => void
}

export function TimerPanel({ timeLabel, progress, onStartFocus }: TimerPanelProps) {
  const radius = 45
  const boundedProgress = Math.max(0, Math.min(100, progress))
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - boundedProgress / 100)

  return (
    <>
      <div className="mb-10 flex justify-center">
        <div className="relative h-[320px] w-[320px] sm:h-[380px] sm:w-[380px]">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <circle
              className="stroke-slate-800/90"
              cx="50"
              cy="50"
              fill="transparent"
              r={radius}
              strokeWidth="2.25"
            />
            <circle
              className="progress-ring__circle stroke-blue-500"
              cx="50"
              cy="50"
              fill="transparent"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="2.25"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="select-none font-mono text-[80px] font-light leading-none tracking-tight text-slate-100 sm:text-[96px]">
              {timeLabel}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="h-2 w-2 rounded-full bg-blue-500/45" />
              <span className="h-2 w-2 rounded-full bg-blue-500/45" />
              <span className="h-2 w-2 rounded-full bg-blue-500/45" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex justify-center">
        <button
          className="inline-flex h-14 items-center gap-2 rounded-full bg-blue-600 px-12 text-lg font-semibold text-white shadow-lg shadow-blue-900/35 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/25 active:translate-y-0"
          onClick={onStartFocus}
          type="button"
        >
          <FontAwesomeIcon icon={faPlay} />
          <span>Start Focus</span>
        </button>
      </div>
    </>
  )
}
