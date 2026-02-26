import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './i18n'
import { LoginPage } from './features/auth/components/LoginPage'
import { RegisterPage } from './features/auth/components/RegisterPage'
import { FocusDashboard } from './features/focus-dashboard/FocusDashboard'
import { getAppBootstrap, type AppBootstrapData, type AppBootstrapInclude } from './features/focus-dashboard/api'
import { HomePage } from './features/home/components/HomePage'
import { getApiErrorFirstMessage } from './lib/api/http'
import { stopFocusAudioPlayback } from './lib/audio/uiSfx'
import {
  loginAuth,
  loginWithGoogleRedirect,
  logoutAuth,
  meAuth,
  registerAuth,
  type AuthApiUser,
} from './features/auth/api'
import type { AppLocale } from './i18n/messages'

type AppSessionUser = {
  id: string
  displayName: string
  email: string
  locale: AppLocale
}

type AppRoute = 'home' | 'login' | 'register' | 'app'
type AuthStatus = 'loading' | 'guest' | 'authenticated'
type AppBootstrapStatus = 'idle' | 'loading' | 'ready' | 'error'

const APP_BOOTSTRAP_INCLUDES: AppBootstrapInclude[] = [
  'tasks',
  'preferences',
  'daily_log',
  'dashboard_stats',
  'active_focus_session',
]

