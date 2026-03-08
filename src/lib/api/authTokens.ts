export type AuthTokenBundle = {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInSeconds: number
  issuedAtUtcMs: number
}

export type PersistedAuthTokenEnvelope = {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
}

const AUTH_TOKENS_STORAGE_KEY = 'velor_auth_tokens'

let inMemoryTokens: AuthTokenBundle | null = null

export function getAuthTokens() {
  if (inMemoryTokens) {
    return inMemoryTokens
  }

  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_TOKENS_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthTokenBundle> | null
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const normalized = normalizeTokenBundle({
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      tokenType: parsed.tokenType,
      expiresInSeconds: parsed.expiresInSeconds,
      issuedAtUtcMs: parsed.issuedAtUtcMs,
    })
    if (!normalized) {
      return null
    }

    inMemoryTokens = normalized
    return normalized
  } catch {
    return null
  }
}

export function hasAuthTokens() {
  return getAuthTokens() !== null
}

export function setAuthTokensFromApiEnvelope(envelope: PersistedAuthTokenEnvelope) {
  const normalized = normalizeTokenBundle({
    accessToken: envelope.access_token,
    refreshToken: envelope.refresh_token,
    tokenType: envelope.token_type ?? 'Bearer',
    expiresInSeconds: envelope.expires_in ?? 900,
    issuedAtUtcMs: Date.now(),
  })

  if (!normalized) {
    return null
  }

  inMemoryTokens = normalized
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKENS_STORAGE_KEY, JSON.stringify(normalized))
  }

  return normalized
}

export function clearAuthTokens() {
  inMemoryTokens = null
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_TOKENS_STORAGE_KEY)
}

export function getAccessToken() {
  return getAuthTokens()?.accessToken ?? null
}

export function getRefreshToken() {
  return getAuthTokens()?.refreshToken ?? null
}

function normalizeTokenBundle(candidate: {
  accessToken: unknown
  refreshToken: unknown
  tokenType: unknown
  expiresInSeconds: unknown
  issuedAtUtcMs: unknown
}): AuthTokenBundle | null {
  if (typeof candidate.accessToken !== 'string' || !candidate.accessToken.trim()) {
    return null
  }

  if (typeof candidate.refreshToken !== 'string' || !candidate.refreshToken.trim()) {
    return null
  }

  const tokenType =
    typeof candidate.tokenType === 'string' && candidate.tokenType.trim()
      ? candidate.tokenType.trim()
      : 'Bearer'
  const expiresInSeconds =
    typeof candidate.expiresInSeconds === 'number' && Number.isFinite(candidate.expiresInSeconds)
      ? Math.max(1, Math.floor(candidate.expiresInSeconds))
      : 900
  const issuedAtUtcMs =
    typeof candidate.issuedAtUtcMs === 'number' && Number.isFinite(candidate.issuedAtUtcMs)
      ? Math.floor(candidate.issuedAtUtcMs)
      : Date.now()

  return {
    accessToken: candidate.accessToken.trim(),
    refreshToken: candidate.refreshToken.trim(),
    tokenType,
    expiresInSeconds,
    issuedAtUtcMs,
  }
}
