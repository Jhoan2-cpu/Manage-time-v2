import { API_BASE_URL, apiFetch, parseJsonResponse } from '../../lib/api/http'
import type { AppLocale } from '../../i18n/messages'
import {
  clearAuthTokens,
  getRefreshToken,
  hasAuthTokens,
  setAuthTokensFromApiEnvelope,
} from '../../lib/api/authTokens'
import {
  clearMockSessionFromAuth,
  isMockBackendEnabled,
  mockLoginAuth,
  mockLoginWithGoogle,
  mockLogoutAuth,
  mockMeAuth,
  mockRegisterAuth,
  syncMockSessionFromAuthUser,
} from '../../lib/mock/mockBackend'

const AUTH_USER_ID_STORAGE_KEY = 'velor_auth_user_id'
const MOCK_AUTH_USER_STORAGE_KEY = 'velor_mock_auth_user'
const isAuthDebugEnabled = `${import.meta.env.VITE_AUTH_DEBUG ?? ''}`.toLowerCase() === 'true'
const isAuthOnlyModeEnabled = `${import.meta.env.VITE_AUTH_ONLY_MODE ?? ''}`.trim().toLowerCase() === 'true'

export type AuthApiUser = {
  id: string
  display_name: string
  email: string
  locale?: AppLocale
}

export type AuthApiSettings = {
  locale?: AppLocale
  time_zone_name?: string
}

type AuthTokensPayload = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

type AuthSessionEnvelope = {
  data: AuthTokensPayload & {
    user: AuthApiUser
    settings?: AuthApiSettings
  }
}

type RefreshAuthResponse = {
  data: AuthTokensPayload
}

type MeAuthResponse = {
  data: AuthApiUser & {
    settings?: AuthApiSettings
  }
}

export type RegisterAuthPayload = {
  display_name: string
  email: string
  password: string
  password_confirmation: string
  locale?: AppLocale
  time_zone_name?: string
}

export async function registerAuth(payload: RegisterAuthPayload) {
  if (isMockAuthEnabled()) {
    const mock = mockRegisterAuth({
      display_name: payload.display_name,
      email: payload.email,
      locale: payload.locale,
      time_zone_name: payload.time_zone_name,
    })
    const mockTokens = buildMockAuthTokensPayload()
    const json: AuthSessionEnvelope = {
      data: {
        ...mockTokens,
        user: mock.data.user,
        settings: {
          locale: mock.data.preferences.locale,
          time_zone_name: mock.data.preferences.time_zone_name,
        },
      },
    }
    persistTokensFromAuthPayload(json.data)
    syncMockSessionFromAuthUser(json.data.user)
    setAuthUserIdStorage(json.data.user.id)
    persistMockAuthUserSnapshot(json.data.user)
    return json
  }

  authDebug('info', 'registerAuth request', {
    email: payload.email,
    locale: payload.locale ?? null,
  })
  const response = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    authMode: 'none',
    retryOnAuthError: false,
    body: JSON.stringify(payload),
  })

  const json = await parseJsonResponse<AuthSessionEnvelope>(response, 'Register failed')
  authDebug('info', 'registerAuth success', { userId: json.data.user.id })
  persistTokensFromAuthPayload(json.data)
  syncMockSessionFromAuthUser(json.data.user)
  setAuthUserIdStorage(json.data.user.id)
  return json
}

export async function loginAuth(payload: { email: string; password: string }) {
  if (isMockAuthEnabled()) {
    const mock = mockLoginAuth({ email: payload.email })
    const mockTokens = buildMockAuthTokensPayload()
    const json: AuthSessionEnvelope = {
      data: {
        ...mockTokens,
        user: mock.data.user,
      },
    }
    persistTokensFromAuthPayload(json.data)
    syncMockSessionFromAuthUser(json.data.user)
    setAuthUserIdStorage(json.data.user.id)
    persistMockAuthUserSnapshot(json.data.user)
    return json
  }

  authDebug('info', 'loginAuth request', { email: payload.email })
  const response = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    authMode: 'none',
    retryOnAuthError: false,
    body: JSON.stringify(payload),
  })

  const json = await parseJsonResponse<AuthSessionEnvelope>(response, 'Login failed')
  authDebug('info', 'loginAuth success', { userId: json.data.user.id })
  persistTokensFromAuthPayload(json.data)
  syncMockSessionFromAuthUser(json.data.user)
  setAuthUserIdStorage(json.data.user.id)
  return json
}

