import { API_BASE_URL, apiFetch, ensureCsrfCookie, parseJsonResponse } from '../../lib/api/http'
import type { AppLocale } from '../../i18n/messages'
import {
  clearMockSessionFromAuth,
  syncMockSessionFromAuthUser,
} from '../../lib/mock/mockBackend'

export type AuthApiUser = {
  id: string | number
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
    preferences?: {
      locale?: AppLocale
      time_zone_name?: string
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
  time_zone_name?: string
}

export async function registerAuth(payload: RegisterAuthPayload) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const json = await parseJsonResponse<RegisterAuthResponse>(response, 'Register failed')
  syncMockSessionFromAuthUser(json.data.user)
  return json
}

export async function loginAuth(payload: { email: string; password: string }) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const json = await parseJsonResponse<AuthUserEnvelope>(response, 'Login failed')
  syncMockSessionFromAuthUser(json.data.user)
  return json
}

export async function meAuth() {
  const response = await apiFetch('/api/v1/auth/me', { method: 'GET' })
  if (response.status === 401) {
    clearMockSessionFromAuth()
    return null
  }

  const json = await parseJsonResponse<MeAuthResponse>(response, 'Auth session lookup failed')
  syncMockSessionFromAuthUser(json.data)
  return json.data
}

export async function logoutAuth() {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/auth/logout', { method: 'POST' })

  if (response.status === 401) {
    clearMockSessionFromAuth()
    return { message: 'Logged out.' }
  }

  const json = await parseJsonResponse<{ message: string }>(response, 'Logout failed')
  clearMockSessionFromAuth()
  return json
}

export function loginWithGoogleRedirect(intent?: 'login' | 'register') {
  if (typeof window === 'undefined') {
    return
  }

  const query = intent ? `?intent=${intent}` : ''
  window.location.href = `${API_BASE_URL}/api/v1/auth/google/redirect${query}`
}
