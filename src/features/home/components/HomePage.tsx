import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faClock,
  faLayerGroup,
  faRightToBracket,
  faTableCells,
  faUser,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import { TaskCard } from '../../focus-dashboard/components/tasks/TaskCard'
import type { Task } from '../../focus-dashboard/types'

type HomePageProps = {
  hasSession?: boolean
  onOpenLogin: () => void
  onOpenRegister: () => void
  onOpenApp?: () => void
}

export function HomePage({ hasSession = false, onOpenLogin, onOpenRegister, onOpenApp }: HomePageProps) {
  const { locale, t } = useI18n()
  const previewTask: Task = {
    ...HOME_PREVIEW_TASK,
    title: t('home.previewTaskTitle'),
    statusText: t('home.previewTaskStatus'),
  }
  const homeCopy =
    locale === 'es'
      ? {
        mobilePreviewKicker: 'Vista previa movil',
        focusSession: 'Sesion de enfoque',
        target: 'Objetivo',
        activeTask: 'Tarea activa',
        trackedTodayShort: 'Hoy',
        progress: 'Progreso',
        breaks: 'Pausas',
      }
      : {
        mobilePreviewKicker: 'Mobile Preview',
        focusSession: 'Focus Session',
        target: 'Target',
        activeTask: 'Active Task',
        trackedTodayShort: 'Today',
        progress: 'Progress',
        breaks: 'Breaks',
      }

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[#040b17] text-slate-100 lg:h-[100svh] lg:overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#040a16_0%,#030814_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_44%,rgba(59,130,246,0.13),transparent_72%)]" />
        <div className="absolute left-[4%] top-[10%] h-56 w-56 rounded-full bg-blue-500/10 blur-[90px] sm:left-[8%] sm:top-[18%] sm:h-72 sm:w-72 sm:blur-[120px]" />
        <div className="absolute right-[4%] top-[16%] h-52 w-52 rounded-full bg-emerald-500/8 blur-[95px] sm:right-[10%] sm:top-[22%] sm:h-72 sm:w-72 sm:blur-[130px]" />
        <div className="absolute bottom-[6%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/7 blur-[100px] sm:bottom-[10%] sm:h-80 sm:w-80 sm:blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 py-3 sm:px-6 sm:py-4 lg:h-full lg:min-h-0 lg:px-10">
        <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 py-1 sm:min-h-16">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img alt="Velor logo" className="h-9 w-9 object-contain sm:h-10 sm:w-10" src="/brand/logo.png" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-100 sm:text-lg">Velor</p>
              <p className="hidden text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:block">{t('common.brand.focusWorkspace')}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label={t('common.actions.logIn')}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-700/70 bg-slate-900/35 text-slate-200 transition hover:bg-slate-800/70 hover:text-slate-100 sm:inline-flex sm:h-auto sm:w-auto sm:items-center sm:gap-2 sm:border-transparent sm:bg-transparent sm:px-3 sm:py-2 sm:text-sm sm:font-medium sm:text-slate-300"
              data-sfx-type="off"
              onClick={onOpenLogin}
              type="button"
            >
              <FontAwesomeIcon className="text-sm sm:text-xs" icon={faRightToBracket} />
              <span className="hidden sm:inline">{t('common.actions.logIn')}</span>
            </button>
            <button
              aria-label={t('common.actions.register')}
              className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/12 text-blue-100 transition hover:border-blue-400/45 hover:bg-blue-500/18 sm:inline-flex sm:h-auto sm:w-auto sm:items-center sm:justify-center sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-semibold"
              data-sfx-type="off"
              onClick={onOpenRegister}
              type="button"
            >
              <FontAwesomeIcon className="hidden text-xs sm:inline-block" icon={faUserPlus} />
              <span className="hidden sm:inline">{t('common.actions.register')}</span>
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 content-start gap-6 pb-5 pt-5 sm:pt-6 lg:content-center lg:items-center lg:gap-6 lg:pb-0 lg:pt-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300/85">{t('home.heroEyebrow')}</p>
            <h1 className="mt-3 max-w-2xl text-[clamp(2rem,8.4vw,2.65rem)] font-semibold leading-[1.06] tracking-tight text-slate-50 sm:text-5xl sm:leading-tight lg:text-6xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-400 sm:text-base sm:leading-relaxed">
              {t('home.heroDescription')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/12 px-4 text-sm font-semibold text-blue-100 shadow-[0_14px_30px_rgba(37,99,235,0.16)] transition hover:border-blue-400/45 hover:bg-blue-500/18 sm:h-11 sm:w-auto"
                data-sfx-type="off"
                onClick={hasSession ? onOpenApp : onOpenRegister}
                type="button"
              >
                <span>{hasSession ? t('home.ctaOpenWorkspace') : t('home.ctaStartWithVelor')}</span>
                <FontAwesomeIcon className="text-xs" icon={faArrowRight} />
              </button>
            </div>

            <div className="mt-7 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              <FeaturePill icon={faClock} title={t('home.featureDualTimerTitle')} subtitle={t('home.featureDualTimerSubtitle')} />
              <FeaturePill icon={faTableCells} title={t('home.featureDailyLogTitle')} subtitle={t('home.featureDailyLogSubtitle')} />
              <FeaturePill icon={faLayerGroup} title={t('home.featureTaskQueueTitle')} subtitle={t('home.featureTaskQueueSubtitle')} />
            </div>
          </div>

          <div className="min-w-0 pb-2 lg:pb-0">
            <MobilePreviewPanel
              focusSessionLabel={homeCopy.focusSession}
              mobilePreviewKicker={homeCopy.mobilePreviewKicker}
              previewLiveLabel={t('home.previewLive')}
              previewSubtitle={t('home.previewSubtitle')}
              previewTaskTitle={previewTask.title}
              progressLabel={homeCopy.progress}
              targetLabel={homeCopy.target}
              breaksLabel={homeCopy.breaks}
              trackedTodayLabel={t('home.previewTrackedToday')}
              trackedTodayShortLabel={homeCopy.trackedTodayShort}
              untrackedTimeLabel={t('home.previewUntrackedTime')}
              activeTaskLabel={homeCopy.activeTask}
            />

            <div className="home-preview-float group/home-preview relative mx-auto w-full max-w-[560px] px-1 [perspective:1200px] lg:[perspective:1800px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden rounded-3xl border border-blue-400/10 bg-blue-500/4 shadow-[0_30px_70px_rgba(8,47,110,0.18)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block lg:[transform:translate3d(18px,22px,-40px)_rotateX(6deg)_rotateY(-10deg)] lg:group-hover/home-preview:[transform:translate3d(26px,30px,-56px)_rotateX(10deg)_rotateY(-16deg)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden rounded-3xl border border-slate-700/45 bg-slate-900/30 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block lg:[transform:translate3d(9px,12px,-20px)_rotateX(4deg)_rotateY(-7deg)] lg:group-hover/home-preview:[transform:translate3d(14px,18px,-30px)_rotateX(7deg)_rotateY(-11deg)]"
              />
              <div
                className="hidden sm:block"
              >
                <div
                  className="relative transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:[transform-style:preserve-3d] lg:[transform:rotateX(4deg)_rotateY(-8deg)_translateY(0px)] lg:group-hover/home-preview:[transform:rotateX(8deg)_rotateY(-14deg)_translateY(-10px)]"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(9,17,33,0.94),rgba(5,11,22,0.94))] p-3 shadow-[0_20px_60px_rgba(1,8,22,0.55)] sm:rounded-3xl sm:p-4 sm:shadow-[0_28px_90px_rgba(1,8,22,0.65)]">
                    <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(65%_50%_at_50%_22%,rgba(59,130,246,0.10),transparent_100%)]" />
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-16 rounded-b-[28px] bg-white/4 blur-xl transition-opacity duration-500 sm:inset-x-10 sm:h-20 sm:rounded-b-[40px] group-hover/home-preview:opacity-90" />
                    <div className="relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:[transform:translateZ(18px)] lg:group-hover/home-preview:[transform:translateZ(26px)]">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('home.previewTitle')}</p>
                          <p className="mt-1 text-base font-semibold tracking-tight text-slate-100 sm:text-lg">{t('home.previewSubtitle')}</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 sm:px-3 sm:text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          {t('home.previewLive')}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-3 shadow-[0_16px_30px_rgba(1,8,22,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:[transform:translateZ(26px)] lg:group-hover/home-preview:[transform:translateZ(42px)]">
                        <div className="pointer-events-none flex justify-center">
                          <div className="origin-center scale-[0.82] sm:scale-[0.96] md:scale-[1.02]">
                            <TaskCard isRunning={true} sessionCount={3} task={previewTask} />
                          </div>
                        </div>

                        <div className="mt-4 text-center">
                          <p className="text-[34px] font-light leading-none tracking-tight text-slate-100 tabular-nums sm:text-[56px]">
                            00:24:31
                          </p>
                          <div className="mx-auto mt-4 h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-slate-900/70 sm:max-w-[360px]">
                            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-blue-400 to-indigo-400" />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.16em]">
                            <span>0%</span>
                            <span className="text-blue-200">62%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:grid-cols-2 lg:[transform:translateZ(20px)] lg:group-hover/home-preview:[transform:translateZ(34px)]">
                        <PreviewStat title={t('home.previewTrackedToday')} value="10h 42m" />
                        <PreviewStat title={t('home.previewUntrackedTime')} value="1h 18m" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const HOME_PREVIEW_TASK: Task = {
  id: 'home-preview-task',
  title: 'Product Planning',
  details: '',
  statusText: 'Preview',
  duration: '00:24:31',
  state: 'active',
  colorTag: 'blue',
  iconTag: 'code',
  targetDurationMinutes: 40,
  alarmTime: null,
}

type FeaturePillProps = {
  icon: typeof faClock
  title: string
  subtitle: string
}

function FeaturePill({ icon, title, subtitle }: FeaturePillProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg  bg-slate-900/40 text-[13px] text-slate-300">
          <FontAwesomeIcon icon={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-slate-100 sm:text-sm">{title}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

type PreviewStatProps = {
  title: string
  value: string
}

function PreviewStat({ title, value }: PreviewStatProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-1 text-base font-semibold text-slate-100">{value}</p>
    </div>
  )
}

type MobilePreviewPanelProps = {
  mobilePreviewKicker: string
  previewSubtitle: string
  previewLiveLabel: string
  focusSessionLabel: string
  activeTaskLabel: string
  previewTaskTitle: string
  progressLabel: string
  targetLabel: string
  breaksLabel: string
  trackedTodayLabel: string
  trackedTodayShortLabel: string
  untrackedTimeLabel: string
}

function MobilePreviewPanel({
  mobilePreviewKicker,
  previewSubtitle,
  previewLiveLabel,
  focusSessionLabel,
  activeTaskLabel,
  previewTaskTitle,
  progressLabel,
  targetLabel,
  breaksLabel,
  trackedTodayLabel,
  trackedTodayShortLabel,
  untrackedTimeLabel,
}: MobilePreviewPanelProps) {
  return (
    <div className="sm:hidden">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(9,17,33,0.96),rgba(5,11,22,0.96))] p-3 shadow-[0_20px_50px_rgba(1,8,22,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(70%_58%_at_52%_18%,rgba(59,130,246,0.10),transparent_100%)]" />
        <div className="relative">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{mobilePreviewKicker}</p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-slate-100">{previewSubtitle}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {previewLiveLabel}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.03)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{activeTaskLabel}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-100">{previewTaskTitle}</p>
              </div>
              <span className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-200">
                {focusSessionLabel}
              </span>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[30px] font-light leading-none tracking-tight text-slate-100 tabular-nums">00:24:31</p>
              <div className="mt-3 overflow-hidden rounded-full bg-slate-900/80">
                <div className="h-2 w-[62%] rounded-full bg-gradient-to-r from-blue-400 to-indigo-400" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <span>{progressLabel}</span>
                <span className="text-blue-200">62%</span>
                <span>{targetLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{trackedTodayShortLabel}</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">10h 42m</p>
              <p className="text-[10px] text-slate-500">{trackedTodayLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{breaksLabel}</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">1h 18m</p>
              <p className="text-[10px] text-slate-500">{untrackedTimeLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
