# Focus Sessions + Daily Log Contract (Desde Cero) - Laravel + Reverb

## Scope

Este modulo une:
- contador (focus session)
- sesiones de enfoque
- tiempo no trackeado (untracked)
- daily log (historial diario)

Regla central:
- backend registra timestamps exactos (con milisegundos)
- frontend solo renderiza el contador y estado visual
- backend es fuente de verdad para sesiones e historial

---

## Que se registra exactamente

### Al dar Play en una Task Card

Backend registra:
- `started_at_utc` exacto (`YYYY-MM-DDTHH:mm:ss.SSSZ`)
- `last_resumed_at_utc` exacto
- `timer_mode` (`timer` o `stopwatch`)
- `target_seconds_snapshot` (valor del taskcard en ese instante)

Notas:
- si el usuario cambia luego la tarea (ej. nuevo target), el snapshot historico se mantiene
- si habia tiempo untracked activo, se cierra en ese mismo instante

### Al dar Pause

Backend registra:
- `last_paused_at_utc` exacto
- actualiza `elapsed_seconds_total`
- crea/inicia `active_untracked_session` desde ese instante

### Cuando no hay tarea en ejecucion

Backend registra tiempo muerto como `untracked`:
- inicia `active_untracked_session` cuando no existe focus en running
- cierra `active_untracked_session` cuando se inicia/reanuda foco
- al cerrar, persiste `time_entry` tipo `untracked`

### Daily Log

- no se edita manualmente desde contador
- se construye desde `time_entries` (`focus` + `untracked` + `manual_adjustment`)

---

## Endpoints (contrato)

## 1) Obtener sesion activa

El frontend enviara al backend:  
`GET /api/v1/focus-sessions/active`

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-02T16:20:10.123Z",
    "active_focus_session": {
      "id": "fs_123",
      "task_id": "task_123",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds_snapshot": 3600,
      "started_at_utc": "2026-03-02T16:10:00.456Z",
      "last_resumed_at_utc": "2026-03-02T16:10:00.456Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 600,
      "version": 4
    },
    "active_untracked_session": null
  }
}
```

---

## 2) Iniciar sesion de enfoque (Play)

El frontend enviara al backend:  
`POST /api/v1/focus-sessions/start`

body:
```json
{
  "task_id": "task_123",
  "timer_mode": "timer",
  "target_seconds": 3600
}
```

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-02T16:10:00.456Z",
    "active_focus_session": {
      "id": "fs_123",
      "task_id": "task_123",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds_snapshot": 3600,
      "started_at_utc": "2026-03-02T16:10:00.456Z",
      "last_resumed_at_utc": "2026-03-02T16:10:00.456Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 0,
      "version": 1
    },
    "active_untracked_session": null,
    "closed_untracked_time_entry_id": "te_987"
  }
}
```

---

## 3) Pausar sesion (Pause)

El frontend enviara al backend:  
`POST /api/v1/focus-sessions/pause`

body:
```json
{
  "expected_version": 1
}
```

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-02T16:20:10.123Z",
    "active_focus_session": {
      "id": "fs_123",
      "task_id": "task_123",
      "timer_mode": "timer",
      "session_state": "paused",
      "target_seconds_snapshot": 3600,
      "started_at_utc": "2026-03-02T16:10:00.456Z",
      "last_resumed_at_utc": "2026-03-02T16:10:00.456Z",
      "last_paused_at_utc": "2026-03-02T16:20:10.123Z",
      "elapsed_seconds_total": 610,
      "version": 2
    },
    "active_untracked_session": {
      "id": "uts_1",
      "started_at_utc": "2026-03-02T16:20:10.123Z"
    }
  }
}
```

---

## 4) Reanudar sesion

El frontend enviara al backend:  
`POST /api/v1/focus-sessions/resume`

body:
```json
{
  "expected_version": 2
}
```

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-02T16:25:00.999Z",
    "active_focus_session": {
      "id": "fs_123",
      "task_id": "task_123",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds_snapshot": 3600,
      "started_at_utc": "2026-03-02T16:10:00.456Z",
      "last_resumed_at_utc": "2026-03-02T16:25:00.999Z",
      "last_paused_at_utc": "2026-03-02T16:20:10.123Z",
      "elapsed_seconds_total": 610,
      "version": 3
    },
    "active_untracked_session": null,
    "closed_untracked_time_entry_id": "te_999"
  }
}
```

