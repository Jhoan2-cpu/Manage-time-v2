import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './i18n'
import { LoginPage } from './features/auth/components/LoginPage'
import { RegisterPage } from './features/auth/components/RegisterPage'
import { useAuthModule } from './features/auth/hooks/useAuthModule'
import { mapAuthApiUserToSessionUser } from './features/auth/utils/sessionUser'
import { FocusDashboard } from './features/focus-dashboard/FocusDashboard'
import {
  getAppBootstrap,
  type AppBootstrapData,
  type AppBootstrapInclude,
  type UserPreferences,
} from './features/focus-dashboard/api'
import { HomePage } from './features/home/components/HomePage'
import { getApiErrorFirstMessage } from './lib/api/http'
import { stopFocusAudioPlayback } from './lib/audio/uiSfx'
import type { AppLocale } from './i18n/messages'
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
  const [appBootstrapStatus, setAppBootstrapStatus] = useState<AppBootstrapStatus>('idle')
  const [appBootstrapData, setAppBootstrapData] = useState<AppBootstrapData | null>(null)
  const [appBootstrapError, setAppBootstrapError] = useState<string | null>(null)
  const [appBootstrapUserId, setAppBootstrapUserId] = useState<string | null>(null)
  const [appBootstrapReloadKey, setAppBootstrapReloadKey] = useState(0)
  const resetAppBootstrapState = () => {
    setAppBootstrapStatus('idle')
    setAppBootstrapData(null)
    setAppBootstrapError(null)
    setAppBootstrapUserId(null)
  }
  const {
    authStatus,
    currentPath,
    fallbackDisplayName,
    forceGuestToLogin,
    goToApp,
    goToLogin,
    goToRegister,
    handleCloseAuthForm,
    handleGoogleAuth,
    handleGoogleRegisterAuth,
    handleLogin,
    handleRegister,
    handleSignOut,
    route,
    sessionUser,
    setSessionUser,
  } = useAuthModule({
    locale,
    onResetAppBootstrapState: resetAppBootstrapState,
    onStopAudioPlayback: stopFocusAudioPlayback,
    setLocale,
  })

  useEffect(() => {
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
          forceGuestToLogin()
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
    forceGuestToLogin,
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

  const handlePreferencesUpdated = (preferences: UserPreferences) => {
    setAppBootstrapData((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        preferences,
        user: {
          ...current.user,
          locale: preferences.locale ?? current.user.locale,
        },
      }
    })

    setSessionUser((current) => {
      if (!current) {
        return current
      }

      const nextLocale = preferences.locale === 'en' ? 'en' : 'es'
      return {
        ...current,
        locale: nextLocale,
      }
    })

    if (preferences.locale && preferences.locale !== locale) {
      setLocale(preferences.locale)
    }
  }

  const hasReadyAppBootstrap =
    route === 'app' &&
    sessionUser !== null &&
    appBootstrapStatus === 'ready' &&
    appBootstrapData !== null &&
    appBootstrapUserId === sessionUser.id

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
          onOpenLogin={goToLogin}
          onRegister={handleRegister}
          onRegisterWithGoogle={handleGoogleRegisterAuth}
        />
      )
    }
    if (route === 'login') {
      return (
        <LoginPage
          onClose={handleCloseAuthForm}
          onLogin={handleLogin}
          onLoginWithGoogle={handleGoogleAuth}
          onOpenRegister={goToRegister}
        />
      )
    }

    return (
      <HomePage
        hasSession={false}
        onOpenLogin={goToLogin}
        onOpenRegister={goToRegister}
      />
    )
  }

  if (route !== 'app') {
    return (
      <HomePage
        hasSession
        onOpenApp={goToApp}
        onOpenLogin={goToApp}
        onOpenRegister={goToApp}
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
      onPreferencesUpdated={handlePreferencesUpdated}
      onSignOut={handleSignOut}
      userEmail={userForDashboard.email}
      userName={userForDashboard.displayName}
    />
  )
}

export default App
