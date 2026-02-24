import { useEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartPie, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { getCurrentIntlLocaleTag, useI18n } from '../../../../i18n'
import { taskColorMap, taskIconMap } from '../../constants/taskOptions'
import type { TaskColorKey } from '../../types'
import { classNames } from '../../utils/classNames'
import { formatSecondsCompact, formatSecondsHms, parseDurationLabelToSeconds } from '../../utils/time'
import { HistoryStatCard } from './HistoryStatCard'
import { HistoryTimeByTaskList } from './HistoryTimeByTaskList'
import {
  buildPieChartBackground,
  formatIsoDateLong,
  formatIsoDateShort,
  type DayHistoryStats,
  type HistoryDaySummary,
  type HistoryRecordRow,
} from './historyUtils'

type HistoryDayDetailsOverlayProps = {
  daySummary: HistoryDaySummary
  dayStats: DayHistoryStats
  onBack: () => void
}

export function HistoryDayDetailsOverlay({ daySummary, dayStats, onBack }: HistoryDayDetailsOverlayProps) {
  const { locale } = useI18n()
  const copy =
    locale === 'es'
      ? {
          back: 'Volver',
          dayDetails: 'Detalles del dia',
          sessions: 'sesiones',
          tracked: 'registrado',
          dailyDistribution: 'Distribucion diaria',
          trackedAndUntrackedHint: 'Registrado y tiempo no registrado para este dia (24h totales).',
          trackedLabel: 'Registrado',
          trackedTime: 'Tiempo registrado',
          untrackedTime: 'Tiempo no registrado',
          sessionsLabel: 'Sesiones',
          topTask: 'Tarea principal',
          noData: 'Sin datos',
          noDataForDay: 'Sin datos para este dia.',
          dailyLog: 'Registro diario',
          recordsForDate: 'registros para',
        }
      : {
          back: 'Back',
          dayDetails: 'Day Details',
          sessions: 'sessions',
          tracked: 'tracked',
          dailyDistribution: 'Daily Distribution',
          trackedAndUntrackedHint: 'Tracked and untracked time for this day (24h total).',
          trackedLabel: 'Tracked',
          trackedTime: 'Tracked Time',
          untrackedTime: 'Untracked Time',
          sessionsLabel: 'Sessions',
          topTask: 'Top Task',
          noData: 'No data',
          noDataForDay: 'No data for this day.',
          dailyLog: 'Daily Log',
          recordsForDate: 'records for',
        }

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
                <span>{copy.back}</span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.dayDetails}</p>
                <p className="text-sm font-medium text-slate-200">{formatIsoDateLong(daySummary.dateIso)}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {daySummary.sessionCount} {copy.sessions} - {formatSecondsCompact(daySummary.totalSeconds).toUpperCase()} {copy.tracked}
            </div>
          </div>

          <div className="app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="rounded-2xl bg-slate-950/30 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <FontAwesomeIcon icon={faChartPie} />
                      {copy.dailyDistribution}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {copy.trackedAndUntrackedHint}
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.trackedLabel}</p>
                          <p className="mt-1 font-mono text-xl font-semibold text-slate-100">
                            {formatSecondsCompact(dayStats.trackedSeconds).toUpperCase()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{dayStats.totalSessions} {copy.sessions}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid w-full grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.trackedTime}</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                          {formatSecondsCompact(dayStats.trackedSeconds).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-slate-400">{dayStats.trackedPercentage.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl bg-slate-900/30 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.25)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.untrackedTime}</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-slate-100">
                          {formatSecondsCompact(dayStats.untrackedSeconds).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-slate-400">{dayStats.untrackedPercentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HistoryStatCard label={copy.trackedTime} value={formatSecondsCompact(dayStats.trackedSeconds).toUpperCase()} />
                    <HistoryStatCard label={copy.untrackedTime} value={formatSecondsCompact(dayStats.untrackedSeconds).toUpperCase()} />
                    <HistoryStatCard label={copy.sessionsLabel} value={`${dayStats.totalSessions}`} />
                    <HistoryStatCard label={copy.topTask} value={dayStats.topTask ? dayStats.topTask.title : copy.noData} valueClassName="text-sm" />
                  </div>

                  <HistoryTimeByTaskList slices={dayStats.slices} emptyLabel={copy.noDataForDay} />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950/20 p-4 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.26)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.dailyLog}</p>
                  <p className="text-xs text-slate-500">
                    {daySummary.rows.length} {copy.recordsForDate} {formatIsoDateShort(daySummary.dateIso)}
                  </p>
                </div>

                <SelectableHistoryDayLogTable rows={daySummary.rows} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type HistoryLogCellCoord = {
  row: number
  col: number
}