---

## 5) Detener sesion

El frontend enviara al backend:  
`POST /api/v1/focus-sessions/stop`

body:
```json
{
  "expected_version": 3,
  "stopped_reason": "user_stop"
}
```

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-02T16:40:00.222Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "task_123",
      "timer_mode": "timer",
      "elapsed_seconds_final": 1510,
      "target_seconds_snapshot": 3600,
      "stopped_reason": "user_stop"
    },
    "created_time_entry_id": "te_focus_1",
    "active_untracked_session": {
      "id": "uts_2",
      "started_at_utc": "2026-03-02T16:40:00.222Z"
    }
  }
}
```

---

## 6) Heartbeat / re-sync

El frontend enviara al backend:  
`POST /api/v1/focus-sessions/heartbeat`

body:
```json
{
  "expected_version": 3
}
```

uso:
- sincronizar estado autoritativo
- resolver drift entre dispositivos
- recuperar estado al volver a foco

---

## 7) Daily log / historial (derivado de time_entries)

El frontend enviara al backend:
- `GET /api/v1/history/overview`
- `GET /api/v1/history/days`
- `GET /api/v1/history/days/{date}`

Regla:
- backend calcula todo desde `time_entries`
- incluye entries `focus` y `untracked`

---

## Errores esperados (base)

sino (`401`):
```json
{
  "message": "Unauthenticated."
}
```

sino (`404`):
```json
{
  "message": "Task not found."
}
```

sino (`409`):
```json
{
  "message": "Session version conflict.",
  "code": "FOCUS_SESSION_VERSION_CONFLICT",
  "data": {
    "server_version": 4
  }
}
```

sino (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "timer_mode": [
      "The selected timer mode is invalid."
    ]
  }
}
```

---

## Realtime (Reverb)

Canal privado:
- wire-level: `private-user.{userId}.focus`
- frontend Echo: `echo.private('user.{userId}.focus')`

Eventos:
- `.focus_session.updated`
- `.focus_session.stopped`
- `.untracked_session.updated`
- `.time_entry.created`

Objetivo realtime:
- todos los dispositivos del mismo usuario ven el mismo estado de contador y log casi en tiempo real

---

## Modelo DB recomendado (minimo)

### `focus_sessions`

- `id` (uuid)
- `user_id` (fk)
- `task_id` (fk)
- `timer_mode` (`timer|stopwatch`)
- `target_seconds_snapshot` (nullable int)
- `session_state` (`running|paused|stopped`)
- `started_at_utc` (timestamp(3))
- `last_resumed_at_utc` (timestamp(3), nullable)
- `last_paused_at_utc` (timestamp(3), nullable)
- `elapsed_seconds_total` (int)
- `version` (int)
- `stopped_at_utc` (timestamp(3), nullable)
- `stopped_reason` (nullable string)

### `active_untracked_sessions`

- `id` (uuid)
- `user_id` (fk unique)
- `started_at_utc` (timestamp(3))

### `time_entries`

- `id` (uuid)
- `user_id` (fk)
- `task_id` (nullable fk)
- `focus_session_id` (nullable fk)
- `entry_type` (`focus|untracked|manual_adjustment`)
- `timer_mode_snapshot` (nullable string)
- `target_seconds_snapshot` (nullable int)
- `started_at_utc` (timestamp(3))
- `ended_at_utc` (timestamp(3))
- `duration_seconds` (int)
- `created_at`
- `updated_at`

Nota:
- `daily_log` no necesita tabla fisica; se arma consultando `time_entries`.

---

## Configuracion adicional obligatoria

### Frontend

- usar `credentials: 'include'`
- mutaciones protegidas con:
  - `GET /sanctum/csrf-cookie`
- al recibir eventos Reverb:
  - aplicar snapshot
  - si llega `created_time_entry_id`, invalidar/refetch de daily log

### Backend Laravel

- timestamps con precision de milisegundos (`timestamp(3)`)
- emitir eventos realtime despues de commit DB
- validacion optimista por `expected_version` en comandos
