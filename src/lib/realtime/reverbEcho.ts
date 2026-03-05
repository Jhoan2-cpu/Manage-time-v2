import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { API_BASE_URL } from '../api/http'

declare global {
  interface Window {
    Pusher?: typeof Pusher
  }
}

export type ReverbEchoClient = Echo<'reverb'>

let echoSingleton: ReverbEchoClient | null = null
let echoConfigSignature: string | null = null
let isRealtimeDisabledForSession = false

export function getOrCreateReverbEchoClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (isRealtimeDisabledForSession) {
    return null
  }

  const config = resolveReverbConfig()
  if (!config) {
    return null
  }

  const signature = JSON.stringify(config)
  if (echoSingleton && echoConfigSignature === signature) {
    return echoSingleton
  }

  if (echoSingleton) {
    try {
      echoSingleton.disconnect()
    } catch {
      // noop
    }
    echoSingleton = null
  }

  window.Pusher = Pusher
  echoSingleton = new Echo({
    broadcaster: 'reverb',
    key: config.appKey,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
    auth: {
      headers: {
        ...(config.xsrfToken ? { 'X-XSRF-TOKEN': config.xsrfToken } : {}),
      },
    },
    authorizer: (channel: { name: string }) => ({
      authorize: async (socketId: string, callback: (error: boolean, data: unknown) => void) => {
        try {
          let xsrfToken = readCookieValue('XSRF-TOKEN')
          if (!xsrfToken) {
            await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                Accept: 'application/json',
              },
            })
            xsrfToken = readCookieValue('XSRF-TOKEN')
          }

          const decodedXsrfToken = xsrfToken ? decodeURIComponent(xsrfToken) : null
          const response = await fetch(`${API_BASE_URL}/broadcasting/auth`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
              ...(decodedXsrfToken ? { 'X-XSRF-TOKEN': decodedXsrfToken } : {}),
            },
            body: new URLSearchParams({
              socket_id: socketId,
              channel_name: channel.name,
            }).toString(),
          })

          if (!response.ok) {
            let responseBody: unknown = null
            try {
              responseBody = await response.json()
            } catch {
              responseBody = await response.text()
            }

            if (response.status === 403) {
              isRealtimeDisabledForSession = true
              setTimeout(() => {
                disconnectReverbEchoClient()
              }, 0)
            }

            callback(true, {
              status: response.status,
              body: responseBody,
            })
            return
          }

          const data = await response.json()
          callback(false, data)
        } catch (error) {
          callback(true, error)
        }
      },
    }),
  })
  echoConfigSignature = signature

  return echoSingleton
}

export function disconnectReverbEchoClient() {
  if (!echoSingleton) {
    return
  }

  try {
    echoSingleton.disconnect()
  } catch {
    // noop
  }

  echoSingleton = null
  echoConfigSignature = null
}

export function resetReverbEchoClientDisabledFlag() {
  isRealtimeDisabledForSession = false
}

function resolveReverbConfig() {
  const env = import.meta.env
  const appKey = `${env['VITE_REVERB_APP_KEY'] ?? ''}`.trim()
  if (!appKey) {
    return null
  }

  const scheme = `${env['VITE_REVERB_SCHEME'] ?? 'http'}`.trim().toLowerCase() === 'https' ? 'https' : 'http'
  const host = `${env['VITE_REVERB_HOST'] ?? window.location.hostname ?? 'localhost'}`.trim() || 'localhost'
  const rawPort = Number(env['VITE_REVERB_PORT'] ?? 8080)
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 8080
  const xsrfToken = readCookieValue('XSRF-TOKEN')

  return {
    appKey,
    scheme,
    host,
    port,
    xsrfToken: xsrfToken ? decodeURIComponent(xsrfToken) : null,
  } as const
}

function readCookieValue(name: string) {
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
