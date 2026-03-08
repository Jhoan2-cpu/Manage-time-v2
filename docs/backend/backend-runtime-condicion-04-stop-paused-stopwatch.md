# Backend Runtime - Condicion 04 (Stop desde paused en stopwatch)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. No incluye start, pause, resume ni casos de timer.

## 1) Objetivo

Cuando el usuario hace click en **Stop** (icono cuadrado) sobre una tarea y:

1. la tarea objetivo esta en `state = paused`,
2. `active_mode = stopwatch`,
3. no existe otra tarea del usuario en `state = working`,

el backend debe finalizar esa sesion pausada usando como tiempo efectivo el timestamp enviado por cliente: `event_at_utc`, registrar snapshot historico y dejar la task en estado `idle` con contador reiniciado.

## 2) Endpoint

`POST /api/v1/focus-sessions/stop`

## 3) Request obligatorio para esta condicion

```json
{
  "task_id": "12",
  "expected_version": 14,
  "event_at_utc": "2026-03-07T19:22:10.456Z",
  "stop_reason": "stopped_from_paused"
}
```

Reglas:
1. `task_id` obligatorio (hay multiples tasks en `paused`, se debe identificar cual detener).
2. `expected_version` obligatorio para control de concurrencia de esa task.
3. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`) y se usa como tiempo de negocio.
4. `stop_reason` obligatorio para auditoria en esta condicion: `stopped_from_paused`.
5. `task_id` debe estar en `state = paused` y `active_mode = stopwatch`.

## 4) Fuente de tiempo

1. En esta condicion, **no usar `now()` del servidor** para el instante de stop.
2. Usar `event_at_utc` como timestamp efectivo de cierre.
3. `server_now_utc` puede devolverse solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks + focus_time_entries)

Si la condicion aplica y la operacion es valida:

1. `focus_tasks.state`: `paused -> idle`.
2. `focus_tasks.active_mode`: se mantiene en `stopwatch`.
3. Para snapshot/historial, backend usa `event_at_utc` como cierre efectivo (`stopwatch_ended_at_utc` logico del cierre).
4. Se crea 1 registro en `focus_time_entries` en la misma transaccion con:
   - `user_id`
   - `focus_task_id_nullable = task_id`
   - `task_title_snapshot`, `task_icon_snapshot`, `task_color_snapshot`
   - `mode_snapshot = stopwatch`
   - `timer_target_snapshot_seconds = null`
   - `started_at_utc` (ancla historica del tramo/sesion)
   - `ended_at_utc = event_at_utc`
   - `elapsed_seconds` (acumulado final de la sesion a cerrar)
   - `stop_reason = stopped_from_paused`
5. Luego del snapshot, la task queda reseteada para stopwatch:
   - `stopwatch_elapsed_seconds = 0`
   - `stopwatch_started_at_utc = null`
   - `stopwatch_ended_at_utc = null`
6. `focus_tasks.total_tracked_seconds` debe quedar acumulado correctamente (siempre monotono, sin perder tiempo ya trackeado).
7. `focus_tasks.version`: incrementar en `+1`.
8. `focus_tasks.updated_at`: actualizar normalmente.

Notas:
1. Todo el flujo debe ser atomico (misma transaccion).
2. Aunque se use `event_at_utc` para cerrar la sesion y el snapshot, la task final queda limpia (`started/ended = null`) por pasar a `idle`.

## 6) Respuesta minima esperada

`200`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T19:22:10Z",
    "effective_event_at_utc": "2026-03-07T19:22:10Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "12",
      "timer_mode": "stopwatch",
      "elapsed_seconds_final": 1543,
      "stop_reason": "stopped_from_paused"
    },
    "created_time_entry_id": "901"
  }
}
```

## 7) Conflictos para esta condicion

1. Si `task_id` no existe o no pertenece al usuario: `404`.
2. Si la task indicada no esta en `paused` o no esta en modo `stopwatch`: `409 FOCUS_RUNTIME_CONFLICT`.
3. Si existe otra `working` incompatible con la operacion de stop dirigida: `409 ACTIVE_SESSION_CONFLICT`.
4. Si `expected_version` no coincide: `409 TASK_VERSION_CONFLICT` (o `VERSION_CONFLICT` segun contrato actual).
5. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Task A en `state = paused`.
2. `active_mode = stopwatch`.
3. `stopwatch_elapsed_seconds > 0`.
4. Ninguna task del usuario en `state = working`.

Accion:
1. Frontend envia `POST /focus-sessions/stop` con `task_id`, `expected_version`, `event_at_utc` y `stop_reason = stopped_from_paused`.

Resultado esperado:
1. Response `200`.
2. `focus_tasks.state = idle` para Task A.
3. `focus_tasks.stopwatch_elapsed_seconds = 0`.
4. `focus_tasks.stopwatch_started_at_utc = null` y `stopwatch_ended_at_utc = null`.
5. Se crea snapshot en `focus_time_entries` con `ended_at_utc = event_at_utc`.
6. `focus_tasks.total_tracked_seconds` acumulado correctamente.
7. `focus_tasks.version` incrementado en `+1`.
