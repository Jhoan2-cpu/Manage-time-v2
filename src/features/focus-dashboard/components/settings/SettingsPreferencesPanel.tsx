import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSliders } from '@fortawesome/free-solid-svg-icons'
import { SettingToggle } from './SettingToggle'

type SettingsPreferencesPanelProps = {
  use24HourClock: boolean
  showDailyLogByDefault: boolean
  reducedMotion: boolean
  onToggle24HourClock: (nextValue: boolean) => void
  onToggleDailyLogDefault: (nextValue: boolean) => void
  onToggleReducedMotion: (nextValue: boolean) => void
}

export function SettingsPreferencesPanel({
  use24HourClock,
  showDailyLogByDefault,
  reducedMotion,
  onToggle24HourClock,
  onToggleDailyLogDefault,
  onToggleReducedMotion,
}: SettingsPreferencesPanelProps) {
  return (
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
          onChange={onToggle24HourClock}
        />
        <SettingToggle
          checked={showDailyLogByDefault}
          description="Open the Daily Log panel by default on desktop."
          label="Open Daily Log on Startup"
          onChange={onToggleDailyLogDefault}
        />
        <SettingToggle
          checked={reducedMotion}
          description="Reduce heavy transitions and UI motion effects."
          label="Reduced Motion"
          onChange={onToggleReducedMotion}
        />
      </div>

      <div className="mt-5 rounded-xl bg-slate-900/35 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">About this section</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          These are simple UI preferences for the current session. The History panel summarizes your Daily Log records
          and focus distribution by task.
        </p>
      </div>
    </section>
  )
}
