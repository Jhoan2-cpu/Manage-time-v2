# Focus Runtime + Daily Log Contract (CU Final) - Frontend <-> Backend

Estado: borrador final para implementacion backend.
Fecha: 2026-03-05.

## Scope

Este documento cubre solo:
- runtime de focus por taskcard (`play/pause/resume/stop/reset`)
- modo `timer` y modo `stopwatch`
- persistencia en `focus_time_entries` e `idle_time_entries`
- sincronizacion realtime entre dispositivos del mismo usuario
- registro diario (daily log) en tiempo real

Fuera de alcance por ahora:
- preferencias/configuracion de usuario
- modulo historial avanzado (filtros/paginacion/reportes)

---

## Source of truth (DB)

Tablas de dominio usadas:
- `focus_tasks`
- `focus_time_entries`
- `idle_time_entries`

IDs:
- DB: `bigint`
- API JSON: `string` (para evitar perdida de precision en JS)

Timestamps:
- siempre UTC
- server-authoritative (`now()` backend)

Enums vigentes:
- `focus_tasks.active_mode`: `timer | stopwatch`
- `focus_tasks.state`: `idle | working | paused | stopped`
- `focus_time_entries.mode_snapshot`: `timer | stopwatch`
- `focus_time_entries.stop_reason`: `manual | timer_completed | task_switch | session_end | idle_detected`
- `idle_time_entries.reason`: `user_idle | break | task_switch | session_end`

Invariantes obligatorias:
- max 1 `focus_time_entries` activo por usuario (`ended_at_utc IS NULL`)
- max 1 `idle_time_entries` activo por usuario (`ended_at_utc IS NULL`)
- nunca activos simultaneamente en ambas tablas para el mismo usuario
- `ended_at_utc IS NULL => elapsed_seconds IS NULL`
- `ended_at_utc IS NOT NULL => elapsed_seconds >= 0`
- `ended_at_utc >= started_at_utc`

---

## Runtime state machine (taskcard)

Transiciones canonicas por task:
- `idle --play--> working`
- `working --pause--> paused`
- `paused --resume--> working`
- `working --stop--> stopped`
- `paused --stop--> stopped`
- `stopped --reset--> idle`
- `paused --reset--> idle`

Regla de modo al hacer `play`:
- si `timer_initial_seconds > 0`, iniciar por defecto en `timer`
- si `timer_initial_seconds IS NULL` o `0`, iniciar por defecto en `stopwatch`

Reglas de edicion de taskcard:
- cuando `state IN (working, paused)`:
  - permitir editar solo `alarm_time_local`
  - bloquear metadatos y valores runtime (nombre, color, icono, timer inicial, etc.)
- cuando `state IN (idle, stopped)`:
  - permitir editar metadatos y timer inicial
- cualquier cambio permitido debe reflejarse en realtime

---

## Persistencia por comando

## 1) Play (`start`)

Efectos backend:
1. transaccion + lock por usuario
2. cerrar idle activo (si existe)
3. abrir `focus_time_entries` activo (snapshot de task actual)
4. actualizar `focus_tasks` del task objetivo:
   - `state = working`
   - `active_mode = timer|stopwatch`
   - `timer_started_at_utc` o `stopwatch_started_at_utc` segun modo
   - `timer_ended_at_utc`/`stopwatch_ended_at_utc = NULL`
   - incrementar `version`

Notas:
- `timer_target_snapshot_seconds` se llena solo en modo `timer`
- en modo `stopwatch`, `timer_target_snapshot_seconds = NULL`

## 2) Pause

Efectos backend:
1. transaccion + lock por usuario
2. validar sesion activa y `expected_version`
3. actualizar solo `focus_tasks`:
   - `state = paused`
   - congelar contador:
     - timer: recalcular `timer_remaining_seconds`
     - stopwatch: recalcular `stopwatch_elapsed_seconds`
   - limpiar marcador de inicio activo del modo (`*_started_at_utc = NULL`)
   - incrementar `version`

Notas:
- no cerrar `focus_time_entries` en pause
- no abrir `idle_time_entries` en pause

## 3) Resume

Efectos backend:
1. transaccion + lock por usuario
2. validar task pausado y `expected_version`
3. actualizar `focus_tasks`:
   - `state = working`
   - reactivar reloj del modo actual:
     - timer: `timer_started_at_utc = now()`
     - stopwatch: `stopwatch_started_at_utc = now()`
   - incrementar `version`

Notas:
- no crear nuevo `focus_time_entries` en resume

## 4) Stop

Efectos backend:
1. transaccion + lock por usuario
2. validar sesion activa y `expected_version`
3. cerrar `focus_time_entries` activo:
   - `ended_at_utc = now()`
   - `elapsed_seconds` final
   - `stop_reason` segun comando (`manual`, `timer_completed`, `session_end`, `idle_detected`, `task_switch`)
4. actualizar `focus_tasks`:
   - `state = stopped`
   - actualizar `timer_remaining_seconds` o `stopwatch_elapsed_seconds`
   - setear `timer_ended_at_utc` o `stopwatch_ended_at_utc`
   - sumar delta a `total_tracked_seconds`
   - incrementar `version`
5. abrir `idle_time_entries` activo cuando aplique:
   - mapeo sugerido:
     - `manual` -> `break`
     - `session_end` -> `session_end`
     - `timer_completed` -> `break`

## 5) Reset

