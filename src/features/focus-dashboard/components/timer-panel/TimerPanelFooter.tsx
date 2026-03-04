import type { CSSProperties } from 'react'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faStop } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames } from '../../utils/classNames'

type TimerPanelFooterProps = {
  copyTotalTaskTime: string
  totalTaskTimeLabel: string
  copyStopFocus: string
  toggleFocusAriaLabel: string
  toggleFocusIcon: IconDefinition
  isRunning: boolean
  canStopFocus: boolean
  canToggleFocus: boolean
  shouldBlinkPlayButton: boolean
  onStopFocus: () => void
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
  toggleFocusAriaLabel,
  toggleFocusIcon,
  isRunning,
  canStopFocus,
  canToggleFocus,
  shouldBlinkPlayButton,
  onStopFocus,
  onToggleFocusClick,
  playButtonGlowStyle,
  accentDividerClassName,
  accentTotalValueClassName,
  accentPlayButtonClassName,
  accentPlayIconClassName,
}: TimerPanelFooterProps) {
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
          aria-label={copyStopFocus}
          className={classNames(
            'grid h-14 w-14 place-items-center rounded-full border transition hover:-translate-y-0.5 active:translate-y-0',
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
