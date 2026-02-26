# Velor Backend - Modulo 5 (Contador server-authoritative / Focus Sessions HTTP) - Handoff para equipo Laravel

## Objetivo del modulo

Implementar el runtime del contador como fuente de verdad en backend (server-authoritative), usando endpoints HTTP para controlar la sesion activa de enfoque:

- `GET /api/v1/focus-sessions/active`
- `POST /api/v1/focus-sessions/start`
- `POST /api/v1/focus-sessions/pause`
- `POST /api/v1/focus-sessions/resume`
- `POST /api/v1/focus-sessions/switch-task`
- `POST /api/v1/focus-sessions/stop`
- `POST /api/v1/focus-sessions/heartbeat` (opcional recomendado)

Este modulo permite que laptop/celular compartan el mismo estado del contador aunque aun no exista WebSocket (Modulo 7).

## Dependencias directas

Este modulo depende de:

- **Modulo 1 (Auth)** operativo
  - sesion via Sanctum (cookie)
  - `users`, `workspaces`, `workspace_members`
- **Modulo 2 (`/app/bootstrap`)** operativo
  - contrato ya incluye `server_now_utc` y `active_focus_session`
- **Modulo 4 (Tasks)** operativo
  - validacion de `task_id`
  - `target_duration_seconds` de la tarea

Recomendado (pero no obligatorio para este modulo):
- **Modulo 3 (Preferences)** para timezone/locale consistentes
- **Modulo 6 (History / time_entries)** para persistir sesiones finalizadas en historial

Referencias:
- `docs/backend/module-1-auth-laravel-handoff.md`
- `docs/backend/module-2-app-bootstrap-laravel-handoff.md`
- `docs/backend/module-4-tasks-laravel-handoff.md`

---

## Alcance (MVP)

### Incluido
- una sesion activa de enfoque por usuario (server-authoritative)
- comandos HTTP:
  - start
  - pause
  - resume
  - switch-task
  - stop
- lectura del estado activo (`GET /active`)
- `server_now_utc` en responses del modulo
- control de concurrencia con `version` + `expected_version`
- scoping por `workspace_id`
- compatibilidad con `active_focus_session` en `/app/bootstrap`

### Opcional en esta entrega (si da tiempo)
- `heartbeat` para deteccion/fallback/presencia
- `focus_session_events` (auditoria de comandos)
- idempotency key en comandos mutantes

### Fuera de alcance (este modulo)
- WebSocket / Reverb / Echo (Modulo 7)
- persistencia de historial (`time_entries`) y agregados diarios (Modulo 6)
- sesiones no registradas ("untracked") en backend
- notificaciones push / alarmas server-side

---

## Decisiones tecnicas (obligatorias)

## 1. Server-authoritative (definicion)
- El backend es la fuente de verdad del contador.
- El frontend no decide el tiempo final; solo renderiza el estado recibido.
- Todo response de este modulo debe incluir:
  - `server_now_utc`
  - `active_focus_session` (o `null` en `stop`)

## 2. Comandos por HTTP; realtime despues
- En este modulo, los cambios de estado se hacen por HTTP.
- El realtime por WebSocket (Modulo 7) solo notificara eventos, pero el comando sigue siendo HTTP.

## 3. Concurrencia optimista (obligatoria)
- `pause`, `resume`, `switch-task`, `stop`, `heartbeat` (si existe) deben recibir `expected_version`.
- Si `expected_version` no coincide con el estado actual:
  - responder `409 Conflict` con snapshot actualizado
  - frontend debe re-sincronizar

## 4. Una sola sesion activa por usuario
- Debe existir como maximo una fila activa por usuario (y workspace).
- Constraint recomendado:
  - `unique (workspace_id, user_id)` en `active_focus_sessions`

## 5. Tiempo en UTC + calculo canonico
- Backend guarda timestamps UTC.
- `elapsed_seconds_total` representa tiempo acumulado confirmado.
- Si la sesion esta `running`, el tiempo mostrado se deriva como:

```txt
display_elapsed = elapsed_seconds_total + (server_now_utc - last_resumed_at_utc)
```

