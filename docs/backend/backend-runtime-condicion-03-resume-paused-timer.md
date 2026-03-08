# Backend Runtime - Condicion 03 (Play desde paused en timer)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. No incluye start desde idle, pause, stop ni casos de stopwatch.

## 1) Objetivo

Cuando el usuario hace click en **Play** para reanudar y:

1. la tarea objetivo esta en `state = paused`,
2. `active_mode = timer`,
3. no existe otra tarea del usuario en `state = working`,

el backend debe reanudar la sesion de timer usando como tiempo efectivo el timestamp enviado por cliente: `event_at_utc`.

## 2) Endpoint

`POST /api/v1/focus-sessions/resume`

## 3) Request obligatorio para esta condicion

```json
{
  "task_id": "12",
  "expected_version": 22,
  "event_at_utc": "2026-03-07T20:18:09.231Z"
}
```

Reglas:
1. `task_id` obligatorio y debe pertenecer al usuario autenticado.
2. `expected_version` obligatorio para control de concurrencia de esa task.
3. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`) y se usa como tiempo de negocio.
4. `task_id` debe estar en `state = paused` y `active_mode = timer`.
5. `timer_remaining_seconds > 0` para permitir reanudacion en timer.

## 4) Fuente de tiempo

1. En esta condicion, **no usar `now()` del servidor** para el instante de reanudacion.
2. Usar `event_at_utc` como timestamp efectivo de reanudacion.
3. `server_now_utc` puede devolverse solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks)

Si la condicion aplica y la operacion es valida:

1. `state`: `paused -> working`
2. `active_mode`: se mantiene en `timer`
3. `timer_started_at_utc`: `event_at_utc` (nuevo ancla del tramo reanudado)
4. `timer_ended_at_utc`: `null` (la sesion vuelve a correr)
5. `timer_remaining_seconds`: **se mantiene** con el valor restante previo al pause (no resetear)
6. `timer_initial_seconds`: se mantiene sin cambios
7. `version`: incrementar en `+1`
8. `updated_at`: actualizar normalmente

Notas:
1. En resume no se debe recalcular `timer_remaining_seconds`; ese remanente se usa como base.
2. El consumo de `timer_remaining_seconds` y el incremento de `total_tracked_seconds` ocurre cuando haya un nuevo `pause` o `stop`.
3. `elapsed_seconds_total` de respuesta debe ser consistente con:  
   `elapsed_seconds_total = max(0, timer_initial_seconds - timer_remaining_seconds)`.

## 6) Respuesta minima esperada

`200`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T20:18:09Z",
    "effective_event_at_utc": "2026-03-07T20:18:09Z",
    "active_focus_session": {
      "task_id": "12",
      "timer_mode": "timer",
      "session_state": "working",
      "target_seconds": 1500,
      "last_resumed_at_utc": "2026-03-07T20:18:09Z",
      "elapsed_seconds_total": 317,
      "version": 23
    }
  }
}
```

## 7) Conflictos para esta condicion

1. Si `task_id` no existe o no pertenece al usuario: `404`.
2. Si existe otra task en `working`: `409 ACTIVE_SESSION_CONFLICT`.
3. Si la task indicada no esta en `paused` o no esta en modo `timer`: `409 FOCUS_RUNTIME_CONFLICT`.
4. Si `timer_remaining_seconds <= 0`: `409 FOCUS_RUNTIME_CONFLICT` (timer agotado; requiere flujo de stop/reset).
5. Si `expected_version` no coincide: `409 TASK_VERSION_CONFLICT` (o `VERSION_CONFLICT` segun contrato actual).
6. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Task A en `state = paused`.
2. `active_mode = timer`.
3. `timer_started_at_utc` no nulo historicamente.
4. `timer_remaining_seconds > 0`.
5. Ninguna task del usuario en `state = working`.

Accion:
1. Frontend envia `POST /focus-sessions/resume` con `task_id`, `event_at_utc` del click local y `expected_version` vigente.

Resultado esperado:
1. Response `200`.
2. `focus_tasks.state = working` para Task A.
3. `focus_tasks.timer_started_at_utc = event_at_utc` enviado por cliente.
4. `focus_tasks.timer_ended_at_utc = null`.
5. `focus_tasks.timer_remaining_seconds` conserva el remanente previo.
6. `focus_tasks.version` incrementado en `+1`.

