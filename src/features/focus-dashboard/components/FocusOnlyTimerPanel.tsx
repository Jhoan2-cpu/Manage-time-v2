import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faStop } from '@fortawesome/free-solid-svg-icons'
import type { FocusTimerMode } from '../types'
import { classNames } from '../utils/classNames'

type TimerDraftParts = {
  hours: string
  minutes: string
  seconds: string
}

type FocusOnlyTimerPanelProps = {
  activeTaskIcon: IconDefinition | null
  taskTitle: string
  totalTaskTimeLabel: string
  mode: FocusTimerMode
  stopwatchLabel: string
  timerDraftParts: TimerDraftParts
  canEditTimerTarget: boolean
  isTimerCompletionVisual: boolean
  renderProgressPercent: number
  timerRingStyle: CSSProperties
  timerCompletePulseStyle: CSSProperties
  timerMarkerStyle: CSSProperties
  timerFieldsRef: RefObject<HTMLDivElement | null>
  onTimerFieldBlur: () => void
  onTimerFieldFocus: () => void
  onTimerFieldKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onTimerFieldChange: (field: keyof TimerDraftParts, value: string) => void
  canStopFocus: boolean
  onStopFocus: () => void
  canToggleFocus: boolean
  onToggleFocusClick: () => void
  toggleFocusAriaLabel: string
  toggleFocusIcon: IconDefinition
  isRunning: boolean
  playButtonGlowStyle: CSSProperties
  accentTimeGlowClassName: string
  accentDividerClassName: string
  accentTotalValueClassName: string
  accentPlayButtonClassName: string
  accentPlayIconClassName: string
  copyTotalTaskTime: string
  copyStopFocus: string
}

