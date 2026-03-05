# Frontend Handoff - Taskcards + Focus Runtime + Daily Log

Fecha: 2026-03-05  
Estado: contrato operativo para implementacion frontend

## 1) Objetivo y alcance

Este documento define como integrar frontend con:
- Taskcards CRUD + realtime
- Focus runtime (`start/pause/resume/stop/reset/switch-task/heartbeat`)
- Daily log por zona horaria

Fuera de alcance:
- preferencias de usuario
- reportes historicos avanzados

## 2) Matriz de disponibilidad backend (hoy)

| Modulo | Endpoint/Canal | Estado |
|---|---|---|
| Taskcards CRUD | `/api/v1/focus/tasks` | Implementado |
| Taskcards alias legacy | `/api/v1/tasks` | Implementado (compat) |
| Taskcards realtime | `private-user.{userId}.focus.tasks` | Implementado |
| Focus runtime HTTP | `/api/v1/focus-sessions/*` | Pendiente |
| Focus runtime realtime | `private-user.{userId}.focus` | Pendiente |
| Daily log | `/api/v1/focus/daily-log` | Pendiente |

## 3) Convenciones globales

- Auth: Sanctum cookie session.
- IDs en JSON: siempre `string` (DB usa `bigint`).
- Timestamps: ISO 8601 UTC, server-authoritative.
- Optimistic locking:
  - Taskcards: `if_version`/`If-Match` contra `focus_tasks.version`.
  - Runtime: `expected_version` contra `focus_tasks.version`.

## 4) Integracion HTTP

### 4.1 Base URL y cookies

- Base API canonica: `http://localhost:<BACKEND_PORT>/api/v1`
- En todas las llamadas autenticadas usar `credentials: 'include'`.
- Antes de `POST/PATCH/DELETE`, asegurar cookie CSRF: `GET /sanctum/csrf-cookie`.

### 4.2 Taskcards (activo hoy)

#### Listar
- `GET /api/v1/focus/tasks`
- 200: lista de tasks del usuario.
- 401: `Unauthenticated.`

#### Crear
- `POST /api/v1/focus/tasks`
- payload editable: `name`, `icon_tag`, `color_tag`, `alarm_time_local`, `timer_initial_seconds` (opcional).
- 201: task creada.
- 422: validacion.

#### Editar
- `PATCH /api/v1/focus/tasks/{taskId}`
- enviar `if_version`.
- solo metadatos, no runtime.
- 200: actualizado.
- 409: `TASK_VERSION_CONFLICT`.
- 422: validacion / campo runtime prohibido.

#### Eliminar
- `DELETE /api/v1/focus/tasks/{taskId}`
- version requerida via `If-Match` (preferido) o `?if_version=`.
- 204: eliminado.
- 409: `TASK_VERSION_CONFLICT`.
- 404: task no encontrada/no pertenece al usuario.

### 4.3 Runtime (objetivo)

Namespace canonico:
- `/api/v1/focus-sessions/*`

Endpoints objetivo:
- `GET /focus-sessions/active`
- `POST /focus-sessions/start`
- `POST /focus-sessions/pause`
- `POST /focus-sessions/resume`
- `POST /focus-sessions/stop`
- `POST /focus-sessions/reset`
- `POST /focus-sessions/switch-task`
- `POST /focus-sessions/heartbeat`

Payloads canonicos:
- `stop_reason` (alias temporal de entrada permitido: `stopped_reason`)
- `timer_mode` + `target_seconds` con precedencia documentada
- en `reset`: `task_id` y `expected_version` obligatorios

### 4.4 Daily log (objetivo)

- `GET /api/v1/focus/daily-log?date=YYYY-MM-DD&time_zone_name=America/Lima`
- corte diario por fecha local + timezone IANA (respetar DST).

## 5) Realtime

### 5.1 Naming canonico de eventos

Taskcards:
- `taskcard.created`
- `taskcard.updated`
- `taskcard.deleted`

