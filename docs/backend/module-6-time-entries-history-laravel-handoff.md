# Velor Backend - Modulo 6 (Time Entries + History / Daily Log) - Handoff para equipo Laravel

## Objetivo del modulo

Implementar la persistencia real del historial de trabajo y los endpoints que alimentan:

- `Daily Log` (registro diario en `/app`)
- `Settings & History` (overview, lista de dias, detalle por dia)

Este modulo introduce la tabla `time_entries` como fuente de verdad del historial y completa la integracion entre:

- **Modulo 2** (`/app/bootstrap`)
- **Modulo 5** (focus sessions server-authoritative)

## Resultado esperado (funcional)

Con M6 listo:

- detener una sesion de foco crea un `time_entry`
- cambiar de tarea durante una sesion (switch) puede registrar el bloque anterior
- el historial ya no depende de logs locales del frontend
- `tracked/untracked`, sesiones por tarea y resumen por dia salen de backend

---

## Dependencias directas

Este modulo depende de:

- **Modulo 1 (Auth)** operativo
  - sesion via Sanctum (cookie)
  - scoping por usuario/workspace
- **Modulo 2 (`/app/bootstrap`)** operativo
  - contrato ya incluye:
    - `daily_log`
    - `dashboard_stats`
    - `server_now_utc`
- **Modulo 3 (Preferences)** operativo
  - `time_zone_name`
  - `time_zone_auto_detect`
- **Modulo 4 (Tasks)** operativo
  - metadata de task para snapshots (`title`, `color_tag`, `icon_tag`)
- **Modulo 5 (Focus Sessions)** operativo
  - `active_focus_sessions`
  - comandos `start/pause/resume/switch-task/stop`

Referencias:
- `docs/backend/module-2-app-bootstrap-laravel-handoff.md`
- `docs/backend/module-3-preferences-laravel-handoff.md`
- `docs/backend/module-4-tasks-laravel-handoff.md`
- `docs/backend/module-5-focus-sessions-laravel-handoff.md`

---

## Alcance (MVP)

### Incluido
- tabla `time_entries` (fuente de verdad del historial)
- creacion de `time_entries` de tipo `focus` desde `focus-sessions/stop`
- (recomendado) creacion de `time_entries` de foco al `switch-task` si hay tiempo acumulado > 0
- endpoint de creacion manual de `time_entries` (ajustes/manual/untracked)
- endpoints de historial:
  - `GET /api/v1/history/overview`
  - `GET /api/v1/history/days`
  - `GET /api/v1/history/days/{date}`
- alimentar `daily_log` y `dashboard_stats` reales en `/api/v1/app/bootstrap`
- agregacion por timezone del usuario (preferencia actual)
- duraciones en segundos (incluyendo segundos exactos)

### Opcional en esta entrega (si da tiempo)
- cache Redis de `history/overview`
- filtros avanzados en `history/days` (texto + tarea + rango + paginacion robusta)
- endpoint `GET /api/v1/daily-log/current` dedicado (si el frontend lo necesita luego)
- soft-delete/correcciones auditadas de `time_entries`

### Fuera de alcance (este modulo)
- WebSocket / Reverb (Modulo 7)
- analitica avanzada con materialized views
- reportes semanales/mensuales complejos
- reconciliacion automatica de sesiones corruptas (job de saneamiento)

---

## Decisiones tecnicas (obligatorias)

## 1. `time_entries` es la fuente de verdad del historial
- `Daily Log` y `Settings & History` deben salir de `time_entries`.
- El frontend no debe calcular ni consolidar historial final en local una vez M6 este integrado.

## 2. Duraciones en segundos
- Guardar siempre `duration_seconds` (integer).
- Mantener precision de segundos en:
  - tracked
  - untracked
  - per-task time
  - avg session

## 3. Snapshots de task en `time_entries`
- Guardar snapshots para que el historial no cambie si luego el usuario edita o elimina una tarea.
- Minimo recomendado:
  - `task_title_snapshot`
  - `task_color_tag_snapshot`
  - `task_icon_tag_snapshot`

