import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft, faGear } from '@fortawesome/free-solid-svg-icons'

type FocusHeaderProps = {
  timeLabel: string
  timeZoneName: string
  utcOffsetLabel: string
  onOpenSettings?: () => void
}

export function FocusHeader({
  timeLabel,
  timeZoneName,
  utcOffsetLabel,
  onOpenSettings,
}: FocusHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#071125]/95 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/20">
          <FontAwesomeIcon icon={faClockRotateLeft} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">FocusFlow</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right leading-tight md:block">
          <p className="tabular-nums text-sm font-semibold text-slate-200">{timeLabel}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {timeZoneName} ({utcOffsetLabel})
          </p>
        </div>

        <div className="hidden h-8 w-px bg-slate-800 md:block" />

        <button
          aria-label="Open settings"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          onClick={onOpenSettings}
          type="button"
        >
          <FontAwesomeIcon icon={faGear} />
        </button>
      </div>
    </header>
  )
}
