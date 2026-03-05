import type { AppLocale } from '../../i18n/messages'

type User = {
  id: string
  display_name: string
  email: string
  locale: AppLocale
}

type Preferences = {
  locale: AppLocale
  time_zone_name: string
  time_zone_auto_detect: boolean
  ui_sounds_enabled: boolean
  background_music_enabled: boolean
  background_music_volume_percent: number
  confirm_task_switch_enabled: boolean
  sign_out_confirmation_enabled: boolean
}

type Task = {
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

type ActiveSession = {
  id: string
  task_id: string
  timer_mode: 'timer' | 'stopwatch'
  session_state: 'running' | 'paused'
  target_seconds: number | null
  started_at_utc: string
  last_resumed_at_utc: string | null
  last_paused_at_utc: string | null
  elapsed_seconds_total: number
  entry_start_elapsed_seconds: number
  version: number
}

type TimeEntry = {
  id: string
  entry_type: 'focus' | 'untracked' | 'manual_adjustment'
  task_id: string | null
  started_at_utc: string
  ended_at_utc: string
  duration_seconds: number
}

type Store = {
  usersById: Map<string, User>
  userIdByEmail: Map<string, string>
  currentUserId: string | null
  preferencesByUserId: Map<string, Preferences>
  tasksByUserId: Map<string, Task[]>
  entriesByUserId: Map<string, TimeEntry[]>
  activeSessionByUserId: Map<string, ActiveSession | null>
  activeUntrackedStartByUserId: Map<string, string | null>
  elapsedByUserTaskMode: Map<string, Record<string, { stopwatch: number; timer: number }>>
}

const store: Store = {
  usersById: new Map(),
  userIdByEmail: new Map(),
  currentUserId: null,
  preferencesByUserId: new Map(),
  tasksByUserId: new Map(),
  entriesByUserId: new Map(),
  activeSessionByUserId: new Map(),
  activeUntrackedStartByUserId: new Map(),
  elapsedByUserTaskMode: new Map(),
}

const DEFAULT_TIME_ZONE = detectTimeZone()
const DEFAULT_LOCALE: AppLocale = 'es'

export function isMockBackendEnabled() {
  // Frontend-only mode for now: keep all data/session behavior client-side.
  return true
}

// Bridges a real backend-authenticated user into the local mock runtime,
// so the rest of the app can remain frontend-only while auth is already real.
export function syncMockSessionFromAuthUser(user: {
  id: string | number
  display_name: string
  email: string
  locale?: AppLocale
}) {
  const normalizedEmail = normalizeEmail(user.email)
  const normalizedLocale: AppLocale = user.locale === 'en' ? 'en' : 'es'
  const userId = `${user.id}`
  const displayName = typeof user.display_name === 'string' && user.display_name.trim()
    ? user.display_name.trim()
    : deriveDisplayName(normalizedEmail)

  const existing = store.usersById.get(userId)
  if (existing) {
    existing.email = normalizedEmail
    existing.display_name = displayName
    existing.locale = normalizedLocale
  } else {
    store.usersById.set(userId, {
      id: userId,
      email: normalizedEmail,
      display_name: displayName,
      locale: normalizedLocale,
    })
  }

  store.userIdByEmail.set(normalizedEmail, userId)
  store.currentUserId = userId
  ensureSeed(userId, normalizedLocale, undefined)
}

export function clearMockSessionFromAuth() {
  store.currentUserId = null
}

export function mockRegisterAuth(payload: {
  display_name: string
  email: string
  locale?: AppLocale
  time_zone_name?: string
}) {
  const email = normalizeEmail(payload.email)
  const locale = payload.locale === 'en' ? 'en' : 'es'
  const user = upsertUser({
    email,
    display_name: payload.display_name?.trim() || deriveDisplayName(email),
    locale,
  })

  store.currentUserId = user.id
  ensureSeed(user.id, locale, normalizeTimeZone(payload.time_zone_name))

  return {
    data: {
      user: { ...user },
      preferences: {
        locale,
        time_zone_name: normalizeTimeZone(payload.time_zone_name),
      },
    },
  }
}

export function mockLoginAuth(payload: { email: string }) {
  const email = normalizeEmail(payload.email)
  const user = upsertUser({
    email,
    display_name: deriveDisplayName(email),
    locale: DEFAULT_LOCALE,
  })
  store.currentUserId = user.id
  ensureSeed(user.id, user.locale, undefined)
  return { data: { user: { ...user } } }
}

export function mockLoginWithGoogle(intent: 'login' | 'register') {
  return mockLoginAuth({ email: `google-${intent}@velor.mock` })
}

export function mockMeAuth() {
  const user = getCurrentUser()
  return user ? { ...user } : null
}

export function mockLogoutAuth() {
  store.currentUserId = null
  return { message: 'Logged out.' }
}

export function mockGetAppBootstrap() {
  const ctx = getContext()
  if (!ctx) {
    return null
  }

  const dateLocal = toDateInTz(new Date().toISOString(), ctx.preferences.time_zone_name)
  const dailyEntries = filterEntriesByDate(ctx.entries, dateLocal, ctx.preferences.time_zone_name)
  const tracked = sumEntries(dailyEntries.filter((entry) => entry.entry_type !== 'untracked'))
  const untracked = sumEntries(dailyEntries.filter((entry) => entry.entry_type === 'untracked'))

  return {
    server_now_utc: nowIso(),
    user: { ...ctx.user },
    workspace: { id: 'workspace_personal', name: 'Personal' },
    preferences: { ...ctx.preferences },
    tasks: ctx.tasks.map((task) => ({ ...task })),
    daily_log: {
      date_local: dateLocal,
      tracked_seconds: tracked,
      untracked_seconds: untracked,
      entries: dailyEntries.map((entry) => mapEntryForBootstrap(entry, ctx.tasks, ctx.preferences.time_zone_name)),
    },
    dashboard_stats: {
      tracked_seconds_today: tracked,
      untracked_seconds_today: untracked,
      tracked_sessions_count_today: dailyEntries.filter((entry) => entry.entry_type !== 'untracked').length,
      focus_time_total_seconds: ctx.tasks.reduce((sum, task) => sum + Math.max(0, task.focus_time_total_seconds), 0),
    },
    active_focus_session: ctx.activeSession ? { ...ctx.activeSession } : null,
  }
}

export function mockGetPreferences() {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  return { ...ctx.preferences }
}

export function mockUpdatePreferences(payload: Partial<Preferences>) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const next: Preferences = {
    ...ctx.preferences,
    ...(typeof payload.locale === 'string' ? { locale: payload.locale === 'en' ? 'en' : 'es' } : {}),
    ...(typeof payload.time_zone_name === 'string' ? { time_zone_name: normalizeTimeZone(payload.time_zone_name) } : {}),
    ...(typeof payload.time_zone_auto_detect === 'boolean' ? { time_zone_auto_detect: payload.time_zone_auto_detect } : {}),
    ...(typeof payload.ui_sounds_enabled === 'boolean' ? { ui_sounds_enabled: payload.ui_sounds_enabled } : {}),
    ...(typeof payload.background_music_enabled === 'boolean'
      ? { background_music_enabled: payload.background_music_enabled }
      : {}),
    ...(typeof payload.confirm_task_switch_enabled === 'boolean'
      ? { confirm_task_switch_enabled: payload.confirm_task_switch_enabled }
      : {}),
    ...(typeof payload.sign_out_confirmation_enabled === 'boolean'
      ? { sign_out_confirmation_enabled: payload.sign_out_confirmation_enabled }
      : {}),
    ...(typeof payload.background_music_volume_percent === 'number'
      ? { background_music_volume_percent: clamp(Math.round(payload.background_music_volume_percent), 0, 100) }
      : {}),
  }
  store.preferencesByUserId.set(ctx.user.id, next)
  ctx.user.locale = next.locale
  return { ...next }
}

