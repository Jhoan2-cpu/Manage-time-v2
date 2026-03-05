import { ApiHttpError, apiFetch, ensureCsrfCookie, parseJsonResponse } from '../../lib/api/http'
import type { AppLocale } from '../../i18n/messages'
import {
  isMockBackendEnabled,
  mockCreateTimeEntry,
  mockFocusSessionCommand,
  mockGetActiveFocusSession,
  mockGetHistoryDayDetail,
  mockGetHistoryDays,
  mockGetHistoryOverview,
  mockGetPreferences,
  mockReorderTasks,
  mockStartFocusSession,
  mockUpdatePreferences,
} from '../../lib/mock/mockBackend'

export type AppBootstrapInclude =
  | 'tasks'
  | 'preferences'
  | 'daily_log'
  | 'dashboard_stats'
  | 'active_focus_session'

export type AppBootstrapUser = {
  id: string
  display_name: string
  email: string
  locale?: AppLocale
}

export type AppBootstrapWorkspace = {
  id: string
  name: string
}

export type AppBootstrapPreferences = {
  locale?: AppLocale
  time_zone_name: string
  time_zone_auto_detect: boolean
  ui_sounds_enabled: boolean
  background_music_enabled: boolean
  background_music_volume_percent: number
  confirm_task_switch_enabled: boolean
  sign_out_confirmation_enabled: boolean
}

export type AppBootstrapTaskItem = {
  id: string
  title: string
  color_tag: string
  icon_tag: string
  target_duration_seconds: number | null
  alarm_time_local: string | null
  sort_order: number
  focus_time_total_seconds: number
  focus_sessions_count: number
}

export type AppBootstrapDailyLogEntry = {
  id: string
  entry_type: 'focus' | 'untracked' | 'manual_adjustment'
  task_id: string | null
  task_title: string | null
  task_color_tag: string | null
  task_icon_tag: string | null
  started_at_utc: string
  ended_at_utc: string
  duration_seconds: number
  started_at_local_label: string | null
}

export type AppBootstrapDailyLog = {
  date_local: string
  tracked_seconds: number
  untracked_seconds: number
  entries: AppBootstrapDailyLogEntry[]
}

export type AppBootstrapDashboardStats = {
  tracked_seconds_today: number
  untracked_seconds_today: number
  tracked_sessions_count_today: number
  focus_time_total_seconds: number
}

export type AppBootstrapActiveFocusSession = {
  id: string
  task_id: string
  timer_mode: 'timer' | 'stopwatch'
  session_state: 'running' | 'working' | 'paused'
  target_seconds: number | null
  started_at_utc: string
  last_resumed_at_utc: string | null
  last_paused_at_utc: string | null
  elapsed_seconds_total: number
  version: number
}

export type FocusTimerModeApi = AppBootstrapActiveFocusSession['timer_mode']
export type FocusSessionStateApi = AppBootstrapActiveFocusSession['session_state']

export type AppBootstrapData = {
  server_now_utc: string
  user: AppBootstrapUser
  workspace: AppBootstrapWorkspace
  preferences: AppBootstrapPreferences
  tasks: AppBootstrapTaskItem[]
  daily_log: AppBootstrapDailyLog
  dashboard_stats: AppBootstrapDashboardStats
  active_focus_session: AppBootstrapActiveFocusSession | null
}

type AppBootstrapEnvelope = {
  data: AppBootstrapData
}

type GetAppBootstrapOptions = {
  include?: AppBootstrapInclude[]
}

export type UserPreferences = AppBootstrapPreferences
export type UpdatePreferencesPayload = Partial<UserPreferences>

type PreferencesEnvelope = {
  data: UserPreferences
}

export type TaskApiItem = {
  id: string
  user_id: string
  name: string
  icon_tag: string | null
  color_tag: string | null
  alarm_time_local: string | null
  timer_initial_seconds: number | null
  target_duration_seconds?: number | null
  version: number
  created_at: string
  updated_at: string
}
export type TaskApiColorTag = TaskApiItem['color_tag']
export type TaskApiIconTag = TaskApiItem['icon_tag']

