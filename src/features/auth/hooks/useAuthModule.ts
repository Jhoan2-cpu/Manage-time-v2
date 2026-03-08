import { useEffect, useMemo, useState } from 'react'
import { getBrowserAppLocale } from '../../../i18n'
import type { AppLocale } from '../../../i18n/messages'
import { hasAuthTokens } from '../../../lib/api/authTokens'
import {
  consumeGoogleCallbackAuthTokens,
  loginAuth,
  loginWithGoogleRedirect,
  logoutAuth,
  meAuth,
  registerAuth,
} from '../api'
import type { AppRoute, AppSessionUser, AuthStatus } from '../types'
import { getBrowserPath, isKnownPath, navigateTo, resolveRoute } from '../utils/routing'
import { mapAuthApiUserToSessionUser } from '../utils/sessionUser'

const isAuthDebugEnabled = `${import.meta.env.VITE_AUTH_DEBUG ?? ''}`.toLowerCase() === 'true'

type RegisterFormPayload = {
  displayName: string
  email: string
  password: string
  passwordConfirmation: string
  timeZoneName: string
}

type UseAuthModuleOptions = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  onResetAppBootstrapState: () => void
  onStopAudioPlayback: () => void
}

let pendingBootstrapMeAuth: ReturnType<typeof meAuth> | null = null

function bootstrapMeAuthOnce() {
  if (!pendingBootstrapMeAuth) {
    pendingBootstrapMeAuth = meAuth().finally(() => {
      pendingBootstrapMeAuth = null
    })
  }

  return pendingBootstrapMeAuth
}

