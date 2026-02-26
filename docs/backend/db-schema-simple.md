# Velor Backend - Esquema de BD (Simple)

## Objetivo

Esquema simplificado y legible de tablas para backend SaaS + contador sincronizado (server-authoritative).

Formato:

```txt
nombre_tabla(
  attr: tipo
  attr2: varchar(123)
  attr3: enum("A", "B")
)
```

## Convenciones

- `id`: `uuid`
- `*_id`: `uuid` (FK)
- `*_utc`: `timestamp`
- duraciones en `seconds` (integer)
- `workspace_id` para scoping SaaS
- `deleted_at` para soft delete (cuando aplique)

---

## 1) users

```txt
users(
  id: uuid (PK)
  display_name: varchar(120)
  email: citext (unique)
  password_hash: text | null
  locale: enum("es", "en")
  avatar_url: text | null
  email_verified_at: timestamp | null
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp | null
)
```

## 2) user_identities (OAuth / Google)

```txt
user_identities(
  id: uuid (PK)
  user_id: uuid (FK -> users.id)
  provider: enum("google")
  provider_user_id: varchar(191)
  provider_email: citext | null
  provider_avatar_url: text | null
  access_token_encrypted: text | null
  refresh_token_encrypted: text | null
  token_expires_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
)
```

> Unico recomendado: `(provider, provider_user_id)`

## 3) workspaces

```txt
workspaces(
  id: uuid (PK)
  owner_user_id: uuid (FK -> users.id)
  kind: enum("personal", "team")
  name: varchar(160)
  slug: varchar(160) | null (unique)
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp | null
)
```

## 4) workspace_members

```txt
workspace_members(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)
  role: enum("owner", "admin", "member")
  status: enum("active", "invited", "suspended")
  invited_by_user_id: uuid | null (FK -> users.id)
  joined_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
)
```

> Unico recomendado: `(workspace_id, user_id)`

## 5) user_preferences

```txt
user_preferences(
  user_id: uuid (PK, FK -> users.id)
  locale: enum("es", "en")
  time_zone_name: varchar(80)
  time_zone_auto_detect: boolean
  ui_sounds_enabled: boolean
  background_music_enabled: boolean
  background_music_volume_percent: smallint(0..100)
  ambient_track_key: varchar(80) | null
  confirm_task_switch_enabled: boolean
  sign_out_confirmation_enabled: boolean
  created_at: timestamp
  updated_at: timestamp
)
```

## 6) tasks

```txt
tasks(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  owner_user_id: uuid (FK -> users.id)
  created_by_user_id: uuid (FK -> users.id)
  title: varchar(180)
  details: text | null              -- legacy (frontend ya no lo usa visualmente)
  color_tag: enum("blue","green","amber","rose","pink","violet")
  icon_tag: enum(
    "briefcase",
    "graduation-cap",
    "screwdriver-wrench",
    "code",
    "book-open",
    "cart-shopping",
    "gamepad",
    "pen"
  )
  target_duration_seconds: integer | null
  alarm_time_local: time | null
  sort_order: integer
  is_archived: boolean
  archived_at: timestamp | null
  focus_time_total_seconds: bigint
  focus_sessions_count: integer
  last_started_at_utc: timestamp | null
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp | null
)
```

## 7) active_focus_sessions (contador vivo, server-authoritative)

```txt
active_focus_sessions(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)
  task_id: uuid (FK -> tasks.id)
  timer_mode: enum("stopwatch", "timer")
  session_state: enum("running", "paused")
  target_seconds: integer | null
  started_at_utc: timestamp
  last_resumed_at_utc: timestamp | null
  last_paused_at_utc: timestamp | null
  elapsed_seconds_total: integer
  paused_gap_started_at_utc: timestamp | null
  is_timer_complete: boolean
  alarm_ringing_since_utc: timestamp | null
  last_known_time_zone_name: varchar(80)
  version: integer                  -- concurrencia optimista
  last_client_request_id: varchar(80) | null
  heartbeat_at_utc: timestamp | null
  created_at: timestamp
  updated_at: timestamp
)
```

> Regla clave: **unica sesion activa por usuario**
>
> Unico recomendado: `(user_id)`

## 8) focus_session_events (auditoria / idempotencia)

```txt
focus_session_events(
  id: bigint (PK)
  active_focus_session_id: uuid | null (FK -> active_focus_sessions.id)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)
  task_id: uuid | null (FK -> tasks.id)
  event_type: enum(
    "start",
    "pause",
    "resume",
    "switch_task",
    "stop",
    "heartbeat",
    "conflict"
  )
  session_version: integer
  client_request_id: varchar(80) | null
  command_source: enum("web","mobile_web","api","system")
  source_device_id: varchar(120) | null
  source_ip: inet | null
  payload: jsonb
  occurred_at_utc: timestamp
)
```

> Unico recomendado (idempotencia): `(user_id, client_request_id)` cuando `client_request_id` no es null

## 9) time_entries (historial / daily log)

```txt
time_entries(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)
  task_id: uuid | null (FK -> tasks.id)
  entry_type: enum("focus", "untracked", "manual_adjustment")
  source: enum("focus_session_stop", "pause_gap", "manual", "import", "recovery")
  source_focus_session_event_id: bigint | null (FK -> focus_session_events.id)
  client_request_id: varchar(80) | null
  started_at_utc: timestamp
  ended_at_utc: timestamp
  duration_seconds: integer
  time_zone_name_snapshot: varchar(80)
  task_title_snapshot: varchar(180) | null
  task_color_tag_snapshot: enum("blue","green","amber","rose","pink","violet") | null
  task_icon_tag_snapshot: enum("briefcase","graduation-cap","screwdriver-wrench","code","book-open","cart-shopping","gamepad","pen") | null
  notes: text | null
  metadata: jsonb
  created_at: timestamp
  updated_at: timestamp
)
```

---

## Relaciones clave (resumen)

- `users` -> `workspaces` (owner)
- `users` <-> `workspaces` via `workspace_members`
- `users` -> `user_preferences` (1:1)
- `workspaces` -> `tasks` (1:N)
- `users` -> `active_focus_sessions` (1:0..1)
- `active_focus_sessions` -> `tasks` (N:1)
- `time_entries` -> `tasks` (N:0..1, con snapshots para historico estable)

---

## Tablas minimas por modulo (recomendado)

### Modulo 1 - Auth
- `users`
- `user_identities` (si Google)
- `workspaces`
- `workspace_members`
- `user_preferences`

### Modulo 2 - `/app` bootstrap
- `users`
- `workspaces`
- `workspace_members`
- `user_preferences`
- `tasks`
- `active_focus_sessions`
- `time_entries` (si ya quieres totales reales)

### Modulo 4 - Tareas
- `tasks`

### Modulo 5 - Contador server-authoritative
- `active_focus_sessions`
- `focus_session_events`
- `tasks`
- `time_entries` (si `stop` ya confirma bloque)

### Modulo 6 - Historial
- `time_entries`
- `tasks` (snapshots/joins)
- `user_preferences` (timezone)

