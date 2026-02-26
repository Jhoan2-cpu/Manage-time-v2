import { useEffect, useMemo, useState } from 'react'
import type { AppLocale } from '../../../../i18n'
import {
  getHistoryDayDetail,
  getHistoryDays,
  getHistoryOverview,
  type HistoryDaysResponse,
  type HistoryDayDetail,
  type HistoryOverview,
} from '../../api'
import {
  adaptHistoryDayDetailToUiSummary,
  adaptHistoryDaysListToUiSummaries,
  adaptHistoryOverviewToUiStats,
} from '../../historyApiAdapter'
import {
  buildDayHistoryStatsFromRows,
  formatIsoDateLong,
  toIsoDateString,
  type DayHistoryStats,
  type HistoryDaySummary,
} from './historyUtils'
import type { SettingsHistoryDateRangeFilter } from './useSettingsHistoryState'

type UseSettingsHistoryApiStateParams = {
  isOpen: boolean
  effectiveTimeZone: string
  locale: AppLocale
  onAuthExpired?: () => void
  reloadKey?: number
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
const EMPTY_HISTORY_STATS = buildDayHistoryStatsFromRows([])

export function useSettingsHistoryApiState({
  isOpen,
  effectiveTimeZone,
  locale,
  onAuthExpired,
  reloadKey = 0,
}: UseSettingsHistoryApiStateParams) {
  const labels = useMemo(
    () =>
      locale === 'es'
        ? {
            untracked: 'Tiempo no registrado',
            manualAdjustment: 'Ajuste manual',
            otherActivity: 'Otra actividad',
          }
        : {
            untracked: 'Untracked Time',
            manualAdjustment: 'Manual adjustment',
            otherActivity: 'Other activity',
          },
    [locale],
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<SettingsHistoryDateRangeFilter>('all')
  const [historyPage, setHistoryPage] = useState(1)
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string | null>(null)

  const [overviewData, setOverviewData] = useState<HistoryOverview | null>(null)
  const [daysResponse, setDaysResponse] = useState<HistoryDaysResponse | null>(null)
  const [selectedDayDetail, setSelectedDayDetail] = useState<HistoryDayDetail | null>(null)
  const [selectedDayDetailLoading, setSelectedDayDetailLoading] = useState(false)

  useEffect(() => {
    setHistoryPage(1)
  }, [searchQuery, selectedTaskFilter, dateRangeFilter])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let didCancel = false
    ;(async () => {
      try {
        const result = await getHistoryOverview()
        if (didCancel) {
          return
        }

        if (!result) {
          onAuthExpired?.()
          return
        }

        setOverviewData(result)
      } catch (error) {
        if (!didCancel) {
          console.error('Failed to load history overview', error)
        }
      }
    })()

    return () => {
      didCancel = true
    }
  }, [isOpen, onAuthExpired, reloadKey])

  const currentDayIsoDate = useMemo(
    () => overviewData?.date_local ?? toIsoDateString(new Date(), effectiveTimeZone),
    [effectiveTimeZone, overviewData?.date_local],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let didCancel = false
    const { date_from, date_to } = buildHistoryDateRangeFilter(dateRangeFilter, currentDayIsoDate)

    ;(async () => {
      try {
        const result = await getHistoryDays({
          q: searchQuery.trim() || undefined,
          task_id: selectedTaskFilter !== 'all' ? selectedTaskFilter : undefined,
          date_from,
          date_to,
          page: historyPage,
          per_page: HISTORY_PAGE_SIZE,
        })
        if (didCancel) {
          return
        }

        if (!result) {
          onAuthExpired?.()
          return
        }

        setDaysResponse(result)
      } catch (error) {
        if (!didCancel) {
          console.error('Failed to load history days', {
            searchQuery,
            selectedTaskFilter,
            dateRangeFilter,
            historyPage,
          }, error)
        }
      }
    })()

    return () => {
      didCancel = true
    }
  }, [currentDayIsoDate, dateRangeFilter, historyPage, isOpen, onAuthExpired, searchQuery, selectedTaskFilter, reloadKey])

  useEffect(() => {
    if (!selectedHistoryDay || !isOpen) {
      setSelectedDayDetail(null)
      setSelectedDayDetailLoading(false)
      return
    }

    let didCancel = false
    setSelectedDayDetailLoading(true)
    ;(async () => {
      try {
        const result = await getHistoryDayDetail(selectedHistoryDay, 'asc')
        if (didCancel) {
          return
        }

        if (!result) {
          onAuthExpired?.()
          return
        }

        setSelectedDayDetail(result)
      } catch (error) {
        if (!didCancel) {
          console.error('Failed to load history day detail', { selectedHistoryDay }, error)
        }
      } finally {
        if (!didCancel) {
          setSelectedDayDetailLoading(false)
        }
      }
    })()

    return () => {
      didCancel = true
    }
  }, [isOpen, onAuthExpired, selectedHistoryDay, reloadKey])

  const overviewUi = useMemo(
    () => (overviewData ? adaptHistoryOverviewToUiStats(overviewData, labels) : null),
    [labels, overviewData],
  )

  const currentDayLabel = useMemo(
    () => overviewUi?.currentDayLabel ?? formatIsoDateLong(currentDayIsoDate),
    [currentDayIsoDate, overviewUi?.currentDayLabel],
  )

  const history: DayHistoryStats = overviewUi?.history ?? EMPTY_HISTORY_STATS
  const overviewDashboardStats = overviewUi?.dashboardStats
  const dailyLogSessionsCount = overviewUi?.dailyLogSessionsCount ?? 0

  const historyDaySummaries = useMemo(
    () => adaptHistoryDaysListToUiSummaries(daysResponse?.data ?? []),
    [daysResponse?.data],
  )

  const historyPagination = useMemo<HistoryPagination>(() => {
    const meta = daysResponse?.meta
    const totalItems = normalizeNonNegativeInt(meta?.total ?? historyDaySummaries.length)
    const totalPages = Math.max(1, normalizeNonNegativeInt(meta?.last_page ?? 1))
    const currentPage = Math.min(Math.max(1, normalizeNonNegativeInt(meta?.page ?? historyPage)), totalPages)
    const pageSize = Math.max(1, normalizeNonNegativeInt(meta?.per_page ?? HISTORY_PAGE_SIZE))
    const pageRows = historyDaySummaries
    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
    const endIndex = totalItems === 0 ? 0 : Math.min(totalItems, startIndex + pageRows.length)

    return {
      pageSize,
      totalItems,
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      pageRows,
    }
  }, [daysResponse?.meta, historyDaySummaries, historyPage])

  useEffect(() => {
    if (historyPage > historyPagination.totalPages) {
      setHistoryPage(historyPagination.totalPages)
    }
  }, [historyPage, historyPagination.totalPages])

  useEffect(() => {
    if (!selectedHistoryDay) {
      return
    }

    if (selectedDayDetail && selectedDayDetail.date_local !== selectedHistoryDay) {
      return
    }
  }, [selectedDayDetail, selectedHistoryDay])

  const selectedHistoryDayUi = useMemo(
    () =>
      selectedDayDetail
        ? adaptHistoryDayDetailToUiSummary(selectedDayDetail, {
            labels,
            timeZone: effectiveTimeZone,
          })
        : null,
    [effectiveTimeZone, labels, selectedDayDetail],
  )

  return {
    currentDayLabel,
    history,
    overviewDashboardStats,
    dailyLogSessionsCount,
    searchQuery,
    setSearchQuery,
    selectedTaskFilter,
    setSelectedTaskFilter,
    dateRangeFilter,
    setDateRangeFilter,
    historyPagination,
    goToPreviousHistoryPage: () => setHistoryPage((page) => Math.max(1, page - 1)),
    goToNextHistoryPage: () =>
      setHistoryPage((page) => Math.min(Math.max(1, historyPagination.totalPages), page + 1)),
    selectedHistoryDaySummary: selectedHistoryDayUi?.summary ?? null,
    selectedHistoryDayStats: selectedHistoryDayUi?.stats ?? EMPTY_HISTORY_STATS,
    selectedHistoryDayLoading: selectedDayDetailLoading,
    openHistoryDayDetails: (dateIso: string) => setSelectedHistoryDay(dateIso),
    closeHistoryDayDetails: () => setSelectedHistoryDay(null),
  }
}

function buildHistoryDateRangeFilter(filter: SettingsHistoryDateRangeFilter, currentDayIsoDate: string) {
  if (filter === 'all') {
    return { date_from: undefined, date_to: undefined }
  }

  if (filter === 'today') {
    return { date_from: currentDayIsoDate, date_to: currentDayIsoDate }
  }

  if (filter === 'last7') {
    return { date_from: addDaysToIso(currentDayIsoDate, -6), date_to: currentDayIsoDate }
  }

  if (filter === 'last30') {
    return { date_from: addDaysToIso(currentDayIsoDate, -29), date_to: currentDayIsoDate }
  }

  return { date_from: undefined, date_to: undefined }
}

function addDaysToIso(isoDate: string, deltaDays: number) {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) {
    return isoDate
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

function normalizeNonNegativeInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.floor(value))
}
