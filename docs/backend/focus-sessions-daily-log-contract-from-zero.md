# Timer + Cronometro Contract (Desde Cero) - Frontend <-> Laravel + Reverb

## Scope

Backend objetivo:
- controlar play/pause/resume/stop del contador
- persistir historial en:
  - `FOCUS_TIME_ENTRIES`
  - `IDLE_TIME_ENTRIES`
- sincronizar estado entre dispositivos del mismo usuario (Reverb)

Frontend objetivo:
- iniciar timer o cronometro desde task card
- pausar / reanudar / detener
- ver estado consistente en todas las sesiones abiertas

---

## Tablas objetivo (source of truth)

### `FOCUS_TIME_ENTRIES`

Guarda tramos de tiempo enfocado (timer o cronometro).

Columnas clave:
- `id` (uuid)
- `user_id` (fk)
- `focus_task_id_nullable` (fk nullable a `FOCUS_TASKS`)
- `task_title_snapshot`
- `task_icon_snapshot`
- `task_color_snapshot`
- `timer_target_snapshot_seconds` (nullable)
- `mode_snapshot` (`timer|stopwatch`)
- `started_at_utc` (timestamp(3))
- `ended_at_utc` (timestamp(3), nullable mientras esta corriendo)
- `elapsed_seconds`
- `stop_reason` (`paused|user_stop|timer_finished|switch_task|app_shutdown`)
- `created_at`
- `updated_at`

### `IDLE_TIME_ENTRIES`

Guarda tiempo no trackeado (sin tarea corriendo).

Columnas clave:
- `id` (uuid)
- `user_id` (fk)
- `started_at_utc` (timestamp(3))
- `ended_at_utc` (timestamp(3), nullable mientras sigue en idle)
- `elapsed_seconds`
- `reason` (`day_start|after_pause|after_stop|after_timer_finished|no_active_task`)
- `created_at`
- `updated_at`

---

## Reglas de negocio obligatorias

1. Solo puede existir **1 tramo activo** por usuario:
- o `FOCUS_TIME_ENTRIES` con `ended_at_utc = null`
- o `IDLE_TIME_ENTRIES` con `ended_at_utc = null`

2. Si inicia foco (`play`), backend debe cerrar idle activo (si existe).

3. Si pausa o detiene foco, backend debe abrir idle nuevo inmediatamente.

4. Si `timer` llega a `00:00:00`, backend debe cerrar foco con `stop_reason = timer_finished` y abrir idle.

5. `timer_target_snapshot_seconds`:
- se guarda cuando `mode_snapshot = timer`
- en `stopwatch` se guarda `null`

6. Frontend renderiza contador; backend manda estado autoritativo.

---

## Estado actual de runtime

El frontend enviara al backend:  
`GET /api/v1/focus/runtime`

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-03T22:10:05.321Z",
    "active_focus_entry": {
      "id": "fte_100",
      "focus_task_id_nullable": "task_123",
      "mode_snapshot": "timer",
      "timer_target_snapshot_seconds": 2700,
      "started_at_utc": "2026-03-03T22:00:00.000Z",
      "ended_at_utc": null
    },
    "active_idle_entry": null
  }
}
```

sino (`401`):
```json
{
  "message": "Unauthenticated."
}
```

---

## 1) Iniciar enfoque (Play)

El frontend enviara al backend:  
`POST /api/v1/focus/start`

body:
```json
{
  "task_id": "task_123",
  "mode": "timer",
  "timer_target_seconds": 2700
}
```

Reglas:
- `mode = timer` => `timer_target_seconds` requerido
- `mode = stopwatch` => `timer_target_seconds = null`
- cerrar `IDLE_TIME_ENTRIES` activo (si existe)
- crear `FOCUS_TIME_ENTRIES` nuevo con `ended_at_utc = null`

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-03T22:00:00.000Z",
    "active_focus_entry": {
      "id": "fte_100",
      "focus_task_id_nullable": "task_123",
      "task_title_snapshot": "Q3 Report Writing",
      "task_icon_snapshot": "briefcase",
      "task_color_snapshot": "blue",
      "mode_snapshot": "timer",
      "timer_target_snapshot_seconds": 2700,
      "started_at_utc": "2026-03-03T22:00:00.000Z",
      "ended_at_utc": null
    },
    "closed_idle_entry_id": "ite_10"
  }
}
```

