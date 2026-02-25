import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './i18n'
import { LoginPage } from './features/auth/components/LoginPage'
import { RegisterPage } from './features/auth/components/RegisterPage'
import { FocusDashboard } from './features/focus-dashboard/FocusDashboard'
import { HomePage } from './features/home/components/HomePage'
import { stopFocusAudioPlayback } from './lib/audio/uiSfx'

type AppSessionUser = {
  displayName: string
  email: string
}

const SESSION_STORAGE_KEY = 'velor.session.user'
type AppRoute = 'home' | 'login' | 'register' | 'app'

function App() {
  const { locale } = useI18n()
  const [sessionUser, setSessionUser] = useState<AppSessionUser | null>(null)
  const [currentPath, setCurrentPath] = useState(() => getBrowserPath())
  const fallbackDisplayName = locale === 'es' ? 'Usuario Velor' : 'Velor User'
  const googleUserDisplayName = locale === 'es' ? 'Usuario de Google' : 'Google User'

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as Partial<AppSessionUser>
      if (typeof parsed.email !== 'string' || !parsed.email.trim()) {
        return
      }

      setSessionUser({
        email: parsed.email.trim().toLowerCase(),
        displayName:
          typeof parsed.displayName === 'string' && parsed.displayName.trim()
            ? parsed.displayName.trim()
            : deriveDisplayNameFromEmail(parsed.email, fallbackDisplayName),
      })
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [fallbackDisplayName])

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
    const route = resolveRoute(currentPath)

    if (route === 'app' && !sessionUser) {
      navigateTo('/login', true)
      setCurrentPath('/login')
      return
    }

    if ((route === 'login' || route === 'register') && sessionUser) {
      navigateTo('/app', true)
      setCurrentPath('/app')
      return
    }

    if (!isKnownPath(currentPath)) {
      navigateTo('/', true)
      setCurrentPath('/')
    }
  }, [currentPath, sessionUser])

  const userForDashboard = useMemo(() => {
    return (
      sessionUser ?? {
        displayName: 'Anton Rivera',
        email: 'anton@velor.app',
      }
    )
  }, [sessionUser])

  const handleLogin = ({ email }: { email: string; password: string }) => {
    const nextUser = {
      email,
      displayName: deriveDisplayNameFromEmail(email, fallbackDisplayName),
    }

    setSessionUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
    }
    navigateTo('/app')
    setCurrentPath('/app')
  }
  const handleRegister = ({
    displayName,
    email,
  }: {
    displayName: string
    email: string
    password: string
  }) => {
    const nextUser = {
      email,
      displayName: displayName.trim() || deriveDisplayNameFromEmail(email, fallbackDisplayName),
    }

    setSessionUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
    }
    navigateTo('/app')
    setCurrentPath('/app')
  }
  const handleGoogleAuth = () => {
    const nextUser = {
      email: 'google.user@velor.app',
      displayName: googleUserDisplayName,
    }

    setSessionUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
    }
    navigateTo('/app')
    setCurrentPath('/app')
  }

  const handleSignOut = () => {
    stopFocusAudioPlayback()
    setSessionUser(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    navigateTo('/login')
    setCurrentPath('/login')
  }

  const route = resolveRoute(currentPath)
  const handleCloseAuthForm = () => {
    navigateTo('/')
    setCurrentPath('/')
  }

  if (!sessionUser) {
    if (route === 'register') {
      return (
        <RegisterPage
          onClose={handleCloseAuthForm}
          onOpenLogin={() => {
            navigateTo('/login')
            setCurrentPath('/login')
          }}
          onRegister={handleRegister}
          onRegisterWithGoogle={handleGoogleAuth}
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
