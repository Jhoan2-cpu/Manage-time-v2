import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartPie, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { DashboardStats } from '../../types'
import { formatMinutesCompact } from '../../utils/time'
import { HistoryStatCard } from './HistoryStatCard'
import { HistoryTimeByTaskList } from './HistoryTimeByTaskList'
import {
  UNTRACKED_TIME_LABEL,
  buildPieChartBackground,
  type DayHistoryStats,
} from './historyUtils'

type HistoryOverviewPanelProps = {
  currentDayLabel: string
  history: DayHistoryStats
  dashboardStats: DashboardStats
  dailyLogSessionsCount: number
}

export function HistoryOverviewPanel({
  currentDayLabel,
  history,
  dashboardStats,
  dailyLogSessionsCount,
}: HistoryOverviewPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="rounded-2xl bg-slate-950/30 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            Daily Log Distribution
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Current day (in progress): <span className="font-medium text-slate-300">{currentDayLabel}</span>
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative h-52 w-52 sm:h-60 sm:w-60">
            <div
              className="absolute inset-0 rounded-full shadow-[0_0_0_1px_rgba(148,163,184,0.06),0_16px_45px_rgba(2,8,20,0.35)]"
              style={{ background: buildPieChartBackground(history) }}
            />
            <div className="absolute inset-[18%] rounded-full bg-[#071122] shadow-[inset_0_1px_0_rgba(148,163,184,0.05),inset_0_-14px_24px_rgba(0,0,0,0.35)]" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Today</p>
                <p className="mt-1 font-mono text-xl font-semibold text-slate-100">
                  {formatMinutesCompact(history.trackedMinutes).toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-slate-500">{history.totalSessions} sessions</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-900/30 px-3 py-2 text-left shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tracked Time</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                {formatMinutesCompact(history.trackedMinutes).toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-400">{history.trackedPercentage.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-slate-900/30 px-3 py-2 text-left shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{UNTRACKED_TIME_LABEL}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                {formatMinutesCompact(history.untrackedMinutes).toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-400">{history.untrackedPercentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HistoryStatCard label="Total Tracked" value={dashboardStats.totalTracked} />
          <HistoryStatCard label="Daily Log Sessions" value={`${dailyLogSessionsCount}`} />
          <HistoryStatCard label="Avg Session" value={formatMinutesCompact(history.averageSessionMinutes).toUpperCase()} />
          <HistoryStatCard label="Top Task" value={history.topTask ? history.topTask.title : 'No data'} valueClassName="text-sm" />
        </div>

        <HistoryTimeByTaskList slices={history.slices} />
      </div>
    </div>
  )
}