export type CreateTaskPayload = {
  name: string
  color_tag: TaskApiColorTag
  icon_tag: TaskApiIconTag
  alarm_time_local: string | null
  timer_initial_seconds?: number | null
  target_duration_seconds?: number | null
}

export type UpdateTaskPayload = {
  if_version: number
  name?: string
  color_tag?: TaskApiColorTag
  icon_tag?: TaskApiIconTag
  alarm_time_local?: string | null
  timer_initial_seconds?: number | null
  target_duration_seconds?: number | null
}

type TasksListEnvelope = {
  data: TaskApiItem[]
}

type TaskEnvelope = {
  data: TaskApiItem
}

export type TaskVersionConflictCode = 'TASK_VERSION_CONFLICT' | 'VERSION_CONFLICT'

export type TaskVersionConflictEnvelope = {
  message: string
  code: TaskVersionConflictCode
  data?: {
    current?: {
      id?: string
      version?: number
      updated_at?: string
    }
  }
}

export type ActiveFocusSession = AppBootstrapActiveFocusSession

export type FocusStoppedReason =
  | 'manual'
  | 'timer_completed'
  | 'task_switch'
  | 'session_end'
  | 'idle_detected'
  | 'user_stop'
  | 'timer_complete'

export type StoppedFocusSessionSummary = {
  task_id: string | null
  timer_mode: FocusTimerModeApi | null
  elapsed_seconds_final: number
  target_seconds: number | null
  stop_reason?: FocusStoppedReason | null
  stopped_reason?: FocusStoppedReason | null
}

export type FocusSessionStateEnvelope = {
  data: {
    server_now_utc: string
    active_focus_session: ActiveFocusSession | null
    stopped_session_summary?: StoppedFocusSessionSummary | null
    created_time_entry_id?: string
  }
}

export type FocusSessionConflictCode =
  | 'ACTIVE_SESSION_CONFLICT'
  | 'FOCUS_RUNTIME_CONFLICT'
  | 'ACTIVE_SESSION_EXISTS'
  | 'NO_ACTIVE_SESSION'
  | 'VERSION_MISMATCH'
  | 'SESSION_NOT_RUNNING'
  | 'SESSION_NOT_PAUSED'

export type FocusSessionConflictEnvelope = {
  message: string
  code: FocusSessionConflictCode
  data: {
    server_now_utc: string
    active_focus_session: ActiveFocusSession | null
  }
}

export type StartFocusSessionPayload = {
  task_id: string
  timer_mode: FocusTimerModeApi
  target_seconds?: number | null
  elapsed_seconds_seed?: number
}

export type PauseFocusSessionPayload = {
  expected_version: number
}

export type ResumeFocusSessionPayload = {
  expected_version: number
}

export type SwitchTaskFocusSessionPayload = {
  expected_version: number
  task_id: string
  timer_mode?: FocusTimerModeApi
  target_seconds?: number | null
  elapsed_seconds_seed?: number
}

export type StopFocusSessionPayload = {
  expected_version: number
  stop_reason?: FocusStoppedReason
  stopped_reason?: FocusStoppedReason
}

export type ResetFocusSessionPayload = {
  expected_version: number
  task_id: string
}

export type HeartbeatFocusSessionPayload = {
  expected_version: number
}

export type FocusDailyLogFocusEntry = {
  id: string
  user_id?: string
  focus_task_id_nullable?: string | null
  task_title_snapshot?: string | null
  task_icon_snapshot?: string | null
  task_color_snapshot?: string | null
  mode_snapshot?: 'timer' | 'stopwatch' | null
  started_at_utc: string
  ended_at_utc: string | null
  elapsed_seconds: number | null
  stop_reason?: string | null
}

