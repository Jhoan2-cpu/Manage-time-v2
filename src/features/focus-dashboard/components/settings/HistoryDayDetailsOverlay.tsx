import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartPie, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import { formatMinutesCompact } from '../../utils/time'
import { HistoryStatCard } from './HistoryStatCard'
import { HistoryTimeByTaskList } from './HistoryTimeByTaskList'
import {
  UNTRACKED_TIME_LABEL,
  buildPieChartBackground,
  formatIsoDateLong,
  formatIsoDateShort,
  type DayHistoryStats,
  type HistoryDaySummary,
} from './historyUtils'

type HistoryDayDetailsOverlayProps = {
  daySummary: HistoryDaySummary
  dayStats: DayHistoryStats
  onBack: () => void
}

export function HistoryDayDetailsOverlay({ daySummary, dayStats, onBack }: HistoryDayDetailsOverlayProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-[110] bg-[#040a16]/92 backdrop-blur-sm">
      <div className="h-full px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col rounded-2xl bg-[linear-gradient(180deg,rgba(8,16,34,0.98),rgba(5,12,25,0.99))] p-4 shadow-[0_24px_70px_rgba(1,8,22,0.45),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900/50 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] transition hover:bg-slate-800/75 hover:text-slate-100"
                onClick={onBack}
                type="button"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
                <span>Back</span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Day Details</p>
                <p className="text-sm font-medium text-slate-200">{formatIsoDateLong(daySummary.dateIso)}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {daySummary.sessionCount} sessions - {formatMinutesCompact(daySummary.totalMinutes).toUpperCase()} tracked
            </div>
          </div>

          <div className="app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="rounded-2xl bg-slate-950/30 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <FontAwesomeIcon icon={faChartPie} />
                      Daily Distribution
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Tracked and {UNTRACKED_TIME_LABEL.toLowerCase()} for this day (24h total).
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative h-52 w-52 sm:h-60 sm:w-60">
                      <div
                        className="absolute inset-0 rounded-full shadow-[0_0_0_1px_rgba(148,163,184,0.06),0_16px_45px_rgba(2,8,20,0.35)]"
                        style={{ background: buildPieChartBackground(dayStats) }}
                      />
                      <div className="absolute inset-[18%] rounded-full bg-[#071122] shadow-[inset_0_1px_0_rgba(148,163,184,0.05),inset_0_-14px_24px_rgba(0,0,0,0.35)]" />
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tracked</p>
                          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">
                            {formatMinutesCompact(dayStats.trackedMinutes).toUpperCase()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{dayStats.totalSessions} sessions</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid w-full grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tracked Time</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                          {formatMinutesCompact(dayStats.trackedMinutes).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-slate-400">{dayStats.trackedPercentage.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{UNTRACKED_TIME_LABEL}</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                          {formatMinutesCompact(dayStats.untrackedMinutes).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-slate-400">{dayStats.untrackedPercentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HistoryStatCard label="Tracked Time" value={formatMinutesCompact(dayStats.trackedMinutes).toUpperCase()} />
                    <HistoryStatCard label={UNTRACKED_TIME_LABEL} value={formatMinutesCompact(dayStats.untrackedMinutes).toUpperCase()} />
                    <HistoryStatCard label="Sessions" value={`${dayStats.totalSessions}`} />
                    <HistoryStatCard label="Top Task" value={dayStats.topTask ? dayStats.topTask.title : 'No data'} valueClassName="text-sm" />
                  </div>

                  <HistoryTimeByTaskList slices={dayStats.slices} emptyLabel="No data for this day." />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950/20 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.26)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Daily Log</p>
                  <p className="text-xs text-slate-500">
                    {daySummary.rows.length} records for {formatIsoDateShort(daySummary.dateIso)}
                  </p>
                </div>

                <div className="space-y-2">
                  {daySummary.rows.map((row) => {
                    const taskColor = row.taskColorTag ? taskColorMap[row.taskColorTag] : null
                    const taskIcon = row.taskIconTag ? taskIconMap[row.taskIconTag] : null
                    return (
                      <div
                        className="grid gap-2 rounded-xl bg-slate-900/25 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.22)] sm:grid-cols-[90px_110px_minmax(0,1fr)] sm:items-center"
                        key={`overlay-${row.id}`}
                      >
                        <span className="font-mono text-sm text-slate-300">{row.start}</span>
                        <span className="inline-flex w-fit items-center rounded-md bg-slate-900/55 px-2 py-1 font-mono text-xs text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
                          {row.duration}
                        </span>
                        <div className="flex min-w-0 items-center gap-2">
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
                            <p className="truncate text-sm font-medium text-slate-100">{row.taskTitle}</p>
                            <p className="truncate text-xs text-slate-500">{row.activityLabel}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
