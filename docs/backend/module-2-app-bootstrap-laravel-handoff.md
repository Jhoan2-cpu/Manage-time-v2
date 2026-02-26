# Velor Backend - Modulo 2 (`/app/bootstrap`) - Handoff para equipo Laravel

## Objetivo del modulo

Implementar el endpoint de carga inicial del panel principal:

- `GET /api/v1/app/bootstrap`

Este endpoint debe devolver en una sola respuesta el estado inicial necesario para renderizar `/app` despues de la autenticacion (Modulo 1).

## Dependencia directa

Este modulo depende de que el **Modulo 1 (Auth)** ya este operativo:

- sesion via Sanctum (cookie)
- `GET /api/v1/auth/me`
- `users`, `workspaces`, `workspace_members`, `user_preferences`

Referencia:
- `docs/backend/module-1-auth-laravel-handoff.md`

---

## Alcance (MVP de bootstrap)

### Incluido
- `GET /api/v1/app/bootstrap`
- respuesta con estructura estable para frontend (aunque algunas secciones vengan vacias)
- `server_now_utc` obligatorio
- `active_focus_session` obligatorio (puede ser `null` en esta fase)
- lectura de:
  - usuario
  - workspace
  - preferencias
  - tareas
  - daily log del dia actual
  - totales del dia (tracked / untracked)

### Fuera de alcance (este modulo)
- CRUD de tareas (Modulo 4)
- contador server-authoritative (Modulo 5)
- realtime WebSocket (Modulo 7)
- filtros/paginacion avanzados de history (Modulo 6)

---

## Decisiones tecnicas (obligatorias)

## 1. Auth (ya definido en Modulo 1)
- Laravel Sanctum con cookie de sesion
- endpoint protegido (`auth:sanctum`)

## 2. Contrato estable primero
- El frontend debe recibir siempre las mismas llaves:
  - `server_now_utc`
  - `user`
  - `workspace`
  - `preferences`
  - `tasks`
  - `daily_log`
  - `dashboard_stats`
  - `active_focus_session`
- Si una seccion aun no tiene datos reales:
  - arrays vacios
  - objetos vacios controlados
  - `active_focus_session: null`

## 3. Tiempo y zona horaria
- El backend debe responder `server_now_utc` (ISO 8601 UTC)
- La agregacion de `daily_log` y stats del dia debe respetar:
  - `user_preferences.time_zone_name`

## 4. Contador (future-proof desde ahora)
- Aunque el Modulo 5 aun no exista, el contrato debe incluir `active_focus_session`
- En este modulo puede responder `null`

---

# Endpoint (contrato de integracion)

## 1) `GET /api/v1/app/bootstrap`

### Para que sirve
Carga el estado inicial del dashboard en una sola request despues de login/register o al refrescar `/app`.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request

#### Query (opcional)
- `include=tasks,preferences,daily_log,dashboard_stats,active_focus_session`

Ejemplo:
```txt
GET /api/v1/app/bootstrap?include=tasks,preferences,daily_log,dashboard_stats,active_focus_session
```

> Si no se manda `include`, el backend puede devolver todo por defecto (recomendado para MVP).