Efectos backend:
1. transaccion + lock por usuario
2. si existe `focus_time_entries` activo, cerrarlo con `stop_reason = session_end`
3. actualizar `focus_tasks`:
   - `state = idle`
   - `timer_remaining_seconds = timer_initial_seconds`
   - `stopwatch_elapsed_seconds = 0`
   - limpiar marcas `*_started_at_utc` y `*_ended_at_utc`
   - incrementar `version`
4. abrir `idle_time_entries` activo con `reason = session_end`

## 6) Switch task (opcional recomendado)

Efectos backend (atomico):
1. cerrar sesion activa de task A con `stop_reason = task_switch`
2. iniciar sesion en task B (`state = working`)
3. no abrir idle intermedio
4. emitir eventos realtime de ambos cambios

---

## API contract recomendado

Namespace canonico:
- `/api/v1/focus-sessions/*`

## GET `/api/v1/focus-sessions/active`

Devuelve snapshot autoritativo de runtime.

Respuesta 200 (shape):
```json
{
  "data": {
    "server_now_utc": "2026-03-05T14:20:00Z",
    "active_focus_session": {
      "id": "9001",
      "task_id": "101",
      "timer_mode": "timer",
      "session_state": "working",
      "target_seconds": 1500,
      "elapsed_seconds_total": 420,
      "version": 6
    }
  }
}
```

## POST `/api/v1/focus-sessions/start`

Request:
```json
{
  "task_id": "101",
  "timer_mode": "timer",
  "target_seconds": 1500
}
```

## POST `/api/v1/focus-sessions/pause`

Request:
```json
{
  "expected_version": 6
}
```

## POST `/api/v1/focus-sessions/resume`

Request:
```json
{
  "expected_version": 7
}
```

## POST `/api/v1/focus-sessions/stop`

Request:
```json
{
  "expected_version": 8,
  "stopped_reason": "manual"
}
```

## POST `/api/v1/focus-sessions/reset`

Request:
```json
{
  "expected_version": 9
}
```

## POST `/api/v1/focus-sessions/switch-task`

Request:
```json
{
  "expected_version": 10,
  "task_id": "102",
  "timer_mode": "stopwatch"
}
```

## POST `/api/v1/focus-sessions/heartbeat`

Request:
```json
{
  "expected_version": 11
}
```

Uso:
- mantener sincronizado elapsed/remaining de forma autoritativa
- evaluar auto-stop por `timer_completed` sin escribir cada segundo

---

## Realtime contract

Canal privado sugerido:
- `private-user.{userId}.focus`

Eventos:
- `.focus_session.updated`
- `.focus_session.stopped`

Payload base:
```json
{
  "type": "focus_session.updated",
  "meta": {
    "user_id": "12",
    "event_id": "evt_01HT...",
    "origin_device_id": "web-7f3b91",
    "emitted_at_utc": "2026-03-05T14:20:00Z"
  },
  "data": {
    "server_now_utc": "2026-03-05T14:20:00Z",
    "active_focus_session": {},
    "stopped_session_summary": null,
    "created_time_entry_id": null
  }
}
```

Reglas realtime:
- emitir despues de commit DB
- incluir `origin_device_id` para dedupe del cliente
- eventos de estado deben propagarse a todos los dispositivos del mismo usuario

Canal de taskcards (ya vigente):
- `private-user.{userId}.focus.tasks`

Cuando cambia runtime del task (state/mode/remaining/elapsed/version), emitir:
- `focus.task.updated`

---

## Daily log realtime

Objetivo:
- el registro diario debe actualizarse en tiempo real entre dispositivos del mismo usuario

Fuente de datos:
- `focus_time_entries`
- `idle_time_entries`

Regla temporal:
- filtrar por dia local (`date` + `time_zone_name`) proyectado a UTC
- respetar DST

Endpoint sugerido:
- `GET /api/v1/focus/daily-log?date=2026-03-05&time_zone_name=America/Lima`

Trigger de refresco recomendado:
- cada vez que se cierre o abra una entrada en FTE/ITE
- emitir realtime con `created_time_entry_id` y/o `closed_entry_id`
- cliente puede aplicar delta o refetch del daily log

---

## Concurrencia y consistencia

Obligatorio en backend:
- `DB::transaction` en cada comando runtime (`start/pause/resume/stop/reset/switch-task`)
- lock por usuario (`SELECT ... FOR UPDATE`) para evitar carreras multi-dispositivo
- control optimista por `expected_version`
- validacion de propiedad de task por `auth()->id()`

No permitido:
- confiar en tiempo del cliente para `started_at_utc`/`ended_at_utc`
- escrituras parciales fuera de transaccion

---

## Errores esperados

401:
```json
{ "message": "Unauthenticated." }
```

404:
```json
{ "message": "Task not found." }
```

409:
```json
{
  "message": "Runtime conflict.",
  "code": "FOCUS_RUNTIME_CONFLICT",
  "data": {
    "server_now_utc": "2026-03-05T14:20:00Z",
    "active_focus_session": null
  }
}
```

422:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "timer_mode": ["The selected timer mode is invalid."]
  }
}
```

---

## Backend checklist

- [ ] comandos runtime implementados en `/api/v1/focus-sessions/*`
- [ ] machine de estados `idle|working|paused|stopped` aplicada en DB
- [ ] snapshots FTE correctos (task title/icon/color + mode + target)
- [ ] cierre FTE solo con `stop_reason` permitido
- [ ] apertura/cierre ITE coherente con reglas de negocio
- [ ] daily log derivado de FTE/ITE por timezone local
- [ ] realtime en canal `user.{id}.focus` + `user.{id}.focus.tasks`
- [ ] `event_id` + `origin_device_id` en eventos
- [ ] transacciones + locks + versioning para evitar carreras
