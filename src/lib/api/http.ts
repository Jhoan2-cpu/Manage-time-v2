export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8001'

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string[]>
  data?: unknown
}

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

export async function apiFetch(path: string, init: RequestInit = {}) {
  const xsrfToken = getCookieValue('XSRF-TOKEN')
  const shouldAttachXsrfHeader = Boolean(xsrfToken) && !hasHeader(init.headers, 'X-XSRF-TOKEN')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(shouldAttachXsrfHeader ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfToken!) } : {}),
      ...init.headers,
    },
    ...init,
  })

  return response
}

export async function ensureCsrfCookie() {
  await apiFetch('/sanctum/csrf-cookie', { method: 'GET' })
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

function getCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const encodedName = `${encodeURIComponent(name)}=`
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    if (cookie.startsWith(encodedName)) {
      return cookie.slice(encodedName.length)
    }
  }

  return null
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