const HISTORY_HEADER_ROW_INDEX = 0

type HistoryLogRowStyle = {
  row: string
  time: string
  duration: string
  activity: string
  icon: string
}

const historyDefaultRowStyle: HistoryLogRowStyle = {
  row: 'border border-slate-800/55 bg-slate-900/25',
  time: 'text-slate-300',
  duration: 'text-slate-200',
  activity: 'text-slate-200',
  icon: 'border-slate-700/80 bg-slate-800/60 text-slate-300',
}

const historyUntrackedRowStyle: HistoryLogRowStyle = {
  row: 'border border-dashed border-slate-800/55 bg-slate-950/10',
  time: 'text-slate-500',
  duration: 'text-slate-500',
  activity: 'text-slate-500',
  icon: 'border-slate-800/80 bg-slate-900/40 text-slate-500',
}

const historyTaskRowStyleByColor: Record<TaskColorKey, HistoryLogRowStyle> = {
  blue: {
    row: 'border border-blue-500/22 bg-blue-500/7 shadow-[inset_3px_0_0_0_rgba(59,130,246,.8)]',
    time: 'text-blue-100',
    duration: 'text-blue-100',
    activity: 'text-blue-100',
    icon: 'border-blue-400/35 bg-blue-500/15 text-blue-200',
  },
  green: {
    row: 'border border-emerald-500/22 bg-emerald-500/7 shadow-[inset_3px_0_0_0_rgba(16,185,129,.8)]',
    time: 'text-emerald-100',
    duration: 'text-emerald-100',
    activity: 'text-emerald-100',
    icon: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
  },
  amber: {
    row: 'border border-amber-500/22 bg-amber-500/7 shadow-[inset_3px_0_0_0_rgba(245,158,11,.8)]',
    time: 'text-amber-100',
    duration: 'text-amber-100',
    activity: 'text-amber-100',
    icon: 'border-amber-400/35 bg-amber-500/15 text-amber-200',
  },
  rose: {
    row: 'border border-rose-500/22 bg-rose-500/7 shadow-[inset_3px_0_0_0_rgba(244,63,94,.8)]',
    time: 'text-rose-100',
    duration: 'text-rose-100',
    activity: 'text-rose-100',
    icon: 'border-rose-400/35 bg-rose-500/15 text-rose-200',
  },
  pink: {
    row: 'border border-pink-500/22 bg-pink-500/7 shadow-[inset_3px_0_0_0_rgba(236,72,153,.8)]',
    time: 'text-pink-100',
    duration: 'text-pink-100',
    activity: 'text-pink-100',
    icon: 'border-pink-400/35 bg-pink-500/15 text-pink-200',
  },
  violet: {
    row: 'border border-violet-500/22 bg-violet-500/7 shadow-[inset_3px_0_0_0_rgba(139,92,246,.8)]',
    time: 'text-violet-100',
    duration: 'text-violet-100',
    activity: 'text-violet-100',
    icon: 'border-violet-400/35 bg-violet-500/15 text-violet-200',
  },
}

