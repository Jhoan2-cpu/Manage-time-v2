import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './i18n'
import { LoginPage } from './features/auth/components/LoginPage'
import { RegisterPage } from './features/auth/components/RegisterPage'
import { FocusDashboard } from './features/focus-dashboard/FocusDashboard'
import { HomePage } from './features/home/components/HomePage'
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

function App() {
  const { locale, setLocale } = useI18n()
  const [sessionUser, setSessionUser] = useState<AppSessionUser | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
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
    setSessionUser(null)
    setAuthStatus('guest')
    navigateTo('/login')
    setCurrentPath('/login')
  }

  const route = resolveRoute(currentPath)
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

  return <FocusDashboard onSignOut={handleSignOut} userEmail={userForDashboard.email} userName={userForDashboard.displayName} />
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