- Si la sesion esta `paused`, el tiempo mostrado es:

```txt
display_elapsed = elapsed_seconds_total
```

## 6. Integracion con Tasks (M4)
- `task_id` debe pertenecer al workspace del usuario.
- `switch-task` debe validar el nuevo `task_id`.
- `timer_mode = timer` puede usar `target_seconds`:
  - enviado por frontend, o
  - derivado de `tasks.target_duration_seconds`

> Recomendado: si el frontend envia `target_seconds`, validar contra task o aceptar si es consistente.

## 7. Historial diferido (M6)
- En este modulo, `stop` puede cerrar la sesion activa sin crear `time_entries`.
- Si el equipo prefiere persistir `time_entries` ya en M5, el contrato puede mantenerse compatible.
- Para no mezclar alcances, la recomendacion es **dejar `time_entries` para M6**.

---

# Shape canonico de `active_focus_session` (contrato)

Este shape debe ser consistente en:
- `GET /api/v1/focus-sessions/active`
- responses de comandos `start/pause/resume/switch-task`
- `GET /api/v1/app/bootstrap` (`data.active_focus_session`)

```json
{
  "id": "fs_01HXYZ...",
  "task_id": "task_01HXYZ...",
  "timer_mode": "timer",
  "session_state": "running",
  "target_seconds": 2700,
  "started_at_utc": "2026-02-25T14:00:00Z",
  "last_resumed_at_utc": "2026-02-25T14:10:00Z",
  "last_paused_at_utc": null,
  "elapsed_seconds_total": 420,
  "version": 3
}
```

### `timer_mode`
- `stopwatch`
- `timer`

### `session_state`
- `running`
- `paused`

---

# Endpoints (contrato de integracion)

## Envelope recomendado para responses del modulo

Para simplificar frontend:

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": { "...": "..." }
  }
}
```

En `stop`, `active_focus_session` puede ser `null`.

### Opcion recomendada en `stop` (extra)
Agregar tambien `stopped_session_summary`:

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "task_01HXYZ...",
      "timer_mode": "timer",
      "elapsed_seconds_final": 1530,
      "target_seconds": 1800,
      "stopped_reason": "user_stop"
    }
  }
}
```

---

## 1) `GET /api/v1/focus-sessions/active`

### Para que sirve
Devuelve la sesion activa actual del usuario autenticado para sincronizar el contador al abrir `/app` o al reintentar sync.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request
- sin body
- sin query

