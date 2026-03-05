import { useEffect, useRef, useState } from 'react'
import type { ConnectionStatus } from 'laravel-echo'
import type { FocusSessionStateEnvelope, StoppedFocusSessionSummary } from '../api'
import { ensureCsrfCookie } from '../../../lib/api/http'
import { disconnectReverbEchoClient, getOrCreateReverbEchoClient } from '../../../lib/realtime/reverbEcho'

export type FocusRealtimeEventType = 'focus_session.updated' | 'focus_session.stopped'

export type FocusRealtimeEvent = {
  type: FocusRealtimeEventType
  data: FocusSessionStateEnvelope['data'] & {
    stopped_session_summary: StoppedFocusSessionSummary | null
    created_time_entry_id: string | null
  }
  meta: {
    workspace_id: string | null
    user_id: string | null
    event_id: string | null
    origin_device_id: string | null
    emitted_at_utc: string | null
  }
}

type UseFocusRealtimeChannelParams = {
  userId: string | null | undefined
  enabled: boolean
  onEvent: (event: FocusRealtimeEvent) => void
  onReconnectSync?: () => void
}

type RealtimeFocusPayload = {
  type?: string
  meta?: {
    workspace_id?: string | null
    user_id?: string | number | null
    event_id?: string | null
    origin_device_id?: string | null
    emitted_at_utc?: string | null
  }
  data?: {
    server_now_utc?: string | null
    active_focus_session?: FocusSessionStateEnvelope['data']['active_focus_session']
    stopped_session_summary?: StoppedFocusSessionSummary | null
    created_time_entry_id?: string | null
  }
}

export function useFocusRealtimeChannel({
  userId,
  enabled,
  onEvent,
  onReconnectSync,
}: UseFocusRealtimeChannelParams) {
  const onEventRef = useRef(onEvent)
  const onReconnectSyncRef = useRef(onReconnectSync)
  const didConnectOnceRef = useRef(false)
  const [connectionState, setConnectionState] = useState<ConnectionStatus | 'idle'>('idle')

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    onReconnectSyncRef.current = onReconnectSync
  }, [onReconnectSync])

  useEffect(() => {
    if (!enabled || !userId) {
      setConnectionState('idle')
      return
    }

    let isDisposed = false
    let cleanupConnectionListener: (() => void) | undefined
    const channelName = `user.${userId}.focus`

    ;(async () => {
      try {
        await ensureCsrfCookie()
        if (isDisposed) {
          return
        }

        const echo = getOrCreateReverbEchoClient()
        if (!echo) {
          setConnectionState('failed')
          return
        }

        setConnectionState(echo.connectionStatus())
        cleanupConnectionListener = echo.connector.onConnectionChange((status) => {
          if (isDisposed) {
            return
          }

          setConnectionState(status)
          if (status === 'connected') {
            if (didConnectOnceRef.current) {
              onReconnectSyncRef.current?.()
            } else {
              didConnectOnceRef.current = true
            }
          }
        })

        const channel = echo.private(channelName)

        channel
          .subscribed(() => {
            if (isDisposed) {
              return
            }
            setConnectionState('connected')
          })
          .error((error: unknown) => {
            if (isDisposed) {
              return
            }
            console.error('Realtime focus channel error', { channelName }, error)
          })

        channel.listen('.focus_session.updated', (rawEvent: unknown) => {
          if (isDisposed) {
            return
          }

          const normalized = normalizeRealtimeFocusEvent(rawEvent, 'focus_session.updated')
          if (!normalized) {
            return
          }

          onEventRef.current(normalized)
        })

        channel.listen('.focus_session.stopped', (rawEvent: unknown) => {
          if (isDisposed) {
            return
          }

          const normalized = normalizeRealtimeFocusEvent(rawEvent, 'focus_session.stopped')
          if (!normalized) {
            return
          }

          onEventRef.current(normalized)
        })
      } catch (error) {
        if (!isDisposed) {
          setConnectionState('failed')
          console.error('Failed to initialize realtime focus channel', { channelName }, error)
        }
      }
    })()

    return () => {
      isDisposed = true
      setConnectionState('idle')
      cleanupConnectionListener?.()

      disconnectReverbEchoClient()
      didConnectOnceRef.current = false
    }
  }, [enabled, userId])

  return {
    connectionState,
  }
}

function normalizeRealtimeFocusEvent(
  rawEvent: unknown,
  canonicalType: FocusRealtimeEventType,
): FocusRealtimeEvent | null {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null
  }

  const payload = rawEvent as RealtimeFocusPayload
  const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : null
  const data = payload.data && typeof payload.data === 'object' ? payload.data : null

  if (!data) {
    return null
  }

  return {
    type: canonicalType,
    data: {
      server_now_utc: normalizeString(payload.data?.server_now_utc) ?? '',
      active_focus_session: (payload.data?.active_focus_session as FocusSessionStateEnvelope['data']['active_focus_session']) ?? null,
      stopped_session_summary: payload.data?.stopped_session_summary ?? null,
      created_time_entry_id: normalizeString(payload.data?.created_time_entry_id) ?? null,
    },
    meta: {
      workspace_id: normalizeString(meta?.workspace_id) ?? null,
      user_id: normalizeString(meta?.user_id) ?? null,
      event_id: normalizeString(meta?.event_id) ?? null,
      origin_device_id: normalizeString(meta?.origin_device_id) ?? null,
      emitted_at_utc: normalizeString(meta?.emitted_at_utc) ?? null,
    },
  }
}

function normalizeString(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.trunc(value)}`
  }

  return null
}