### Response (exito, `200`)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "user": {
      "id": "usr_01...",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "workspace": {
      "id": "ws_01...",
      "name": "Espacio personal de Velor"
    },
    "preferences": {
      "locale": "es",
      "time_zone_name": "America/Lima",
      "time_zone_auto_detect": true,
      "ui_sounds_enabled": true,
      "background_music_enabled": false,
      "background_music_volume_percent": 62,
      "confirm_task_switch_enabled": true,
      "sign_out_confirmation_enabled": true
    },
    "tasks": [
      {
        "id": "task_01...",
        "title": "Limpieza de correos",
        "color_tag": "green",
        "icon_tag": "pen",
        "target_duration_seconds": 2700,
        "alarm_time_local": "08:00:00",
        "sort_order": 1,
        "focus_time_total_seconds": 4944,
        "focus_sessions_count": 12
      }
    ],
    "daily_log": {
      "date_local": "2026-02-25",
      "tracked_seconds": 26442,
      "untracked_seconds": 4158,
      "entries": [
        {
          "id": "te_01...",
          "entry_type": "focus",
          "task_id": "task_01...",
          "task_title": "Limpieza de correos",
          "task_color_tag": "green",
          "task_icon_tag": "pen",
          "started_at_utc": "2026-02-25T13:00:00Z",
          "ended_at_utc": "2026-02-25T13:45:00Z",
          "duration_seconds": 2700,
          "started_at_local_label": "8:00:00 a. m."
        }
      ]
    },
    "dashboard_stats": {
      "tracked_seconds_today": 26442,
      "untracked_seconds_today": 4158,
      "tracked_sessions_count_today": 13,
      "focus_time_total_seconds": 4944
    },
    "active_focus_session": null
  }
}
```

### Respuesta minima valida (si aun no hay datos)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "user": { "id": "usr_01...", "display_name": "Anton Rivera", "email": "anton@velor.app", "locale": "es" },
    "workspace": { "id": "ws_01...", "name": "Espacio personal de Velor" },
    "preferences": {
      "locale": "es",
      "time_zone_name": "America/Lima",
      "time_zone_auto_detect": true,
      "ui_sounds_enabled": true,
      "background_music_enabled": false,
      "background_music_volume_percent": 62,
      "confirm_task_switch_enabled": true,
      "sign_out_confirmation_enabled": true
    },
    "tasks": [],
    "daily_log": {
      "date_local": "2026-02-25",
      "tracked_seconds": 0,
      "untracked_seconds": 0,
      "entries": []
    },
    "dashboard_stats": {
      "tracked_seconds_today": 0,
      "untracked_seconds_today": 0,
      "tracked_sessions_count_today": 0,
      "focus_time_total_seconds": 0
    },
    "active_focus_session": null
  }
}
```

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `422 Unprocessable Entity` (query invalida)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "include": ["El parametro include contiene valores no permitidos."]
  }
}
```

#### `500 Internal Server Error`
- Error inesperado al agregar datos (ej. timezone invalida persistida, query defectuosa)
- Debe loguearse con contexto (`user_id`, `workspace_id`)

---

# Impacto en BD respecto al Modulo 1 (que se agrega / que se modifica)

## Estado actual esperado (Modulo 1 ya implementado)
Tablas ya existentes:
- `users`
- `workspaces`
- `workspace_members`
- `user_preferences`
- `user_identities` (si Google fue incluido)

## Tablas que se agregan para Modulo 2

### A) `tasks` (requerida para devolver tarjetas)
Se agrega para poblar `tasks` del bootstrap.

```txt
tasks(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  owner_user_id: uuid (FK -> users.id)
  created_by_user_id: uuid (FK -> users.id)
  title: varchar(180)
  details: text | null              -- legacy
  color_tag: enum("blue","green","amber","rose","pink","violet")
  icon_tag: enum("briefcase","graduation-cap","screwdriver-wrench","code","book-open","cart-shopping","gamepad","pen")
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

### B) `time_entries` (recomendada en Modulo 2 si se quieren daily log y totales reales)
Si el equipo backend quiere que `daily_log` y `dashboard_stats` ya salgan con datos reales, se agrega `time_entries`.

```txt
time_entries(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)
  task_id: uuid | null (FK -> tasks.id)
  entry_type: enum("focus","untracked","manual_adjustment")
  source: enum("focus_session_stop","pause_gap","manual","import","recovery")
  started_at_utc: timestamp
  ended_at_utc: timestamp
  duration_seconds: integer
  time_zone_name_snapshot: varchar(80)
  task_title_snapshot: varchar(180) | null
  task_color_tag_snapshot: enum(...) | null
  task_icon_tag_snapshot: enum(...) | null
  notes: text | null
  metadata: json/jsonb
  created_at: timestamp
  updated_at: timestamp
)
```

> Si `time_entries` aun no se implementa en este modulo:
> - `daily_log.entries = []`
> - `tracked/untracked = 0`
> - pero **mantener** el contrato de respuesta.

### C) `active_focus_sessions` (opcional en M2, recomendado agregar ya para compatibilidad futura)
No es necesario para que el modulo funcione si se devuelve `active_focus_session: null`, pero es recomendable agregarla desde ya para reducir cambios en M5.

```txt
active_focus_sessions(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)        -- unique
  task_id: uuid (FK -> tasks.id)
  timer_mode: enum("stopwatch","timer")
  session_state: enum("running","paused")
  target_seconds: integer | null
  started_at_utc: timestamp
  last_resumed_at_utc: timestamp | null
  last_paused_at_utc: timestamp | null
  elapsed_seconds_total: integer
  version: integer
  created_at: timestamp
  updated_at: timestamp
)
```

## Tablas que se modifican (posibles ajustes sobre Modulo 1)

### `user_preferences` (verificar que tenga campos completos de settings)
Si en Modulo 1 se creo una version minima (solo `locale`), en Modulo 2 se deben agregar estos campos para poder responder `preferences` completo:

Campos requeridos para bootstrap:
- `time_zone_name`
- `time_zone_auto_detect`
- `ui_sounds_enabled`
- `background_music_enabled`
- `background_music_volume_percent`
- `confirm_task_switch_enabled`
- `sign_out_confirmation_enabled`

### `workspaces`, `users`, `workspace_members`
- **Sin cambios funcionales obligatorios** para M2

---

# Indices recomendados para este modulo

## `tasks`
- `(workspace_id, owner_user_id, sort_order)` donde `deleted_at IS NULL`
- `(workspace_id, owner_user_id, is_archived)` donde `deleted_at IS NULL`

## `time_entries` (si se agrega en M2)
- `(workspace_id, user_id, started_at_utc DESC)`
- `(workspace_id, user_id, entry_type, started_at_utc DESC)`

## `active_focus_sessions` (si se agrega en M2)
- `UNIQUE(user_id)`
- `(workspace_id, user_id)`

---

# Orden de migraciones (incremental desde Modulo 1)

## Camino recomendado (M2 completo)
1. `create_tasks_table`
2. `create_time_entries_table` (si daily log/stats reales en M2)
3. `create_active_focus_sessions_table` (opcional recomendado)
4. `alter_user_preferences_add_missing_bootstrap_fields` (solo si faltan columnas)

## Camino minimo (M2 contrato estable + placeholders)
1. `create_tasks_table`
2. `alter_user_preferences_add_missing_bootstrap_fields` (si aplica)

> En este camino minimo:
> - `daily_log` y `dashboard_stats` pueden salir en cero
> - `active_focus_session` sale `null`

---

# Implementacion Laravel esperada (backend)

## Rutas
- `routes/api.php`
  - `GET /api/v1/app/bootstrap`

## Controlador
- `AppBootstrapController`

## Requests / validacion
- `AppBootstrapRequest` (opcional, recomendado si soportan `include`)

## Resources
- `BootstrapResource`
- `TaskResource` (si separan resource)
- `DailyLogEntryResource` (opcional)

## Services (recomendado)
- `AppBootstrapService`
  - arma la respuesta principal
- `DailyLogService`
  - calcula log del dia actual segun timezone
- `DashboardStatsService`
  - calcula tracked/untracked del dia

## Reglas de implementacion
- usar `auth()->user()`
- resolver workspace activo (personal por ahora)
- no hardcodear labels de UI que ya puede formatear frontend, salvo `started_at_local_label` si deciden enviarlo
- responder `server_now_utc` siempre
- envolver agregaciones pesadas en servicios para reutilizarlas luego en Modulo 6

---

# Flujo backend esperado en `GET /api/v1/app/bootstrap`

## Pasos
1. Validar sesion (`auth:sanctum`)
2. Obtener `user`
3. Obtener `workspace` personal del usuario (owner/member activo)
4. Obtener `user_preferences`
5. Obtener `tasks` activas ordenadas (si tabla existe y modulo listo)
6. Resolver timezone efectiva (`user_preferences.time_zone_name`)
7. Construir `daily_log` del dia actual (si `time_entries` existe; si no, placeholders)
8. Construir `dashboard_stats` del dia actual (si `time_entries` existe; si no, placeholders)
9. Obtener `active_focus_session` (si tabla existe y modulo listo; si no, `null`)
10. Responder `data` completo con `server_now_utc`

---

# Pruebas (minimo esperado)

## Feature tests HTTP
- `bootstrap` con sesion -> `200`
- `bootstrap` sin sesion -> `401`
- `bootstrap` con `include` invalido -> `422` (si se valida)
- `bootstrap` devuelve llaves obligatorias aunque no haya tasks ni time_entries

## Casos de datos
- usuario sin tareas
- usuario con tareas
- usuario con `time_entries` focus/untracked del dia
- timezone distinta a UTC (ej. `America/Lima`)
- `active_focus_session` ausente -> `null`

---

# Criterios de aceptacion del Modulo 2

- El frontend puede entrar a `/app` y renderizar con **una sola llamada** a `GET /api/v1/app/bootstrap`
- La respuesta incluye siempre:
  - `server_now_utc`
  - `user`
  - `workspace`
  - `preferences`
  - `tasks`
  - `daily_log`
  - `dashboard_stats`
  - `active_focus_session`
- Si aun no existen datos reales, el backend responde placeholders consistentes (sin romper contrato)
- El modulo es compatible con lo entregado en Modulo 1

---

# Que se entrega al cerrar este modulo

## Obligatorio
- endpoint `/api/v1/app/bootstrap`
- migraciones/tablas necesarias segun el camino elegido (minimo o completo)
- tests de bootstrap
- documentacion actualizada del contrato final

## Recomendado
- `tasks` + `time_entries` ya implementadas para que bootstrap entregue datos reales
- `active_focus_sessions` agregada aunque responda `null` por ahora (future-proof para Modulo 5)

