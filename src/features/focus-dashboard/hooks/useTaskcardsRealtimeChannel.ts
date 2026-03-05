import { useEffect, useRef, useState } from 'react'
import type { ConnectionStatus } from 'laravel-echo'
import { ensureCsrfCookie } from '../../../lib/api/http'
import { disconnectReverbEchoClient, getOrCreateReverbEchoClient } from '../../../lib/realtime/reverbEcho'

export type TaskcardsRealtimeEventType =
  | 'focus.task.created'
  | 'focus.task.updated'
  | 'focus.task.deleted'

export type TaskcardsRealtimeEvent = {
  event_id?: string | null
  origin_device_id?: string | null
  occurred_at_utc?: string | null
  user_id?: string | null
  event: TaskcardsRealtimeEventType
  task: {
    id?: string
    task_id?: string
    user_id?: string
    name?: string | null
    icon_tag?: string | null
    color_tag?: string | null
    alarm_time_local?: string | null
    timer_initial_seconds?: number | null
    version?: number
    created_at?: string
    updated_at?: string
  }
}

type UseTaskcardsRealtimeChannelParams = {
  userId: string | null | undefined
  enabled: boolean
  onEvent: (event: TaskcardsRealtimeEvent) => void
  onReconnectSync?: () => void
}

type RealtimeTaskPayload = {
  meta?: {
    user_id?: string | number | null
    event_id?: string | null
    emitted_at_utc?: string | null
    occurred_at_utc?: string | null
    origin_device_id?: string | null
  }
  type?: string
  event?: string
  event_id?: string | null
  origin_device_id?: string | null
  occurred_at_utc?: string | null
  emitted_at_utc?: string | null
  task?: RealtimeTaskPayload
  data?: {
    task?: RealtimeTaskPayload
    id?: string | number
    task_id?: string | number
    user_id?: string | number
    version?: number | string
    name?: string | null
    title?: string | null
    icon_tag?: string | null
    icon?: string | null
    color_tag?: string | null
    color?: string | null
    alarm_time_local?: string | null
    alarmTimeLocal?: string | null
    timer_initial_seconds?: number | string | null
    timerInitialSeconds?: number | string | null
    target_duration_seconds?: number | string | null
    created_at?: string
    updated_at?: string
  }
  id?: string | number
  task_id?: string | number
  user_id?: string | number
  name?: string | null
  title?: string | null
  icon_tag?: string | null
  icon?: string | null
  color_tag?: string | null
  color?: string | null
  alarm_time_local?: string | null
  alarmTimeLocal?: string | null
  timer_initial_seconds?: number | string | null
  timerInitialSeconds?: number | string | null
  target_duration_seconds?: number | string | null
  version?: number | string
  created_at?: string
  updated_at?: string
}