### Response (`200`) con sesion activa

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": {
      "id": "fs_01HXYZ...",
      "task_id": "task_01...",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds": 2700,
      "started_at_utc": "2026-02-25T14:10:00Z",
      "last_resumed_at_utc": "2026-02-25T14:10:00Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 0,
      "version": 1
    }
  }
}
```

### Response (`200`) sin sesion activa

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
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

#### `500 Internal Server Error`
- error inesperado leyendo sesion activa

---

## 2) `POST /api/v1/focus-sessions/start`

### Para que sirve
Inicia una nueva sesion de enfoque activa para una tarea.

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

### Request

```json
{
  "task_id": "task_01HXYZ...",
  "timer_mode": "timer",
  "target_seconds": 2700
}
```

### Variantes validas
- `timer_mode = "stopwatch"` con `target_seconds = null`
- `target_seconds` puede omitirse si backend lo deriva desde la tarea (recomendado)

### Validaciones minimas (sugeridas)
- `task_id`: required|uuid (o ulid/string segun proyecto)
- `timer_mode`: required|in:timer,stopwatch
- `target_seconds`: nullable|integer|min:1|max:86400

### Reglas de negocio (obligatorias)
- validar que `task_id` pertenece al workspace del usuario
- si ya existe sesion activa:
  - responder `409 Conflict` (`ACTIVE_SESSION_EXISTS`) con snapshot actual
  - no reemplazar silenciosamente

### Response (exito, `200` o `201`)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": {
      "id": "fs_01HXYZ...",
      "task_id": "task_01HXYZ...",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds": 2700,
      "started_at_utc": "2026-02-25T14:32:10Z",
      "last_resumed_at_utc": "2026-02-25T14:32:10Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 0,
      "version": 1
    }
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

#### `404 Not Found`
- `task_id` no existe o no pertenece al workspace del usuario

#### `409 Conflict` (sesion ya existe)
```json
{
  "message": "An active focus session already exists.",
  "code": "ACTIVE_SESSION_EXISTS",
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": {
      "id": "fs_01...",
      "task_id": "task_99...",
      "timer_mode": "stopwatch",
      "session_state": "running",
      "target_seconds": null,
      "started_at_utc": "2026-02-25T14:28:00Z",
      "last_resumed_at_utc": "2026-02-25T14:28:00Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 0,
      "version": 4
    }
  }
}
```

#### `422 Unprocessable Entity`
- payload invalido

---

## 3) `POST /api/v1/focus-sessions/pause`

### Para que sirve
Pausa la sesion activa y consolida tiempo acumulado hasta `server_now_utc`.

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

### Request

```json
{
  "expected_version": 3
}
```

### Validaciones minimas
- `expected_version`: required|integer|min:1

### Reglas de negocio (obligatorias)
- debe existir sesion activa
- debe estar en `session_state = running`
- calcular y consolidar `elapsed_seconds_total`
- incrementar `version`

### Response (`200`)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:40:00Z",
    "active_focus_session": {
      "id": "fs_01HXYZ...",
      "task_id": "task_01...",
      "timer_mode": "timer",
      "session_state": "paused",
      "target_seconds": 2700,
      "started_at_utc": "2026-02-25T14:32:10Z",
      "last_resumed_at_utc": null,
      "last_paused_at_utc": "2026-02-25T14:40:00Z",
      "elapsed_seconds_total": 470,
      "version": 4
    }
  }
}
```

### Errores esperados

#### `401 Unauthorized`
#### `409 Conflict` (`VERSION_MISMATCH`)
```json
{
  "message": "Focus session version mismatch.",
  "code": "VERSION_MISMATCH",
  "data": {
    "server_now_utc": "2026-02-25T14:40:00Z",
    "active_focus_session": {
      "id": "fs_01...",
      "version": 5
    }
  }
}
```

#### `409 Conflict` (`NO_ACTIVE_SESSION` / `SESSION_NOT_RUNNING`)
- no hay sesion activa o ya estaba pausada

#### `500 Internal Server Error`

---

## 4) `POST /api/v1/focus-sessions/resume`

### Para que sirve
Reanuda una sesion activa pausada.

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

### Request

```json
{
  "expected_version": 4
}
```

### Reglas de negocio (obligatorias)
- debe existir sesion activa
- debe estar `paused`
- setear:
  - `session_state = running`
  - `last_resumed_at_utc = server_now_utc`
- incrementar `version`

### Response (`200`)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:43:10Z",
    "active_focus_session": {
      "id": "fs_01HXYZ...",
      "task_id": "task_01...",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds": 2700,
      "started_at_utc": "2026-02-25T14:32:10Z",
      "last_resumed_at_utc": "2026-02-25T14:43:10Z",
      "last_paused_at_utc": "2026-02-25T14:40:00Z",
      "elapsed_seconds_total": 470,
      "version": 5
    }
  }
}
```

### Errores esperados
- `401`
- `409 VERSION_MISMATCH`
- `409 NO_ACTIVE_SESSION`
- `409 SESSION_NOT_PAUSED`
- `500`

---

## 5) `POST /api/v1/focus-sessions/switch-task`

### Para que sirve
Cambia la tarea activa de la sesion de enfoque y reinicia el conteo de la sesion actual (nuevo bloque de foco).

> Este endpoint existe para sincronizar el flujo actual del frontend donde cambiar de task inicia un conteo nuevo.

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

### Request

```json
{
  "expected_version": 5,
  "task_id": "task_02HXYZ...",
  "timer_mode": "stopwatch",
  "target_seconds": null
}
```

### Validaciones minimas
- `expected_version`: required|integer|min:1
- `task_id`: required|uuid (o ulid/string)
- `timer_mode`: nullable|in:timer,stopwatch
- `target_seconds`: nullable|integer|min:1|max:86400

### Reglas de negocio (obligatorias)
- debe existir sesion activa
- validar `task_id` nuevo en workspace
- resetear conteo de sesion:
  - `elapsed_seconds_total = 0`
  - `started_at_utc = server_now_utc`
  - `last_resumed_at_utc = server_now_utc` (si queda running)
  - `last_paused_at_utc = null`
- mantener `session_state = running` (recomendado para alinear UX actual)
- incrementar `version`

### Response (`200`)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:45:00Z",
    "active_focus_session": {
      "id": "fs_01HXYZ...",
      "task_id": "task_02HXYZ...",
      "timer_mode": "stopwatch",
      "session_state": "running",
      "target_seconds": null,
      "started_at_utc": "2026-02-25T14:45:00Z",
      "last_resumed_at_utc": "2026-02-25T14:45:00Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 0,
      "version": 6
    }
  }
}
```

