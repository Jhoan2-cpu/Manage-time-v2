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
  faSliders,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { taskColorMap, taskIconMap } from '../constants/taskOptions'
import type { DashboardStats, LogEntry, Task, TaskColorKey } from '../types'
import { formatMinutesCompact, parseDurationLabelToMinutes } from '../utils/time'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  entries: LogEntry[]
  historyEntries: LogEntry[]
  dashboardStats: DashboardStats
}

type HistorySlice = {
  key: string
  title: string
  minutes: number
  percentage: number
  sessionCount: number
  colorTag?: TaskColorKey
  iconTag?: Task['iconTag']
}

type HistoryRecordRow = {
  id: string
  dateIso: string
  start: string
  duration: string
  minutes: number
  taskId?: string
  taskTitle: string
  taskColorTag?: TaskColorKey
  taskIconTag?: Task['iconTag']
  activityLabel: string
}

const chartColorHexByTag: Record<TaskColorKey, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
}

export function SettingsModal({ isOpen, onClose, tasks, entries, historyEntries, dashboardStats }: SettingsModalProps) {
  const [use24HourClock, setUse24HourClock] = useState(false)
  const [showDailyLogByDefault, setShowDailyLogByDefault] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'last7' | 'last30'>('all')
  const [historyPage, setHistoryPage] = useState(1)

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

  const currentDayIsoDate = useMemo(() => entries[0]?.date ?? toIsoDateString(new Date()), [entries])
  const currentDayLabel = useMemo(() => formatIsoDateLong(currentDayIsoDate), [currentDayIsoDate])

  const history = useMemo(() => {
    const taskMap = new Map(tasks.map((task) => [task.id, task]))
    const aggregated = new Map<string, Omit<HistorySlice, 'percentage'>>()

    for (const entry of entries) {
      const minutes = parseDurationLabelToMinutes(entry.duration)
      if (minutes <= 0) {
        continue
      }

      const task = entry.taskId ? taskMap.get(entry.taskId) : undefined
      const key = task?.id ?? '__other__'
      const current = aggregated.get(key)

      if (current) {
        current.minutes += minutes
        current.sessionCount += 1
        continue
      }

      aggregated.set(key, {
        key,
        title: task?.title ?? 'Other activity',
        minutes,
        sessionCount: 1,
        colorTag: task?.colorTag,
        iconTag: task?.iconTag,
      })
    }

    const slices = Array.from(aggregated.values())
      .sort((a, b) => b.minutes - a.minutes)
      .map((slice) => ({ ...slice, percentage: 0 }))

    const totalMinutes = slices.reduce((sum, slice) => sum + slice.minutes, 0)
    const totalSessions = slices.reduce((sum, slice) => sum + slice.sessionCount, 0)

    const withPercentages = slices.map((slice) => ({
      ...slice,
      percentage: totalMinutes > 0 ? (slice.minutes / totalMinutes) * 100 : 0,
    }))

    const topTask = withPercentages[0] ?? null
    const averageSessionMinutes = totalSessions > 0 ? totalMinutes / totalSessions : 0

    return {
      slices: withPercentages,
      totalMinutes,
      totalSessions,
      topTask,
      averageSessionMinutes,
    }
  }, [entries, tasks])

  const pieChartBackground = useMemo(() => {
    if (history.totalMinutes <= 0 || history.slices.length === 0) {
      return 'conic-gradient(rgba(51,65,85,0.45) 0deg 360deg)'
    }

    let cursor = 0
    const segments = history.slices.map((slice) => {
      const degrees = (slice.minutes / history.totalMinutes) * 360
      const start = cursor
      const end = cursor + degrees
      cursor = end
      const color = slice.colorTag ? chartColorHexByTag[slice.colorTag] : '#64748b'
      return `${color} ${start}deg ${end}deg`
    })

    return `conic-gradient(${segments.join(', ')})`
  }, [history])

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
          minutes: parseDurationLabelToMinutes(entry.duration),
          taskId: task?.id,
          taskTitle: task?.title ?? entry.activity ?? 'Other activity',
          taskColorTag: task?.colorTag,
          taskIconTag: task?.iconTag,
          activityLabel: entry.activity ?? task?.title ?? 'Other activity',
        }
      })
      .sort((a, b) => {
        if (a.dateIso !== b.dateIso) {
          return a.dateIso < b.dateIso ? 1 : -1
        }
        return a.id < b.id ? 1 : -1
      })
  }, [currentDayIsoDate, historyEntries, tasks])

  const filteredHistoryRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const currentDay = startOfDayFromIso(currentDayIsoDate)

    return historyRows.filter((row) => {
      if (selectedTaskFilter !== 'all' && row.taskId !== selectedTaskFilter) {
        return false
      }

      if (dateRangeFilter !== 'all') {
        const rowDate = startOfDayFromIso(row.dateIso)
        const dayDiff = Math.floor((currentDay.getTime() - rowDate.getTime()) / 86_400_000)

        if (dateRangeFilter === 'today' && row.dateIso !== currentDayIsoDate) {
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

      const searchable = [
        row.taskTitle,
        row.activityLabel,
        row.start,
        row.duration,
        row.dateIso,
        formatIsoDateShort(row.dateIso),
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedSearch)
    })
  }, [currentDayIsoDate, dateRangeFilter, historyRows, searchQuery, selectedTaskFilter])

  useEffect(() => {
    setHistoryPage(1)
  }, [searchQuery, selectedTaskFilter, dateRangeFilter])

  const historyPagination = useMemo(() => {
    const pageSize = 8
    const totalItems = filteredHistoryRows.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const currentPage = Math.min(historyPage, totalPages)
    const startIndex = (currentPage - 1) * pageSize
    const pageRows = filteredHistoryRows.slice(startIndex, startIndex + pageSize)

    return {
      pageSize,
      totalItems,
      totalPages,
      currentPage,
      startIndex,
      endIndex: pageRows.length > 0 ? startIndex + pageRows.length : 0,
      pageRows,
    }
  }, [filteredHistoryRows, historyPage])

  useEffect(() => {
    if (historyPage > historyPagination.totalPages) {
      setHistoryPage(historyPagination.totalPages)
    }
  }, [historyPage, historyPagination.totalPages])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[95] bg-[#030915]/96 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/15 text-blue-200 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]">
              <FontAwesomeIcon icon={faGear} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
                Settings & History
              </h2>
              <p className="truncate text-xs text-slate-500">FocusFlow preferences and Daily Log insights</p>
            </div>
          </div>

          <button
            aria-label="Close settings"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.45)] transition hover:bg-slate-800/80 hover:text-slate-100"
            onClick={onClose}
            type="button"
          >
            <FontAwesomeIcon icon={faXmark} />
            <span className="hidden sm:inline">Close</span>
          </button>
        </header>

        <div className="app-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section className="rounded-2xl bg-[linear-gradient(180deg,rgba(9,18,36,0.92),rgba(6,13,26,0.95))] p-4 shadow-[0_18px_45px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <FontAwesomeIcon className="text-slate-400" icon={faSliders} />
                <h3 className="text-base font-semibold text-slate-100">Settings</h3>
              </div>

              <div className="space-y-3">
                <SettingToggle
                  checked={use24HourClock}
                  description="Display time in 24h format across the dashboard."
                  label="24h Clock"
                  onChange={setUse24HourClock}
                />
                <SettingToggle
                  checked={showDailyLogByDefault}
                  description="Open the Daily Log panel by default on desktop."
                  label="Open Daily Log on Startup"
                  onChange={setShowDailyLogByDefault}
                />
                <SettingToggle
                  checked={reducedMotion}
                  description="Reduce heavy transitions and UI motion effects."
                  label="Reduced Motion"
                  onChange={setReducedMotion}
                />
              </div>

              <div className="mt-5 rounded-xl bg-slate-900/35 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">About this section</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  These are simple UI preferences for the current session. The History panel summarizes your Daily Log
                  records and focus distribution by task.
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_44%),linear-gradient(180deg,rgba(8,16,34,0.93),rgba(5,12,25,0.96))] p-4 shadow-[0_20px_55px_rgba(2,8,20,0.32),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-5">
              <div className="mb-5 flex items-center gap-2">
                <FontAwesomeIcon className="text-slate-400" icon={faChartPie} />
                <h3 className="text-base font-semibold text-slate-100">History</h3>
              </div>

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
                        style={{ background: pieChartBackground }}
                      />
                      <div className="absolute inset-[18%] rounded-full bg-[#071122] shadow-[inset_0_1px_0_rgba(148,163,184,0.05),inset_0_-14px_24px_rgba(0,0,0,0.35)]" />
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Today</p>
                          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">
                            {formatMinutesCompact(history.totalMinutes).toUpperCase()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{history.totalSessions} sessions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HistoryStatCard label="Total Tracked" value={dashboardStats.totalTracked} />
                    <HistoryStatCard label="Daily Log Sessions" value={`${entries.length}`} />
                    <HistoryStatCard
                      label="Avg Session"
                      value={formatMinutesCompact(history.averageSessionMinutes).toUpperCase()}
                    />
                    <HistoryStatCard
                      label="Top Task"
                      value={history.topTask ? history.topTask.title : 'No data'}
                      valueClassName="text-sm"
                    />
                  </div>

                  <div className="rounded-2xl bg-slate-950/25 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Time by Task
                      </p>
                      <p className="text-xs text-slate-500">Percent + total time</p>
                    </div>

                    <div className="space-y-2">
                      {history.slices.length > 0 ? (
                        history.slices.map((slice) => {
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
                                  style={{
                                    backgroundColor: slice.colorTag ? chartColorHexByTag[slice.colorTag] : '#64748b',
                                  }}
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
                                  {formatMinutesCompact(slice.minutes).toUpperCase()}
                                </p>
                                <p className="text-xs text-slate-400">{slice.percentage.toFixed(1)}%</p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="rounded-xl bg-slate-900/25 px-3 py-4 text-sm text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.2)]">
                          No Daily Log data available yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950/20 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.26)]">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">All Days Log Records</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Full history across all available days. Use filters and search to inspect sessions.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {historyPagination.totalItems} matching records
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
                      placeholder="Search by task, date, time..."
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
                        All tasks
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
                        All dates
                      </option>
                      <option className="bg-slate-900" value="today">
                        Today
                      </option>
                      <option className="bg-slate-900" value="last7">
                        Last 7 days
                      </option>
                      <option className="bg-slate-900" value="last30">
                        Last 30 days
                      </option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_rgba(51,65,85,0.24)]">
                  <div className="hidden grid-cols-[140px_90px_110px_minmax(0,1fr)] gap-3 bg-slate-900/35 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:grid">
                    <span>Date</span>
                    <span>Start</span>
                    <span>Duration</span>
                    <span>Activity</span>
                  </div>

                  <div className="divide-y divide-slate-800/70 bg-slate-950/15">
                    {historyPagination.pageRows.length > 0 ? (
                      historyPagination.pageRows.map((row) => {
                        const taskColor = row.taskColorTag ? taskColorMap[row.taskColorTag] : null
                        const taskIcon = row.taskIconTag ? taskIconMap[row.taskIconTag] : null
                        return (
                          <div
                            className="grid gap-2 px-4 py-3 md:grid-cols-[140px_90px_110px_minmax(0,1fr)] md:items-center md:gap-3"
                            key={row.id}
                          >
                            <div className="flex items-center justify-between gap-2 md:block">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                                Date
                              </span>
                              <span className="text-sm text-slate-300">{formatIsoDateShort(row.dateIso)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 md:block">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                                Start
                              </span>
                              <span className="font-mono text-sm text-slate-300">{row.start}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 md:block">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:hidden">
                                Duration
                              </span>
                              <span className="inline-flex items-center rounded-md bg-slate-900/45 px-2 py-1 font-mono text-xs text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                                {row.duration}
                              </span>
                            </div>

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
                              ) : (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500" />
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-100">{row.taskTitle}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {row.minutes > 0 ? `${row.minutes} min` : row.duration}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">
                        No records match the current filters.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{' '}
                    <span className="font-medium text-slate-300">
                      {historyPagination.totalItems === 0 ? 0 : historyPagination.startIndex + 1}
                    </span>
                    {' - '}
                    <span className="font-medium text-slate-300">{historyPagination.endIndex}</span> of{' '}
                    <span className="font-medium text-slate-300">{historyPagination.totalItems}</span> records
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900/45 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] transition hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={historyPagination.currentPage <= 1}
                      onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                      type="button"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                      Prev
                    </button>

                    <span className="rounded-lg bg-slate-900/30 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                      Page {historyPagination.currentPage} / {historyPagination.totalPages}
                    </span>

                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900/45 px-3 py-2 text-sm text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] transition hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={historyPagination.currentPage >= historyPagination.totalPages}
                      onClick={() => setHistoryPage((page) => Math.min(historyPagination.totalPages, page + 1))}
                      type="button"
                    >
                      Next
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

type SettingToggleProps = {
  label: string
  description: string
  checked: boolean
  onChange: (nextValue: boolean) => void
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>

      <button
        aria-pressed={checked}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-blue-500/70' : 'bg-slate-700/70'
        }`}
        onClick={(event) => {
          event.preventDefault()
          onChange(!checked)
        }}
        type="button"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

type HistoryStatCardProps = {
  label: string
  value: string
  valueClassName?: string
}

function HistoryStatCard({ label, value, valueClassName }: HistoryStatCardProps) {
  return (
    <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 truncate font-mono text-base font-semibold text-slate-100 ${valueClassName ?? ''}`}>{value}</p>
    </div>
  )
}

function toIsoDateString(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDayFromIso(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`)
}

function formatIsoDateLong(isoDate: string) {
  const date = startOfDayFromIso(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatIsoDateShort(isoDate: string) {
  const date = startOfDayFromIso(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