## 4. Fechas operativas en UTC; agrupacion por timezone actual del usuario
- Persistir `started_at_utc`, `ended_at_utc`
- Agrupar por dia (`YYYY-MM-DD`) usando timezone actual del usuario (`user_preferences.time_zone_name` o el efectivo)
- **No** persistir obligatoriamente un `date_local` fijo en la fila (puede quedar desactualizado si el usuario cambia timezone)

## 5. Integracion con Modulo 5 sin romper contratos
- `focus-sessions/stop` puede **ampliar** su response agregando `created_time_entry_id`, sin quitar `stopped_session_summary`.
- `focus-sessions/switch-task` puede registrar el bloque anterior y seguir devolviendo el mismo envelope M5.
- Mantener respuestas M5 compatibles con el frontend ya integrado.

## 6. Tipos de entrada soportados
- `focus`
- `untracked`
- `manual_adjustment`

> `untracked` puede venir de backend en fases posteriores; para M6 conviene soportarlo ya en el modelo.

## 7. Inmutabilidad practica (recomendada)
- Las filas `focus` generadas por el sistema no deberian editarse libremente desde UI.
- Las filas `manual_adjustment` pueden permitir CRUD en una fase futura.

---

# Tabla principal del modulo: `time_entries`

## Proposito

Representa bloques de tiempo confirmados que alimentan historial, daily log y agregados.

## Schema minimo recomendado (conceptual)