function App() {
  const { locale, setLocale } = useI18n()
  const [sessionUser, setSessionUser] = useState<AppSessionUser | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [appBootstrapStatus, setAppBootstrapStatus] = useState<AppBootstrapStatus>('idle')
  const [appBootstrapData, setAppBootstrapData] = useState<AppBootstrapData | null>(null)
  const [appBootstrapError, setAppBootstrapError] = useState<string | null>(null)
  const [appBootstrapUserId, setAppBootstrapUserId] = useState<string | null>(null)
  const [appBootstrapReloadKey, setAppBootstrapReloadKey] = useState(0)
  const [currentPath, setCurrentPath] = useState(() => getBrowserPath())
  const fallbackDisplayName = locale === 'es' ? 'Usuario Velor' : 'Velor User'

  useEffect(() => {
    let didCancel = false
    const fallbackDisplayNameAtBoot = locale === 'es' ? 'Usuario Velor' : 'Velor User'

    const bootstrapAuthSession = async () => {
      setAuthStatus('loading')

      try {
        const user = await meAuth()
        if (didCancel) {
          return
        }

        if (!user) {
          setSessionUser(null)
          setAuthStatus('guest')
          return
        }

        const nextUser = mapAuthApiUserToSessionUser(user, fallbackDisplayNameAtBoot)
        setSessionUser(nextUser)
        setLocale(nextUser.locale)
        setAuthStatus('authenticated')
      } catch {
        if (didCancel) {
          return
        }
        setSessionUser(null)
        setAuthStatus('guest')
      }
    }

    void bootstrapAuthSession()

    return () => {
      didCancel = true
    }
  }, [setLocale])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handlePopState = () => {
      setCurrentPath(getBrowserPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'loading') {
      return
    }

    const route = resolveRoute(currentPath)

    if (route === 'app' && authStatus !== 'authenticated') {
      navigateTo('/login', true)
      setCurrentPath('/login')
      return
    }

    if ((route === 'login' || route === 'register') && authStatus === 'authenticated') {
      navigateTo('/app', true)
      setCurrentPath('/app')
      return
    }

    if (!isKnownPath(currentPath)) {
      navigateTo('/', true)
      setCurrentPath('/')
    }
  }, [authStatus, currentPath])

  useEffect(() => {
    const route = resolveRoute(currentPath)

    if (authStatus !== 'authenticated' || !sessionUser) {
      setAppBootstrapStatus((current) => (current === 'idle' ? current : 'idle'))
      setAppBootstrapData(null)
      setAppBootstrapError(null)
      setAppBootstrapUserId(null)
      return
    }

    if (route !== 'app') {
      return
    }

    if (appBootstrapStatus === 'ready' && appBootstrapData && appBootstrapUserId === sessionUser.id) {
      return
    }

    let didCancel = false

    const loadAppBootstrap = async () => {
      setAppBootstrapStatus('loading')
      setAppBootstrapError(null)
      setAppBootstrapUserId(sessionUser.id)

      try {
        const bootstrap = await getAppBootstrap({ include: APP_BOOTSTRAP_INCLUDES })
        if (didCancel) {
          return
        }

        if (!bootstrap) {
          stopFocusAudioPlayback()
          setAppBootstrapStatus('idle')
          setAppBootstrapData(null)
          setAppBootstrapError(null)
          setAppBootstrapUserId(null)
          setSessionUser(null)
          setAuthStatus('guest')
          navigateTo('/login', true)
          setCurrentPath('/login')
          return
        }

        setAppBootstrapData(bootstrap)
        setAppBootstrapStatus('ready')
        setAppBootstrapError(null)
        setAppBootstrapUserId(sessionUser.id)

        const nextUser = mapAuthApiUserToSessionUser(bootstrap.user, fallbackDisplayName)
        const nextLocale = bootstrap.preferences.locale ?? nextUser.locale

        setSessionUser((current) => (current && current.id === nextUser.id ? { ...nextUser, locale: nextLocale } : current))
        if (nextLocale !== locale) {
          setLocale(nextLocale)
        }
      } catch (error) {
        if (didCancel) {
          return
        }

        setAppBootstrapData(null)
        setAppBootstrapStatus('error')
        setAppBootstrapError(
          getApiErrorFirstMessage(
            error,
            locale === 'es'
              ? 'No se pudo cargar el panel. Intenta nuevamente.'
              : 'Could not load the dashboard. Please try again.',
          ),
        )
      }
    }

    void loadAppBootstrap()

    return () => {
      didCancel = true
    }
  }, [
    appBootstrapData,
    appBootstrapStatus,
    appBootstrapUserId,
    appBootstrapReloadKey,
    authStatus,
    currentPath,
    fallbackDisplayName,
    locale,
    sessionUser,
    setLocale,
  ])

  const userForDashboard = useMemo(() => {
    return (
      sessionUser ?? {
        id: 'demo-user',
        displayName: 'Anton Rivera',
        email: 'anton@velor.app',
        locale,
      }
    )
  }, [locale, sessionUser])

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    const result = await loginAuth({ email, password })
    const nextUser = mapAuthApiUserToSessionUser(result.data.user, fallbackDisplayName)
    setSessionUser(nextUser)
    if (nextUser.locale !== locale) {
      setLocale(nextUser.locale)
    }
    setAuthStatus('authenticated')
    setAppBootstrapStatus('idle')
    setAppBootstrapData(null)
    setAppBootstrapError(null)
    setAppBootstrapUserId(null)
    navigateTo('/app')
    setCurrentPath('/app')
  }
  const handleRegister = async ({
    displayName,
    email,
    password,
    passwordConfirmation,
  }: {
    displayName: string
    email: string
    password: string
    passwordConfirmation: string
  }) => {
    const result = await registerAuth({
      display_name: displayName.trim(),
      email,
      password,
      password_confirmation: passwordConfirmation,
      locale,
    })

    const nextUser = mapAuthApiUserToSessionUser(result.data.user, fallbackDisplayName)
    setSessionUser(nextUser)
    if (nextUser.locale !== locale) {
      setLocale(nextUser.locale)
    }
    setAuthStatus('authenticated')
    setAppBootstrapStatus('idle')
    setAppBootstrapData(null)
    setAppBootstrapError(null)
    setAppBootstrapUserId(null)
    navigateTo('/app')
    setCurrentPath('/app')
  }
  const handleGoogleAuth = () => {
    loginWithGoogleRedirect('login')
  }

  const handleSignOut = async () => {
    stopFocusAudioPlayback()
    try {
      await logoutAuth()
    } catch {
      // If the backend session already expired, clear local auth state anyway.
    }
    setAppBootstrapStatus('idle')
    setAppBootstrapData(null)
    setAppBootstrapError(null)
    setAppBootstrapUserId(null)
    setSessionUser(null)
    setAuthStatus('guest')
    navigateTo('/login')
    setCurrentPath('/login')
  }

  const route = resolveRoute(currentPath)
  const hasReadyAppBootstrap =
    route === 'app' &&
    sessionUser !== null &&
    appBootstrapStatus === 'ready' &&
    appBootstrapData !== null &&
    appBootstrapUserId === sessionUser.id
  const handleCloseAuthForm = () => {
    navigateTo('/')
    setCurrentPath('/')
  }

  if (authStatus === 'loading') {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-[#040b17] text-slate-200">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm">
          {locale === 'es' ? 'Cargando sesión...' : 'Loading session...'}
        </div>
      </div>
    )
  }

  if (authStatus !== 'authenticated' || !sessionUser) {
    if (route === 'register') {
      return (
        <RegisterPage
          onClose={handleCloseAuthForm}
          onOpenLogin={() => {
            navigateTo('/login')
            setCurrentPath('/login')
          }}
          onRegister={handleRegister}
          onRegisterWithGoogle={() => loginWithGoogleRedirect('register')}
        />
      )
    }
    if (route === 'login') {
      return (
        <LoginPage
          onClose={handleCloseAuthForm}
          onLogin={handleLogin}
          onLoginWithGoogle={handleGoogleAuth}
          onOpenRegister={() => {
            navigateTo('/register')
            setCurrentPath('/register')
          }}
        />
      )
    }

    return (
      <HomePage
        hasSession={false}
        onOpenLogin={() => {
          navigateTo('/login')
          setCurrentPath('/login')
        }}
        onOpenRegister={() => {
          navigateTo('/register')
          setCurrentPath('/register')
        }}
      />
    )
  }

  if (route !== 'app') {
    return (
      <HomePage
        hasSession
        onOpenApp={() => {
          navigateTo('/app')
          setCurrentPath('/app')
        }}
        onOpenLogin={() => {
          navigateTo('/app')
          setCurrentPath('/app')
        }}
        onOpenRegister={() => {
          navigateTo('/app')
          setCurrentPath('/app')
        }}
      />
    )
  }

  if (!hasReadyAppBootstrap) {
    if (appBootstrapStatus === 'error') {
      return (
        <div className="grid min-h-[100svh] place-items-center bg-[#040b17] px-4 text-slate-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 shadow-[0_18px_40px_rgba(1,8,22,0.35)]">
            <h2 className="text-base font-semibold text-slate-100">
              {locale === 'es' ? 'No se pudo cargar el panel' : 'Could not load the dashboard'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {appBootstrapError ??
                (locale === 'es'
                  ? 'Ocurrio un error al cargar los datos iniciales.'
                  : 'An error occurred while loading the initial data.')}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center rounded-xl bg-blue-600/85 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                onClick={() => setAppBootstrapReloadKey((current) => current + 1)}
                type="button"
              >
                {locale === 'es' ? 'Reintentar' : 'Retry'}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/70"
                onClick={handleSignOut}
                type="button"
              >
                {locale === 'es' ? 'Cerrar sesion' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="grid min-h-[100svh] place-items-center bg-[#040b17] text-slate-200">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm">
          {locale === 'es' ? 'Cargando panel...' : 'Loading dashboard...'}
        </div>
      </div>
    )
  }

  return (
    <FocusDashboard
      bootstrapData={appBootstrapData}
      key={`dashboard-${sessionUser.id}`}
      onSignOut={handleSignOut}
      userEmail={userForDashboard.email}
      userName={userForDashboard.displayName}
    />
  )
}

export default App

function deriveDisplayNameFromEmail(email: string, fallback = 'Velor User') {
  const localPart = email.trim().split('@')[0] ?? ''

  if (!localPart) {
    return fallback
  }

  const formatted = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

  return formatted || fallback
}

function mapAuthApiUserToSessionUser(user: AuthApiUser, fallbackDisplayName: string): AppSessionUser {
  const normalizedEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''

  return {
    id: user.id,
    email: normalizedEmail,
    displayName:
      typeof user.display_name === 'string' && user.display_name.trim()
        ? user.display_name.trim()
        : deriveDisplayNameFromEmail(normalizedEmail, fallbackDisplayName),
    locale: user.locale === 'en' ? 'en' : 'es',
  }
}

function getBrowserPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname || '/'
}

function isKnownPath(pathname: string) {
  return pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/app'
}

function resolveRoute(pathname: string): AppRoute {
  if (pathname === '/login') {
    return 'login'
  }

  if (pathname === '/register') {
    return 'register'
  }

  if (pathname === '/app') {
    return 'app'
  }

  return 'home'
}

function navigateTo(pathname: string, replace = false) {
  if (typeof window === 'undefined') {
    return
  }

  const nextPath = pathname || '/'
  if (window.location.pathname === nextPath) {
    return
  }

  if (replace) {
    window.history.replaceState(null, '', nextPath)
    return
  }

  window.history.pushState(null, '', nextPath)
}
