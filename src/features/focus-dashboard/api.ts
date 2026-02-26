import { ApiHttpError, apiFetch, parseJsonResponse } from '../../lib/api/http'
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

async function requestBootstrap(include?: AppBootstrapInclude[]) {
  const includeQuery =
    Array.isArray(include) && include.length > 0
      ? `?include=${encodeURIComponent(include.join(','))}`
      : ''

  return apiFetch(`/api/v1/app/bootstrap${includeQuery}`, { method: 'GET' })
}