function SelectableHistoryDayLogTable({ rows }: { rows: HistoryRecordRow[] }) {
  const { locale } = useI18n()
  const copy =
    locale === 'es'
      ? {
          start: 'Inicio',
          duration: 'Duracion',
          activity: 'Actividad',
        }
      : {
          start: 'Start',
          duration: 'Duration',
          activity: 'Activity',
        }
  const tableSelectionRef = useRef<HTMLDivElement | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<HistoryLogCellCoord | null>(null)
  const [selectionFocus, setSelectionFocus] = useState<HistoryLogCellCoord | null>(null)
  const [isSelectingCells, setIsSelectingCells] = useState(false)

  const selectedRange = useMemo(() => {
    if (!selectionAnchor || !selectionFocus) {
      return null
    }

    return {
      minRow: Math.min(selectionAnchor.row, selectionFocus.row),
      maxRow: Math.max(selectionAnchor.row, selectionFocus.row),
      minCol: Math.min(selectionAnchor.col, selectionFocus.col),
      maxCol: Math.max(selectionAnchor.col, selectionFocus.col),
    }
  }, [selectionAnchor, selectionFocus])

  useEffect(() => {
    if (!isSelectingCells) {
      return
    }

    const stopSelection = () => setIsSelectingCells(false)
    window.addEventListener('mouseup', stopSelection)
    return () => window.removeEventListener('mouseup', stopSelection)
  }, [isSelectingCells])

  const isCellSelected = (row: number, col: number) => {
    if (!selectedRange) return false
    return row >= selectedRange.minRow && row <= selectedRange.maxRow && col >= selectedRange.minCol && col <= selectedRange.maxCol
  }

  const isAnchorCell = (row: number, col: number) => {
    if (!selectionAnchor) return false
    return selectionAnchor.row === row && selectionAnchor.col === col
  }

  const handleCellMouseDown = (row: number, col: number, extendSelection = false) => {
    if (extendSelection && selectionAnchor) {
      setSelectionFocus({ row, col })
      setIsSelectingCells(false)
      tableSelectionRef.current?.focus()
      return
    }

    setSelectionAnchor({ row, col })
    setSelectionFocus({ row, col })
    setIsSelectingCells(true)
    tableSelectionRef.current?.focus()
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelectingCells) return
    setSelectionFocus({ row, col })
  }

  const handleCopySelection = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!selectedRange) {
      return
    }

    const headers = [copy.start, copy.duration, copy.activity]
    const matrix = rows.map((row) => [
      formatHistoryStartTimeWithSeconds(row.start),
      formatSecondsHms(parseDurationLabelToSeconds(row.duration)),
      row.taskTitle || row.activityLabel,
    ])
    const selectedHeaderRow = headers.slice(selectedRange.minCol, selectedRange.maxCol + 1).join('\t')
    const copiedLines: string[] = []

    const includesHeaderRow = selectedRange.minRow <= HISTORY_HEADER_ROW_INDEX && selectedRange.maxRow >= HISTORY_HEADER_ROW_INDEX
    if (includesHeaderRow || selectedRange.minRow > HISTORY_HEADER_ROW_INDEX) {
      copiedLines.push(selectedHeaderRow)
    }

    const dataStartVisualRow = Math.max(selectedRange.minRow, HISTORY_HEADER_ROW_INDEX + 1)
    const dataEndVisualRow = selectedRange.maxRow
    if (dataEndVisualRow >= HISTORY_HEADER_ROW_INDEX + 1) {
      copiedLines.push(
        ...matrix
          .slice(dataStartVisualRow - 1, dataEndVisualRow)
          .map((columns) => columns.slice(selectedRange.minCol, selectedRange.maxCol + 1).join('\t')),
      )
    }

    if (copiedLines.length === 0 || !selectedHeaderRow) {
      return
    }

    event.preventDefault()
    event.clipboardData.setData('text/plain', copiedLines.join('\n'))
  }

  return (
    <div
      className="app-scroll overflow-auto"
      onCopy={handleCopySelection}
      onMouseLeave={() => {
        if (isSelectingCells) {
          setIsSelectingCells(false)
        }
      }}
      ref={tableSelectionRef}
      tabIndex={0}
    >
      <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-xs select-none">
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[100px]" />
          <col />
        </colgroup>
        <thead>
          <tr>
            {([copy.start, copy.duration, copy.activity] as const).map((label, colIndex) => (
              <th
                className={classNames(
                  'cursor-default border border-slate-800/55 bg-[#081225]/95 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition',
                  colIndex === 0 && 'rounded-l-md border-r-0',
                  colIndex === 1 && 'border-x-0',
                  colIndex === 2 && 'rounded-r-md border-l-0',
                  isCellSelected(HISTORY_HEADER_ROW_INDEX, colIndex) &&
                    'bg-blue-500/16 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                  isAnchorCell(HISTORY_HEADER_ROW_INDEX, colIndex) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                )}
                key={`history-day-header-${label}`}
                onMouseDown={(event) => {
                  if (event.button !== 0) return
                  event.preventDefault()
                  handleCellMouseDown(HISTORY_HEADER_ROW_INDEX, colIndex, event.shiftKey)
                }}
                onMouseEnter={() => handleCellMouseEnter(HISTORY_HEADER_ROW_INDEX, colIndex)}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const taskColor = row.taskColorTag ? taskColorMap[row.taskColorTag] : null
            const taskIcon = row.taskIconTag ? taskIconMap[row.taskIconTag] : null
            const rowStyle = row.taskColorTag
              ? historyTaskRowStyleByColor[row.taskColorTag]
              : row.taskId
                ? historyDefaultRowStyle
                : historyUntrackedRowStyle

            return (
              <tr className={classNames('align-middle', rowStyle.row)} key={`overlay-row-${row.id}`}>
                <td
                  className={classNames(
                    'cursor-default rounded-l-md border border-r-0 border-slate-800/55 px-2 py-2 font-mono tabular-nums transition',
                    rowStyle.time,
                    isCellSelected(rowIndex + 1, 0) && 'bg-blue-500/16 text-slate-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                    isAnchorCell(rowIndex + 1, 0) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                  )}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    handleCellMouseDown(rowIndex + 1, 0, event.shiftKey)
                  }}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex + 1, 0)}
                >
                  {formatHistoryStartTimeWithSeconds(row.start)}
                </td>
                <td
                  className={classNames(
                    'cursor-default border-y border-slate-800/55 px-2 py-2 text-center font-mono tabular-nums transition',
                    rowStyle.duration,
                    isCellSelected(rowIndex + 1, 1) && 'bg-blue-500/16 text-slate-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                    isAnchorCell(rowIndex + 1, 1) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                  )}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    handleCellMouseDown(rowIndex + 1, 1, event.shiftKey)
                  }}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex + 1, 1)}
                >
                  {formatSecondsHms(parseDurationLabelToSeconds(row.duration))}
                </td>
                <td
                  className={classNames(
                    'cursor-default rounded-r-md border border-l-0 border-slate-800/55 px-2 py-2 transition',
                    rowStyle.activity,
                    isCellSelected(rowIndex + 1, 2) && 'bg-blue-500/16 text-slate-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                    isAnchorCell(rowIndex + 1, 2) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                  )}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    handleCellMouseDown(rowIndex + 1, 2, event.shiftKey)
                  }}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex + 1, 2)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {taskIcon ? (
                      <span
                        className={classNames(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[10px]',
                          row.taskColorTag && taskColor ? taskColor.iconShellClassName : rowStyle.icon,
                        )}
                      >
                        <FontAwesomeIcon icon={taskIcon.icon} />
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.taskTitle}</p>
                      {row.activityLabel && row.activityLabel !== row.taskTitle ? (
                        <p className="truncate text-[11px] text-slate-500">{row.activityLabel}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatHistoryStartTimeWithSeconds(startLabel: string) {
  const trimmed = startLabel.trim()
  const formatter = new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
  const alreadyHasSeconds = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i)
  if (alreadyHasSeconds) {
    const hours12 = Number.parseInt(alreadyHasSeconds[1] ?? '', 10)
    const minutes = Number.parseInt(alreadyHasSeconds[2] ?? '', 10)
    const seconds = Number.parseInt(alreadyHasSeconds[3] ?? '', 10)
    const period = (alreadyHasSeconds[4] ?? 'AM').toUpperCase()
    if (!Number.isFinite(hours12) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return trimmed.replace(/\s+/g, ' ').toUpperCase()
    }
    const date = new Date()
    let hours24 = hours12 % 12
    if (period === 'PM') {
      hours24 += 12
    }
    date.setHours(hours24, minutes, seconds, 0)
    return formatter.format(date)
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) {
    return trimmed
  }

  const hours = match[1]
  const minutes = Number.parseInt(match[2] ?? '', 10)
  const period = (match[3] ?? '').toUpperCase()
  const hours12 = Number.parseInt(hours ?? '', 10)
  if (!Number.isFinite(hours12) || !Number.isFinite(minutes)) {
    return `${hours}:${match[2]}:00 ${period}`
  }
  const date = new Date()
  let hours24 = hours12 % 12
  if (period === 'PM') {
    hours24 += 12
  }
  date.setHours(hours24, minutes, 0, 0)
  return formatter.format(date)
}
