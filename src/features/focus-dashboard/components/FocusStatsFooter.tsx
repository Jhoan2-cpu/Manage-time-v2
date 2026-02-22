type FocusStatsFooterProps = {
  sessions: number
  focusTime: string
}

export function FocusStatsFooter({ sessions, focusTime }: FocusStatsFooterProps) {
  return (
    <footer className="mt-8 flex justify-center gap-8 text-xs text-slate-500">
      <div className="text-center">
        <p className="text-xl font-bold text-slate-200">{sessions}</p>
        <p>Sessions</p>
      </div>
      <div className="w-px bg-slate-800" />
      <div className="text-center">
        <p className="text-xl font-bold text-slate-200">{focusTime}</p>
        <p>Focus Time</p>
      </div>
    </footer>
  )
}
