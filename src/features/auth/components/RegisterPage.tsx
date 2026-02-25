import { FormEvent, useState, type ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faEnvelope,
  faEye,
  faEyeSlash,
  faLock,
  faRightToBracket,
  faUser,
} from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { useI18n } from '../../../i18n'

type RegisterPageProps = {
  onRegister: (payload: { displayName: string; email: string; password: string }) => void
  onRegisterWithGoogle?: () => void
  onOpenLogin?: () => void
  onGoBack?: () => void
}

export function RegisterPage({ onRegister, onRegisterWithGoogle, onOpenLogin, onGoBack }: RegisterPageProps) {
  const { t } = useI18n()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSubmitDisabled = !displayName.trim() || !email.trim() || !password || !confirmPassword

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = displayName.trim()

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setErrorMessage(t('auth.register.errors.missingFields'))
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage(t('auth.register.errors.invalidEmail'))
      return
    }

    if (password.length < 6) {
      setErrorMessage(t('auth.register.errors.shortPassword'))
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.register.errors.passwordMismatch'))
      return
    }

    setErrorMessage(null)
    onRegister({ displayName: normalizedName, email: normalizedEmail, password })
  }

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[#040b17] text-slate-100 lg:h-[100svh] lg:overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#040a16_0%,#020712_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(72%_68%_at_50%_38%,rgba(16,185,129,0.16),transparent_70%)]" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-emerald-500/10 blur-[90px]" />
        <div className="absolute bottom-6 right-4 h-72 w-72 rounded-full bg-blue-500/8 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl items-start px-4 py-4 sm:px-6 sm:py-5 lg:h-full lg:min-h-0 lg:items-center lg:px-10">
        <div className="grid w-full items-start gap-6 lg:items-center lg:grid-cols-[minmax(0,1.05fr)_440px]">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-6 flex items-center gap-3">
                <img alt="Velor logo" className="h-9 w-9 object-contain" src="/brand/logo.png" />
                <span className="text-2xl font-semibold tracking-tight text-slate-100">Velor</span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/85">{t('auth.register.heroEyebrow')}</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-50 xl:text-5xl">
                {t('auth.register.heroTitle')}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
                {t('auth.register.heroDescription')}
              </p>

              <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                <MetricCard label={t('auth.register.metricOnboardingLabel')} value={t('auth.register.metricOnboardingValue')} />
                <MetricCard label={t('auth.register.metricSignInLabel')} value={t('auth.register.metricSignInValue')} />
                <MetricCard label={t('auth.register.metricWorkspaceLabel')} value={t('auth.register.metricWorkspaceValue')} />
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(62%_48%_at_50%_18%,rgba(16,185,129,0.14),transparent_100%)] blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(10,18,35,0.96),rgba(5,11,22,0.96))] shadow-[0_28px_90px_rgba(1,8,22,0.7)]">
              <div className="border-b border-slate-800/80 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3 lg:hidden">
                  <img alt="Velor logo" className="h-8 w-8 object-contain" src="/brand/logo.png" />
                  <span className="text-xl font-semibold tracking-tight text-slate-100">Velor</span>
                </div>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-slate-100">{t('auth.register.cardTitle')}</p>
                    <p className="text-sm text-slate-400">{t('auth.register.cardSubtitle')}</p>
                  </div>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/35 px-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-100"
                    data-sfx-type="off"
                    onClick={onGoBack}
                    type="button"
                  >
                    <FontAwesomeIcon className="text-xs" icon={faArrowLeft} />
                    {t('common.actions.back')}
                  </button>
                </div>
              </div>

              <form className="px-5 py-5 sm:px-6 sm:py-6" onSubmit={handleSubmit}>
                <div className="grid gap-3">
                  <FieldLabel label={t('auth.register.fieldDisplayName')}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FontAwesomeIcon icon={faUser} />
                      </span>
                      <input
                        autoComplete="name"
                        className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/45 focus:bg-slate-900/70"
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder={t('auth.register.displayNamePlaceholder')}
                        type="text"
                        value={displayName}
                      />
                    </div>
                  </FieldLabel>

                  <FieldLabel label={t('auth.register.fieldEmail')}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FontAwesomeIcon icon={faEnvelope} />
                      </span>
                      <input
                        autoComplete="email"
                        className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/45 focus:bg-slate-900/70"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={t('auth.register.emailPlaceholder')}
                        type="email"
                        value={email}
                      />
                    </div>
                  </FieldLabel>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldLabel label={t('auth.register.fieldPassword')}>
                      <PasswordInput
                        onChange={setPassword}
                        hidePasswordLabel={t('auth.register.hidePassword')}
                        placeholder={t('auth.register.passwordPlaceholder')}
                        showPassword={showPassword}
                        showPasswordLabel={t('auth.register.showPassword')}
                        toggleShowPassword={() => setShowPassword((current) => !current)}
                        value={password}
                      />
                    </FieldLabel>

                    <FieldLabel label={t('auth.register.fieldConfirmPassword')}>
                      <PasswordInput
                        onChange={setConfirmPassword}
                        hidePasswordLabel={t('auth.register.hidePassword')}
                        placeholder={t('auth.register.confirmPasswordPlaceholder')}
                        showPassword={showConfirmPassword}
                        showPasswordLabel={t('auth.register.showPassword')}
                        toggleShowPassword={() => setShowConfirmPassword((current) => !current)}
                        value={confirmPassword}
                      />
                    </FieldLabel>
                  </div>
                </div>

                <button
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/35 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/60"
                  data-sfx-type="off"
                  onClick={onRegisterWithGoogle}
                  type="button"
                >
                  <FontAwesomeIcon className="text-base text-[#EA4335]" icon={faGoogle} />
                  <span>{t('auth.register.signUpWithGoogle')}</span>
                </button>

                {errorMessage ? (
                  <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-4 text-sm font-semibold text-emerald-100 shadow-[0_12px_26px_rgba(16,185,129,0.16)] transition hover:border-emerald-400/45 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitDisabled}
                  type="submit"
                >
                  <FontAwesomeIcon icon={faRightToBracket} />
                  <span>{t('auth.register.createAccount')}</span>
                </button>

                <p className="mt-3 text-center text-xs text-slate-500">
                  {t('auth.register.demoNotice')}
                </p>
                <p className="mt-2 text-center text-sm text-slate-400">
                  {t('auth.register.alreadyHaveAccount')}{' '}
                  <button
                    className="font-semibold text-emerald-300 transition hover:text-emerald-200"
                    data-sfx-type="off"
                    onClick={onOpenLogin}
                    type="button"
                  >
                    {t('auth.register.logIn')}
                  </button>
                </p>
              </form>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

type FieldLabelProps = {
  label: string
  children: ReactNode
}

function FieldLabel({ label, children }: FieldLabelProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

type MetricCardProps = {
  label: string
  value: string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  )
}

type PasswordInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  showPassword: boolean
  showPasswordLabel: string
  hidePasswordLabel: string
  toggleShowPassword: () => void
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  showPassword,
  showPasswordLabel,
  hidePasswordLabel,
  toggleShowPassword,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        <FontAwesomeIcon icon={faLock} />
      </span>
      <input
        className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 pl-10 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/45 focus:bg-slate-900/70"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={showPassword ? 'text' : 'password'}
        value={value}
      />
      <button
        aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        data-sfx-type="off"
        onClick={toggleShowPassword}
        type="button"
      >
        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
      </button>
    </div>
  )
}