export function mockGetTasks() {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  return ctx.tasks.map((task) => ({ ...task }))
}

export function mockCreateTask(payload: {
  title: string
  color_tag: string
  icon_tag: string
  target_duration_seconds: number | null
  alarm_time_local: string | null
}) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }

  const created: Task = {
    id: id('task'),
    title: payload.title?.trim() || 'Untitled task',
    color_tag: normalizeColor(payload.color_tag),
    icon_tag: normalizeIcon(payload.icon_tag),
    target_duration_seconds: normalizeTarget(payload.target_duration_seconds),
    alarm_time_local: normalizeAlarm(payload.alarm_time_local),
    sort_order: ctx.tasks.length,
    focus_time_total_seconds: 0,
    focus_sessions_count: 0,
  }
  ctx.tasks.push(created)
  return { ...created }
}

export function mockUpdateTask(taskId: string, payload: {
  title?: string
  color_tag?: string
  icon_tag?: string
  target_duration_seconds?: number | null
  alarm_time_local?: string | null
}) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const task = ctx.tasks.find((item) => item.id === taskId)
  if (!task) {
    return null
  }

  if (typeof payload.title === 'string') task.title = payload.title.trim() || task.title
  if (typeof payload.color_tag === 'string') task.color_tag = normalizeColor(payload.color_tag)
  if (typeof payload.icon_tag === 'string') task.icon_tag = normalizeIcon(payload.icon_tag)
  if ('target_duration_seconds' in payload) task.target_duration_seconds = normalizeTarget(payload.target_duration_seconds ?? null)
  if ('alarm_time_local' in payload) task.alarm_time_local = normalizeAlarm(payload.alarm_time_local ?? null)

  return { ...task }
}

