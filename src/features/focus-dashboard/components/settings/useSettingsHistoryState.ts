import { useEffect, useMemo, useState } from 'react'
import type { AppLocale } from '../../../../i18n'
import type { LogEntry, Task } from '../../types'
import { parseDurationLabelToMinutes, parseDurationLabelToSeconds } from '../../utils/time'
import {
  buildDayHistoryStatsFromRows,
  formatIsoDateLong,
  formatIsoDateShort,
  startOfDayFromIso,
  toIsoDateString,
  type HistoryDaySummary,
  type HistoryRecordRow,
} from './historyUtils'

export type SettingsHistoryDateRangeFilter = 'all' | 'today' | 'last7' | 'last30'

type UseSettingsHistoryStateParams = {
  tasks: Task[]
  entries: LogEntry[]
  historyEntries: LogEntry[]
  effectiveTimeZone: string
  locale: AppLocale
  otherActivityLabel: string
}

type HistoryPagination = {
  pageSize: number
  totalItems: number
  totalPages: number
  currentPage: number
  startIndex: number
  endIndex: number
  pageRows: HistoryDaySummary[]
}

const HISTORY_PAGE_SIZE = 6

export function useSettingsHistoryState({
  tasks,
  entries,
  historyEntries,
  effectiveTimeZone,
  locale,
  otherActivityLabel,
}: UseSettingsHistoryStateParams) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<SettingsHistoryDateRangeFilter>('all')
  const [historyPage, setHistoryPage] = useState(1)
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string | null>(null)

  const currentDayIsoDate = useMemo(
    () => entries[0]?.date ?? toIsoDateString(new Date(), effectiveTimeZone),
    [effectiveTimeZone, entries],
  )
  const currentDayLabel = useMemo(() => formatIsoDateLong(currentDayIsoDate), [currentDayIsoDate, locale])

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
          taskTitle: task?.title ?? entry.activity ?? otherActivityLabel,
          taskColorTag: task?.colorTag,
          taskIconTag: task?.iconTag,
          activityLabel: entry.activity ?? task?.title ?? otherActivityLabel,
        }
      }),
    [currentDayIsoDate, entries, otherActivityLabel, taskMap],
  )

  const history = useMemo(() => buildDayHistoryStatsFromRows(currentDayRows), [currentDayRows])

  const historyRows = useMemo<HistoryRecordRow[]>(
    () =>
      [...historyEntries]
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
            taskTitle: task?.title ?? entry.activity ?? otherActivityLabel,
            taskColorTag: task?.colorTag,
            taskIconTag: task?.iconTag,
            activityLabel: entry.activity ?? task?.title ?? otherActivityLabel,
          }
        })
        .sort((a, b) => {
          if (a.dateIso !== b.dateIso) {
            return a.dateIso < b.dateIso ? 1 : -1
          }
          return a.id < b.id ? 1 : -1
        }),
    [currentDayIsoDate, historyEntries, otherActivityLabel, taskMap],
  )

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

  const historyPagination = useMemo<HistoryPagination>(() => {
    const totalItems = filteredHistoryDays.length
    const totalPages = Math.max(1, Math.ceil(totalItems / HISTORY_PAGE_SIZE))
    const currentPage = Math.min(historyPage, totalPages)
    const startIndex = (currentPage - 1) * HISTORY_PAGE_SIZE
    const pageRows = filteredHistoryDays.slice(startIndex, startIndex + HISTORY_PAGE_SIZE)

    return {
      pageSize: HISTORY_PAGE_SIZE,
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

  return {
    currentDayLabel,
    history,
    searchQuery,
    setSearchQuery,
    selectedTaskFilter,
    setSelectedTaskFilter,
    dateRangeFilter,
    setDateRangeFilter,
    historyPagination,
    goToPreviousHistoryPage: () => setHistoryPage((page) => Math.max(1, page - 1)),
    goToNextHistoryPage: () => setHistoryPage((page) => Math.min(historyPagination.totalPages, page + 1)),
    selectedHistoryDaySummary,
    selectedHistoryDayStats,
    openHistoryDayDetails: (dateIso: string) => setSelectedHistoryDay(dateIso),
    closeHistoryDayDetails: () => setSelectedHistoryDay(null),
  }
}