export function useAuthModule({
  locale,
  setLocale,
  onResetAppBootstrapState,
  onStopAudioPlayback,
}: UseAuthModuleOptions) {
  const [sessionUser, setSessionUser] = useState<AppSessionUser | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [currentPath, setCurrentPath] = useState(() => getBrowserPath())
  const fallbackDisplayName = locale === 'es' ? 'Usuario Velor' : 'Velor User'
  const route = useMemo<AppRoute>(() => resolveRoute(currentPath), [currentPath])

  useEffect(() => {
    let didCancel = false
    const fallbackDisplayNameAtBoot = locale === 'es' ? 'Usuario Velor' : 'Velor User'

    const bootstrapAuthSession = async () => {
      setAuthStatus('loading')
      const isGoogleCallbackPath = typeof window !== 'undefined' && window.location.pathname === '/auth/callback'
      authDebug('info', 'bootstrapAuthSession start', {
        currentPath: typeof window !== 'undefined' ? window.location.pathname : null,
        isGoogleCallbackPath,
      })

      try {
        if (isGoogleCallbackPath) {
          const consumed = consumeGoogleCallbackAuthTokens()
          const hasStoredTokens = hasAuthTokens()
          authDebug('info', 'consumeGoogleCallbackAuthTokens result', { consumed, hasStoredTokens })
          if (!consumed) {
            if (hasStoredTokens) {
              authDebug('info', 'Google callback second-pass detected; using previously persisted tokens')
            } else {
            setSessionUser(null)
            setAuthStatus('guest')
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/login?auth_error=google')
            }
            setCurrentPath('/login')
            return
            }
          }
        }

        const user = await bootstrapMeAuthOnce()
        authDebug('info', 'bootstrap meAuth result', { hasUser: Boolean(user) })
        if (didCancel) {
          return
        }

        if (!user) {
          setSessionUser(null)
          setAuthStatus('guest')
          if (isGoogleCallbackPath && typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/login?auth_error=google')
            setCurrentPath('/login')
          }
          return
        }

        const nextUser = mapAuthApiUserToSessionUser(user, fallbackDisplayNameAtBoot)
        setSessionUser(nextUser)
        setLocale(nextUser.locale)
        setAuthStatus('authenticated')
        authDebug('info', 'bootstrap authenticated', { userId: nextUser.id, locale: nextUser.locale })
        if (isGoogleCallbackPath) {
          navigateTo('/app', true)
          setCurrentPath('/app')
        }
      } catch {
        if (didCancel) {
          return
        }

        authDebug('error', 'bootstrapAuthSession failed')
        setSessionUser(null)
        setAuthStatus('guest')
        if (isGoogleCallbackPath && typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/login?auth_error=google')
          setCurrentPath('/login')
        }
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

    if (route === 'auth-callback') {
      if (authStatus === 'authenticated') {
        navigateTo('/app', true)
        setCurrentPath('/app')
      } else {
        navigateTo('/login', true)
        setCurrentPath('/login')
      }
      return
    }

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
  }, [authStatus, currentPath, route])

  const goToApp = () => {
    navigateTo('/app')
    setCurrentPath('/app')
  }

  const goToHome = () => {
    navigateTo('/')
    setCurrentPath('/')
  }

  const goToLogin = () => {
    navigateTo('/login')
    setCurrentPath('/login')
  }

  const goToRegister = () => {
    navigateTo('/register')
    setCurrentPath('/register')
  }

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    authDebug('info', 'handleLogin submit', { email })
    const result = await loginAuth({ email, password })
    const nextUser = mapAuthApiUserToSessionUser(result.data.user, fallbackDisplayName)

    setSessionUser(nextUser)
    if (nextUser.locale !== locale) {
      setLocale(nextUser.locale)
    }

    onResetAppBootstrapState()
    setAuthStatus('authenticated')
    goToApp()
  }

  const handleRegister = async ({
    displayName,
    email,
    password,
    passwordConfirmation,
    timeZoneName,
  }: RegisterFormPayload) => {
    authDebug('info', 'handleRegister submit', { email })
    const result = await registerAuth({
      display_name: displayName.trim(),
      email,
      password,
      password_confirmation: passwordConfirmation,
      locale: getBrowserAppLocale(),
      time_zone_name: timeZoneName.trim() || 'UTC',
    })

    const nextUser = mapAuthApiUserToSessionUser(result.data.user, fallbackDisplayName)
    setSessionUser(nextUser)
    if (nextUser.locale !== locale) {
      setLocale(nextUser.locale)
    }

    onResetAppBootstrapState()
    setAuthStatus('authenticated')
    goToApp()
  }

  const handleGoogleAuth = () => {
    authDebug('info', 'handleGoogleAuth click')
    loginWithGoogleRedirect('login')
  }

  const handleGoogleRegisterAuth = () => {
    authDebug('info', 'handleGoogleRegisterAuth click')
    loginWithGoogleRedirect('register')
  }

  const forceGuestToLogin = () => {
    onStopAudioPlayback()
    onResetAppBootstrapState()
    setSessionUser(null)
    setAuthStatus('guest')
    navigateTo('/login', true)
    setCurrentPath('/login')
  }

  const handleSignOut = async () => {
    onStopAudioPlayback()
    try {
      await logoutAuth()
    } catch {
      // If backend session already expired, clear local auth state anyway.
    }

    onResetAppBootstrapState()
    setSessionUser(null)
    setAuthStatus('guest')
    goToLogin()
  }

  return {
    sessionUser,
    setSessionUser,
    authStatus,
    setAuthStatus,
    currentPath,
    setCurrentPath,
    route,
    fallbackDisplayName,
    handleLogin,
    handleRegister,
    handleGoogleAuth,
    handleGoogleRegisterAuth,
    handleSignOut,
    handleCloseAuthForm: goToHome,
    goToApp,
    goToLogin,
    goToRegister,
    forceGuestToLogin,
  }
}

function authDebug(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  if (!isAuthDebugEnabled) {
    return
  }

  if (level === 'error') {
    console.error(`[auth-debug] ${message}`, data ?? '')
    return
  }

  if (level === 'warn') {
    console.warn(`[auth-debug] ${message}`, data ?? '')
    return
  }

  console.info(`[auth-debug] ${message}`, data ?? '')
}
