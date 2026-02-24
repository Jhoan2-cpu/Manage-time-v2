import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import { formatSecondsCompact } from '../../utils/time'
import { chartColorHexByTag, type HistorySlice } from './historyUtils'

type HistoryTimeByTaskListProps = {
  slices: HistorySlice[]
  emptyLabel?: string
  headerHint?: string
}

export function HistoryTimeByTaskList({
  slices,
  emptyLabel = 'No Daily Log data available yet.',
  headerHint = 'Icons + accumulated time + % of 24h day',
}: HistoryTimeByTaskListProps) {
  return (
    <div className="rounded-2xl bg-slate-950/25 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Time by Task</p>
        <p className="text-xs text-slate-500">{headerHint}</p>
      </div>

      <div className="space-y-2">
        {slices.length > 0 ? (
          slices.map((slice) => {
            const taskColor = slice.colorTag ? taskColorMap[slice.colorTag] : null
            const taskIcon = slice.iconTag ? taskIconMap[slice.iconTag] : null

            return (
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.22)]"
                key={slice.key}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.colorTag ? chartColorHexByTag[slice.colorTag] : '#64748b' }}
                  />
                  {taskIcon ? (
                    <span
                      className={
                        taskColor
                          ? `grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[10px] ${taskColor.iconShellClassName}`
                          : 'grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-800 text-[10px] text-slate-300'
                      }
                    >
                      <FontAwesomeIcon icon={taskIcon.icon} />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{slice.title}</p>
                    <p className="text-[11px] text-slate-500">{slice.sessionCount} sessions</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-slate-200">
                    {formatSecondsCompact(slice.seconds).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-400">{slice.percentage.toFixed(1)}% of day</p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl bg-slate-900/25 px-3 py-4 text-sm text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.2)]">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  )
}