export function mockDeleteTask(taskId: string) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const index = ctx.tasks.findIndex((item) => item.id === taskId)
  if (index < 0) {
    return null
  }
  ctx.tasks.splice(index, 1)
  ctx.tasks.forEach((task, sortOrder) => {
    task.sort_order = sortOrder
  })
  if (ctx.activeSession?.task_id === taskId) {
    store.activeSessionByUserId.set(ctx.user.id, null)
  }
  return 'deleted' as const
}

export function mockReorderTasks(taskIdsInOrder: string[]) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const byId = new Map(ctx.tasks.map((task) => [task.id, task] as const))
  const ordered: Task[] = []
  for (const taskId of taskIdsInOrder) {
    const task = byId.get(taskId)
    if (task) {
      ordered.push(task)
      byId.delete(taskId)
    }
  }
  ordered.push(...Array.from(byId.values()))
  ordered.forEach((task, index) => {
    task.sort_order = index
  })
  store.tasksByUserId.set(ctx.user.id, ordered)
  return ordered.map((task) => ({ ...task }))
}

export function mockGetActiveFocusSession() {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  return {
    data: {
      server_now_utc: nowIso(),
      active_focus_session: ctx.activeSession ? { ...ctx.activeSession } : null,
    },
  }
}

export function mockStartFocusSession(payload: {
  task_id: string
  timer_mode: 'timer' | 'stopwatch'
  target_seconds?: number | null
  elapsed_seconds_seed?: number
}) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const task = ctx.tasks.find((item) => item.id === payload.task_id)
  if (!task) {
    return mockGetActiveFocusSession()
  }

  closeUntracked(ctx.user.id)
  const now = nowIso()
  const nextMode = payload.timer_mode === 'timer' ? 'timer' : 'stopwatch'
  const seededElapsedSeconds =
    normalizeElapsedSeed(payload.elapsed_seconds_seed) ?? getModeElapsed(ctx.user.id, task.id, nextMode)
  const session: ActiveSession = {
    id: id('fs'),
    task_id: task.id,
    timer_mode: nextMode,
    session_state: 'running',
    target_seconds: normalizeTarget(payload.target_seconds ?? task.target_duration_seconds),
    started_at_utc: now,
    last_resumed_at_utc: now,
    last_paused_at_utc: null,
    elapsed_seconds_total: seededElapsedSeconds,
    entry_start_elapsed_seconds: seededElapsedSeconds,
    version: 1,
  }
  setModeElapsed(ctx.user.id, task.id, nextMode, seededElapsedSeconds)
  store.activeSessionByUserId.set(ctx.user.id, session)
  return {
    data: {
      server_now_utc: nowIso(),
      active_focus_session: { ...session },
    },
  }
}

