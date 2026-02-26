import { ApiHttpError, apiFetch, ensureCsrfCookie, parseJsonResponse } from '../../lib/api/http'
import type { AppLocale } from '../../i18n/messages'

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
  session_state: 'running' | 'paused'
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

export type TaskApiItem = AppBootstrapTaskItem
export type TaskApiColorTag = AppBootstrapTaskItem['color_tag']
export type TaskApiIconTag = AppBootstrapTaskItem['icon_tag']

export type CreateTaskPayload = {
  title: string
  color_tag: TaskApiColorTag
  icon_tag: TaskApiIconTag
  target_duration_seconds: number | null
  alarm_time_local: string | null
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>

type TasksListEnvelope = {
  data: TaskApiItem[]
}

type TaskEnvelope = {
  data: TaskApiItem
}

export type ActiveFocusSession = AppBootstrapActiveFocusSession

export type FocusStoppedReason = 'user_stop' | 'timer_complete' | 'task_switch'

export type StoppedFocusSessionSummary = {
  task_id: string | null
  timer_mode: FocusTimerModeApi | null
  elapsed_seconds_final: number
  target_seconds: number | null
  stopped_reason: FocusStoppedReason | null
}

export type FocusSessionStateEnvelope = {
  data: {
    server_now_utc: string
    active_focus_session: ActiveFocusSession | null
    stopped_session_summary?: StoppedFocusSessionSummary | null
  }
}

export type FocusSessionConflictCode =
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
}

export type StopFocusSessionPayload = {
  expected_version: number
  stopped_reason?: FocusStoppedReason
}

export type HeartbeatFocusSessionPayload = {
  expected_version: number
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
  const response = await apiFetch('/api/v1/preferences', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<PreferencesEnvelope>(response, 'Preferences lookup failed')
  return json.data
}

export async function updatePreferences(payload: UpdatePreferencesPayload) {
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
  const response = await apiFetch('/api/v1/tasks', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TasksListEnvelope>(response, 'Tasks lookup failed')
  return json.data
}

export async function createTask(payload: CreateTaskPayload) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/tasks', {
    method: 'POST',
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
  const response = await apiFetch(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  if (response.status === 401) {
    return null
  }

  const json = await parseJsonResponse<TaskEnvelope>(response, 'Task update failed')
  return json.data
}

export async function deleteTask(taskId: string) {
  await ensureCsrfCookie()
  const response = await apiFetch(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
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
  const response = await apiFetch('/api/v1/focus-sessions/active', { method: 'GET' })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<FocusSessionStateEnvelope>(response, 'Active focus session lookup failed')
}

export async function startFocusSession(payload: StartFocusSessionPayload) {
  await ensureCsrfCookie()
  const response = await apiFetch('/api/v1/focus-sessions/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<FocusSessionStateEnvelope>(response, 'Focus session start failed')
}

export async function focusSessionCommand(
  endpoint: 'pause' | 'resume' | 'switch-task' | 'stop' | 'heartbeat',
  payload:
    | PauseFocusSessionPayload
    | ResumeFocusSessionPayload
    | SwitchTaskFocusSessionPayload
    | StopFocusSessionPayload
    | HeartbeatFocusSessionPayload,
) {
  await ensureCsrfCookie()
  const response = await apiFetch(`/api/v1/focus-sessions/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (response.status === 401) {
    return null
  }

  return parseJsonResponse<FocusSessionStateEnvelope>(response, `Focus session ${endpoint} failed`)
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

  const data = body.data
  if (!data || typeof data !== 'object') {
    return null
  }

  return {
    message: typeof body.message === 'string' && body.message.trim() ? body.message : 'Focus session conflict.',
    code: body.code,
    data: {
      server_now_utc:
        typeof (data as { server_now_utc?: unknown }).server_now_utc === 'string'
          ? ((data as { server_now_utc: string }).server_now_utc)
          : '',
      active_focus_session:
        ((data as { active_focus_session?: unknown }).active_focus_session as ActiveFocusSession | null | undefined) ??
        null,
    },
  } satisfies FocusSessionConflictEnvelope
}

async function requestBootstrap(include?: AppBootstrapInclude[]) {
  const includeQuery =
    Array.isArray(include) && include.length > 0
      ? `?include=${encodeURIComponent(include.join(','))}`
      : ''

  return apiFetch(`/api/v1/app/bootstrap${includeQuery}`, { method: 'GET' })
}

function isFocusSessionConflictCode(value: unknown): value is FocusSessionConflictCode {
  return (
    value === 'ACTIVE_SESSION_EXISTS' ||
    value === 'NO_ACTIVE_SESSION' ||
    value === 'VERSION_MISMATCH' ||
    value === 'SESSION_NOT_RUNNING' ||
    value === 'SESSION_NOT_PAUSED'
  )
}
