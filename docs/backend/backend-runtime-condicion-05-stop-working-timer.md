# Backend Runtime - Condicion 05 (Stop desde working en timer)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. No incluye start, pause, resume ni casos de stopwatch.

## 1) Objetivo

Cuando el usuario hace click en **Stop** (icono cuadrado) sobre una tarea y:

1. la tarea objetivo esta en `state = working`,
2. `active_mode = timer`,

el backend debe cerrar esa sesion en curso usando como tiempo efectivo `event_at_utc`, registrar snapshot historico del tramo corrido y dejar la task en `idle` con timer reseteado a su valor inicial.

## 2) Endpoint

`POST /api/v1/focus-sessions/stop`

## 3) Request obligatorio para esta condicion

```json
{
  "task_id": "12",
  "expected_version": 24,
  "event_at_utc": "2026-03-07T20:58:10.456Z",
  "stop_reason": "stopped"
}
```

Reglas:
1. `task_id` obligatorio y debe pertenecer al usuario autenticado.
2. `expected_version` obligatorio para control de concurrencia de esa task.
3. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`) y se usa como tiempo de negocio.
4. `stop_reason` obligatorio para esta condicion: `stopped`.
5. `task_id` debe estar en `state = working` y `active_mode = timer`.

## 4) Fuente de tiempo

1. En esta condicion, **no usar `now()` del servidor** para el instante de stop.
2. Usar `event_at_utc` como timestamp efectivo de cierre.
3. `server_now_utc` puede devolverse solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks + historico)

Si la condicion aplica y la operacion es valida:

1. `focus_tasks.state`: `working -> idle`.
2. `focus_tasks.active_mode`: se mantiene en `timer`.
3. Cierre logico del tramo timer con `event_at_utc` (usar este timestamp para calculo y snapshot).
4. Registrar snapshot en `focus_time_entries` (misma transaccion) con:
   - `user_id`
   - `focus_task_id_nullable = task_id`
   - `task_title_snapshot`, `task_icon_snapshot`, `task_color_snapshot`
   - `mode_snapshot = timer`
   - `timer_target_snapshot_seconds = timer_initial_seconds`
   - `started_at_utc = timer_started_at_utc` del tramo en curso
   - `ended_at_utc = event_at_utc`
   - `elapsed_seconds = max(0, floor(event_at_utc - timer_started_at_utc))`
   - `stop_reason = stopped`
5. Luego del snapshot, limpiar runtime timer de la task:
   - `timer_started_at_utc = null`
   - `timer_ended_at_utc = null`
   - `timer_remaining_seconds = timer_initial_seconds`
6. `focus_tasks.total_tracked_seconds` debe quedar monotono y sin doble conteo (sumar solo el tramo corrido desde `timer_started_at_utc`).
7. `focus_tasks.version`: incrementar en `+1`.
8. `focus_tasks.updated_at`: actualizar normalmente.

Notas:
1. Todo el flujo debe ser atomico (misma transaccion).
2. Si el modelo maneja `idle_time_entries`, abrir idle desde `event_at_utc` con razon consistente de stop (ejemplo: `stopped` o `working_to_stop` segun contrato interno).

## 6) Respuesta minima esperada

`200`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T20:58:10Z",
    "effective_event_at_utc": "2026-03-07T20:58:10Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "12",
      "timer_mode": "timer",
      "elapsed_seconds_final": 317,
      "stop_reason": "stopped"
    },
    "created_time_entry_id": "955"
  }
}
```

## 7) Conflictos para esta condicion

1. Si `task_id` no existe o no pertenece al usuario: `404`.
2. Si la task indicada no esta en `working` o no esta en modo `timer`: `409 FOCUS_RUNTIME_CONFLICT`.
3. Si `expected_version` no coincide: `409 TASK_VERSION_CONFLICT` (o `VERSION_CONFLICT` segun contrato actual).
4. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Task A en `state = working`.
2. `active_mode = timer`.
3. `timer_started_at_utc` no nulo.
4. `timer_initial_seconds > 0`.
5. `timer_remaining_seconds >= 0`.

Accion:
1. Frontend envia `POST /focus-sessions/stop` con `task_id`, `expected_version`, `event_at_utc` y `stop_reason = stopped`.

Resultado esperado:
1. Response `200`.
2. `focus_tasks.state = idle` para Task A.
3. `focus_tasks.timer_started_at_utc = null` y `timer_ended_at_utc = null`.
4. `focus_tasks.timer_remaining_seconds = timer_initial_seconds`.
5. Se crea snapshot en `focus_time_entries` con `ended_at_utc = event_at_utc` y `stop_reason = stopped`.
6. `focus_tasks.total_tracked_seconds` incrementado correctamente sin doble conteo.
7. `focus_tasks.version` incrementado en `+1`.

