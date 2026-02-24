import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faChevronDown, faGlobe, faMagnifyingGlass, faSliders, faVolumeHigh } from '@fortawesome/free-solid-svg-icons'
import { SettingToggle } from './SettingToggle'

type SettingsPreferencesPanelProps = {
  uiInteractionSfxEnabled: boolean
  backgroundMusicVolume: number
  requireTaskSwitchConfirmation: boolean
  autoDetectTimeZone: boolean
  selectedTimeZone: string
  effectiveTimeZone: string
  timeZoneOptions: string[]
  onToggleUiInteractionSfx: (nextValue: boolean) => void
  onBackgroundMusicVolumeChange: (nextValue: number) => void
  onToggleTaskSwitchConfirmation: (nextValue: boolean) => void
  onToggleAutoDetectTimeZone: (nextValue: boolean) => void
  onTimeZoneChange: (nextValue: string) => void
}

export function SettingsPreferencesPanel({
  uiInteractionSfxEnabled,
  backgroundMusicVolume,
  requireTaskSwitchConfirmation,
  autoDetectTimeZone,
  selectedTimeZone,
  effectiveTimeZone,
  timeZoneOptions,
  onToggleUiInteractionSfx,
  onBackgroundMusicVolumeChange,
  onToggleTaskSwitchConfirmation,
  onToggleAutoDetectTimeZone,
  onTimeZoneChange,
}: SettingsPreferencesPanelProps) {
  const volumePercent = Math.round(Math.max(0, Math.min(1, backgroundMusicVolume)) * 100)
  const [isTimeZonePickerOpen, setIsTimeZonePickerOpen] = useState(false)
  const [timeZoneSearch, setTimeZoneSearch] = useState('')
  const timeZonePickerRef = useRef<HTMLDivElement | null>(null)

  const filteredTimeZoneOptions = useMemo(() => {
    const query = timeZoneSearch.trim().toLowerCase()
    if (!query) {
      return timeZoneOptions
    }

    return timeZoneOptions.filter((timeZone) => timeZone.toLowerCase().includes(query))
  }, [timeZoneOptions, timeZoneSearch])

  useEffect(() => {
    if (!isTimeZonePickerOpen) {
      return
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (timeZonePickerRef.current?.contains(target)) {
        return
      }

      setIsTimeZonePickerOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTimeZonePickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isTimeZonePickerOpen])

  useEffect(() => {
    if (autoDetectTimeZone) {
      setIsTimeZonePickerOpen(false)
    }
  }, [autoDetectTimeZone])

  return (
    <section className="rounded-2xl bg-[linear-gradient(180deg,rgba(9,18,36,0.92),rgba(6,13,26,0.95))] p-4 shadow-[0_18px_45px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <FontAwesomeIcon className="text-slate-400" icon={faSliders} />
        <h3 className="text-base font-semibold text-slate-100">Settings</h3>
      </div>

      <div className="space-y-3">
        <SettingToggle
          checked={uiInteractionSfxEnabled}
          description="Enable or disable UI click and typing sounds."
          label="UI Sounds (Click + Typing)"
          onChange={onToggleUiInteractionSfx}
        />

        <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900/45 text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <FontAwesomeIcon icon={faVolumeHigh} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">Background Music Volume</p>
                <p className="text-xs text-slate-500">Adjust the volume of the loop music.</p>
              </div>
            </div>
            <span className="rounded-md bg-slate-900/45 px-2 py-1 text-xs font-semibold text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
              {volumePercent}%
            </span>
          </div>

          <input
            className="w-full accent-blue-400"
            max={100}
            min={0}
            onChange={(event) => onBackgroundMusicVolumeChange(Number(event.target.value) / 100)}
            step={1}
            type="range"
            value={volumePercent}
          />
        </div>

        <SettingToggle
          checked={requireTaskSwitchConfirmation}
          description="Ask for confirmation before switching while another task is currently running."
          label="Confirm Task Switch"
          onChange={onToggleTaskSwitchConfirmation}
        />

        <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900/45 text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <FontAwesomeIcon icon={faGlobe} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">Time Zone</p>
                <p className="text-xs text-slate-500">Used for the header clock and new log timestamps.</p>
              </div>
            </div>
          </div>

          <SettingToggle
            checked={autoDetectTimeZone}
            description={`Current: ${effectiveTimeZone}`}
            label="Auto-detect Time Zone"
            onChange={onToggleAutoDetectTimeZone}
          />

          <div
            className={`mt-3 rounded-xl p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)] ${autoDetectTimeZone ? 'bg-slate-900/20 opacity-70' : 'bg-slate-900/30'}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Manual Time Zone</p>
              <span className="text-[11px] text-slate-500">{timeZoneOptions.length} options</span>
            </div>

            <div className="relative" ref={timeZonePickerRef}>
              <button
                aria-expanded={isTimeZonePickerOpen}
                aria-haspopup="listbox"
                className="inline-flex w-full items-center justify-between gap-2 rounded-lg bg-slate-900/60 px-3 py-2 text-left text-sm text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] outline-none transition hover:bg-slate-900/70 focus-visible:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.45)] disabled:cursor-not-allowed"
                disabled={autoDetectTimeZone}
                onClick={() => {
                  setIsTimeZonePickerOpen((current) => !current)
                  setTimeZoneSearch('')
                }}
                type="button"
              >
                <span className="truncate">{selectedTimeZone}</span>
                <FontAwesomeIcon
                  className={`shrink-0 text-[11px] text-slate-400 transition ${isTimeZonePickerOpen ? 'rotate-180' : ''}`}
                  icon={faChevronDown}
                />
              </button>

              {!autoDetectTimeZone && isTimeZonePickerOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-slate-700/70 bg-[#081225]/98 shadow-[0_20px_45px_rgba(2,8,20,0.45)] backdrop-blur">
                  <div className="border-b border-slate-800/80 p-2">
                    <label className="relative block">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                      </span>
                      <input
                        autoFocus
                        className="w-full rounded-lg bg-slate-900/55 py-2 pl-9 pr-3 text-sm text-slate-100 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.35)] outline-none transition placeholder:text-slate-500 focus:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.45)]"
                        onChange={(event) => setTimeZoneSearch(event.target.value)}
                        placeholder="Search timezone..."
                        value={timeZoneSearch}
                      />
                    </label>
                  </div>

                  <div className="timezone-picker-scroll max-h-64 overflow-y-auto p-1.5" role="listbox">
                    {filteredTimeZoneOptions.length > 0 ? (
                      filteredTimeZoneOptions.map((timeZone) => {
                        const isSelected = timeZone === selectedTimeZone
                        return (
                          <button
                            aria-selected={isSelected}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? 'bg-blue-500/18 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.42)]'
                                : 'text-slate-200 hover:bg-slate-800/70'
                            }`}
                            key={timeZone}
                            onClick={() => {
                              onTimeZoneChange(timeZone)
                              setIsTimeZonePickerOpen(false)
                              setTimeZoneSearch('')
                            }}
                            type="button"
                          >
                            <span className="truncate">{timeZone}</span>
                            {isSelected ? (
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/18 text-[10px] text-blue-200">
                                <FontAwesomeIcon icon={faCheck} />
                              </span>
                            ) : null}
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-slate-500">No time zones match your search.</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              {autoDetectTimeZone ? 'Disable auto-detect to choose a different IANA time zone.' : `Active: ${selectedTimeZone}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-900/35 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sign Out Confirmation</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Sign out will always require confirmation. This setting only affects switching tasks that are already in
          progress.
        </p>
      </div>
    </section>
  )
}