Focus runtime:
- `focus_session.updated`
- `focus_session.stopped`

### 5.2 Regla Echo

- escuchar con punto:
  - `listen('.taskcard.updated')`
  - `listen('.focus_session.updated')`
- en payload `type` sin punto:
  - `"type": "taskcard.updated"`
  - `"type": "focus_session.updated"`

### 5.3 Canales privados

Frontend suscribe:
- `private-user.{userId}.focus.tasks`
- `private-user.{userId}.focus` (cuando backend lo habilite)

Backend registra:
- `user.{userId}.focus.tasks`
- `user.{userId}.focus`

### 5.4 Idempotencia y orden

- deduplicar por `event_id`.
- ignorar evento si `incoming.version < local.version`.
- si `incoming.version === local.version`, aplicar solo si no existe `event_id`.
- usar `origin_device_id` para evitar re-aplicar eco local.

## 6) Estrategia de estado frontend recomendada

Store sugerido:
- `taskcardsById: Record<string, Taskcard>`
- `orderedTaskIds: string[]`
- `activeSession: FocusSession | null`
- `dailyLogCacheByDateTz: Record<string, DailyLog>`
- `lastEventIds: Set<string>`

Reglas:
- Taskcards HTTP como source primario para CRUD.
- Realtime como sincronizacion cross-device.
- Runtime HTTP (cuando exista) como source autoritativo de estado de sesion.
- Daily log: refetch tras eventos de apertura/cierre FTE/ITE o aplicar delta.

## 7) Reglas de negocio criticas (frontend debe respetar)

- No editar runtime de task desde PATCH taskcards (`state`, `active_mode`, `timer_*`, `stopwatch_*`, `total_tracked_seconds`).
- `start`:
  - si backend responde `ACTIVE_SESSION_CONFLICT`, no forzar localmente.
- `reset`:
  - siempre enviar `task_id` + `expected_version`.
- `stop`:
  - usar solo `stop_reason` canonico.

## 8) Manejo de errores y UX

401:
- limpiar estado de sesion y redirigir a login.

404:
- eliminar entidad local y refrescar lista.

409 (`TASK_VERSION_CONFLICT`):
- refrescar task desde backend y mostrar aviso de conflicto.

409 (`FOCUS_RUNTIME_CONFLICT` / `ACTIVE_SESSION_CONFLICT`):
- hacer `GET /focus-sessions/active` (cuando exista) y rehidratar runtime.

422:
- mapear `errors` por campo y mostrar validaciones inline.

## 9) QA checklist frontend (paso a paso)

1. Login + CSRF + `GET /focus/tasks` exitoso.
2. Crear task y verificar render + IDs string.
3. Editar con `if_version` correcto (200).
4. Editar con `if_version` viejo (409 `TASK_VERSION_CONFLICT`).
5. DELETE con `If-Match` correcto (204).
6. DELETE con version vieja (409 `TASK_VERSION_CONFLICT`).
7. Realtime taskcards:
   - recibe `taskcard.created/updated/deleted`
   - dedupe por `event_id`
   - no downgrade por version menor.
8. Runtime (cuando se habilite):
   - start/pause/resume/stop/reset/switch-task/heartbeat contra contratos.
9. Daily log (cuando se habilite):
   - valida corte por timezone y casos de DST.

## 10) Tabla de verdad canonica

Rutas:
- Taskcards: `/api/v1/focus/tasks` (canonico), `/api/v1/tasks` (legacy)
- Runtime: `/api/v1/focus-sessions/*`
- Daily log: `/api/v1/focus/daily-log`

Eventos:
- Taskcards: `taskcard.created|updated|deleted`
- Runtime: `focus_session.updated|stopped`

Codigos de conflicto:
- Taskcards: `TASK_VERSION_CONFLICT`
- Runtime: `FOCUS_RUNTIME_CONFLICT`
- Start con focus activo: `ACTIVE_SESSION_CONFLICT`
