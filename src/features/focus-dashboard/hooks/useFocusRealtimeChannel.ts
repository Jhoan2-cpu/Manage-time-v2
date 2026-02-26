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
    user_id: string
    emitted_at_utc: string
  }
}

type UseFocusRealtimeChannelParams = {
  userId: string | null | undefined
  enabled: boolean
  onEvent: (event: FocusRealtimeEvent) => void
  onReconnectSync?: () => void
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

        channel.listen('.focus_session.updated', (event: FocusRealtimeEvent) => {
          if (isDisposed || !event || event.type !== 'focus_session.updated') {
            return
          }
          onEventRef.current(event)
        })

        channel.listen('.focus_session.stopped', (event: FocusRealtimeEvent) => {
          if (isDisposed || !event || event.type !== 'focus_session.stopped') {
            return
          }
          onEventRef.current(event)
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