sino (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "mode": [
      "The selected mode is invalid."
    ]
  }
}
```

---

## 2) Pausar enfoque

El frontend enviara al backend:  
`POST /api/v1/focus/pause`

body:
```json
{
  "active_focus_entry_id": "fte_100"
}
```

Reglas:
- cerrar `FOCUS_TIME_ENTRIES` activo (`ended_at_utc = now`)
- calcular `elapsed_seconds`
- guardar `stop_reason = paused`
- crear `IDLE_TIME_ENTRIES` nuevo (`ended_at_utc = null`, `reason = after_pause`)

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-03T22:20:10.111Z",
    "closed_focus_entry": {
      "id": "fte_100",
      "elapsed_seconds": 1210,
      "stop_reason": "paused"
    },
    "active_idle_entry": {
      "id": "ite_11",
      "started_at_utc": "2026-03-03T22:20:10.111Z",
      "ended_at_utc": null,
      "reason": "after_pause"
    }
  }
}
```

sino (`409`):
```json
{
  "message": "No active focus entry to pause.",
  "code": "FOCUS_NOT_RUNNING"
}
```

---

## 3) Reanudar enfoque

El frontend enviara al backend:  
`POST /api/v1/focus/resume`

body:
```json
{
  "task_id": "task_123",
  "mode": "timer",
  "timer_target_seconds": 1490
}
```

Reglas:
- cerrar `IDLE_TIME_ENTRIES` activo (si existe)
- crear nuevo `FOCUS_TIME_ENTRIES` con `ended_at_utc = null`
- para `timer`, snapshot debe guardar el target vigente al reanudar

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-03T22:25:00.000Z",
    "active_focus_entry": {
      "id": "fte_101",
      "focus_task_id_nullable": "task_123",
      "mode_snapshot": "timer",
      "timer_target_snapshot_seconds": 1490,
      "started_at_utc": "2026-03-03T22:25:00.000Z",
      "ended_at_utc": null
    },
    "closed_idle_entry_id": "ite_11"
  }
}
```

---

## 4) Detener enfoque (Stop)

El frontend enviara al backend:  
`POST /api/v1/focus/stop`

body:
```json
{
  "active_focus_entry_id": "fte_101",
  "reason": "user_stop"
}
```

`reason` permitido:
- `user_stop`
- `timer_finished`
- `switch_task`

Reglas:
- cerrar `FOCUS_TIME_ENTRIES` activo
- calcular `elapsed_seconds`
- guardar `stop_reason`
- crear `IDLE_TIME_ENTRIES` nuevo con `reason` derivado

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "server_now_utc": "2026-03-03T22:40:00.500Z",
    "closed_focus_entry": {
      "id": "fte_101",
      "elapsed_seconds": 900,
      "stop_reason": "user_stop"
    },
    "active_idle_entry": {
      "id": "ite_12",
      "started_at_utc": "2026-03-03T22:40:00.500Z",
      "ended_at_utc": null,
      "reason": "after_stop"
    }
  }
}
```

---

## 5) Timer llega a cero (evento de negocio)

Flujo recomendado:
- frontend detecta `00:00:00`
- frontend envia:
  - `POST /api/v1/focus/stop`
  - body con `reason = timer_finished`

resultado esperado:
- se cierra `FOCUS_TIME_ENTRIES` con `stop_reason = timer_finished`
- se abre `IDLE_TIME_ENTRIES` con `reason = after_timer_finished`
- se emite evento realtime para que otros dispositivos reflejen stop + alarma

---

## 6) Idle al inicio del dia / sin foco activo

Regla:
- si no existe foco activo ni idle activo para el usuario, backend debe abrir idle:
  - `started_at_utc = now`
  - `reason = day_start` o `no_active_task`

Esto puede dispararse en:
- primer `GET /api/v1/focus/runtime` del dia
- job programado de corte diario (opcional)

---

## Realtime con Reverb

Canal privado:
- wire-level: `private-user.{userId}.focus-runtime`
- frontend Echo: `echo.private('user.{userId}.focus-runtime')`

Eventos:
- `.focus.started`
- `.focus.paused`
- `.focus.resumed`
- `.focus.stopped`
- `.idle.started`
- `.idle.stopped`

payload base:
```json
{
  "type": "focus.stopped",
  "meta": {
    "user_id": "usr_123",
    "emitted_at_utc": "2026-03-03T22:40:00.500Z",
    "origin_device_id": "web-ab12"
  },
  "data": {
    "closed_focus_entry_id": "fte_101",
    "active_idle_entry_id": "ite_12"
  }
}
```

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
  "message": "Runtime conflict.",
  "code": "FOCUS_RUNTIME_CONFLICT"
}
```

sino (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "timer_target_seconds": [
      "The timer target seconds field is required when mode is timer."
    ]
  }
}
```

---

## Configuracion adicional obligatoria (Laravel)

- todas las transiciones (`start/pause/resume/stop`) en transaccion DB
- lock por usuario en runtime (`SELECT ... FOR UPDATE`) para evitar doble play
- timestamps con milisegundos (`timestamp(3)`)
- `elapsed_seconds` calculado en backend con UTC
- emitir Reverb despues de commit
- siempre filtrar por `auth()->id()`
