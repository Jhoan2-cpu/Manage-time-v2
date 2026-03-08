import type { CSSProperties } from 'react'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faRotateRight, faStop } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames } from '../../utils/classNames'

type TimerPanelFooterProps = {
  copyTotalTaskTime: string
  totalTaskTimeLabel: string
  copyStopFocus: string
  copyResetTimer: string
  toggleFocusAriaLabel: string
  toggleFocusIcon: IconDefinition
  isRunning: boolean
  isTimerAlarmActive: boolean
  canStopFocus: boolean
  canToggleFocus: boolean
  shouldBlinkPlayButton: boolean
  onStopFocus: () => void
  onResetAfterTimerAlarm: () => void
  onToggleFocusClick: () => void
  playButtonGlowStyle: CSSProperties
  accentDividerClassName: string
  accentTotalValueClassName: string
  accentPlayButtonClassName: string
  accentPlayIconClassName: string
}

export function TimerPanelFooter({
  copyTotalTaskTime,
  totalTaskTimeLabel,
  copyStopFocus,
  copyResetTimer,
  toggleFocusAriaLabel,
  toggleFocusIcon,
  isRunning,
  isTimerAlarmActive,
  canStopFocus,
  canToggleFocus,
  shouldBlinkPlayButton,
  onStopFocus,
  onResetAfterTimerAlarm,
  onToggleFocusClick,
  playButtonGlowStyle,
  accentDividerClassName,
  accentTotalValueClassName,
  accentPlayButtonClassName,
  accentPlayIconClassName,
}: TimerPanelFooterProps) {
  const isResetMode = isTimerAlarmActive
  const canStopOrReset = isResetMode || canStopFocus
  const stopButtonAriaLabel = isResetMode ? copyResetTimer : copyStopFocus
  const stopButtonIcon = isResetMode ? faRotateRight : faStop
  const handleStopOrResetClick = () => {
    if (isResetMode) {
      onResetAfterTimerAlarm()
      return
    }
    onStopFocus()
  }

  return (
    <>
      <div
        className={classNames(
          'mx-auto w-full max-w-[460px] border-t',
          'mt-0.5 pt-3 sm:mt-auto sm:pt-4',
          '[@media(max-height:840px)]:mt-2 [@media(max-height:840px)]:pt-3',
          accentDividerClassName,
        )}
      >
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
          {copyTotalTaskTime}
          <span className={classNames('ml-2 font-mono tracking-[0.16em]', accentTotalValueClassName)}>
            {totalTaskTimeLabel}
          </span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          aria-label={stopButtonAriaLabel}
          className={classNames(
            'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
            canStopOrReset
              ? 'border-slate-600/80 bg-slate-900/45 text-slate-100 shadow-[0_8px_20px_rgba(2,6,23,0.38)] hover:border-slate-500/85 hover:bg-slate-800/55'
              : 'cursor-not-allowed border-slate-800/70 bg-slate-900/20 text-slate-600',
          )}
          disabled={!canStopOrReset}
          onClick={handleStopOrResetClick}
          type="button"
        >
          <FontAwesomeIcon className="text-[14px]" icon={stopButtonIcon} />
        </button>

        <button
          aria-label={toggleFocusAriaLabel}
          className={classNames(
            'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
            canToggleFocus
              ? classNames(shouldBlinkPlayButton && 'timer-play-paused-blink', accentPlayButtonClassName)
              : 'cursor-not-allowed border-slate-800/70 bg-slate-900/20 text-slate-600',
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
    </>
  )
}
