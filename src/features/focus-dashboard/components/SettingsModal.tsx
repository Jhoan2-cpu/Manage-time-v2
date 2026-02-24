import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
  faChartPie,
  faClockRotateLeft,
  faFilter,
  faGear,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import { taskColorMap, taskIconMap } from '../constants/taskOptions'
import type { DashboardStats, LogEntry, Task } from '../types'
import { formatSecondsCompact, parseDurationLabelToMinutes, parseDurationLabelToSeconds } from '../utils/time'
import { HistoryDayDetailsOverlay } from './settings/HistoryDayDetailsOverlay'
import { HistoryOverviewPanel } from './settings/HistoryOverviewPanel'
import { SettingsPreferencesPanel } from './settings/SettingsPreferencesPanel'
import {
  DAY_TOTAL_SECONDS,
  buildDayHistoryStatsFromRows,
  formatIsoDateLong,
  formatIsoDateShort,
  startOfDayFromIso,
  toIsoDateString,
  type HistoryDaySummary,
  type HistoryRecordRow,
} from './settings/historyUtils'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  entries: LogEntry[]
  historyEntries: LogEntry[]
  dashboardStats: DashboardStats
  uiInteractionSfxEnabled: boolean
  backgroundMusicVolume: number
  requireTaskSwitchConfirmation: boolean
  onToggleUiInteractionSfx: (nextValue: boolean) => void
  onBackgroundMusicVolumeChange: (nextValue: number) => void
  onToggleTaskSwitchConfirmation: (nextValue: boolean) => void
  autoDetectTimeZone: boolean
  selectedTimeZone: string
  effectiveTimeZone: string
  timeZoneOptions: string[]
  onToggleAutoDetectTimeZone: (nextValue: boolean) => void
  onTimeZoneChange: (nextValue: string) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  tasks,
  entries,
  historyEntries,
  dashboardStats,
  uiInteractionSfxEnabled,
  backgroundMusicVolume,
  requireTaskSwitchConfirmation,
  onToggleUiInteractionSfx,
  onBackgroundMusicVolumeChange,
  onToggleTaskSwitchConfirmation,
  autoDetectTimeZone,
  selectedTimeZone,
  effectiveTimeZone,
  timeZoneOptions,
  onToggleAutoDetectTimeZone,
  onTimeZoneChange,
}: SettingsModalProps) {
  const { locale } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'last7' | 'last30'>('all')
  const [historyPage, setHistoryPage] = useState(1)
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string | null>(null)

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

  const currentDayIsoDate = useMemo(
    () => entries[0]?.date ?? toIsoDateString(new Date(), effectiveTimeZone),
    [effectiveTimeZone, entries],
  )
  const currentDayLabel = useMemo(() => formatIsoDateLong(currentDayIsoDate), [currentDayIsoDate, locale])
  const copy =
    locale === 'es'
      ? {
          settingsAndHistory: 'Configuracion e Historial',
          subtitle: 'Preferencias de Velor e insights del registro diario',
          closeSettings: 'Cerrar configuracion',
          close: 'Cerrar',
          history: 'Historial',
          allDaysLogRecords: 'Registros del registro diario de todos los dias',
          allDaysSummary: 'Resumen por dia (vista 24h). Abre un dia para inspeccionar las sesiones detalladas.',
          matchingDays: 'dias coincidentes',
          searchPlaceholder: 'Buscar por fecha o tarea...',
          allTasks: 'Todas las tareas',
          allDates: 'Todas las fechas',
          today: 'Hoy',
          last7Days: 'Ultimos 7 dias',
          last30Days: 'Ultimos 30 dias',
          date: 'Fecha',
          activities: 'Actividades',
          trackedTime: 'Tiempo registrado',
          details: 'Detalles',
          sessions: 'sesiones',
          noTaskIcons: 'Sin iconos de tarea',
          taskTypes: 'tipos de tarea',
          daySuffix: '% dia',
          noRecordsMatch: 'No hay registros que coincidan con los filtros actuales.',
          showing: 'Mostrando',
          of: 'de',
          days: 'dias',
          prev: 'Anterior',
          next: 'Siguiente',
          page: 'Pagina',
          otherActivity: 'Otra actividad',
        }
      : {
          settingsAndHistory: 'Settings & History',
          subtitle: 'Velor preferences and Daily Log insights',
          closeSettings: 'Close settings',
          close: 'Close',
          history: 'History',
          allDaysLogRecords: 'All Days Log Records',
          allDaysSummary: 'Summary by day (24h view). Open a day to inspect the detailed sessions performed.',
          matchingDays: 'matching days',
          searchPlaceholder: 'Search by date or task...',
          allTasks: 'All tasks',
          allDates: 'All dates',
          today: 'Today',
          last7Days: 'Last 7 days',
          last30Days: 'Last 30 days',
          date: 'Date',
          activities: 'Activities',
          trackedTime: 'Tracked Time',
          details: 'Details',
          sessions: 'sessions',
          noTaskIcons: 'No task icons',
          taskTypes: 'task types',
          daySuffix: '% day',
          noRecordsMatch: 'No records match the current filters.',
          showing: 'Showing',
          of: 'of',
          days: 'days',
          prev: 'Prev',
          next: 'Next',
          page: 'Page',
          otherActivity: 'Other activity',
        }
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])

  const currentDayRows = useMemo<HistoryRecordRow[]>(
    () =>
      entries.map((entry) => {
        const task = entry.taskId ? taskMap.get(entry.taskId) : undefined
        return {
          id: entry.id,
          dateIso: entry.date ?? currentDayIsoDate,
          start: entry.start,
          duration: entry.duration,
          seconds: parseDurationLabelToSeconds(entry.duration),
          minutes: parseDurationLabelToMinutes(entry.duration),
          taskId: task?.id,
          taskTitle: task?.title ?? entry.activity ?? copy.otherActivity,
          taskColorTag: task?.colorTag,
          taskIconTag: task?.iconTag,
          activityLabel: entry.activity ?? task?.title ?? copy.otherActivity,
        }
      }),
    [copy.otherActivity, currentDayIsoDate, entries, taskMap],
  )

  const history = useMemo(() => buildDayHistoryStatsFromRows(currentDayRows), [currentDayRows])

  const historyRows = useMemo<HistoryRecordRow[]>(() => {
    const taskMap = new Map(tasks.map((task) => [task.id, task]))

    return [...historyEntries]
      .map((entry) => {
        const task = entry.taskId ? taskMap.get(entry.taskId) : undefined
        const dateIso = entry.date ?? currentDayIsoDate
        return {
          id: entry.id,
          dateIso,
          start: entry.start,
          duration: entry.duration,
          seconds: parseDurationLabelToSeconds(entry.duration),
          minutes: parseDurationLabelToMinutes(entry.duration),
          taskId: task?.id,
          taskTitle: task?.title ?? entry.activity ?? copy.otherActivity,
          taskColorTag: task?.colorTag,
          taskIconTag: task?.iconTag,
          activityLabel: entry.activity ?? task?.title ?? copy.otherActivity,
        }
      })
      .sort((a, b) => {
        if (a.dateIso !== b.dateIso) {
          return a.dateIso < b.dateIso ? 1 : -1
        }
        return a.id < b.id ? 1 : -1
      })
  }, [copy.otherActivity, currentDayIsoDate, historyEntries, tasks])

  const historyDaySummaries = useMemo<HistoryDaySummary[]>(() => {
    const byDate = new Map<string, HistoryDaySummary>()

    for (const row of historyRows) {
      const current = byDate.get(row.dateIso)

      if (current) {
        current.rows.push(row)
        current.totalSeconds += row.seconds
        current.totalMinutes += row.minutes
        current.sessionCount += 1
        if (row.taskId && !current.taskIds.includes(row.taskId)) {
          current.taskIds.push(row.taskId)
        }
        if (row.taskIconTag && !current.iconTags.includes(row.taskIconTag)) {
          current.iconTags.push(row.taskIconTag)
        }
        current.searchText = `${current.searchText} ${row.taskTitle} ${row.activityLabel} ${row.start} ${row.duration}`.toLowerCase()
        continue
      }

      byDate.set(row.dateIso, {
        dateIso: row.dateIso,
        rows: [row],
        totalSeconds: row.seconds,
        totalMinutes: row.minutes,
        sessionCount: 1,
        taskIds: row.taskId ? [row.taskId] : [],
        iconTags: row.taskIconTag ? [row.taskIconTag] : [],
        searchText: `${row.dateIso} ${formatIsoDateShort(row.dateIso)} ${formatIsoDateLong(row.dateIso)} ${row.taskTitle} ${row.activityLabel} ${row.start} ${row.duration}`.toLowerCase(),
      })
    }

    return Array.from(byDate.values())
      .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1))
      .map((day) => ({
        ...day,
        rows: [...day.rows].sort((a, b) => (a.id < b.id ? 1 : -1)),
      }))
  }, [historyRows])

  const filteredHistoryDays = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const currentDay = startOfDayFromIso(currentDayIsoDate)

    return historyDaySummaries.filter((day) => {
      if (selectedTaskFilter !== 'all' && !day.taskIds.includes(selectedTaskFilter)) {
        return false
      }

      if (dateRangeFilter !== 'all') {
        const dayDate = startOfDayFromIso(day.dateIso)
        const dayDiff = Math.floor((currentDay.getTime() - dayDate.getTime()) / 86_400_000)

        if (dateRangeFilter === 'today' && day.dateIso !== currentDayIsoDate) {
          return false
        }
        if (dateRangeFilter === 'last7' && (dayDiff < 0 || dayDiff > 6)) {
          return false
        }
        if (dateRangeFilter === 'last30' && (dayDiff < 0 || dayDiff > 29)) {
          return false
        }
      }

      if (!normalizedSearch) {
        return true
      }

      return day.searchText.includes(normalizedSearch)
    })
  }, [currentDayIsoDate, dateRangeFilter, historyDaySummaries, searchQuery, selectedTaskFilter])

  useEffect(() => {
    setHistoryPage(1)
  }, [searchQuery, selectedTaskFilter, dateRangeFilter])

  const historyPagination = useMemo(() => {
    const pageSize = 6
    const totalItems = filteredHistoryDays.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const currentPage = Math.min(historyPage, totalPages)
    const startIndex = (currentPage - 1) * pageSize
    const pageRows = filteredHistoryDays.slice(startIndex, startIndex + pageSize)

    return {
      pageSize,
      totalItems,
      totalPages,
      currentPage,
      startIndex,
      endIndex: pageRows.length > 0 ? startIndex + pageRows.length : 0,
      pageRows,
    }
  }, [filteredHistoryDays, historyPage])

  useEffect(() => {
    if (historyPage > historyPagination.totalPages) {
      setHistoryPage(historyPagination.totalPages)
    }
  }, [historyPage, historyPagination.totalPages])

  useEffect(() => {
    if (!selectedHistoryDay) {
      return
    }

    const existsInFiltered = filteredHistoryDays.some((day) => day.dateIso === selectedHistoryDay)
    if (!existsInFiltered) {
      setSelectedHistoryDay(null)
    }
  }, [filteredHistoryDays, selectedHistoryDay])

  const selectedHistoryDaySummary = useMemo(
    () => (selectedHistoryDay ? historyDaySummaries.find((day) => day.dateIso === selectedHistoryDay) ?? null : null),
    [historyDaySummaries, selectedHistoryDay],
  )

  const selectedHistoryDayStats = useMemo(
    () => buildDayHistoryStatsFromRows(selectedHistoryDaySummary?.rows ?? []),
    [selectedHistoryDaySummary],
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="settings-history-overlay-animate fixed inset-0 z-[95] overflow-hidden bg-[#030915]/96 backdrop-blur-sm">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="settings-history-glow-animate absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="settings-history-glow-animate absolute right-[10%] top-[14%] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl [animation-delay:70ms]" />
        <div className="settings-history-glow-animate absolute left-1/3 bottom-[8%] h-96 w-96 rounded-full bg-cyan-400/8 blur-[80px] [animation-delay:120ms]" />
      </div>

      <div className="settings-history-shell-animate relative flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/15 text-blue-200 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]">
              <FontAwesomeIcon icon={faGear} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
                {copy.settingsAndHistory}
              </h2>
              <p className="truncate text-xs text-slate-500">{copy.subtitle}</p>
            </div>
          </div>

          <button
            aria-label={copy.closeSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.45)] transition hover:bg-slate-800/80 hover:text-slate-100"
            onClick={onClose}
            type="button"
          >
            <FontAwesomeIcon icon={faXmark} />
            <span className="hidden sm:inline">{copy.close}</span>
          </button>
        </header>

        <div className="app-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <SettingsPreferencesPanel
              autoDetectTimeZone={autoDetectTimeZone}
              backgroundMusicVolume={backgroundMusicVolume}
              effectiveTimeZone={effectiveTimeZone}
              onBackgroundMusicVolumeChange={onBackgroundMusicVolumeChange}
              onTimeZoneChange={onTimeZoneChange}
              onToggleAutoDetectTimeZone={onToggleAutoDetectTimeZone}
              onToggleTaskSwitchConfirmation={onToggleTaskSwitchConfirmation}
              onToggleUiInteractionSfx={onToggleUiInteractionSfx}
              requireTaskSwitchConfirmation={requireTaskSwitchConfirmation}
              selectedTimeZone={selectedTimeZone}
              timeZoneOptions={timeZoneOptions}
              uiInteractionSfxEnabled={uiInteractionSfxEnabled}
            />

            <section className="relative rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_44%),linear-gradient(180deg,rgba(8,16,34,0.93),rgba(5,12,25,0.96))] p-4 shadow-[0_20px_55px_rgba(2,8,20,0.32),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-5">
              <div className="mb-5 flex items-center gap-2">
                <FontAwesomeIcon className="text-slate-400" icon={faChartPie} />
                <h3 className="text-base font-semibold text-slate-100">{copy.history}</h3>
              </div>

              <HistoryOverviewPanel
                currentDayLabel={currentDayLabel}
                dailyLogSessionsCount={entries.length}
                dashboardStats={dashboardStats}
                history={history}
              />

              <div className="mt-4 rounded-2xl bg-slate-950/20 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.26)]">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.allDaysLogRecords}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {copy.allDaysSummary}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {historyPagination.totalItems} {copy.matchingDays}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_180px]">
                  <label className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </span>
                    <input
                      className="w-full rounded-xl bg-slate-900/35 py-2 pl-9 pr-3 text-sm text-slate-100 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] outline-none transition placeholder:text-slate-500 focus:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.45)]"
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      value={searchQuery}
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
                    <FontAwesomeIcon className="text-slate-500" icon={faFilter} />
                    <select
                      className="w-full bg-transparent text-sm text-slate-200 outline-none"
                      onChange={(event) => setSelectedTaskFilter(event.target.value)}
                      value={selectedTaskFilter}
                    >
                      <option className="bg-slate-900" value="all">
                        {copy.allTasks}
                      </option>
                      {tasks.map((task) => (
                        <option className="bg-slate-900" key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
                    <FontAwesomeIcon className="text-slate-500" icon={faClockRotateLeft} />
                    <select
                      className="w-full bg-transparent text-sm text-slate-200 outline-none"
                      onChange={(event) => setDateRangeFilter(event.target.value as 'all' | 'today' | 'last7' | 'last30')}
                      value={dateRangeFilter}
                    >
                      <option className="bg-slate-900" value="all">
                        {copy.allDates}
                      </option>
                      <option className="bg-slate-900" value="today">
                        {copy.today}
                      </option>
                      <option className="bg-slate-900" value="last7">
                        {copy.last7Days}
                      </option>
                      <option className="bg-slate-900" value="last30">
                        {copy.last30Days}
                      </option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_rgba(51,65,85,0.24)]">
                  <div className="hidden grid-cols-[170px_minmax(0,1fr)_140px_140px] gap-3 bg-slate-900/35 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:grid">
                    <span>{copy.date}</span>
                    <span>{copy.activities}</span>
                    <span>{copy.trackedTime}</span>
                    <span>{copy.details}</span>
                  </div>

                  <div className="divide-y divide-slate-800/70 bg-slate-950/15">
                    {historyPagination.pageRows.length > 0 ? (
                      historyPagination.pageRows.map((day) => {
                        const visualTasks = Array.from(
                          new Map(
                            day.rows
                              .filter((row) => row.taskIconTag)
                              .map((row) => [
                                row.taskId ?? `${row.taskIconTag}-${row.taskTitle}`,
                                {
                                  iconTag: row.taskIconTag!,
                                  colorTag: row.taskColorTag,
                                  title: row.taskTitle,
                                },
                              ]),
                          ).values(),
                        )
                        const visibleVisualTasks = visualTasks.slice(0, 6)
                        const hiddenIconsCount = Math.max(0, visualTasks.length - visibleVisualTasks.length)
                        return (
                          <div key={day.dateIso}>
                            <div className="grid gap-3 px-4 py-3 md:grid-cols-[170px_minmax(0,1fr)_140px_140px] md:items-center">
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-2 md:block">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                                    {copy.date}
                                  </span>
                                  <p className="text-sm font-medium text-slate-200">{formatIsoDateShort(day.dateIso)}</p>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{day.sessionCount} {copy.sessions}</p>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-2 md:hidden">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    {copy.activities}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 md:mt-0">
                                  <div className="flex min-w-0 items-center">
                                    {visibleVisualTasks.length > 0 ? (
                                      visibleVisualTasks.map((visualTask, index) => {
                                        const taskIcon = taskIconMap[visualTask.iconTag]
                                        const taskColor = visualTask.colorTag ? taskColorMap[visualTask.colorTag] : null
                                        return (
                                          <span
                                            className={
                                              taskColor
                                                ? `-ml-1 grid h-7 w-7 place-items-center rounded-full border text-[10px] ${taskColor.iconShellClassName} ${index === 0 ? 'ml-0' : ''}`
                                                : `-ml-1 grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-[10px] text-slate-300 ${index === 0 ? 'ml-0' : ''}`
                                            }
                                            key={`${day.dateIso}-${visualTask.title}-${index}`}
                                            title={visualTask.title}
                                          >
                                            <FontAwesomeIcon icon={taskIcon.icon} />
                                          </span>
                                        )
                                      })
                                    ) : (
                                      <span className="text-xs text-slate-500">{copy.noTaskIcons}</span>
                                    )}
                                    {hiddenIconsCount > 0 ? (
                                      <span className="-ml-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)]">
                                        +{hiddenIconsCount}
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="truncate text-xs text-slate-500">{day.taskIds.length} {copy.taskTypes}</span>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between gap-2 md:block">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                                    {copy.trackedTime}
                                  </span>
                                  <span className="inline-flex items-center rounded-md bg-slate-900/45 px-2 py-1 font-mono text-xs text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                                    {formatSecondsCompact(day.totalSeconds).toUpperCase()}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{((day.totalSeconds / DAY_TOTAL_SECONDS) * 100).toFixed(1)}{copy.daySuffix}</p>
                              </div>

                              <div className="flex justify-end md:justify-start">
                                <button
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900/45 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.32)] transition hover:bg-slate-800/70 hover:text-slate-100"
                                  onClick={() => setSelectedHistoryDay(day.dateIso)}
                                  type="button"
                                >
                                  <FontAwesomeIcon className="text-[11px]" icon={faChevronRight} />
                                  <span>{copy.details}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">
                        {copy.noRecordsMatch}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    {copy.showing}{' '}
                    <span className="font-medium text-slate-300">
                      {historyPagination.totalItems === 0 ? 0 : historyPagination.startIndex + 1}
                    </span>
                    {' - '}
                    <span className="font-medium text-slate-300">{historyPagination.endIndex}</span> {copy.of}{' '}
                    <span className="font-medium text-slate-300">{historyPagination.totalItems}</span> {copy.days}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900/45 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] transition hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={historyPagination.currentPage <= 1}
                      onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                      {copy.prev}
                    </button>

                    <span className="rounded-lg bg-slate-900/30 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                      {copy.page} {historyPagination.currentPage} / {historyPagination.totalPages}
                    </span>

                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900/45 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] transition hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={historyPagination.currentPage >= historyPagination.totalPages}
                      onClick={() => setHistoryPage((page) => Math.min(historyPagination.totalPages, page + 1))}
                      type="button"
                    >
                      {copy.next}
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedHistoryDaySummary ? (
                <HistoryDayDetailsOverlay
                  dayStats={selectedHistoryDayStats}
                  daySummary={selectedHistoryDaySummary}
                  onBack={() => setSelectedHistoryDay(null)}
                />
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}


