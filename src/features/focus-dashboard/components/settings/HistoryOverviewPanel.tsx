import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartPie, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../../i18n'
import type { DashboardStats } from '../../types'
import { formatSecondsCompact, parseDurationLabelToSeconds } from '../../utils/time'
import { HistoryStatCard } from './HistoryStatCard'
import { HistoryTimeByTaskList } from './HistoryTimeByTaskList'
import {
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
  const { locale } = useI18n()
  const copy =
    locale === 'es'
      ? {
          distributionTitle: 'Distribucion del registro diario',
          currentDayInProgress: 'Dia actual (en progreso):',
          today: 'Hoy',
          sessions: 'sesiones',
          trackedTime: 'Tiempo registrado',
          untrackedTime: 'Tiempo no registrado',
          totalTracked: 'Total registrado',
          dailyLogSessions: 'Sesiones del registro diario',
          avgSession: 'Promedio por sesion',
          topTask: 'Tarea principal',
          noData: 'Sin datos',
        }
      : {
          distributionTitle: 'Daily Log Distribution',
          currentDayInProgress: 'Current day (in progress):',
          today: 'Today',
          sessions: 'sessions',
          trackedTime: 'Tracked Time',
          untrackedTime: 'Untracked Time',
          totalTracked: 'Total Tracked',
          dailyLogSessions: 'Daily Log Sessions',
          avgSession: 'Avg Session',
          topTask: 'Top Task',
          noData: 'No data',
        }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="rounded-2xl bg-slate-950/30 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            {copy.distributionTitle}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {copy.currentDayInProgress} <span className="font-medium text-slate-300">{currentDayLabel}</span>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.today}</p>
                <p className="mt-1 font-mono text-xl font-semibold text-slate-100">
                  {formatSecondsCompact(history.trackedSeconds).toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-slate-500">{history.totalSessions} {copy.sessions}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-900/30 px-3 py-2 text-left shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.trackedTime}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                {formatSecondsCompact(history.trackedSeconds).toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-400">{history.trackedPercentage.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-slate-900/30 px-3 py-2 text-left shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.untrackedTime}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                {formatSecondsCompact(history.untrackedSeconds).toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-400">{history.untrackedPercentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HistoryStatCard
            label={copy.totalTracked}
            value={formatSecondsCompact(parseDurationLabelToSeconds(dashboardStats.totalTracked)).toUpperCase()}
          />
          <HistoryStatCard label={copy.dailyLogSessions} value={`${dailyLogSessionsCount}`} />
          <HistoryStatCard label={copy.avgSession} value={formatSecondsCompact(history.averageSessionSeconds).toUpperCase()} />
          <HistoryStatCard label={copy.topTask} value={history.topTask ? history.topTask.title : copy.noData} valueClassName="text-sm" />
        </div>

        <HistoryTimeByTaskList slices={history.slices} />
      </div>
    </div>
  )
}