```txt
time_entries
- id (string/uuid/ulid, pk)
- workspace_id (string/uuid/ulid, fk -> workspaces.id)
- user_id (string/uuid/ulid, fk -> users.id)
- task_id (string/uuid/ulid, fk -> tasks.id, nullable)
- active_focus_session_id (string/uuid/ulid, nullable)     -- referencia historica opcional
- entry_type (varchar(24))                                  -- focus|untracked|manual_adjustment
- source (varchar(32))                                      -- focus_stop|focus_switch|manual_create|system_repair
- started_at_utc (timestamptz)
- ended_at_utc (timestamptz)
- duration_seconds (integer)
- timezone_name_snapshot (varchar(64), nullable)            -- opcional (debug/auditoria)
- task_title_snapshot (varchar(200), nullable)
- task_color_tag_snapshot (varchar(24), nullable)
- task_icon_tag_snapshot (varchar(40), nullable)
- notes (text, nullable)                                    -- para manual_adjustment
- metadata_json (jsonb, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

## Constraints recomendadas

- `check (entry_type in ('focus','untracked','manual_adjustment'))`
- `check (duration_seconds >= 0)`
- `check (ended_at_utc >= started_at_utc)`
- `check (duration_seconds = floor(extract(epoch from (ended_at_utc - started_at_utc))))`
  - opcional (si quieren consistencia estricta; puede ser pesado en algunas DBs)
- `check ((entry_type = 'focus' and task_id is not null) or (entry_type <> 'focus'))`
  - recomendado

## Indices recomendados (muy importantes)

- `(workspace_id, user_id, started_at_utc desc)`
- `(workspace_id, user_id, ended_at_utc desc)`
- `(workspace_id, user_id, task_id, started_at_utc desc)`  -- `time by task`
- `(workspace_id, user_id, entry_type, started_at_utc desc)`
- `BRIN (started_at_utc)` si el volumen crece (Postgres)

## Notas de implementacion

- `duration_seconds` debe persistirse explicitamente para evitar recalculo masivo en queries.
- `task_*_snapshot` se llena al crear entradas `focus` y puede dejarse `null` en `untracked`.

---

# Endpoints del modulo (contrato)

## Formato general de responses

### Exito
```json
{
  "data": {}
}
```

### Error (base)
```json
{
  "message": "Descripcion del error",
  "errors": {
    "field": ["Detalle de validacion"]
  }
}
```

---

## 1) `POST /api/v1/time-entries` (manual / untracked / ajustes)

### Para que sirve

Crear bloques de tiempo manuales (principalmente `manual_adjustment`) y, si el equipo decide, permitir `untracked` desde frontend en una fase siguiente.

> Para M6 MVP, se recomienda **habilitar al menos** `manual_adjustment`.  
> `focus` deberia generarse automaticamente desde `focus-sessions`.

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (POST)

### Request (ejemplo `manual_adjustment`)

```json
{
  "entry_type": "manual_adjustment",
  "task_id": "task_01HXYZ...",
  "started_at_utc": "2026-03-03T14:00:00Z",
  "ended_at_utc": "2026-03-03T14:12:42Z",
  "notes": "Ajuste manual"
}
```

### Request (ejemplo `untracked`, opcional habilitar en M6)

```json
{
  "entry_type": "untracked",
  "task_id": null,
  "started_at_utc": "2026-03-03T14:12:42Z",
  "ended_at_utc": "2026-03-03T14:20:00Z",
  "notes": null
}
```

### Validaciones minimas sugeridas
- `entry_type`: required|in:manual_adjustment,untracked
  - (si permiten `focus`, validar reglas extra)
- `task_id`: nullable + pertenece al workspace
- `started_at_utc`: required|date
- `ended_at_utc`: required|date|after:started_at_utc
- `notes`: nullable|string|max:2000

### Reglas de negocio
- calcular `duration_seconds` en backend
- llenar snapshots si `task_id` no es null
- scoping por `workspace_id`

### Response (`201 Created`)

```json
{
  "data": {
    "id": "te_01HXYZ...",
    "entry_type": "manual_adjustment",
    "task_id": "task_01HXYZ...",
    "duration_seconds": 762,
    "started_at_utc": "2026-03-03T14:00:00Z",
    "ended_at_utc": "2026-03-03T14:12:42Z"
  }
}
```

### Errores esperados
- `401 Unauthorized`
- `404 Not Found` (si `task_id` no existe/no accesible)
- `422 Unprocessable Entity`
- `500 Internal Server Error`

---

## 2) `GET /api/v1/history/overview`

### Para que sirve

Devuelve el resumen del panel superior de `Settings & History` para un dia especifico (default: hoy local del usuario).

Alimenta:
- donut tracked/untracked
- totals del dia
- `time by task`
- top task
- avg session

### Auth
- Requerida

### Request (query)
- `date=YYYY-MM-DD` (opcional; default hoy en timezone efectivo del usuario)

Ejemplos:
- `GET /api/v1/history/overview`
- `GET /api/v1/history/overview?date=2026-03-03`

### Response (`200`)

```json
{
  "data": {
    "date_local": "2026-03-03",
    "server_now_utc": "2026-03-03T18:25:10Z",
    "tracked_seconds": 26442,
    "untracked_seconds": 4158,
    "tracked_sessions_count": 13,
    "avg_session_seconds": 2034,
    "top_task": {
      "task_id": "task_01HXYZ...",
      "title": "Redaccion de reporte Q3",
      "color_tag": "blue",
      "icon_tag": "briefcase",
      "tracked_seconds": 9000,
      "sessions_count": 4
    },
    "time_by_task": [
      {
        "task_id": "task_01HXYZ...",
        "title": "Redaccion de reporte Q3",
        "color_tag": "blue",
        "icon_tag": "briefcase",
        "tracked_seconds": 9000,
        "sessions_count": 4
      },
      {
        "task_id": "task_02HXYZ...",
        "title": "Revision de diseno",
        "color_tag": "violet",
        "icon_tag": "learning",
        "tracked_seconds": 5400,
        "sessions_count": 3
      },
      {
        "task_id": null,
        "title": "Untracked Time",
        "color_tag": null,
        "icon_tag": null,
        "tracked_seconds": 4158,
        "sessions_count": 5
      }
    ]
  }
}
```

### Reglas de calculo (importante)
- Agrupar por **timezone efectivo del usuario**
- `tracked_seconds` = suma de `entry_type = focus`
- `untracked_seconds` = suma de `entry_type = untracked`
- `tracked_sessions_count` = cantidad de entries `focus`
- `avg_session_seconds` = promedio de entries `focus` (redondeo consistente)
- `time_by_task` se basa en snapshots de `time_entries`, no en `tasks` actuales

### Errores esperados
- `401 Unauthorized`
- `422 Unprocessable Entity` (fecha invalida)
- `500 Internal Server Error`

---

## 3) `GET /api/v1/history/days`

### Para que sirve

Lista dias del historial (tabla de `Settings & History`) con filtros y paginacion.

### Auth
- Requerida

### Request (query)
- `q` (opcional) texto libre (fecha o nombre de tarea)
- `task_id` (opcional)
- `date_from` (opcional, `YYYY-MM-DD`)
- `date_to` (opcional, `YYYY-MM-DD`)
- `page` (opcional, default `1`)
- `per_page` (opcional, default `20`, max recomendado `100`)

Ejemplo:

```txt
GET /api/v1/history/days?q=Q3&date_from=2026-03-01&date_to=2026-03-10&page=1&per_page=20
```

### Response (`200`)

```json
{
  "data": [
    {
      "date_local": "2026-03-03",
      "tracked_seconds": 26442,
      "untracked_seconds": 4158,
      "tracked_sessions_count": 13,
      "task_types_count": 3,
      "matched_tasks": [
        {
          "task_id": "task_01HXYZ...",
          "title": "Redaccion de reporte Q3",
          "color_tag": "blue",
          "icon_tag": "briefcase"
        }
      ]
    },
    {
      "date_local": "2026-03-02",
      "tracked_seconds": 18300,
      "untracked_seconds": 900,
      "tracked_sessions_count": 8,
      "task_types_count": 2,
      "matched_tasks": []
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "last_page": 1
  }
}
```

### Reglas de negocio
- El agrupado por dia debe usar timezone efectivo del usuario
- `q` sobre fecha local y/o snapshots de task title
- `task_id` filtra dias que contienen entries de esa tarea

### Errores esperados
- `401 Unauthorized`
- `422 Unprocessable Entity` (rangos invalidos, per_page alto, fecha invalida)
- `500 Internal Server Error`

---

## 4) `GET /api/v1/history/days/{date}`

### Para que sirve

Devuelve el detalle de un dia (entries) para el overlay/modal de detalle.

### Auth
- Requerida

### Path param
- `{date}` = `YYYY-MM-DD` (fecha local del usuario)

### Request (query opcional)
- `sort=asc|desc` (default `asc` por hora local)

### Response (`200`)

```json
{
  "data": {
    "date_local": "2026-03-03",
    "server_now_utc": "2026-03-03T18:25:10Z",
    "tracked_seconds": 26442,
    "untracked_seconds": 4158,
    "tracked_sessions_count": 13,
    "entries": [
      {
        "id": "te_01HXYZ...",
        "entry_type": "focus",
        "task_id": "task_02HXYZ...",
        "task_title": "Limpieza de correos",
        "task_color_tag": "green",
        "task_icon_tag": "pen",
        "started_at_utc": "2026-03-03T13:00:00Z",
        "ended_at_utc": "2026-03-03T13:45:00Z",
        "duration_seconds": 2700,
        "started_at_local_label": "8:00:00 a. m."
      },
      {
        "id": "te_01HXZA...",
        "entry_type": "untracked",
        "task_id": null,
        "task_title": null,
        "task_color_tag": null,
        "task_icon_tag": null,
        "started_at_utc": "2026-03-03T13:45:00Z",
        "ended_at_utc": "2026-03-03T13:55:00Z",
        "duration_seconds": 600,
        "started_at_local_label": "8:45:00 a. m."
      }
    ]
  }
}
```

### Reglas de negocio
- ordenar por `started_at_utc` traducido a la fecha local consultada
- `started_at_local_label` puede venir formateado desde backend (recomendado por compatibilidad UI)
- usar snapshots de task para consistencia historica

### Errores esperados
- `401 Unauthorized`
- `422 Unprocessable Entity` (fecha invalida)
- `404 Not Found` (opcional; tambien se puede responder `200` con `entries: []`)
- `500 Internal Server Error`

---

# Cambios requeridos sobre Modulo 5 (sin romper frontend actual)

## Cambio 1: `POST /api/v1/focus-sessions/stop`

### Antes (M5)
- cerraba sesion activa
- devolvia `active_focus_session: null`
- devolvia `stopped_session_summary`
- **no** persistia `time_entries`

### Ahora (M6)
- debe crear `time_entry` de tipo `focus` si `elapsed_seconds_final > 0`
- mantiene response M5 compatible
- puede agregar campos extra (no breaking)

### Response recomendado (M6, compatible)

```json
{
  "data": {
    "server_now_utc": "2026-03-03T18:25:10Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "task_01HXYZ...",
      "timer_mode": "timer",
      "elapsed_seconds_final": 1524,
      "target_seconds": 1800,
      "stopped_reason": "user_stop"
    },
    "created_time_entry_id": "te_01HXYZ..."
  }
}
```

## Cambio 2: `POST /api/v1/focus-sessions/switch-task` (recomendado)

### Recomendacion M6
- si la sesion actual tiene `elapsed_seconds_total + delta_running > 0`
- persistir `time_entry` del bloque saliente (`entry_type = focus`, `source = focus_switch`)
- luego resetear sesion activa con la tarea nueva

### Contrato
- mantener response de M5 igual
- opcionalmente agregar:
  - `created_time_entry_id` o `created_time_entry_ids`

## Cambio 3: `/api/v1/app/bootstrap` (Modulo 2)

### Sin cambios breaking
- misma estructura de response

### Lo que debe cambiar internamente
- `daily_log.entries` debe salir de `time_entries`
- `dashboard_stats` debe salir de `time_entries`
- `tracked/untracked` con segundos exactos

---

# Impacto en BD respecto al Modulo 5 (que se agrega / que se modifica)

## Estado esperado despues de M5

Tablas existentes:
- `users`
- `workspaces`
- `workspace_members`
- `user_preferences`
- `tasks`
- `active_focus_sessions`
- `focus_session_events` (opcional; puede no existir)

## Tablas que se agregan para M6
- `time_entries` (**obligatoria**)

## Tablas que se modifican para M6
- ninguna obligatoria si `time_entries` es nueva
- opcional:
  - `active_focus_sessions` (agregar columna tecnica si el equipo quiere optimizar stop/switch)
  - `tasks` (sin cambios requeridos)

## Migracion (camino recomendado)

1. crear tabla `time_entries`
2. agregar constraints
3. agregar indices
4. desplegar cambios M6 en `focus-sessions/stop` (+ `switch-task` recomendado)
5. actualizar servicios de `/app/bootstrap` y `history/*`
6. ejecutar pruebas de regresion M5 + nuevas de M6

---

# Implementacion Laravel esperada (entregables del equipo backend)

## Rutas (`routes/api.php`)

- `POST /api/v1/time-entries`
- `GET /api/v1/history/overview`
- `GET /api/v1/history/days`
- `GET /api/v1/history/days/{date}`

Cambios internos (sin nuevas rutas):
- `POST /api/v1/focus-sessions/stop` (crear `time_entry`)
- `POST /api/v1/focus-sessions/switch-task` (recomendado: crear `time_entry` del bloque saliente)
- `GET /api/v1/app/bootstrap` (usar `time_entries`)

## Controllers

- `TimeEntryController`
  - `store` (manual/untracked)
- `HistoryController`
  - `overview`
  - `days`
  - `dayDetail`

## Form Requests (minimos)

- `StoreTimeEntryRequest`
- `HistoryOverviewRequest` (si usan validacion de query con Form Request)
- `HistoryDaysRequest`
- `HistoryDayDetailRequest` (o validacion en controller)

## Resources

- `TimeEntryResource`
- `HistoryOverviewResource`
- `HistoryDayCollectionResource`
- `HistoryDayDetailResource`
- `DailyLogEntryResource` (reutilizable para bootstrap y detalle de dia)

## Servicios (recomendado)

- `TimeEntryService`
  - `createManualEntry(...)`
  - `createFocusEntryFromStoppedSession(...)`
  - `createFocusEntryFromSwitch(...)` (recomendado)

- `HistoryQueryService`
  - `getOverviewForDate(...)`
  - `getDaysList(...)`
  - `getDayDetail(...)`

- `DailyLogService` (opcional, si separan de History)
  - `buildTodayDailyLogForBootstrap(...)`

- `DashboardStatsService` (opcional, si separan de bootstrap)
  - `buildTodayStats(...)`

## Integracion con `FocusSessionService` (M5)

Actualizar `FocusSessionService` para:
- en `stop(...)`:
  - calcular `elapsed_seconds_final`
  - crear `time_entry` si > 0
  - devolver summary + `created_time_entry_id`
- en `switchTask(...)` (recomendado):
  - crear `time_entry` del bloque saliente si > 0
  - resetear sesion activa con nueva tarea

> Todo dentro de `DB::transaction()` para consistencia.

---

# Reglas de negocio y calculo (M6)

## 1. Crear `time_entry` en `stop`

Al detener sesion:

- consolidar tiempo final (si estaba `running`)
- si `elapsed_seconds_final > 0`:
  - crear entry:
    - `entry_type = focus`
    - `source = focus_stop`
    - `task_id = active_focus_session.task_id`
    - snapshots de task
    - `started_at_utc` derivado del bloque actual
    - `ended_at_utc = server_now_utc`

## 2. Crear `time_entry` en `switch-task` (recomendado)

Antes de resetear la sesion:

- consolidar elapsed del bloque actual
- si > 0 crear `time_entry` `focus` con `source = focus_switch`
- luego resetear `active_focus_session` con nueva tarea

## 3. `pause` NO crea `time_entry`

- `pause` solo consolida tiempo en sesion activa
- la persistencia historica ocurre en:
  - `stop`
  - `switch-task` (recomendado)

## 4. Agregacion por timezone del usuario

Para `history/*` y `daily_log`:

- resolver timezone efectivo del usuario (`time_zone_auto_detect` + `time_zone_name`)
- filtrar por rango UTC equivalente a la fecha local solicitada
- formatear labels locales (`started_at_local_label`) con ese timezone

## 5. Snapshots en historial

Las respuestas de historial deben preferir:
- `task_title_snapshot`
- `task_color_tag_snapshot`
- `task_icon_tag_snapshot`

Solo hacer fallback a `tasks` si el snapshot falta.

---

# Pruebas minimas (Feature tests)

## `POST /time-entries`
- crea `manual_adjustment` valido
- valida `ended_at_utc > started_at_utc`
- rechaza `task_id` de otro workspace
- responde `401` sin sesion

## `GET /history/overview`
- devuelve tracked/untracked correctos con segundos
- calcula `avg_session_seconds`
- agrupa por timezone del usuario
- responde `422` con fecha invalida

## `GET /history/days`
- pagina resultados
- filtra por rango de fechas
- filtra por `task_id`
- filtra por `q` (titulo snapshot)

## `GET /history/days/{date}`
- devuelve entries del dia ordenados
- incluye snapshots y labels locales
- devuelve vacio consistente o `404` segun decision

## Integracion M5 + M6 (`focus-sessions/stop`)
- al detener sesion activa crea `time_entry` `focus`
- response mantiene `stopped_session_summary`
- `created_time_entry_id` se devuelve (si adoptan extension)

## Integracion M5 + M6 (`switch-task`)
- si elapsed > 0 crea entry del bloque saliente
- resetea sesion con nueva tarea
- conserva compatibilidad de response M5

## `/app/bootstrap`
- `daily_log` y `dashboard_stats` salen de `time_entries`
- mantiene contrato M2

---

# Criterios de aceptacion (Modulo 6)

- [ ] Existe tabla `time_entries` con snapshots e indices minimos
- [ ] `focus-sessions/stop` crea `time_entry` `focus` cuando corresponde
- [ ] (Recomendado) `focus-sessions/switch-task` crea `time_entry` del bloque saliente
- [ ] `history/overview` devuelve tracked/untracked y `time_by_task` con segundos exactos
- [ ] `history/days` soporta filtros y paginacion basicos
- [ ] `history/days/{date}` devuelve entries del dia con labels locales
- [ ] `/app/bootstrap` usa `time_entries` para `daily_log` y `dashboard_stats`
- [ ] Agrupacion por dia respeta timezone efectivo del usuario
- [ ] No hay cambios breaking en contratos de M2 ni M5
- [ ] Tests de regresion M5 siguen pasando

---

## Nota para el equipo backend

Modulo 6 cierra el ciclo de datos del contador:

- **M5** decide el estado vivo (sesion activa server-authoritative)
- **M6** persiste el historial confirmado (`time_entries`)

Con esto, el frontend ya puede dejar de depender del log local para `Daily Log` y `Settings & History`.  
El **Modulo 7** solo agrega notificaciones realtime (WebSocket) sobre un flujo ya consistente.

