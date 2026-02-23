import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { taskIconMap } from '../constants/taskOptions'
import type { LogEntry, LogTone, Task, TaskColorKey } from '../types'
import { classNames } from '../utils/classNames'

type DailyLogPanelProps = {
  entries: LogEntry[]
  tasks: Task[]
  totalTracked: string
  isOpen: boolean
}

type LogCellCoord = {
  row: number
  col: number
}

const HEADER_ROW_INDEX = 0

const logToneStyles: Record<LogTone, { row: string; time: string; duration: string; activity: string; icon: string }> = {
  break: {
    row: 'border border-cyan-500/25 bg-cyan-500/10',
    time: 'text-slate-300',
    duration: 'bg-cyan-500/15 text-cyan-300',
    activity: 'text-cyan-100',
    icon: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200',
  },
  warning: {
    row: 'border border-amber-500/25 bg-amber-500/10',
    time: 'text-amber-100',
    duration: 'bg-amber-500/15 text-amber-300',
    activity: 'font-semibold text-amber-100',
    icon: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  },
  active: {
    row: 'border border-emerald-400/45 bg-emerald-500/10 shadow-[inset_3px_0_0_0_rgba(16,185,129,.95)]',
    time: 'font-semibold text-emerald-100',
    duration: 'bg-emerald-500/15 font-semibold text-emerald-200',
    activity: 'font-semibold text-emerald-100',
    icon: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  },
  faded: {
    row: 'border border-dashed border-slate-700/50 opacity-55',
    time: 'text-slate-500',
    duration: 'border border-slate-700 bg-transparent text-slate-500',
    activity: 'italic text-slate-500',
    icon: 'border-slate-700 bg-slate-900/40 text-slate-500',
  },
  default: {
    row: 'border border-transparent hover:border-slate-700 hover:bg-slate-800/65',
    time: 'text-slate-400',
    duration: 'bg-slate-800 text-slate-300',
    activity: 'text-slate-200',
    icon: 'border-slate-700 bg-slate-800 text-slate-300',
  },
}

const taskLogColorStyles: Record<TaskColorKey, { row: string; time: string; duration: string; activity: string; icon: string }> = {
  blue: {
    row: 'border border-blue-500/25 bg-blue-500/8 shadow-[inset_3px_0_0_0_rgba(59,130,246,.85)]',
    time: 'text-blue-100',
    duration: 'bg-blue-500/15 text-blue-200',
    activity: 'font-semibold text-blue-100',
    icon: 'border-blue-400/35 bg-blue-500/15 text-blue-200',
  },
  green: {
    row: 'border border-emerald-500/25 bg-emerald-500/8 shadow-[inset_3px_0_0_0_rgba(16,185,129,.85)]',
    time: 'text-emerald-100',
    duration: 'bg-emerald-500/15 text-emerald-200',
    activity: 'font-semibold text-emerald-100',
    icon: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
  },
  amber: {
    row: 'border border-amber-500/25 bg-amber-500/8 shadow-[inset_3px_0_0_0_rgba(245,158,11,.85)]',
    time: 'text-amber-100',
    duration: 'bg-amber-500/15 text-amber-200',
    activity: 'font-semibold text-amber-100',
    icon: 'border-amber-400/35 bg-amber-500/15 text-amber-200',
  },
  rose: {
    row: 'border border-rose-500/25 bg-rose-500/8 shadow-[inset_3px_0_0_0_rgba(244,63,94,.85)]',
    time: 'text-rose-100',
    duration: 'bg-rose-500/15 text-rose-200',
    activity: 'font-semibold text-rose-100',
    icon: 'border-rose-400/35 bg-rose-500/15 text-rose-200',
  },
  violet: {
    row: 'border border-violet-500/25 bg-violet-500/8 shadow-[inset_3px_0_0_0_rgba(139,92,246,.85)]',
    time: 'text-violet-100',
    duration: 'bg-violet-500/15 text-violet-200',
    activity: 'font-semibold text-violet-100',
    icon: 'border-violet-400/35 bg-violet-500/15 text-violet-200',
  },
}