export function mockFocusSessionCommand(
  endpoint: 'pause' | 'resume' | 'switch-task' | 'stop' | 'heartbeat',
  payload: Record<string, unknown>,
) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const current = ctx.activeSession ? { ...ctx.activeSession } : null
  const now = Date.now()
  const nowUtc = new Date(now).toISOString()

  if (endpoint === 'heartbeat') {
    return { data: { server_now_utc: nowUtc, active_focus_session: current } }
  }

  if (endpoint === 'pause' && current && current.session_state === 'running') {
    current.elapsed_seconds_total = computeElapsed(current, now)
    setModeElapsed(ctx.user.id, current.task_id, current.timer_mode, current.elapsed_seconds_total)
    current.session_state = 'paused'
    current.last_paused_at_utc = nowUtc
    current.version += 1
    store.activeSessionByUserId.set(ctx.user.id, current)
    store.activeUntrackedStartByUserId.set(ctx.user.id, nowUtc)
    return { data: { server_now_utc: nowUtc, active_focus_session: { ...current } } }
  }

  if (endpoint === 'resume' && current && current.session_state === 'paused') {
    closeUntracked(ctx.user.id)
    current.session_state = 'running'
    current.last_resumed_at_utc = nowUtc
    current.version += 1
    store.activeSessionByUserId.set(ctx.user.id, current)
    return { data: { server_now_utc: nowUtc, active_focus_session: { ...current } } }
  }

  if (endpoint === 'switch-task' && current) {
    const taskId = `${payload.task_id ?? ''}`
    const task = ctx.tasks.find((item) => item.id === taskId)
    if (!task) {
      return { data: { server_now_utc: nowUtc, active_focus_session: { ...current } } }
    }

    const elapsed = computeElapsed(current, now)
    setModeElapsed(ctx.user.id, current.task_id, current.timer_mode, elapsed)
    const entryStartElapsed = Math.max(0, Math.floor(current.entry_start_elapsed_seconds ?? 0))
    const durationForEntry = Math.max(0, elapsed - entryStartElapsed)
    const created = materializeFocusEntry(ctx.user.id, {
      task_id: current.task_id,
      started_at_utc: current.started_at_utc,
      ended_at_utc: nowUtc,
      duration_seconds: durationForEntry,
    })
    const requestedTimerMode = payload.timer_mode
    const resolvedTimerMode =
      requestedTimerMode === 'timer' || requestedTimerMode === 'stopwatch'
        ? requestedTimerMode
        : task.target_duration_seconds
          ? 'timer'
          : 'stopwatch'
    const nextSeedElapsedSeconds =
      normalizeElapsedSeed(payload.elapsed_seconds_seed as number | null | undefined) ??
      getModeElapsed(ctx.user.id, task.id, resolvedTimerMode)

    const next = {
      id: id('fs'),
      task_id: task.id,
      timer_mode: resolvedTimerMode,
      session_state: 'running',
      target_seconds: normalizeTarget((payload.target_seconds as number | null | undefined) ?? task.target_duration_seconds),
      started_at_utc: nowUtc,
      last_resumed_at_utc: nowUtc,
      last_paused_at_utc: null,
      elapsed_seconds_total: nextSeedElapsedSeconds,
      entry_start_elapsed_seconds: nextSeedElapsedSeconds,
      version: 1,
    } satisfies ActiveSession
    setModeElapsed(ctx.user.id, task.id, resolvedTimerMode, nextSeedElapsedSeconds)
    store.activeSessionByUserId.set(ctx.user.id, next)
    return { data: { server_now_utc: nowUtc, active_focus_session: { ...next }, created_time_entry_id: created ?? undefined } }
  }

  if (endpoint === 'stop' && current) {
    const elapsed = computeElapsed(current, now)
    setModeElapsed(ctx.user.id, current.task_id, current.timer_mode, elapsed)
    const entryStartElapsed = Math.max(0, Math.floor(current.entry_start_elapsed_seconds ?? 0))
    const durationForEntry = Math.max(0, elapsed - entryStartElapsed)
    const created = materializeFocusEntry(ctx.user.id, {
      task_id: current.task_id,
      started_at_utc: current.started_at_utc,
      ended_at_utc: nowUtc,
      duration_seconds: durationForEntry,
    })
    store.activeSessionByUserId.set(ctx.user.id, null)
    store.activeUntrackedStartByUserId.set(ctx.user.id, nowUtc)
    return {
      data: {
        server_now_utc: nowUtc,
        active_focus_session: null,
        stopped_session_summary: {
          task_id: current.task_id,
          timer_mode: current.timer_mode,
          elapsed_seconds_final: elapsed,
          target_seconds: current.target_seconds,
          stopped_reason: `${payload.stop_reason ?? payload.stopped_reason ?? 'manual'}`,
        },
        created_time_entry_id: created ?? undefined,
      },
    }
  }

  return { data: { server_now_utc: nowUtc, active_focus_session: current } }
}

