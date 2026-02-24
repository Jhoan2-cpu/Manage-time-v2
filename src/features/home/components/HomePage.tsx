import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faClock,
  faLayerGroup,
  faTableCells,
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
  const { t } = useI18n()
  const previewTask: Task = {
    ...HOME_PREVIEW_TASK,
    title: t('home.previewTaskTitle'),
    statusText: t('home.previewTaskStatus'),
  }

  return (
    <div className="relative h-[100svh] overflow-hidden bg-[#040b17] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#040a16_0%,#030814_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_44%,rgba(59,130,246,0.13),transparent_72%)]" />
        <div className="absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-72 w-72 rounded-full bg-emerald-500/8 blur-[130px]" />
        <div className="absolute bottom-[10%] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/7 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <section className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex h-16 shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <img alt="Velor logo" className="h-10 w-10 object-contain" src="/brand/logo.png" />
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-100">Velor</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{t('common.brand.focusWorkspace')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
              data-sfx-type="off"
              onClick={onOpenLogin}
              type="button"
            >
              {t('common.actions.logIn')}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/12 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-400/45 hover:bg-blue-500/18"
              data-sfx-type="off"
              onClick={onOpenRegister}
              type="button"
            >
              {t('common.actions.register')}
              <FontAwesomeIcon className="text-xs" icon={faArrowRight} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300/85">{t('home.heroEyebrow')}</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              {t('home.heroDescription')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/12 px-4 text-sm font-semibold text-blue-100 shadow-[0_14px_30px_rgba(37,99,235,0.16)] transition hover:border-blue-400/45 hover:bg-blue-500/18"
                data-sfx-type="off"
                onClick={hasSession ? onOpenApp : onOpenRegister}
                type="button"
              >
                <span>{hasSession ? t('home.ctaOpenWorkspace') : t('home.ctaStartWithVelor')}</span>
                <FontAwesomeIcon className="text-xs" icon={faArrowRight} />
              </button>
            </div>

            <div className="mt-7 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <FeaturePill icon={faClock} title={t('home.featureDualTimerTitle')} subtitle={t('home.featureDualTimerSubtitle')} />
              <FeaturePill icon={faTableCells} title={t('home.featureDailyLogTitle')} subtitle={t('home.featureDailyLogSubtitle')} />
              <FeaturePill icon={faLayerGroup} title={t('home.featureTaskQueueTitle')} subtitle={t('home.featureTaskQueueSubtitle')} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="home-preview-float group/home-preview relative mx-auto w-full max-w-[560px] [perspective:1800px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-3xl border border-blue-400/10 bg-blue-500/4 shadow-[0_30px_70px_rgba(8,47,110,0.18)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translate3d(18px,22px,-40px)_rotateX(6deg)_rotateY(-10deg)] group-hover/home-preview:[transform:translate3d(26px,30px,-56px)_rotateX(10deg)_rotateY(-16deg)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-3xl border border-slate-700/45 bg-slate-900/30 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translate3d(9px,12px,-20px)_rotateX(4deg)_rotateY(-7deg)] group-hover/home-preview:[transform:translate3d(14px,18px,-30px)_rotateX(7deg)_rotateY(-11deg)]"
              />
              <div
                className="relative transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] [transform:rotateX(4deg)_rotateY(-8deg)_translateY(0px)] group-hover/home-preview:[transform:rotateX(8deg)_rotateY(-14deg)_translateY(-10px)]"
              >
                <div className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(9,17,33,0.94),rgba(5,11,22,0.94))] p-4 shadow-[0_28px_90px_rgba(1,8,22,0.65)]">
                  <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(65%_50%_at_50%_22%,rgba(59,130,246,0.10),transparent_100%)]" />
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-20 rounded-b-[40px] bg-white/4 blur-xl transition-opacity duration-500 group-hover/home-preview:opacity-90" />
                  <div className="relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(18px)] group-hover/home-preview:[transform:translateZ(26px)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('home.previewTitle')}</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-100">{t('home.previewSubtitle')}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        {t('home.previewLive')}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-3 shadow-[0_16px_30px_rgba(1,8,22,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(26px)] group-hover/home-preview:[transform:translateZ(42px)]">
                      <div className="pointer-events-none flex justify-center">
                        <div className="origin-center scale-[0.96] sm:scale-[1.02]">
                          <TaskCard isRunning={true} sessionCount={3} task={previewTask} />
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-[42px] font-light leading-none tracking-tight text-slate-100 tabular-nums sm:text-[56px]">
                          00:24:31
                        </p>
                        <div className="mx-auto mt-4 h-2 w-full max-w-[360px] overflow-hidden rounded-full bg-slate-900/70">
                          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-blue-400 to-indigo-400" />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <span>0%</span>
                          <span className="text-blue-200">62%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:grid-cols-2 [transform:translateZ(20px)] group-hover/home-preview:[transform:translateZ(34px)]">
                      <PreviewStat title={t('home.previewTrackedToday')} value="10h 42m" />
                      <PreviewStat title={t('home.previewUntrackedTime')} value="1h 18m" />
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
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/70 bg-slate-900/40 text-slate-300">
          <FontAwesomeIcon icon={icon} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{title}</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
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
