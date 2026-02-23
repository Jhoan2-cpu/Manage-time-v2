type HistoryStatCardProps = {
  label: string
  value: string
  valueClassName?: string
}

export function HistoryStatCard({ label, value, valueClassName }: HistoryStatCardProps) {
  return (
    <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 truncate font-mono text-base font-semibold text-slate-100 ${valueClassName ?? ''}`}>{value}</p>
    </div>
  )
}