export function mockCreateTimeEntry(payload: {
  entry_type: 'manual_adjustment' | 'untracked'
  task_id: string | null
  started_at_utc: string
  ended_at_utc: string
}) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const start = Date.parse(payload.started_at_utc)
  const end = Date.parse(payload.ended_at_utc)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null
  }
  const entry: TimeEntry = {
    id: id('te'),
    entry_type: payload.entry_type,
    task_id: payload.task_id,
    started_at_utc: new Date(start).toISOString(),
    ended_at_utc: new Date(end).toISOString(),
    duration_seconds: Math.max(1, Math.floor((end - start) / 1000)),
  }
  ctx.entries.push(entry)
  return { ...entry }
}

export function mockGetHistoryOverview(date?: string) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const dateLocal = /^\d{4}-\d{2}-\d{2}$/.test(`${date ?? ''}`) ? `${date}` : toDateInTz(nowIso(), ctx.preferences.time_zone_name)
  const entries = filterEntriesByDate(ctx.entries, dateLocal, ctx.preferences.time_zone_name)
  const tracked = entries.filter((entry) => entry.entry_type !== 'untracked')
  const untracked = entries.filter((entry) => entry.entry_type === 'untracked')
  const timeByTask = aggregateByTask(entries, ctx.tasks)
  const topTask = timeByTask.find((row) => row.task_id !== null) ?? null
  return {
    date_local: dateLocal,
    server_now_utc: nowIso(),
    tracked_seconds: sumEntries(tracked),
    untracked_seconds: sumEntries(untracked),
    tracked_sessions_count: tracked.length,
    avg_session_seconds: tracked.length > 0 ? Math.round(sumEntries(tracked) / tracked.length) : 0,
    top_task: topTask,
    time_by_task: timeByTask,
  }
}