### Errores esperados
- `401`
- `404` (`task_id` inexistente/no accesible)
- `409 VERSION_MISMATCH`
- `409 NO_ACTIVE_SESSION`
- `500`

---

## 6) `POST /api/v1/focus-sessions/stop`

### Para que sirve
Finaliza y cierra la sesion activa.

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

### Request

```json
{
  "expected_version": 6,
  "stopped_reason": "user_stop"
}
```

### `stopped_reason` sugeridos
- `user_stop`
- `timer_complete`
- `task_switch` (si se decide usar `stop + start` en vez de `switch-task`)

### Validaciones minimas
- `expected_version`: required|integer|min:1
- `stopped_reason`: nullable|in:user_stop,timer_complete,task_switch

### Reglas de negocio (obligatorias)
- debe existir sesion activa
- calcular `elapsed_seconds_final`
- eliminar/cerrar la fila de `active_focus_sessions`
- responder `active_focus_session: null`

### Response (`200`)

```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:49:12Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "task_02HXYZ...",
      "timer_mode": "stopwatch",
      "elapsed_seconds_final": 252,
      "target_seconds": null,
      "stopped_reason": "user_stop"
    }
  }
}
```

### Errores esperados
- `401`
- `409 VERSION_MISMATCH`
- `409 NO_ACTIVE_SESSION`
- `500`

---

## 7) `POST /api/v1/focus-sessions/heartbeat` (opcional recomendado)

### Para que sirve
Refresca snapshot del estado activo sin mutar logica de negocio (util para fallback/presencia/sync ligero).

### Auth + CSRF
- Requiere sesion (Sanctum)
- Requiere CSRF (si lo consideran mutacion). Si solo lee, puede ser `GET` y salir de este modulo.

### Request (si se implementa)

```json
{
  "expected_version": 6
}
```

### Response
- mismo envelope con `server_now_utc` + `active_focus_session`

### Nota
- Si complica la entrega, puede postergarse a Modulo 7.

---

## Errores y codigos recomendados (M5)

### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

### `404 Not Found`
- `task_id` no existe o no pertenece al workspace del usuario

### `409 Conflict` (estado/concurrencia)

Codigos sugeridos (`code`):
- `ACTIVE_SESSION_EXISTS`
- `NO_ACTIVE_SESSION`
- `VERSION_MISMATCH`
- `SESSION_NOT_RUNNING`
- `SESSION_NOT_PAUSED`

> En conflictos, cuando sea posible, incluir snapshot actualizado (`server_now_utc`, `active_focus_session`) para re-sync inmediato del frontend.

### `422 Unprocessable Entity`
- payload invalido (`task_id`, `timer_mode`, `expected_version`, etc.)