export type FocusDailyLogIdleEntry = {
  id: string
  user_id?: string
  started_at_utc: string
  ended_at_utc: string | null
  elapsed_seconds: number | null
  reason?: string | null
}

export type FocusDailyLogData = {
  date: string
  time_zone_name: string
  focus_time_entries: FocusDailyLogFocusEntry[]
  idle_time_entries: FocusDailyLogIdleEntry[]
}

type FocusDailyLogEnvelope = {
  data: FocusDailyLogData
}

export type HistoryTaskRow = {
  task_id: string | null
  title: string | null
  color_tag: string | null
  icon_tag: string | null
  tracked_seconds: number
  sessions_count: number
}

export type HistoryOverview = {
  date_local: string
  server_now_utc: string
  tracked_seconds: number
  untracked_seconds: number
  tracked_sessions_count: number
  avg_session_seconds: number
  top_task: HistoryTaskRow | null
  time_by_task: HistoryTaskRow[]
}

export type HistoryMatchedTask = {
  task_id: string
  title: string
  color_tag: string | null
  icon_tag: string | null
}

export type HistoryDayRow = {
  date_local: string
  tracked_seconds: number
  untracked_seconds: number
  tracked_sessions_count: number
  task_types_count: number
  matched_tasks: HistoryMatchedTask[]
}

export type HistoryDaysResponse = {
  data: HistoryDayRow[]
  meta: {
    page: number
    per_page: number
    total: number
    last_page: number
  }
}

export type HistoryDailyLogEntry = AppBootstrapDailyLogEntry

export type HistoryDayDetail = {
  date_local: string
  server_now_utc: string
  tracked_seconds: number
  untracked_seconds: number
  tracked_sessions_count: number
  entries: HistoryDailyLogEntry[]
}

export type CreateTimeEntryPayload = {
  entry_type: 'manual_adjustment' | 'untracked'
  task_id: string | null
  started_at_utc: string
  ended_at_utc: string
  notes?: string | null
}

export type TimeEntryCreated = {
  id: string
  entry_type: 'manual_adjustment' | 'untracked' | 'focus'
  task_id: string | null
  duration_seconds: number
  started_at_utc: string | null
  ended_at_utc: string | null
}

type HistoryOverviewEnvelope = {
  data: HistoryOverview
}

type HistoryDayDetailEnvelope = {
  data: HistoryDayDetail
}

type TimeEntryCreatedEnvelope = {
  data: TimeEntryCreated
}

export async function getAppBootstrap(options: GetAppBootstrapOptions = {}) {
  try {
    const response = await requestBootstrap(options.include)
    if (response.status === 401) {
      return null
    }

    const json = await parseJsonResponse<AppBootstrapEnvelope>(response, 'App bootstrap failed')
    return json.data
  } catch (error) {
    if (
      error instanceof ApiHttpError &&
      error.status === 422 &&
      Array.isArray(options.include) &&
      options.include.length > 0
    ) {
      const fallbackResponse = await requestBootstrap()
      if (fallbackResponse.status === 401) {
        return null
      }

      const fallbackJson = await parseJsonResponse<AppBootstrapEnvelope>(fallbackResponse, 'App bootstrap failed')
      return fallbackJson.data
    }

    throw error
  }
}

