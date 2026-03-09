import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faCheck, faGlobe, faSliders, faVolumeHigh } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../../i18n'
import { SettingToggle } from './SettingToggle'

type SettingsPreferencesPanelProps = {
  onLocaleChange: (nextValue: 'es' | 'en') => void
  uiInteractionSfxEnabled: boolean
  uiInteractionSfxVolume: number
  backgroundMusicVolume: number
  timerAlarmVolume: number
  requireTaskSwitchConfirmation: boolean
  onToggleUiInteractionSfx: (nextValue: boolean) => void
  onUiInteractionSfxVolumeChange: (nextValue: number) => void
  onBackgroundMusicVolumeChange: (nextValue: number) => void
  onTimerAlarmVolumeChange: (nextValue: number) => void
  onToggleTaskSwitchConfirmation: (nextValue: boolean) => void
}

export function SettingsPreferencesPanel({
  onLocaleChange,
  uiInteractionSfxEnabled,
  uiInteractionSfxVolume,
  backgroundMusicVolume,
  timerAlarmVolume,
  requireTaskSwitchConfirmation,
  onToggleUiInteractionSfx,
  onUiInteractionSfxVolumeChange,
  onBackgroundMusicVolumeChange,
  onTimerAlarmVolumeChange,
  onToggleTaskSwitchConfirmation,
}: SettingsPreferencesPanelProps) {
  const { locale, t } = useI18n()
  const uiSfxVolumePercent = Math.round(Math.max(0, Math.min(1, uiInteractionSfxVolume)) * 100)
  const volumePercent = Math.round(Math.max(0, Math.min(1, backgroundMusicVolume)) * 100)
  const timerAlarmVolumePercent = Math.round(Math.max(0, Math.min(1, timerAlarmVolume)) * 100)

  return (
    <section className="rounded-2xl bg-[linear-gradient(180deg,rgba(9,18,36,0.92),rgba(6,13,26,0.95))] p-4 shadow-[0_18px_45px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(148,163,184,0.04)] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <FontAwesomeIcon className="text-slate-400" icon={faSliders} />
        <h3 className="text-base font-semibold text-slate-100">{t('settings.panelTitle')}</h3>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900/45 text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <FontAwesomeIcon icon={faGlobe} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">{t('settings.language.title')}</p>
                <p className="text-xs text-slate-500">{t('settings.language.description')}</p>
              </div>
            </div>
            <span className="rounded-md bg-slate-900/45 px-2 py-1 text-xs font-semibold text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
              {t('settings.language.defaultBadge')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { code: 'es', label: t('common.languageNames.es') },
              { code: 'en', label: t('common.languageNames.en') },
            ] as const).map((option) => {
              const isSelected = locale === option.code

              return (
                <button
                  className={`inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    isSelected
                      ? 'bg-blue-500/18 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.42)]'
                      : 'bg-slate-900/45 text-slate-300 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)] hover:bg-slate-800/70'
                  }`}
                  key={option.code}
                  onClick={() => onLocaleChange(option.code)}
                  type="button"
                >
                  <span>{option.label}</span>
                  {isSelected ? <FontAwesomeIcon className="text-[11px]" icon={faCheck} /> : null}
                </button>
              )
            })}
          </div>
        </div>

        <SettingToggle
          checked={uiInteractionSfxEnabled}
          description={t('settings.uiSounds.description')}
          label={t('settings.uiSounds.label')}
          onChange={onToggleUiInteractionSfx}
        />

        <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900/45 text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <FontAwesomeIcon icon={faVolumeHigh} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">{t('settings.uiSoundsVolume.label')}</p>
                <p className="text-xs text-slate-500">{t('settings.uiSoundsVolume.description')}</p>
              </div>
            </div>
            <span className="rounded-md bg-slate-900/45 px-2 py-1 text-xs font-semibold text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
              {uiSfxVolumePercent}%
            </span>
          </div>

          <input
            className="w-full accent-blue-400"
            max={100}
            min={0}
            onChange={(event) => onUiInteractionSfxVolumeChange(Number(event.target.value) / 100)}
            step={1}
            type="range"
            value={uiSfxVolumePercent}
          />
        </div>

        <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900/45 text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <FontAwesomeIcon icon={faVolumeHigh} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">{t('settings.musicVolume.label')}</p>
                <p className="text-xs text-slate-500">{t('settings.musicVolume.description')}</p>
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

        <div className="rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900/45 text-slate-400 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
                <FontAwesomeIcon icon={faBell} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100">{t('settings.timerAlarmVolume.label')}</p>
                <p className="text-xs text-slate-500">{t('settings.timerAlarmVolume.description')}</p>
              </div>
            </div>
            <span className="rounded-md bg-slate-900/45 px-2 py-1 text-xs font-semibold text-slate-200 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
              {timerAlarmVolumePercent}%
            </span>
          </div>

          <input
            className="w-full accent-blue-400"
            max={100}
            min={0}
            onChange={(event) => onTimerAlarmVolumeChange(Number(event.target.value) / 100)}
            step={1}
            type="range"
            value={timerAlarmVolumePercent}
          />
        </div>

        <SettingToggle
          checked={requireTaskSwitchConfirmation}
          description={t('settings.taskSwitchConfirm.description')}
          label={t('settings.taskSwitchConfirm.label')}
          onChange={onToggleTaskSwitchConfirmation}
        />
      </div>

      <div className="mt-5 rounded-xl bg-slate-900/35 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.3)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t('settings.signOutConfirmation.title')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t('settings.signOutConfirmation.description')}</p>
      </div>
    </section>
  )
}