export async function refreshAuth() {
  if (isMockAuthEnabled()) {
    let mockUser = mockMeAuth()
    if (!mockUser) {
      const restored = readMockAuthUserSnapshot()
      if (restored) {
        syncMockSessionFromAuthUser(restored)
        mockUser = restored
      }
    }
    if (!mockUser) {
      clearLocalAuthState()
      return null
    }

    const tokens = buildMockAuthTokensPayload()
    persistTokensFromAuthPayload(tokens)
    return tokens
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearLocalAuthState()
    return null
  }

  const response = await apiFetch('/api/v1/auth/refresh', {
    method: 'POST',
    authMode: 'none',
    retryOnAuthError: false,
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (response.status === 401) {
    clearLocalAuthState()
    return null
  }

  const json = await parseJsonResponse<RefreshAuthResponse>(response, 'Refresh failed')
  persistTokensFromAuthPayload(json.data)
  return json.data
}

export async function meAuth() {
  if (isMockAuthEnabled()) {
    let mockUser = mockMeAuth()
    if (!mockUser) {
      const restored = readMockAuthUserSnapshot()
      if (restored) {
        syncMockSessionFromAuthUser(restored)
        mockUser = restored
      }
    }

    if (!mockUser) {
      clearLocalAuthState()
      return null
    }

    syncMockSessionFromAuthUser(mockUser)
    setAuthUserIdStorage(mockUser.id)
    persistMockAuthUserSnapshot(mockUser)
    return mockUser
  }

  if (!hasAuthTokens()) {
    authDebug('warn', 'meAuth skipped: no auth tokens found')
    return null
  }

  const response = await apiFetch('/api/v1/auth/me', { method: 'GET' })
  authDebug('info', 'meAuth response received', { status: response.status })
  if (response.status === 401) {
    authDebug('warn', 'meAuth returned 401; clearing local auth state')
    clearLocalAuthState()
    return null
  }

  const json = await parseJsonResponse<MeAuthResponse>(response, 'Auth session lookup failed')
  authDebug('info', 'meAuth success', { userId: json.data.id, email: json.data.email })
  syncMockSessionFromAuthUser(json.data)
  setAuthUserIdStorage(json.data.id)
  return json.data
}

export async function logoutAuth() {
  if (isMockAuthEnabled()) {
    try {
      const json = mockLogoutAuth()
      return { message: json.message }
    } finally {
      clearLocalAuthState()
    }
  }

  const refreshToken = getRefreshToken()

  try {
    const response = await apiFetch('/api/v1/auth/logout', {
      method: 'POST',
      retryOnAuthError: false,
      ...(refreshToken ? { body: JSON.stringify({ refresh_token: refreshToken }) } : {}),
    })

    if (response.status === 401) {
      return { message: 'Logged out.' }
    }

    return parseJsonResponse<{ message: string }>(response, 'Logout failed')
  } finally {
    clearLocalAuthState()
  }
}

export function loginWithGoogleRedirect(intent?: 'login' | 'register') {
  if (typeof window === 'undefined') {
    return
  }

  // Clear stale OAuth error query before starting a new Google flow.
  if (window.location.pathname === '/login' && window.location.search.includes('auth_error=google')) {
    window.history.replaceState(null, '', '/login')
  }

  if (isMockAuthEnabled()) {
    const resolvedIntent = intent ?? 'login'
    const mock = mockLoginWithGoogle(resolvedIntent)
    const tokens = buildMockAuthTokensPayload()
    persistTokensFromAuthPayload(tokens)
    syncMockSessionFromAuthUser(mock.data.user)
    setAuthUserIdStorage(mock.data.user.id)
    persistMockAuthUserSnapshot(mock.data.user)
    window.location.href = '/app'
    return
  }

  const query = intent ? `?intent=${intent}` : ''
  const redirectUrl = `${API_BASE_URL}/api/v1/auth/google/redirect${query}`
  authDebug('info', 'Google OAuth redirect start', {
    intent: intent ?? 'login',
    url: redirectUrl,
  })
  window.location.href = redirectUrl
}

export function consumeGoogleCallbackAuthTokens() {
  if (typeof window === 'undefined' || window.location.pathname !== '/auth/callback') {
    return false
  }

  authDebug('info', 'Google callback reached', {
    path: window.location.pathname,
    search: window.location.search,
    hashLength: window.location.hash.length,
  })

  const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const hashParams = new URLSearchParams(fragment)
  const queryParams = new URLSearchParams(
    window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search,
  )

  const hashTokens = extractGoogleCallbackTokens(hashParams, 'hash')
  const queryTokens = extractGoogleCallbackTokens(queryParams, 'query')
  const tokenBundle = hashTokens ?? queryTokens
  if (!tokenBundle) {
    authDebug('warn', 'Google callback missing tokens in hash and query', {
      hashKeys: Array.from(hashParams.keys()),
      queryKeys: Array.from(queryParams.keys()),
    })
    return false
  }

  const accessToken = tokenBundle.accessToken
  const refreshToken = tokenBundle.refreshToken
  const tokenType = tokenBundle.tokenType
  const expiresIn = tokenBundle.expiresInSeconds

  if (isMockAuthEnabled()) {
    const mockUserId =
      tokenBundle.params.get('mock_user_id')?.trim() ?? hashParams.get('mock_user_id')?.trim() ?? ''
    const mockUserEmail =
      tokenBundle.params.get('mock_user_email')?.trim() ?? hashParams.get('mock_user_email')?.trim() ?? ''
    if (mockUserId && mockUserEmail) {
      syncMockSessionFromAuthUser({
        id: mockUserId,
        email: mockUserEmail,
        display_name: tokenBundle.params.get('mock_user_display_name')?.trim() || 'Velor User',
        locale: tokenBundle.params.get('mock_user_locale') === 'en' ? 'en' : 'es',
      })
      setAuthUserIdStorage(mockUserId)
      persistMockAuthUserSnapshot({
        id: mockUserId,
        email: mockUserEmail,
        display_name: tokenBundle.params.get('mock_user_display_name')?.trim() || 'Velor User',
        locale: tokenBundle.params.get('mock_user_locale') === 'en' ? 'en' : 'es',
      })
    }
  }

  const stored = setAuthTokensFromApiEnvelope({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
    expires_in: expiresIn,
  })
  if (!stored) {
    authDebug('error', 'Google callback token persistence failed')
    return false
  }

  authDebug('info', 'Google callback tokens persisted', {
    tokenType,
    expiresIn,
    source: tokenBundle.source,
  })
  window.history.replaceState(null, '', '/auth/callback')
  return true
}

function extractGoogleCallbackTokens(
  params: URLSearchParams,
  source: 'hash' | 'query',
): {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInSeconds: number
  params: URLSearchParams
  source: 'hash' | 'query'
} | null {
  const accessToken = params.get('access_token')?.trim() ?? ''
  const refreshToken = params.get('refresh_token')?.trim() ?? ''
  if (!accessToken || !refreshToken) {
    return null
  }

  const tokenType = params.get('token_type')?.trim() || 'Bearer'
  const parsedExpiresIn = Number(params.get('expires_in') ?? '900')
  const expiresInSeconds = Number.isFinite(parsedExpiresIn) ? Math.max(1, Math.floor(parsedExpiresIn)) : 900
  return {
    accessToken,
    refreshToken,
    tokenType,
    expiresInSeconds,
    params,
    source,
  }
}

function persistTokensFromAuthPayload(payload: AuthTokensPayload) {
  setAuthTokensFromApiEnvelope({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type,
    expires_in: payload.expires_in,
  })
}

function buildMockAuthTokensPayload() {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(16).slice(2)}`

  return {
    access_token: `mock_access_${suffix}`,
    refresh_token: `mock_refresh_${suffix}`,
    token_type: 'Bearer',
    expires_in: 900,
  } satisfies AuthTokensPayload
}

function clearLocalAuthState() {
  authDebug('info', 'Clearing local auth state')
  clearMockSessionFromAuth()
  clearAuthTokens()
  clearAuthUserIdStorage()
  clearMockAuthUserSnapshot()
}

function setAuthUserIdStorage(userId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, `${userId}`)
}

function clearAuthUserIdStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY)
}

function persistMockAuthUserSnapshot(user: AuthApiUser) {
  if (typeof window === 'undefined') {
    return
  }

  const normalized: AuthApiUser = {
    id: `${user.id}`,
    display_name: `${user.display_name ?? ''}`.trim() || 'Velor User',
    email: `${user.email ?? ''}`.trim().toLowerCase(),
    locale: user.locale === 'en' ? 'en' : 'es',
  }
  window.localStorage.setItem(MOCK_AUTH_USER_STORAGE_KEY, JSON.stringify(normalized))
}

function readMockAuthUserSnapshot(): AuthApiUser | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(MOCK_AUTH_USER_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthApiUser>
    const id = typeof parsed.id === 'string' ? parsed.id : typeof parsed.id === 'number' ? `${parsed.id}` : ''
    const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : ''
    if (!id || !email) {
      return null
    }

    return {
      id,
      email,
      display_name:
        typeof parsed.display_name === 'string' && parsed.display_name.trim()
          ? parsed.display_name.trim()
          : 'Velor User',
      locale: parsed.locale === 'en' ? 'en' : 'es',
    }
  } catch {
    return null
  }
}

function clearMockAuthUserSnapshot() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(MOCK_AUTH_USER_STORAGE_KEY)
}

function isMockAuthEnabled() {
  if (isAuthOnlyModeEnabled) {
    return true
  }

  const raw = `${import.meta.env.VITE_ENABLE_MOCK_AUTH ?? ''}`.trim().toLowerCase()
  if (raw) {
    return raw === 'true' || raw === '1' || raw === 'yes'
  }

  return isMockBackendEnabled()
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