export async function getPreferences() {
  if (isMockBackendEnabled()) {
    const data = mockGetPreferences()
    return data ? (data as UserPreferences) : null
  }

  const response = await apiFetch('/api/v1/preferences', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<PreferencesEnvelope>(response, 'Preferences lookup failed')
  return json.data
}

export async function updatePreferences(payload: UpdatePreferencesPayload) {
  if (isMockBackendEnabled()) {
    const data = mockUpdatePreferences(payload)
    return data ? (data as UserPreferences) : null
  }

  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<PreferencesEnvelope>(response, 'Preferences update failed')
  return json.data
}

export async function getTasks() {
  const response = await apiFetch('/api/v1/focus/tasks', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TasksListEnvelope>(response, 'Tasks lookup failed')
  return json.data
}

export async function createTask(payload: CreateTaskPayload) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/focus/tasks', {
    method: 'POST',
    headers: {
      'X-Origin-Device-Id': getOrCreateOriginDeviceId(),
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TaskEnvelope>(response, 'Task create failed')
  return json.data
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  await ensureCsrfCookie()
  const response = await apiFetch(`/api/v1/focus/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      'X-Origin-Device-Id': getOrCreateOriginDeviceId(),
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TaskEnvelope>(response, 'Task update failed')
  return json.data
}

export async function deleteTask(taskId: string, options: { ifVersion: number }) {
  await ensureCsrfCookie()
  const expectedVersion = Math.max(1, Math.floor(options.ifVersion))
  const response = await apiFetch(`/api/v1/focus/tasks/${encodeURIComponent(taskId)}?if_version=${expectedVersion}`, {
    method: 'DELETE',
    headers: {
      'If-Match': `${expectedVersion}`,
      'X-Origin-Device-Id': getOrCreateOriginDeviceId(),
    },
  })

  if (response.status === 401) {
    return null
  }

  if (response.status === 204) {
    return 'deleted' as const
  }

  if (!response.ok) {
    await parseJsonResponse<unknown>(response, 'Task delete failed')
  }

  return 'deleted' as const
}

export async function reorderTasks(taskIdsInOrder: string[]) {
  if (isMockBackendEnabled()) {
    const data = mockReorderTasks(taskIdsInOrder)
    return data ? (data as TaskApiItem[]) : null
  }

  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/tasks/reorder', {
    method: 'POST',
    body: JSON.stringify({ ordered_task_ids: taskIdsInOrder }),
  })

  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TasksListEnvelope>(response, 'Task reorder failed')
  return json.data
}

export async function getActiveFocusSession() {
  if (isMockBackendEnabled()) {
    const data = mockGetActiveFocusSession()
    return data ? (data as FocusSessionStateEnvelope) : null
  }

  const response = await apiFetch('/api/v1/focus-sessions/active', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<FocusSessionStateEnvelope>(response, 'Active focus session lookup failed')
}

export async function startFocusSession(payload: StartFocusSessionPayload) {
  if (isMockBackendEnabled()) {
    const data = mockStartFocusSession(payload)
    return data ? (data as FocusSessionStateEnvelope) : null
  }

  await ensureCsrfCookie()
  const { elapsed_seconds_seed: _elapsedSeed, ...networkPayload } = payload
  const response = await apiFetch('/api/v1/focus-sessions/start', {
    method: 'POST',
    headers: {
      'X-Origin-Device-Id': getOrCreateOriginDeviceId(),
    },
    body: JSON.stringify(networkPayload),
  })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<FocusSessionStateEnvelope>(response, 'Focus session start failed')
}

export async function focusSessionCommand(
  endpoint: 'pause' | 'resume' | 'switch-task' | 'stop' | 'reset' | 'heartbeat',
  payload:
    | PauseFocusSessionPayload
    | ResumeFocusSessionPayload
    | SwitchTaskFocusSessionPayload
    | StopFocusSessionPayload
    | ResetFocusSessionPayload
    | HeartbeatFocusSessionPayload,
) {
  if (isMockBackendEnabled()) {
    const data = mockFocusSessionCommand(endpoint, payload as Record<string, unknown>)
    return data ? (data as FocusSessionStateEnvelope) : null
  }

  await ensureCsrfCookie()
  const networkPayloadBase =
    endpoint === 'switch-task'
      ? (() => {
        const {
          elapsed_seconds_seed: _elapsedSeed,
          ...rest
        } = payload as SwitchTaskFocusSessionPayload
        return rest
      })()
      : payload
  const networkPayload = endpoint === 'stop'
    ? normalizeStopPayload(networkPayloadBase as StopFocusSessionPayload)
    : networkPayloadBase
  const response = await apiFetch(`/api/v1/focus-sessions/${endpoint}`, {
    method: 'POST',
    headers: {
      'X-Origin-Device-Id': getOrCreateOriginDeviceId(),
    },
    body: JSON.stringify(networkPayload),
  })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<FocusSessionStateEnvelope>(response, `Focus session ${endpoint} failed`)
}

export async function getFocusDailyLog(params: { date: string; time_zone_name: string }) {
  if (isMockBackendEnabled()) {
    const detail = mockGetHistoryDayDetail(params.date, 'asc')
    if (!detail) {
      return null
    }

    const focus_time_entries = detail.entries
      .filter((entry) => entry.entry_type === 'focus' || entry.entry_type === 'manual_adjustment')
      .map((entry) => ({
        id: entry.id,
        focus_task_id_nullable: entry.task_id,
        task_title_snapshot: null,
        task_icon_snapshot: null,
        task_color_snapshot: null,
        mode_snapshot: null,
        started_at_utc: entry.started_at_utc,
        ended_at_utc: entry.ended_at_utc,
        elapsed_seconds: entry.duration_seconds,
        stop_reason: null,
      })) satisfies FocusDailyLogFocusEntry[]

    const idle_time_entries = detail.entries
      .filter((entry) => entry.entry_type === 'untracked')
      .map((entry) => ({
        id: entry.id,
        started_at_utc: entry.started_at_utc,
        ended_at_utc: entry.ended_at_utc,
        elapsed_seconds: entry.duration_seconds,
        reason: 'break',
      })) satisfies FocusDailyLogIdleEntry[]

    return {
      date: detail.date_local,
      time_zone_name: 'UTC',
      focus_time_entries,
      idle_time_entries,
    } satisfies FocusDailyLogData
  }

  const search = new URLSearchParams({
    date: params.date,
    time_zone_name: params.time_zone_name,
  })
  const response = await apiFetch(`/api/v1/focus/daily-log?${search.toString()}`, { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<FocusDailyLogEnvelope>(response, 'Focus daily log lookup failed')
  return json.data
}

export async function createTimeEntry(payload: CreateTimeEntryPayload) {
  if (isMockBackendEnabled()) {
    const data = mockCreateTimeEntry(payload)
    return data ? (data as TimeEntryCreated) : null
  }

  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/time-entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TimeEntryCreatedEnvelope>(response, 'Time entry create failed')
  return json.data
}

export async function getHistoryOverview(date?: string) {
  if (isMockBackendEnabled()) {
    const data = mockGetHistoryOverview(date)
    return data ? (data as HistoryOverview) : null
  }

  const search = new URLSearchParams()
  if (typeof date === 'string' && date.trim()) {
    search.set('date', date.trim())
  }

  const query = search.toString()
  const response = await apiFetch(`/api/v1/history/overview${query ? `?${query}` : ''}`, { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<HistoryOverviewEnvelope>(response, 'History overview lookup failed')
  return json.data
}

export type GetHistoryDaysParams = {
  q?: string
  task_id?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export async function getHistoryDays(params: GetHistoryDaysParams = {}) {
  if (isMockBackendEnabled()) {
    const data = mockGetHistoryDays(params)
    return data ? (data as HistoryDaysResponse) : null
  }

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }

    const normalized = `${value}`.trim()
    if (!normalized) {
      continue
    }

    search.set(key, normalized)
  }

  const query = search.toString()
  const path = `/api/v1/history/days${query ? `?${query}` : ''}`
  const response = await apiFetch(path, { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<HistoryDaysResponse>(response, 'History days lookup failed')
}

export async function getHistoryDayDetail(dateLocal: string, sort: 'asc' | 'desc' = 'asc') {
  if (isMockBackendEnabled()) {
    const data = mockGetHistoryDayDetail(dateLocal, sort)
    return data ? (data as HistoryDayDetail) : null
  }

  const search = new URLSearchParams({ sort })
  const response = await apiFetch(`/api/v1/history/days/${encodeURIComponent(dateLocal)}?${search.toString()}`, {
    method: 'GET',
  })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<HistoryDayDetailEnvelope>(response, 'History day detail lookup failed')
  return json.data
}

export function getFocusSessionConflictFromApiError(error: unknown) {
  if (!(error instanceof ApiHttpError) || error.status !== 409) {
    return null
  }

  const body = error.body as Partial<FocusSessionConflictEnvelope> | null
  if (!body || typeof body !== 'object') {
    return null
  }

  if (!isFocusSessionConflictCode(body.code)) {
    return null
  }

  const data = body.data && typeof body.data === 'object' ? body.data : null

  return {
    message: typeof body.message === 'string' && body.message.trim() ? body.message : 'Focus session conflict.',
    code: body.code,
    data: {
      server_now_utc:
        typeof (data as { server_now_utc?: unknown } | null)?.server_now_utc === 'string'
          ? (((data as { server_now_utc: string } | null)?.server_now_utc) ?? '')
          : '',
      active_focus_session:
        (((data as { active_focus_session?: unknown } | null)?.active_focus_session) as ActiveFocusSession | null | undefined) ??
        null,
    },
  } satisfies FocusSessionConflictEnvelope
}

export function getTaskVersionConflictFromApiError(error: unknown) {
  if (!(error instanceof ApiHttpError) || error.status !== 409) {
    return null
  }

  const body = error.body as Partial<TaskVersionConflictEnvelope> | null
  if (!body || !isTaskVersionConflictCode(body.code)) {
    return null
  }

  return {
    message: typeof body.message === 'string' && body.message.trim() ? body.message : 'Version conflict.',
    code: body.code,
    data: {
      current: {
        id:
          typeof body.data?.current?.id === 'string'
            ? body.data.current.id
            : undefined,
        version:
          typeof body.data?.current?.version === 'number' && Number.isFinite(body.data.current.version)
            ? body.data.current.version
            : undefined,
        updated_at:
          typeof body.data?.current?.updated_at === 'string'
            ? body.data.current.updated_at
            : undefined,
      },
    },
  } satisfies TaskVersionConflictEnvelope
}

async function requestBootstrap(include?: AppBootstrapInclude[]) {
  const includeQuery =
    Array.isArray(include) && include.length > 0
      ? `?include=${encodeURIComponent(include.join(','))}`
      : ''

  return apiFetch(`/api/v1/app/bootstrap${includeQuery}`, { method: 'GET' })
}

export function getOrCreateOriginDeviceId() {
  if (typeof window === 'undefined') {
    return 'web-server'
  }

  const storageKey = 'velor_origin_device_id'
  const existing = window.localStorage.getItem(storageKey)?.trim()
  if (existing) {
    return existing
  }

  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  const next = `web-${randomPart}`
  window.localStorage.setItem(storageKey, next)
  return next
}

function isFocusSessionConflictCode(value: unknown): value is FocusSessionConflictCode {
  return (
    value === 'ACTIVE_SESSION_CONFLICT' ||
    value === 'FOCUS_RUNTIME_CONFLICT' ||
    value === 'ACTIVE_SESSION_EXISTS' ||
    value === 'NO_ACTIVE_SESSION' ||
    value === 'VERSION_MISMATCH' ||
    value === 'SESSION_NOT_RUNNING' ||
    value === 'SESSION_NOT_PAUSED'
  )
}

function isTaskVersionConflictCode(value: unknown): value is TaskVersionConflictCode {
  return value === 'TASK_VERSION_CONFLICT' || value === 'VERSION_CONFLICT'
}

function normalizeStopPayload(payload: StopFocusSessionPayload) {
  const canonicalReason = payload.stop_reason ?? payload.stopped_reason
  if (!canonicalReason) {
    return {
      expected_version: payload.expected_version,
    }
  }

  return {
    expected_version: payload.expected_version,
    stop_reason: canonicalReason,
  }
}
