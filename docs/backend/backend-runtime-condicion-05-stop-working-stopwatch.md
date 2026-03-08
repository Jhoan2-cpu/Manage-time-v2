# Backend Runtime - Condicion 05 (Stop directo desde working en stopwatch)

Fecha: 2026-03-08  
Alcance: **solo esta condicion**. No incluye start, pause, resume ni casos de timer.

## 1) Objetivo

Cuando el usuario hace click en **Stop** (icono cuadrado) sobre una tarea y:

1. la tarea objetivo esta en `state = working`,
2. `active_mode = stopwatch`,

el backend debe cerrar la sesion activa y pasar la task a `idle` en **una sola peticion** (`stop`), sin requerir `pause` previo.

Motivo:

1. evitar doble escritura/doble snapshot por flujo `pause -> stop`,
2. evitar duplicados innecesarios en historial.

## 2) Endpoint

`POST /api/v1/focus-sessions/stop`

## 3) Request obligatorio para esta condicion

```json
{
  "task_id": "12",
  "expected_version": 37,
  "event_at_utc": "2026-03-08T02:11:44.456Z",
  "stop_reason": "stopped"
}
```

Reglas:

1. `task_id` obligatorio.
2. `expected_version` obligatorio para control de concurrencia.
3. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`) y se usa como tiempo de negocio.
4. `stop_reason` obligatorio para esta condicion: `stopped`.
5. La task debe estar en `state = working` y `active_mode = stopwatch`.
6. **No** hacer `POST /pause` antes de esta operacion.

## 4) Fuente de tiempo

1. No usar `now()` del servidor para el instante de corte.
2. Usar `event_at_utc` como timestamp efectivo de cierre.
3. `server_now_utc` puede devolverse solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks + focus_time_entries)

Si la condicion aplica y la operacion es valida:

1. `focus_tasks.state`: `working -> idle`.
2. `focus_tasks.active_mode`: se mantiene en `stopwatch`.
3. Se crea **1 solo** snapshot en `focus_time_entries` en la misma transaccion con:
   - `user_id`
   - `focus_task_id_nullable = task_id`
   - `task_title_snapshot`, `task_icon_snapshot`, `task_color_snapshot`
   - `mode_snapshot = stopwatch`
   - `timer_target_snapshot_seconds = null`
   - `started_at_utc = stopwatch_started_at_utc` del tramo activo
   - `ended_at_utc = event_at_utc`
   - `elapsed_seconds = tramo consumido` (segun regla de redondeo vigente)
   - `stop_reason = stopped`
4. Luego del snapshot, limpiar runtime stopwatch:
   - `stopwatch_elapsed_seconds = 0`
   - `stopwatch_started_at_utc = null`
   - `stopwatch_ended_at_utc = null`
5. `focus_tasks.total_tracked_seconds` debe acumularse una sola vez (sin doble conteo).
6. `focus_tasks.version`: incrementar en `+1`.
7. `focus_tasks.updated_at`: actualizar normalmente.

Notas:

1. Flujo atomico (misma transaccion).
2. Esta condicion reemplaza el flujo frontend antiguo `pause -> stop` para stopwatch en `working`.

## 6) Respuesta minima esperada

`200`:

```json
{
  "data": {
    "server_now_utc": "2026-03-08T02:11:44Z",
    "effective_event_at_utc": "2026-03-08T02:11:44Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "12",
      "timer_mode": "stopwatch",
      "elapsed_seconds_final": 1543,
      "stop_reason": "stopped"
    },
    "created_time_entry_id": "1102"
  }
}
```

## 7) Conflictos para esta condicion

1. Si `task_id` no existe o no pertenece al usuario: `404`.
2. Si la task indicada no esta en `working` o no esta en modo `stopwatch`: `409 FOCUS_RUNTIME_CONFLICT`.
3. Si `expected_version` no coincide: `409 TASK_VERSION_CONFLICT` (o `VERSION_CONFLICT` segun contrato actual).
4. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:

1. Task A en `state = working`.
2. `active_mode = stopwatch`.
3. `stopwatch_started_at_utc` no nulo.
4. `stopwatch_elapsed_seconds >= 0`.

Accion:

1. Frontend envia **solo una** peticion `POST /focus-sessions/stop` con `task_id`, `expected_version`, `event_at_utc`, `stop_reason = stopped`.

Resultado esperado:

1. Response `200`.
2. `focus_tasks.state = idle` para Task A.
3. Se crea **un solo** registro nuevo en `focus_time_entries`.
4. No se generan duplicados por flujo `pause -> stop`.
5. `focus_tasks.total_tracked_seconds` queda acumulado correctamente.
6. `focus_tasks.version` incrementa en `+1`.

