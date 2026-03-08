# Backend Runtime - Condicion 02 (Pause desde working en stopwatch)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. No incluye start, resume, stop ni casos de timer.

## 1) Objetivo

Cuando el usuario hace click en **Pause** sobre la tarea activa y:

1. existe una sesion activa en `state = working`,
2. `active_mode = stopwatch`,

el backend debe pausar la sesion usando como tiempo efectivo el timestamp enviado por cliente: `event_at_utc`.

## 2) Endpoint

`POST /api/v1/focus-sessions/pause`

## 3) Request obligatorio para esta condicion

```json
{
  "expected_version": 12,
  "event_at_utc": "2026-03-07T18:42:10.456Z"
}
```

Reglas:
1. `expected_version` obligatorio para control de concurrencia.
2. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`) y se usa como tiempo de negocio.
3. En esta condicion no se envia `task_id` (la sesion activa se resuelve por usuario autenticado).

## 4) Fuente de tiempo

1. En esta condicion, **no usar `now()` del servidor** para el instante de pausa.
2. Usar `event_at_utc` como timestamp efectivo de pausa.
3. `server_now_utc` puede devolverse solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks)

Si la condicion aplica y la operacion es valida:

1. `state`: `working -> paused`
2. `active_mode`: se mantiene en `stopwatch`
3. `stopwatch_ended_at_utc`: `event_at_utc`
4. `stopwatch_elapsed_seconds`: lo calcula backend con esta formula:
   `nuevo_elapsed = elapsed_actual + max(0, floor(event_at_utc - stopwatch_started_at_utc))`
5. `stopwatch_started_at_utc`: se mantiene con su valor actual (ancla del tramo que se estaba corriendo)
6. `version`: incrementar en `+1`
7. `updated_at`: actualizar normalmente

Notas:
1. No resetear contador en pause.
2. `total_tracked_seconds` (si aplica en esta fase) debe acumularse consistentemente por backend en esta misma transicion.

## 6) Respuesta minima esperada

`200`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T18:42:10.700Z",
    "effective_event_at_utc": "2026-03-07T18:42:10.456Z",
    "active_focus_session": {
      "task_id": "12",
      "timer_mode": "stopwatch",
      "session_state": "paused",
      "last_paused_at_utc": "2026-03-07T18:42:10.456Z",
      "elapsed_seconds_total": 1543,
      "version": 13
    }
  }
}
```

## 7) Conflictos para esta condicion

1. Si no existe sesion activa en `working`: `409 FOCUS_RUNTIME_CONFLICT`.
2. Si la sesion activa no esta en modo `stopwatch`: `409 FOCUS_RUNTIME_CONFLICT`.
3. Si `expected_version` no coincide: `409 TASK_VERSION_CONFLICT` (o `VERSION_CONFLICT` segun contrato actual).
4. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Task A en `state = working`.
2. `active_mode = stopwatch`.
3. `stopwatch_started_at_utc` no nulo.

Accion:
1. Frontend envia `POST /focus-sessions/pause` con `event_at_utc` del click local y `expected_version` vigente.

Resultado esperado:
1. Response `200`.
2. `focus_tasks.state = paused` para Task A.
3. `focus_tasks.stopwatch_ended_at_utc = event_at_utc` enviado por cliente.
4. `focus_tasks.stopwatch_elapsed_seconds` incrementado por backend segun el tramo corrido.
5. `focus_tasks.version` incrementado en `+1`.