export function DailyLogPanel({
  entries,
  tasks,
  totalTracked,
  isOpen,
}: DailyLogPanelProps) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const tableSelectionRef = useRef<HTMLDivElement | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<LogCellCoord | null>(null)
  const [selectionFocus, setSelectionFocus] = useState<LogCellCoord | null>(null)
  const [isSelectingCells, setIsSelectingCells] = useState(false)

  const rowModels = useMemo(
    () =>
      entries.map((entry) => {
        const task = entry.taskId ? taskMap.get(entry.taskId) : undefined
        const styles = task ? taskLogColorStyles[task.colorTag] : logToneStyles[entry.tone ?? 'default']
        const taskIcon = task ? taskIconMap[task.iconTag] : undefined
        const activityLabel = task?.title ?? entry.activity ?? 'Unknown Activity'

        return {
          id: entry.id,
          start: entry.start,
          duration: entry.duration,
          activityLabel,
          styles,
          taskIcon,
        }
      }),
    [entries, taskMap],
  )

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
    if (!selectedRange) {
      return false
    }

    return row >= selectedRange.minRow && row <= selectedRange.maxRow && col >= selectedRange.minCol && col <= selectedRange.maxCol
  }

  const isAnchorCell = (row: number, col: number) => {
    if (!selectionAnchor) {
      return false
    }
    return selectionAnchor.row === row && selectionAnchor.col === col
  }

  const handleCellMouseDown = (row: number, col: number) => {
    setSelectionAnchor({ row, col })
    setSelectionFocus({ row, col })
    setIsSelectingCells(true)
    tableSelectionRef.current?.focus()
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelectingCells) {
      return
    }
    setSelectionFocus({ row, col })
  }

  const handleCopySelection = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!selectedRange) {
      return
    }

    const headers = ['Start', 'Duration', 'Activity']
    const matrix = rowModels.map((row) => [row.start, row.duration, row.activityLabel])
    const selectedHeaderRow = headers.slice(selectedRange.minCol, selectedRange.maxCol + 1).join('\t')
    const copiedLines: string[] = []

    const includesHeaderRow = selectedRange.minRow <= HEADER_ROW_INDEX && selectedRange.maxRow >= HEADER_ROW_INDEX
    if (includesHeaderRow || selectedRange.minRow > HEADER_ROW_INDEX) {
      copiedLines.push(selectedHeaderRow)
    }

    const dataStartVisualRow = Math.max(selectedRange.minRow, HEADER_ROW_INDEX + 1)
    const dataEndVisualRow = selectedRange.maxRow
    if (dataEndVisualRow >= HEADER_ROW_INDEX + 1) {
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
    <aside
      className={classNames(
        'z-40 overflow-hidden xl:relative xl:shrink-0',
        'fixed inset-x-0 bottom-0 top-16 max-h-none xl:static xl:inset-auto xl:bottom-auto xl:max-h-none',
        'transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        isOpen ? 'pointer-events-auto xl:w-[340px]' : 'pointer-events-none xl:w-0',
      )}
    >
      <div
        className={classNames(
          'flex h-full flex-col border border-slate-800 bg-[#050d1d]/95 shadow-[0_24px_60px_rgba(1,8,22,0.55)] backdrop-blur will-change-transform',
          'rounded-none xl:h-full xl:w-[340px] xl:rounded-none xl:border-y-0 xl:border-l-0 xl:border-r xl:border-slate-800 xl:bg-[#050d1d] xl:shadow-none xl:backdrop-blur-0',
          'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'translate-x-0 translate-y-0 xl:translate-x-0' : '-translate-x-[10%] translate-y-[104%] xl:-translate-x-full xl:translate-y-0',
        )}
      >
        <div className="border-b border-slate-800 px-4 py-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-100">
            <FontAwesomeIcon className="text-slate-300" icon={faClockRotateLeft} />
            Daily Log
          </h2>
          <p className="mt-2 text-[11px] text-slate-500">Selectable table (copy and paste into Excel)</p>
        </div>

        <div
          className="app-scroll flex-1 overflow-auto px-3 pb-3 pt-2"
          onCopy={handleCopySelection}
          onMouseLeave={() => {
            if (isSelectingCells) {
              setIsSelectingCells(false)
            }
          }}
          ref={tableSelectionRef}
          tabIndex={0}
        >
          <table className="w-full table-fixed border-separate border-spacing-y-1 text-xs select-none">
            <colgroup>
              <col className="w-[72px]" />
              <col className="w-[88px]" />
              <col />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th
                  className={classNames(
                    'cursor-default rounded-l-md border border-r-0 border-slate-800/55 bg-[#081225]/95 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition',
                    isCellSelected(HEADER_ROW_INDEX, 0) &&
                      'bg-blue-500/16 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                    isAnchorCell(HEADER_ROW_INDEX, 0) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                  )}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    handleCellMouseDown(HEADER_ROW_INDEX, 0)
                  }}
                  onMouseEnter={() => handleCellMouseEnter(HEADER_ROW_INDEX, 0)}
                >
                  Start
                </th>
                <th
                  className={classNames(
                    'cursor-default border-y border-slate-800/55 bg-[#081225]/95 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition',
                    isCellSelected(HEADER_ROW_INDEX, 1) &&
                      'bg-blue-500/16 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                    isAnchorCell(HEADER_ROW_INDEX, 1) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                  )}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    handleCellMouseDown(HEADER_ROW_INDEX, 1)
                  }}
                  onMouseEnter={() => handleCellMouseEnter(HEADER_ROW_INDEX, 1)}
                >
                  Duration
                </th>
                <th
                  className={classNames(
                    'cursor-default rounded-r-md border border-l-0 border-slate-800/55 bg-[#081225]/95 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition',
                    isCellSelected(HEADER_ROW_INDEX, 2) &&
                      'bg-blue-500/16 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)]',
                    isAnchorCell(HEADER_ROW_INDEX, 2) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                  )}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    handleCellMouseDown(HEADER_ROW_INDEX, 2)
                  }}
                  onMouseEnter={() => handleCellMouseEnter(HEADER_ROW_INDEX, 2)}
                >
                  Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {rowModels.map((row, rowIndex) => {
                return (
                  <tr className={classNames('align-middle', row.styles.row)} key={row.id}>
                    <td
                      className={classNames(
                        'cursor-default rounded-l-md border border-r-0 border-slate-800/55 px-2 py-2 font-mono tabular-nums transition',
                        row.styles.time,
                        isCellSelected(rowIndex + 1, 0) &&
                          'bg-blue-500/16 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)] text-slate-100',
                        isAnchorCell(rowIndex + 1, 0) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                      )}
                      onMouseDown={(event) => {
                        if (event.button !== 0) return
                        event.preventDefault()
                        handleCellMouseDown(rowIndex + 1, 0)
                      }}
                      onMouseEnter={() => handleCellMouseEnter(rowIndex + 1, 0)}
                    >
                      {row.start}
                    </td>
                    <td
                      className={classNames(
                        'cursor-default border-y border-slate-800/55 px-2 py-2 text-center font-mono tabular-nums transition',
                        row.styles.time,
                        isCellSelected(rowIndex + 1, 1) &&
                          'bg-blue-500/16 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)] text-slate-100',
                        isAnchorCell(rowIndex + 1, 1) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                      )}
                      onMouseDown={(event) => {
                        if (event.button !== 0) return
                        event.preventDefault()
                        handleCellMouseDown(rowIndex + 1, 1)
                      }}
                      onMouseEnter={() => handleCellMouseEnter(rowIndex + 1, 1)}
                    >
                      {row.duration}
                    </td>
                    <td
                      className={classNames(
                        'cursor-default rounded-r-md border border-l-0 border-slate-800/55 px-2 py-2 transition',
                        row.styles.activity,
                        isCellSelected(rowIndex + 1, 2) &&
                          'bg-blue-500/16 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.55)] text-slate-100',
                        isAnchorCell(rowIndex + 1, 2) && 'shadow-[inset_0_0_0_1px_rgba(147,197,253,0.8)]',
                      )}
                      onMouseDown={(event) => {
                        if (event.button !== 0) return
                        event.preventDefault()
                        handleCellMouseDown(rowIndex + 1, 2)
                      }}
                      onMouseEnter={() => handleCellMouseEnter(rowIndex + 1, 2)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {row.taskIcon ? (
                          <span
                            aria-hidden="true"
                            className={classNames(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] select-none',
                              row.styles.icon,
                            )}
                          >
                            <FontAwesomeIcon icon={row.taskIcon.icon} />
                          </span>
                        ) : null}
                        <span className="truncate">{row.activityLabel}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-800 bg-[#040b18] px-4 py-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Tracked</span>
            <span className="font-mono font-medium tabular-nums text-slate-300">{totalTracked}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