export function useTaskcardsRealtimeChannel({
  userId,
  enabled,
  onEvent,
  onReconnectSync,
}: UseTaskcardsRealtimeChannelParams) {
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
    const canonicalChannelName = `user.${userId}.focus.tasks`
    const legacyChannelName = `user.${userId}.taskcards`
    const includeLegacyChannel =
      `${import.meta.env.VITE_TASKCARDS_REALTIME_ENABLE_LEGACY_CHANNEL ?? ''}`.trim().toLowerCase() === 'true'
    const channelNames = includeLegacyChannel
      ? [canonicalChannelName, legacyChannelName]
      : [canonicalChannelName]
    const eventBindings: Array<{ listenName: string; canonical: TaskcardsRealtimeEventType }> = [
      { listenName: '.focus.task.created', canonical: 'focus.task.created' },
      { listenName: '.focus.task.updated', canonical: 'focus.task.updated' },
      { listenName: '.focus.task.deleted', canonical: 'focus.task.deleted' },
      { listenName: '.taskcard.created', canonical: 'focus.task.created' },
      { listenName: '.taskcard.updated', canonical: 'focus.task.updated' },
      { listenName: '.taskcard.deleted', canonical: 'focus.task.deleted' },
      { listenName: '.taskcard.state.changed', canonical: 'focus.task.updated' },
    ]

    ;(async () => {
      try {
        await ensureCsrfCookie()
        if (isDisposed) {
          return
        }

        const echo = getOrCreateReverbEchoClient()
        if (!echo) {
          setConnectionState('failed')
          console.warn(
            'Realtime taskcards disabled: Reverb client is not configured. Define VITE_REVERB_APP_KEY / HOST / PORT.',
          )
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

        for (const channelName of channelNames) {
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
              console.error('Realtime taskcards channel error', { channelName }, error)
            })

          for (const binding of eventBindings) {
            channel.listen(binding.listenName, (rawEvent: unknown) => {
              if (isDisposed) {
                return
              }

              const normalized = normalizeRealtimeTaskEvent(rawEvent, binding.canonical)
              if (!normalized) {
                return
              }

              onEventRef.current(normalized)
            })
          }
        }
      } catch (error) {
        if (!isDisposed) {
          setConnectionState('failed')
          console.error('Failed to initialize realtime taskcards channel', { channelNames }, error)
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

function normalizeRealtimeTaskEvent(
  rawEvent: unknown,
  canonicalEvent: TaskcardsRealtimeEventType,
): TaskcardsRealtimeEvent | null {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null
  }

  const payload = rawEvent as RealtimeTaskPayload
  const payloadMeta = payload.meta && typeof payload.meta === 'object' ? payload.meta : null
  const nestedTask = extractTaskPayload(payload)
  const taskPayload = normalizeTaskPayload(nestedTask ?? payload)
  const normalizedTaskId = taskPayload.id ?? taskPayload.task_id ?? null

  if (!normalizedTaskId) {
    return null
  }

  return {
    event_id:
      normalizeStringLike(payload.event_id) ??
      normalizeStringLike(payloadMeta?.event_id) ??
      null,
    origin_device_id:
      normalizeStringLike(payload.origin_device_id) ??
      normalizeStringLike(payloadMeta?.origin_device_id) ??
      null,
    occurred_at_utc:
      normalizeStringLike(payload.occurred_at_utc) ??
      normalizeStringLike(payload.emitted_at_utc) ??
      normalizeStringLike(payloadMeta?.occurred_at_utc) ??
      normalizeStringLike(payloadMeta?.emitted_at_utc) ??
      null,
    user_id:
      taskPayload.user_id ??
      normalizeStringLike(payload.user_id) ??
      normalizeStringLike(payloadMeta?.user_id) ??
      null,
    event: canonicalEvent,
    task: taskPayload,
  }
}

function extractTaskPayload(payload: RealtimeTaskPayload) {
  if (payload.task && typeof payload.task === 'object') {
    return payload.task
  }

  if (payload.data?.task && typeof payload.data.task === 'object') {
    return payload.data.task
  }

  if (
    payload.data &&
    typeof payload.data === 'object' &&
    (normalizeStringLike(payload.data.id) || normalizeStringLike(payload.data.task_id))
  ) {
    return payload.data as RealtimeTaskPayload
  }

  return null
}

function normalizeTaskPayload(payload: RealtimeTaskPayload): TaskcardsRealtimeEvent['task'] {
  const normalizedName =
    typeof payload.name === 'string'
      ? payload.name
      : typeof payload.title === 'string'
        ? payload.title
        : null
  const normalizedIconTag =
    typeof payload.icon_tag === 'string'
      ? payload.icon_tag
      : typeof payload.icon === 'string'
        ? payload.icon
        : null
  const normalizedColorTag =
    typeof payload.color_tag === 'string'
      ? payload.color_tag
      : typeof payload.color === 'string'
        ? payload.color
        : null
  const normalizedAlarmTimeLocal =
    typeof payload.alarm_time_local === 'string'
      ? payload.alarm_time_local
      : typeof payload.alarmTimeLocal === 'string'
        ? payload.alarmTimeLocal
        : null

  return {
    id: normalizeStringLike(payload.id),
    task_id: normalizeStringLike(payload.task_id),
    user_id: normalizeStringLike(payload.user_id),
    name: normalizedName,
    icon_tag: normalizedIconTag,
    color_tag: normalizedColorTag,
    alarm_time_local: normalizedAlarmTimeLocal,
    timer_initial_seconds: normalizeNullableNonNegativeInt(
      payload.timer_initial_seconds ?? payload.timerInitialSeconds ?? payload.target_duration_seconds,
    ),
    version: normalizeVersion(payload.version),
    created_at: typeof payload.created_at === 'string' ? payload.created_at : undefined,
    updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : undefined,
  }
}

function normalizeStringLike(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.trunc(value)}`
  }

  return undefined
}

function normalizeVersion(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value))
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.floor(parsed))
    }
  }

  return undefined
}

function normalizeNullableNonNegativeInt(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.max(0, Math.floor(parsed))
}