export function FocusOnlyTimerPanel({
  activeTaskIcon,
  taskTitle,
  totalTaskTimeLabel,
  mode,
  stopwatchLabel,
  timerDraftParts,
  canEditTimerTarget,
  isTimerCompletionVisual,
  renderProgressPercent,
  timerRingStyle,
  timerCompletePulseStyle,
  timerMarkerStyle,
  timerFieldsRef,
  onTimerFieldBlur,
  onTimerFieldFocus,
  onTimerFieldKeyDown,
  onTimerFieldChange,
  canStopFocus,
  onStopFocus,
  canToggleFocus,
  onToggleFocusClick,
  toggleFocusAriaLabel,
  toggleFocusIcon,
  isRunning,
  playButtonGlowStyle,
  accentTimeGlowClassName,
  accentDividerClassName,
  accentTotalValueClassName,
  accentPlayButtonClassName,
  accentPlayIconClassName,
  copyTotalTaskTime,
  copyStopFocus,
}: FocusOnlyTimerPanelProps) {
  const progressDegrees = renderProgressPercent * 3.6

  const timerInputClassName = classNames(
    'rounded-xl border border-slate-400/30 bg-[#0a1530]/72 text-center font-mono font-semibold leading-none tracking-tight tabular-nums text-slate-100 outline-none transition',
    'h-11 w-11 text-[28px] sm:h-[3.25rem] sm:w-[3.25rem] sm:text-[34px] lg:h-[3.45rem] lg:w-[3.45rem] lg:text-[36px]',
    canEditTimerTarget ? 'focus:border-white/55 focus:bg-[#102347]' : 'cursor-default text-slate-100/90',
    accentTimeGlowClassName,
  )

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div className="flex h-full w-full max-w-[1480px] flex-col items-center px-4 py-1.5 sm:px-7 sm:py-2.5 lg:py-3.5">
        <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-start">
          <div
            className={classNames(
              'relative w-full max-w-[1200px] [perspective:1600px]',
              mode === 'stopwatch'
                ? 'h-[clamp(19rem,60vh,40rem)] [@media(min-width:1200px)]:h-[clamp(22rem,66vh,44rem)]'
                : 'h-[clamp(17.5rem,56vh,30rem)] xl:h-[clamp(18.5rem,60vh,33rem)]',
            )}
          >
            {mode === 'stopwatch' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-0.5 pt-0 sm:pb-1.5 sm:pt-0.5">
                <div className="flex w-full max-w-[min(100%,82rem)] items-start justify-center gap-3.5 px-2 sm:px-3">
                  <span
                    className={classNames(
                      'mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-2xl sm:h-10 sm:w-10 sm:text-[1.75rem]',
                      accentTotalValueClassName,
                    )}
                  >
                    {activeTaskIcon ? <FontAwesomeIcon icon={activeTaskIcon} /> : <FontAwesomeIcon icon={faLayerGroup} />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="w-full overflow-hidden break-words text-center font-semibold leading-tight tracking-tight text-slate-100 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] text-[clamp(1.45rem,4.2vw,4.1rem)] [@media(max-width:900px)]:text-[clamp(1.25rem,5vw,2.2rem)]">
                      {taskTitle}
                    </h2>
                  </div>
                </div>

                <p
                  className={classNames(
                    'relative mt-2.5 w-full max-w-full px-2 pb-1 text-center select-none font-bold leading-[0.86] tracking-tight text-slate-100 tabular-nums text-[clamp(4rem,13.5vw,17rem)] [@media(max-width:900px)]:text-[clamp(3.25rem,12vw,8rem)]',
                    accentTimeGlowClassName,
                  )}
                >
                  {stopwatchLabel}
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-start justify-center pt-0.5 sm:pt-1.5">
                <div className="relative h-[min(50vh,76vw,22.5rem)] w-[min(50vh,76vw,22.5rem)] min-h-[15.8rem] min-w-[15.8rem] sm:min-h-[16.8rem] sm:min-w-[16.8rem] lg:h-[min(54vh,24rem)] lg:w-[min(54vh,24rem)] lg:min-h-[17.8rem] lg:min-w-[17.8rem]">
                  <div
                    className={classNames('absolute inset-0 rounded-full p-[4px]', isTimerCompletionVisual && 'timer-complete-ring-breathe')}
                    style={isTimerCompletionVisual ? { ...timerRingStyle, ...timerCompletePulseStyle } : timerRingStyle}
                  >
                    {isTimerCompletionVisual ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[-6px] rounded-full timer-complete-aura-breathe"
                        style={timerCompletePulseStyle}
                      />
                    ) : null}
                    <div
                      className={classNames(
                        'flex h-full w-full flex-col items-center justify-center rounded-full border border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),rgba(2,6,23,0.72)_55%,rgba(2,6,23,0.88))] px-8 text-center',
                        isTimerCompletionVisual && 'timer-complete-core-breathe',
                      )}
                      style={isTimerCompletionVisual ? timerCompletePulseStyle : undefined}
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex items-start justify-center gap-2 sm:gap-2.5" ref={timerFieldsRef}>
                          <div className="flex flex-col items-center">
                            <input
                              aria-label="HH"
                              className={timerInputClassName}
                              inputMode="numeric"
                              onBlur={onTimerFieldBlur}
                              onChange={(event) => onTimerFieldChange('hours', event.target.value)}
                              onFocus={onTimerFieldFocus}
                              onKeyDown={onTimerFieldKeyDown}
                              readOnly={!canEditTimerTarget}
                              value={timerDraftParts.hours}
                            />
                            <span className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-slate-400 sm:text-[11px]">HH</span>
                          </div>
                          <span className="pt-1.5 font-mono text-[24px] text-slate-300/85 sm:pt-2 sm:text-[30px] lg:text-[32px]">:</span>
                          <div className="flex flex-col items-center">
                            <input
                              aria-label="MM"
                              className={timerInputClassName}
                              inputMode="numeric"
                              onBlur={onTimerFieldBlur}
                              onChange={(event) => onTimerFieldChange('minutes', event.target.value)}
                              onFocus={onTimerFieldFocus}
                              onKeyDown={onTimerFieldKeyDown}
                              readOnly={!canEditTimerTarget}
                              value={timerDraftParts.minutes}
                            />
                            <span className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-slate-400 sm:text-[11px]">MM</span>
                          </div>
                          <span className="pt-1.5 font-mono text-[24px] text-slate-300/85 sm:pt-2 sm:text-[30px] lg:text-[32px]">:</span>
                          <div className="flex flex-col items-center">
                            <input
                              aria-label="SS"
                              className={timerInputClassName}
                              inputMode="numeric"
                              onBlur={onTimerFieldBlur}
                              onChange={(event) => onTimerFieldChange('seconds', event.target.value)}
                              onFocus={onTimerFieldFocus}
                              onKeyDown={onTimerFieldKeyDown}
                              readOnly={!canEditTimerTarget}
                              value={timerDraftParts.seconds}
                            />
                            <span className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-slate-400 sm:text-[11px]">SS</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2.5 line-clamp-2 max-w-[84%] bg-slate-200/8 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-300 sm:mt-3 sm:text-[11px]">
                        {taskTitle}
                      </p>
                    </div>
                  </div>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `rotate(${progressDegrees}deg)` }}
                  >
                    <span
                      className={classNames(
                        'absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55 bg-white',
                        isTimerCompletionVisual && 'timer-complete-marker-breathe',
                      )}
                      style={isTimerCompletionVisual ? { ...timerMarkerStyle, ...timerCompletePulseStyle } : timerMarkerStyle}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={classNames('mx-auto mt-1.5 w-full max-w-[500px] border-t pt-3', accentDividerClassName)}>
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-[11px]">
            {copyTotalTaskTime}
            <span className={classNames('ml-2 font-mono tracking-[0.16em]', accentTotalValueClassName)}>
              {totalTaskTimeLabel}
            </span>
          </p>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            aria-label={copyStopFocus}
            className={classNames(
              'grid h-12 w-12 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0 sm:h-[3.25rem] sm:w-[3.25rem]',
              canStopFocus
                ? 'border-slate-600/80 bg-slate-900/45 text-slate-100 shadow-[0_8px_20px_rgba(2,6,23,0.38)] hover:border-slate-500/85 hover:bg-slate-800/55'
                : 'cursor-not-allowed border-slate-800/70 bg-slate-900/20 text-slate-600',
            )}
            disabled={!canStopFocus}
            onClick={onStopFocus}
            type="button"
          >
            <FontAwesomeIcon className="text-[14px]" icon={faStop} />
          </button>

          <button
            aria-label={toggleFocusAriaLabel}
            className={classNames(
              'grid h-12 w-12 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0 sm:h-[3.25rem] sm:w-[3.25rem]',
              canToggleFocus ? accentPlayButtonClassName : 'cursor-not-allowed border-slate-800/70 bg-slate-900/20 text-slate-600',
            )}
            disabled={!canToggleFocus}
            onClick={onToggleFocusClick}
            style={canToggleFocus ? playButtonGlowStyle : undefined}
            type="button"
          >
            <FontAwesomeIcon
              className={classNames(
                isRunning ? 'text-[18px]' : 'translate-x-[1px] text-xl',
                accentPlayIconClassName,
              )}
              icon={toggleFocusIcon}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
