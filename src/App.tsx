import { useEffect, useMemo, useState } from 'react'
import { LoginPage } from './features/auth/components/LoginPage'
import { RegisterPage } from './features/auth/components/RegisterPage'
import { FocusDashboard } from './features/focus-dashboard/FocusDashboard'

type AppSessionUser = {
  displayName: string
  email: string
}

const SESSION_STORAGE_KEY = 'velor.session.user'
type AuthScreen = 'login' | 'register'

function App() {
  const [sessionUser, setSessionUser] = useState<AppSessionUser | null>(null)
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')

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
            : deriveDisplayNameFromEmail(parsed.email),
      })
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

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
      displayName: deriveDisplayNameFromEmail(email),
    }

    setAuthScreen('login')
    setSessionUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
    }
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
      displayName: displayName.trim() || deriveDisplayNameFromEmail(email),
    }

    setAuthScreen('login')
    setSessionUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
    }
  }
  const handleGoogleAuth = () => {
    const nextUser = {
      email: 'google.user@velor.app',
      displayName: 'Google User',
    }

    setAuthScreen('login')
    setSessionUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
    }
  }

  const handleSignOut = () => {
    setSessionUser(null)
    setAuthScreen('login')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  if (!sessionUser) {
    if (authScreen === 'register') {
      return (
        <RegisterPage
          onOpenLogin={() => setAuthScreen('login')}
          onRegister={handleRegister}
          onRegisterWithGoogle={handleGoogleAuth}
        />
      )
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onLoginWithGoogle={handleGoogleAuth}
        onOpenRegister={() => setAuthScreen('register')}
      />
    )
  }

  return <FocusDashboard onSignOut={handleSignOut} userEmail={userForDashboard.email} userName={userForDashboard.displayName} />
}

export default App

function deriveDisplayNameFromEmail(email: string) {
  const localPart = email.trim().split('@')[0] ?? ''
  const fallback = 'Velor User'

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
