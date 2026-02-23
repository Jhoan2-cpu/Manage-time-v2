import { FormEvent, useMemo, useState, type ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faEye, faEyeSlash, faLock, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'

type LoginPageProps = {
  onLogin: (payload: { email: string; password: string }) => void
  onLoginWithGoogle?: () => void
  onOpenRegister?: () => void
}

export function LoginPage({ onLogin, onLoginWithGoogle, onOpenRegister }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSubmitDisabled = !email.trim() || !password

  const emailPreviewName = useMemo(() => {
    const localPart = email.trim().split('@')[0] ?? ''
    if (!localPart) {
      return 'Welcome back'
    }

    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ')
  }, [email])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setErrorMessage('Enter your email and password.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.')
      return
    }

    setErrorMessage(null)
    onLogin({ email: normalizedEmail, password })
  }

  return (
    <div className="relative h-[100svh] overflow-hidden bg-[#040b17] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#040a16_0%,#020712_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(72%_68%_at_50%_38%,rgba(59,130,246,0.18),transparent_70%)]" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute bottom-6 right-4 h-72 w-72 rounded-full bg-violet-500/8 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <section className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-4 py-4 sm:px-6 lg:px-10">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_420px]">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-6 flex items-center gap-3">
                <img alt="Velor logo" className="h-9 w-9 object-contain" src="/brand/logo.png" />
                <span className="text-2xl font-semibold tracking-tight text-slate-100">Velor</span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/85">Focus Workspace</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-50 xl:text-5xl">
                Sign in to resume your flow.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
                Continue tracking focused work sessions, review your Daily Log, and manage tasks inside your Velor
                workspace.
              </p>

              <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                <MetricCard label="Session Mode" value="Timer + Stopwatch" />
                <MetricCard label="Daily Log" value="Excel-ready" />
                <MetricCard label="Workspace" value="Task-driven" />
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(62%_48%_at_50%_18%,rgba(59,130,246,0.14),transparent_100%)] blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(10,18,35,0.96),rgba(5,11,22,0.96))] shadow-[0_28px_90px_rgba(1,8,22,0.7)]">
              <div className="border-b border-slate-800/80 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3 lg:hidden">
                  <img alt="Velor logo" className="h-8 w-8 object-contain" src="/brand/logo.png" />
                  <span className="text-xl font-semibold tracking-tight text-slate-100">Velor</span>
                </div>
                <div className="mt-1">
                  <p className="text-lg font-semibold tracking-tight text-slate-100">Log In</p>
                  <p className="text-sm text-slate-400">Access your focus workspace.</p>
                </div>
              </div>

              <form className="px-5 py-5 sm:px-6 sm:py-6" onSubmit={handleSubmit}>
                <div className="mb-5 rounded-2xl border border-slate-800/80 bg-slate-950/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
                  <p className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-100">
                    {emailPreviewName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">Velor personal workspace</p>
                </div>

                <div className="grid gap-4">
                  <FieldLabel label="Email">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FontAwesomeIcon icon={faEnvelope} />
                      </span>
                      <input
                        autoComplete="email"
                        className="h-11 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/45 focus:bg-slate-900/70"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@velor.app"
                        type="email"
                        value={email}
                      />
                    </div>
                  </FieldLabel>

                  <FieldLabel label="Password">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FontAwesomeIcon icon={faLock} />
                      </span>
                      <input
                        autoComplete="current-password"
                        className="h-11 w-full rounded-xl border border-slate-700/70 bg-slate-950/45 pl-10 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/45 focus:bg-slate-900/70"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                      />
                      <button
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                        data-sfx-type="off"
                        onClick={() => setShowPassword((current) => !current)}
                        type="button"
                      >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                  </FieldLabel>
                </div>

                <button
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/35 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/60"
                  data-sfx-type="off"
                  onClick={onLoginWithGoogle}
                  type="button"
                >
                  <FontAwesomeIcon className="text-base text-[#EA4335]" icon={faGoogle} />
                  <span>Continue with Google</span>
                </button>

                {errorMessage ? (
                  <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/14 px-4 text-sm font-semibold text-blue-100 shadow-[0_12px_26px_rgba(37,99,235,0.18)] transition hover:border-blue-400/45 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitDisabled}
                  type="submit"
                >
                  <FontAwesomeIcon icon={faRightToBracket} />
                  <span>Enter Velor</span>
                </button>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Demo login enabled. Any valid email and password will open the dashboard.
                </p>
                <p className="mt-3 text-center text-sm text-slate-400">
                  Need an account?{' '}
                  <button
                    className="font-semibold text-blue-300 transition hover:text-blue-200"
                    data-sfx-type="off"
                    onClick={onOpenRegister}
                    type="button"
                  >
                    Create one
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
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
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
