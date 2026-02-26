import { API_BASE_URL, apiFetch, ensureCsrfCookie, parseJsonResponse } from '../../lib/api/http'
import type { AppLocale } from '../../i18n/messages'

export type AuthApiUser = {
  id: string
  display_name: string
  email: string
  locale?: AppLocale
}

type AuthUserEnvelope = {
  data: {
    user: AuthApiUser
  }
}

type RegisterAuthResponse = {
  data: {
    user: AuthApiUser
    workspace: {
      id: string
      name: string
    }
  }
}

type MeAuthResponse = {
  data: AuthApiUser
}

export type RegisterAuthPayload = {
  display_name: string
  email: string
  password: string
  password_confirmation: string
  locale?: AppLocale
}

export async function registerAuth(payload: RegisterAuthPayload) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<RegisterAuthResponse>(response, 'Register failed')
}

export async function loginAuth(payload: { email: string; password: string }) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<AuthUserEnvelope>(response, 'Login failed')
}

export async function meAuth() {
  const response = await apiFetch('/api/v1/auth/me', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<MeAuthResponse>(response, 'Auth session lookup failed')
  return json.data
}

export async function logoutAuth() {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/auth/logout', { method: 'POST' })

  if (response.status === 401) {
    return { message: 'Logged out.' }
  }

  return parseJsonResponse<{ message: string }>(response, 'Logout failed')
}

export function loginWithGoogleRedirect(intent: 'login' | 'register' = 'login') {
  if (typeof window === 'undefined') {
    return
  }

  window.location.href = `${API_BASE_URL}/api/v1/auth/google/redirect?intent=${intent}`
}