### `500 Internal Server Error`
- error inesperado de persistencia o transaccion
- loguear contexto (`user_id`, `workspace_id`, endpoint, payload_keys`)

---

# Impacto en BD respecto al Modulo 4 (que se agrega / que se modifica)

## Estado actual esperado (Modulo 4 ya implementado)
Tablas existentes:
- `users`
- `workspaces`
- `workspace_members`
- `user_preferences`
- `tasks`

Tablas posibles (si M2/M6 adelantaron cosas):
- `time_entries`

## Tablas que se agregan para Modulo 5
- `active_focus_sessions` (**obligatoria**)
- `focus_session_events` (opcional recomendado)

## Tablas que se modifican para Modulo 5
- ninguna obligatoria si `active_focus_sessions` es nueva
- opcional: agregar indice/columna auxiliar en `tasks` (no requerido para MVP)

---

## Tabla `active_focus_sessions` (schema minimo recomendado)

```txt
active_focus_sessions
- id (string/uuid/ulid, pk)
- workspace_id (string/uuid/ulid, fk -> workspaces.id)
- user_id (string/uuid/ulid, fk -> users.id)
- task_id (string/uuid/ulid, fk -> tasks.id)
- timer_mode (varchar(16))               -- 'timer' | 'stopwatch'
- session_state (varchar(16))            -- 'running' | 'paused'
- target_seconds (integer, nullable)
- started_at_utc (timestamptz)
- last_resumed_at_utc (timestamptz, nullable)
- last_paused_at_utc (timestamptz, nullable)
- elapsed_seconds_total (integer, default 0)
- version (bigint, default 1)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Constraints recomendadas
- `check (timer_mode in ('timer','stopwatch'))`
- `check (session_state in ('running','paused'))`
- `check (elapsed_seconds_total >= 0)`
- `check (target_seconds is null or target_seconds between 1 and 86400)`

### Unicidad / indices recomendados
- `unique (workspace_id, user_id)`  -- una sesion activa por usuario/workspace
- indice: `(workspace_id, task_id)`
- indice: `(user_id)`
- indice: `(updated_at)`

### Nota de consistencia (recomendada)
Si usan checks mas avanzados:
- cuando `session_state = 'running'`, `last_resumed_at_utc` no debe ser null

---

## Tabla `focus_session_events` (opcional recomendado)

Sirve para auditoria, debugging, idempotencia y analisis posterior. Puede entrar en M5 o diferirse.

```txt
focus_session_events
- id (string/uuid/ulid, pk)
- workspace_id (string/uuid/ulid, fk -> workspaces.id)
- user_id (string/uuid/ulid, fk -> users.id)
- focus_session_id (string/uuid/ulid, nullable)   -- puede quedar null despues de stop si se borra la fila
- task_id (string/uuid/ulid, nullable)
- event_type (varchar(32))                         -- start|pause|resume|switch_task|stop|heartbeat
- version_after (bigint, nullable)
- occurred_at_utc (timestamptz)
- idempotency_key (varchar(80), nullable)
- payload_json (jsonb, nullable)
- created_at (timestamptz)
```

### Indices recomendados
- indice: `(workspace_id, user_id, occurred_at_utc desc)`
- indice: `(event_type, occurred_at_utc desc)`
- unique parcial en `idempotency_key` si lo implementan

---

## Cambios esperados en `/app/bootstrap` (Modulo 2) despues de M5

No hay cambios breaking de contrato.

Lo que cambia:
- `data.active_focus_session` deja de ser placeholder/null casi siempre
- pasa a reflejar el estado real del contador server-authoritative
- `server_now_utc` ya se vuelve clave para calcular tiempo en frontend

---

## Orden de migraciones recomendado (si M5 llega despues de M4)

1. crear `active_focus_sessions`
2. agregar constraints / unique / indices
3. (opcional) crear `focus_session_events`
4. desplegar backend con endpoints M5
5. validar `/app/bootstrap` con `active_focus_session` real

---

## Implementacion Laravel esperada (entregables del equipo backend)

## Rutas (`routes/api.php`)
- `GET /api/v1/focus-sessions/active`
- `POST /api/v1/focus-sessions/start`
- `POST /api/v1/focus-sessions/pause`
- `POST /api/v1/focus-sessions/resume`
- `POST /api/v1/focus-sessions/switch-task`
- `POST /api/v1/focus-sessions/stop`
- `POST /api/v1/focus-sessions/heartbeat` (opcional)

## Controllers
- `FocusSessionController`
  - `active`
  - `start`
  - `pause`
  - `resume`
  - `switchTask`
  - `stop`
  - `heartbeat` (opcional)

## Form Requests (minimos)
- `StartFocusSessionRequest`
- `PauseFocusSessionRequest`
- `ResumeFocusSessionRequest`
- `SwitchFocusSessionTaskRequest`
- `StopFocusSessionRequest`
- `HeartbeatFocusSessionRequest` (opcional)

## Resources
- `ActiveFocusSessionResource`
- `FocusSessionStateResource` (envelope con `server_now_utc` + `active_focus_session`)
- `StoppedFocusSessionResource` (si incluyen summary de stop)

## Servicios (recomendado)
- `FocusSessionService`
  - `getActiveForUser(...)`
  - `start(...)`
  - `pause(...)`
  - `resume(...)`
  - `switchTask(...)`
  - `stop(...)`
  - `heartbeat(...)` (opcional)

- `FocusSessionClock` (opcional helper)
  - encapsula `nowUtc()` y calculo de elapsed

## Estrategia de concurrencia (recomendada)
- `DB::transaction()` en comandos mutantes
- leer fila con `lockForUpdate()`
- validar `expected_version`
- actualizar e incrementar `version`

> Alternativa: optimistic locking puro (`where version = expected_version`), pero con calculo de tiempo suele ser mas claro usar `lockForUpdate`.

---

## Pruebas minimas (Feature tests)

## `GET /focus-sessions/active`
- devuelve `active_focus_session: null` si no hay sesion
- devuelve snapshot correcto si hay sesion
- responde `401` sin sesion

## `POST /start`
- crea sesion activa running
- valida `task_id` del workspace
- responde `409 ACTIVE_SESSION_EXISTS` si ya hay una activa

## `POST /pause`
- consolida `elapsed_seconds_total`
- cambia `session_state` a `paused`
- incrementa `version`
- responde `409 VERSION_MISMATCH` si corresponde

## `POST /resume`
- cambia a `running`
- setea `last_resumed_at_utc`
- incrementa `version`
- valida estado previo (`paused`)

## `POST /switch-task`
- cambia `task_id`
- reinicia elapsed de la sesion
- mantiene sesion en `running`
- incrementa `version`
- valida task del workspace

## `POST /stop`
- calcula tiempo final
- elimina/cierra sesion activa
- devuelve `active_focus_session: null`
- responde `409 VERSION_MISMATCH` si corresponde

## Seguridad / scoping
- no permite manipular tareas de otro workspace
- no permite leer sesion activa de otro usuario

---

## Criterios de aceptacion (Modulo 5)

- [ ] `/app/bootstrap` puede devolver `active_focus_session` real (no solo `null`)
- [ ] `GET /api/v1/focus-sessions/active` devuelve snapshot consistente + `server_now_utc`
- [ ] `start/pause/resume/switch-task/stop` funcionan con sesion/cookie (Sanctum)
- [ ] Todos los comandos mutantes requieren y respetan CSRF
- [ ] Existe una sola sesion activa por usuario/workspace
- [ ] Se aplica control de concurrencia con `version` + `expected_version`
- [ ] Conflictos devuelven `409` con codigo claro y snapshot cuando aplique
- [ ] No hay cambios breaking en contrato de `/app/bootstrap`
- [ ] El modulo funciona sin WebSocket (realtime se agrega en Modulo 7)

---

## Nota para el equipo backend

Este modulo prepara la sincronizacion multi-dispositivo del contador incluso antes del realtime:

- backend = fuente de verdad
- frontend = renderer del estado
- `server_now_utc` + `active_focus_session` = base del calculo de tiempo

En el **Modulo 6** se integra historial (`time_entries`) y en el **Modulo 7** se agrega WebSocket (Reverb/Echo) para sync en tiempo real entre laptop/celular.