export function mockGetHistoryDays(params: {
  q?: string
  task_id?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}) {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const grouped = groupByDate(ctx.entries, ctx.preferences.time_zone_name)
  const rows = Object.entries(grouped).map(([dateLocal, entries]) => {
    const tasksUsed = Array.from(new Set(entries.map((entry) => entry.task_id).filter(Boolean))) as string[]
    return {
      date_local: dateLocal,
      tracked_seconds: sumEntries(entries.filter((entry) => entry.entry_type !== 'untracked')),
      untracked_seconds: sumEntries(entries.filter((entry) => entry.entry_type === 'untracked')),
      tracked_sessions_count: entries.filter((entry) => entry.entry_type !== 'untracked').length,
      task_types_count: tasksUsed.length,
      matched_tasks: tasksUsed.map((taskId) => {
        const task = ctx.tasks.find((item) => item.id === taskId)
        return {
          task_id: taskId,
          title: task?.title ?? 'Task',
          color_tag: task?.color_tag ?? null,
          icon_tag: task?.icon_tag ?? null,
        }
      }),
    }
  })
  const q = `${params.q ?? ''}`.trim().toLowerCase()
  const filtered = rows
    .filter((row) => !params.date_from || row.date_local >= params.date_from)
    .filter((row) => !params.date_to || row.date_local <= params.date_to)
    .filter((row) => !params.task_id || row.matched_tasks.some((task) => task.task_id === params.task_id))
    .filter((row) => !q || `${row.date_local} ${row.matched_tasks.map((task) => task.title).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => b.date_local.localeCompare(a.date_local))
  const perPage = Math.max(1, Math.floor(params.per_page ?? 6))
  const page = Math.max(1, Math.floor(params.page ?? 1))
  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, lastPage)
  const start = (current - 1) * perPage
  return {
    data: filtered.slice(start, start + perPage),
    meta: {
      page: current,
      per_page: perPage,
      total,
      last_page: lastPage,
    },
  }
}

export function mockGetHistoryDayDetail(dateLocal: string, sort: 'asc' | 'desc' = 'asc') {
  const ctx = getContext()
  if (!ctx) {
    return null
  }
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(dateLocal) ? dateLocal : toDateInTz(nowIso(), ctx.preferences.time_zone_name)
  const entries = filterEntriesByDate(ctx.entries, safeDate, ctx.preferences.time_zone_name)
    .sort((a, b) => (sort === 'asc' ? a.started_at_utc.localeCompare(b.started_at_utc) : b.started_at_utc.localeCompare(a.started_at_utc)))
    .map((entry) => mapEntryForBootstrap(entry, ctx.tasks, ctx.preferences.time_zone_name))
  return {
    date_local: safeDate,
    server_now_utc: nowIso(),
    tracked_seconds: sumEntries(entries.filter((entry) => entry.entry_type !== 'untracked')),
    untracked_seconds: sumEntries(entries.filter((entry) => entry.entry_type === 'untracked')),
    tracked_sessions_count: entries.filter((entry) => entry.entry_type !== 'untracked').length,
    entries,
  }
}

function getContext() {
  if (!store.currentUserId) {
    return null
  }
  const user = store.usersById.get(store.currentUserId) ?? null
  if (!user) {
    return null
  }
  ensureSeed(user.id, user.locale, undefined)
  return {
    user,
    preferences: store.preferencesByUserId.get(user.id)!,
    tasks: store.tasksByUserId.get(user.id)!,
    entries: store.entriesByUserId.get(user.id)!,
    activeSession: store.activeSessionByUserId.get(user.id) ?? null,
  }
}

function ensureSeed(userId: string, locale: AppLocale, timeZone: string | undefined) {
  if (!store.preferencesByUserId.has(userId)) {
    store.preferencesByUserId.set(userId, {
      locale,
      time_zone_name: normalizeTimeZone(timeZone),
      time_zone_auto_detect: true,
      ui_sounds_enabled: true,
      background_music_enabled: false,
      background_music_volume_percent: 40,
      confirm_task_switch_enabled: true,
      sign_out_confirmation_enabled: true,
    })
  }
  if (!store.tasksByUserId.has(userId)) {
    store.tasksByUserId.set(userId, seedTasks())
  }
  if (!store.entriesByUserId.has(userId)) {
    const tasks = store.tasksByUserId.get(userId)!
    store.entriesByUserId.set(userId, seedEntries(tasks))
  }
  if (!store.activeSessionByUserId.has(userId)) {
    store.activeSessionByUserId.set(userId, null)
  }
  if (!store.activeUntrackedStartByUserId.has(userId)) {
    store.activeUntrackedStartByUserId.set(userId, null)
  }
  if (!store.elapsedByUserTaskMode.has(userId)) {
    store.elapsedByUserTaskMode.set(userId, {})
  }
}

function getModeElapsed(userId: string, taskId: string, mode: ActiveSession['timer_mode']) {
  const byTask = store.elapsedByUserTaskMode.get(userId) ?? {}
  const snapshot = byTask[taskId]
  if (!snapshot) {
    return 0
  }
  const value = mode === 'timer' ? snapshot.timer : snapshot.stopwatch
  return Math.max(0, Math.floor(value))
}

function setModeElapsed(userId: string, taskId: string, mode: ActiveSession['timer_mode'], elapsedSeconds: number) {
  const byTask = store.elapsedByUserTaskMode.get(userId) ?? {}
  const previous = byTask[taskId] ?? { stopwatch: 0, timer: 0 }
  const bounded = Math.max(0, Math.floor(elapsedSeconds))
  const next = mode === 'timer' ? { ...previous, timer: bounded } : { ...previous, stopwatch: bounded }

  if (next.stopwatch === previous.stopwatch && next.timer === previous.timer) {
    return
  }

  store.elapsedByUserTaskMode.set(userId, {
    ...byTask,
    [taskId]: next,
  })
}

function upsertUser(input: { email: string; display_name: string; locale: AppLocale }) {
  const existingId = store.userIdByEmail.get(input.email)
  if (existingId) {
    const existing = store.usersById.get(existingId)!
    existing.display_name = input.display_name
    existing.locale = input.locale
    return existing
  }
  const created: User = {
    id: id('usr'),
    email: input.email,
    display_name: input.display_name,
    locale: input.locale,
  }
  store.usersById.set(created.id, created)
  store.userIdByEmail.set(created.email, created.id)
  return created
}

function seedTasks(): Task[] {
  return [
    { id: 'task-q3-report', title: 'Q3 Report Writing', color_tag: 'blue', icon_tag: 'briefcase', target_duration_seconds: 1500, alarm_time_local: '09:15', sort_order: 0, focus_time_total_seconds: 0, focus_sessions_count: 0 },
    { id: 'task-email-cleanup', title: 'Email Cleanup', color_tag: 'green', icon_tag: 'pen', target_duration_seconds: 2700, alarm_time_local: '08:00', sort_order: 1, focus_time_total_seconds: 0, focus_sessions_count: 0 },
    { id: 'task-design-review', title: 'Design Review', color_tag: 'violet', icon_tag: 'learning', target_duration_seconds: 5400, alarm_time_local: '14:00', sort_order: 2, focus_time_total_seconds: 0, focus_sessions_count: 0 },
  ]
}

function seedEntries(tasks: Task[]) {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  const start = day.getTime()
  const entries: TimeEntry[] = [
    mkEntry('focus', tasks[1]?.id ?? null, start + 8 * 3600 * 1000, 45 * 60),
    mkEntry('focus', tasks[0]?.id ?? null, start + 9 * 3600 * 1000 + 15 * 60 * 1000, 25 * 60),
    mkEntry('untracked', null, start + 9 * 3600 * 1000 + 45 * 60 * 1000, 10 * 60),
    mkEntry('focus', tasks[2]?.id ?? null, start + 10 * 3600 * 1000 + 20 * 60 * 1000, 40 * 60),
    mkEntry('focus', tasks[0]?.id ?? null, start - 24 * 3600 * 1000 + 9 * 3600 * 1000, 35 * 60),
    mkEntry('focus', tasks[2]?.id ?? null, start - 48 * 3600 * 1000 + 14 * 3600 * 1000, 30 * 60),
  ]
  const byTask = new Map<string, { total: number; count: number }>()
  for (const entry of entries) {
    if (!entry.task_id || entry.entry_type === 'untracked') continue
    const current = byTask.get(entry.task_id) ?? { total: 0, count: 0 }
    current.total += entry.duration_seconds
    current.count += 1
    byTask.set(entry.task_id, current)
  }
  tasks.forEach((task) => {
    const tracked = byTask.get(task.id)
    task.focus_time_total_seconds = tracked?.total ?? 0
    task.focus_sessions_count = tracked?.count ?? 0
  })
  return entries
}

function mkEntry(type: TimeEntry['entry_type'], taskId: string | null, startedMs: number, seconds: number): TimeEntry {
  const started = new Date(startedMs)
  const ended = new Date(startedMs + seconds * 1000)
  return {
    id: id('te'),
    entry_type: type,
    task_id: taskId,
    started_at_utc: started.toISOString(),
    ended_at_utc: ended.toISOString(),
    duration_seconds: Math.max(1, Math.floor(seconds)),
  }
}

function closeUntracked(userId: string) {
  const started = store.activeUntrackedStartByUserId.get(userId)
  if (!started) return null
  const startMs = Date.parse(started)
  const endMs = Date.now()
  store.activeUntrackedStartByUserId.set(userId, null)
  if (!Number.isFinite(startMs) || endMs <= startMs) return null
  const entry = mkEntry('untracked', null, startMs, Math.floor((endMs - startMs) / 1000))
  store.entriesByUserId.set(userId, [...(store.entriesByUserId.get(userId) ?? []), entry])
  return entry.id
}

function materializeFocusEntry(userId: string, params: { task_id: string; started_at_utc: string; ended_at_utc: string; duration_seconds: number }) {
  if (params.duration_seconds <= 0) return null
  const entry: TimeEntry = {
    id: id('te'),
    entry_type: 'focus',
    task_id: params.task_id,
    started_at_utc: params.started_at_utc,
    ended_at_utc: params.ended_at_utc,
    duration_seconds: Math.floor(params.duration_seconds),
  }
  const entries = store.entriesByUserId.get(userId) ?? []
  store.entriesByUserId.set(userId, [...entries, entry])
  const tasks = store.tasksByUserId.get(userId) ?? []
  const task = tasks.find((item) => item.id === params.task_id)
  if (task) {
    task.focus_time_total_seconds += entry.duration_seconds
    task.focus_sessions_count += 1
  }
  return entry.id
}

function computeElapsed(session: ActiveSession, nowMs: number) {
  if (session.session_state !== 'running' || !session.last_resumed_at_utc) {
    return session.elapsed_seconds_total
  }
  const resumeMs = Date.parse(session.last_resumed_at_utc)
  if (!Number.isFinite(resumeMs) || nowMs <= resumeMs) {
    return session.elapsed_seconds_total
  }
  return session.elapsed_seconds_total + Math.floor((nowMs - resumeMs) / 1000)
}

function filterEntriesByDate(entries: TimeEntry[], dateIso: string, timeZone: string) {
  return entries.filter((entry) => toDateInTz(entry.started_at_utc, timeZone) === dateIso)
}

function groupByDate(entries: TimeEntry[], timeZone: string) {
  return entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const key = toDateInTz(entry.started_at_utc, timeZone)
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})
}

function aggregateByTask(entries: TimeEntry[], tasks: Task[]) {
  const taskById = new Map(tasks.map((task) => [task.id, task] as const))
  const map = new Map<string, { task_id: string | null; title: string | null; color_tag: string | null; icon_tag: string | null; tracked_seconds: number; sessions_count: number }>()
  for (const entry of entries) {
    const key = entry.task_id ?? '__untracked__'
    const existing = map.get(key) ?? {
      task_id: entry.task_id,
      title: entry.task_id ? taskById.get(entry.task_id)?.title ?? 'Task' : 'Untracked Time',
      color_tag: entry.task_id ? taskById.get(entry.task_id)?.color_tag ?? null : null,
      icon_tag: entry.task_id ? taskById.get(entry.task_id)?.icon_tag ?? null : null,
      tracked_seconds: 0,
      sessions_count: 0,
    }
    existing.tracked_seconds += entry.duration_seconds
    existing.sessions_count += 1
    map.set(key, existing)
  }
  return Array.from(map.values()).sort((a, b) => b.tracked_seconds - a.tracked_seconds)
}

function mapEntryForBootstrap(entry: TimeEntry, tasks: Task[], timeZone: string) {
  const task = entry.task_id ? tasks.find((item) => item.id === entry.task_id) ?? null : null
  return {
    id: entry.id,
    entry_type: entry.entry_type,
    task_id: entry.task_id,
    task_title: task?.title ?? (entry.entry_type === 'untracked' ? 'Untracked Time' : null),
    task_color_tag: task?.color_tag ?? null,
    task_icon_tag: task?.icon_tag ?? null,
    started_at_utc: entry.started_at_utc,
    ended_at_utc: entry.ended_at_utc,
    duration_seconds: entry.duration_seconds,
    started_at_local_label: formatTime(entry.started_at_utc, timeZone),
  }
}

function normalizeEmail(email: string) {
  return `${email ?? ''}`.trim().toLowerCase()
}

function deriveDisplayName(email: string) {
  const local = normalizeEmail(email).split('@')[0] ?? ''
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
  return words || 'Velor User'
}

function normalizeColor(value: string) {
  const allowed = new Set(['blue', 'green', 'amber', 'rose', 'pink', 'violet'])
  return allowed.has(value) ? value : 'blue'
}

function normalizeIcon(value: string) {
  const allowed = new Set(['briefcase', 'learning', 'tools', 'code', 'book', 'pen', 'cart', 'game'])
  return allowed.has(value) ? value : 'briefcase'
}

function normalizeTarget(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return clamp(Math.round(value), 1, 24 * 3600)
}

function normalizeElapsedSeed(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }

  return Math.max(0, Math.floor(value))
}

function normalizeAlarm(value: string | null | undefined) {
  const v = `${value ?? ''}`.trim()
  return /^\d{2}:\d{2}$/.test(v) ? v : null
}

function normalizeTimeZone(value: string | null | undefined) {
  const candidate = `${value ?? ''}`.trim()
  if (!candidate) return DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

function sumEntries(entries: Array<{ duration_seconds: number }>) {
  return entries.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.duration_seconds)), 0)
}

function toDateInTz(isoUtc: string, timeZone: string) {
  const date = new Date(isoUtc)
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function formatTime(isoUtc: string, timeZone: string) {
  const date = new Date(isoUtc)
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(date)
  } catch {
    return null
  }
}

function nowIso() {
  return new Date().toISOString()
}

function id(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`
  return `${prefix}_${suffix}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
