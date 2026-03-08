import {
  clearAuthTokens,
  getAuthTokens,
  getRefreshToken,
  setAuthTokensFromApiEnvelope,
} from './authTokens'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8001'

type ApiErrorBody = {
  message?: string
  code?: string
  errors?: Record<string, string[]>
  data?: unknown
}

type ApiFetchOptions = RequestInit & {
  authMode?: 'auto' | 'none'
  retryOnAuthError?: boolean
}

type RefreshResponseEnvelope = {
  data?: {
    access_token?: string
    refresh_token?: string
    token_type?: string
    expires_in?: number
  }
}

const AUTH_REFRESH_PATH = '/api/v1/auth/refresh'
const AUTH_ME_PATH = '/api/v1/auth/me'
const AUTH_LOGOUT_PATH = '/api/v1/auth/logout'

let pendingAccessTokenRefresh: Promise<boolean> | null = null

export class ApiHttpError extends Error {
  status: number
  body: ApiErrorBody | null

  constructor(status: number, body: ApiErrorBody | null, fallbackMessage = 'Request failed') {
    super(typeof body?.message === 'string' && body.message.trim() ? body.message : fallbackMessage)
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch(path: string, init: ApiFetchOptions = {}) {
  const {
    authMode = 'auto',
    retryOnAuthError = true,
    ...requestInit
  } = init

  const response = await executeApiFetch(path, requestInit, authMode)
  if (!shouldAttemptAuthRefresh(path, response, authMode, retryOnAuthError)) {
    return response
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    return response
  }

  return executeApiFetch(path, requestInit, authMode)
}

export async function ensureCsrfCookie() {
  // JWT auth no longer needs CSRF bootstrap. Kept as no-op for backward compatibility.
  return
}

export async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await readJsonBody(response)
  if (!response.ok) {
    throw new ApiHttpError(response.status, body, fallbackMessage)
  }

  return (body ?? {}) as T
}

export function getApiErrorFirstMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiHttpError)) {
    return fallback
  }

  const fieldErrors = error.body?.errors
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const messages of Object.values(fieldErrors)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string' && messages[0].trim()) {
        return messages[0]
      }
    }
  }

  if (typeof error.body?.message === 'string' && error.body.message.trim()) {
    return error.body.message
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallback
}

async function readJsonBody(response: Response): Promise<ApiErrorBody | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return null
  }

  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return null
  }
}

async function executeApiFetch(path: string, init: RequestInit, authMode: 'auto' | 'none') {
  const defaultHeaders: HeadersInit = {
    Accept: 'application/json',
    ...(init.body && !hasHeader(init.headers, 'Content-Type')
      ? { 'Content-Type': 'application/json' }
      : {}),
  }
  const mergedHeaders = mergeHeaders(defaultHeaders, init.headers)

  if (authMode !== 'none' && !mergedHeaders.has('Authorization')) {
    const accessToken = getCurrentAccessTokenFromRefreshFlowSafe()
    if (accessToken) {
      mergedHeaders.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: init.credentials ?? 'omit',
    headers: mergedHeaders,
  })
}

function hasHeader(headers: RequestInit['headers'], targetName: string) {
  if (!headers) {
    return false
  }

  if (headers instanceof Headers) {
    return headers.has(targetName)
  }

  if (Array.isArray(headers)) {
    return headers.some(([name]) => name.toLowerCase() === targetName.toLowerCase())
  }

  return Object.keys(headers).some((name) => name.toLowerCase() === targetName.toLowerCase())
}

function mergeHeaders(defaultHeaders: HeadersInit, extraHeaders?: HeadersInit) {
  const merged = new Headers(defaultHeaders)
  if (!extraHeaders) {
    return merged
  }

  const extra = new Headers(extraHeaders)
  extra.forEach((value, key) => {
    merged.set(key, value)
  })

  return merged
}

function shouldAttemptAuthRefresh(
  path: string,
  response: Response,
  authMode: 'auto' | 'none',
  retryOnAuthError: boolean,
) {
  if (authMode === 'none' || !retryOnAuthError || response.status !== 401) {
    return false
  }

  if (!getRefreshToken()) {
    return false
  }

  if (path === AUTH_REFRESH_PATH) {
    return false
  }

  const isAuthPath = path.startsWith('/api/v1/auth/')
  if (isAuthPath && path !== AUTH_ME_PATH && path !== AUTH_LOGOUT_PATH) {
    return false
  }

  return true
}

function getCurrentAccessTokenFromRefreshFlowSafe() {
  try {
    const bundle = getAuthTokens()
    return bundle?.accessToken ?? null
  } catch {
    return null
  }
}

async function refreshAccessToken() {
  if (pendingAccessTokenRefresh) {
    return pendingAccessTokenRefresh
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearAuthTokens()
    return false
  }

  pendingAccessTokenRefresh = (async () => {
    try {
      const response = await executeApiFetch(
        AUTH_REFRESH_PATH,
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
        'none',
      )
      const body = (await readJsonBody(response)) as RefreshResponseEnvelope | null
      if (!response.ok) {
        clearAuthTokens()
        return false
      }

      const tokenPayload = body?.data
      const stored = tokenPayload
        ? setAuthTokensFromApiEnvelope({
          access_token: tokenPayload.access_token ?? '',
          refresh_token: tokenPayload.refresh_token ?? '',
          token_type: tokenPayload.token_type ?? 'Bearer',
          expires_in: tokenPayload.expires_in ?? 900,
        })
        : null

      if (!stored) {
        clearAuthTokens()
        return false
      }

      return true
    } catch {
      clearAuthTokens()
      return false
    } finally {
      pendingAccessTokenRefresh = null
    }
  })()

  return pendingAccessTokenRefresh
}
