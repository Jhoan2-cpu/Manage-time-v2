# Backend Runtime Minimo - Timer y Stopwatch (sin Daily Log aun)

Fecha: 2026-03-06  
Objetivo: implementar solo la logica de cronometro/temporizador con persistencia en `focus_tasks` y snapshots en `focus_time_entries`.

## 1) Alcance (fase actual)

Implementar en backend:

1. Transiciones de estado por acciones: `play`, `pause`, `resume`, `stop`.
2. Persistencia de tiempos en `focus_tasks`.
3. Registro de snapshots en `focus_time_entries` en `pause` y `stop`.
4. Regla de "una sola task en working por usuario".

No implementar en esta fase:

1. Daily log consolidado.
2. Realtime/websocket.
3. Preferencias avanzadas.

## 2) Estados y modos canonicos

## 2.1 `focus_tasks.state` (permitidos)

1. `idle`
2. `working`
3. `paused`

## 2.2 `focus_tasks.active_mode` (permitidos)

1. `timer`
2. `stopwatch`

## 2.3 `focus_time_entries.mode_snapshot` (permitidos)

1. `timer`
2. `stopwatch`

## 3) Reglas de negocio obligatorias

1. Solo puede existir **1 task en `working` por usuario**.
2. Si llega `play/start` y ya existe otra task `working` del mismo usuario: responder `409 ACTIVE_SESSION_CONFLICT`.
3. Todas las acciones runtime deben ejecutarse en transaccion con lock por usuario (`SELECT ... FOR UPDATE`).
4. `total_tracked_seconds` siempre acumula los segundos realmente trabajados.
5. `pause` y `stop` generan snapshot en `focus_time_entries` (ver seccion 6).

## 4) Transiciones permitidas

1. `idle -> working` por `play/start`.
2. `paused -> working` por `resume/play`.
3. `working -> paused` por `pause`.
4. `working -> idle` por `stop` (boton cuadrado).
5. `paused -> idle` por `stop` (boton cuadrado).

Transiciones invalidas: `409 FOCUS_RUNTIME_CONFLICT`.

## 5) Persistencia en `focus_tasks` por accion

## 5.1 `play/start` desde `idle`

Actualizar:

1. `state = 'working'`
2. `active_mode = 'timer' | 'stopwatch'` (segun request)
3. Si modo `stopwatch`:
   1. `stopwatch_started_at_utc = now_utc`
   2. `stopwatch_ended_at_utc = null`
4. Si modo `timer`:
   1. `timer_started_at_utc = now_utc`
   2. `timer_ended_at_utc = null`
   3. Si `timer_remaining_seconds` es null, inicializar desde `timer_initial_seconds` (o `target_seconds` si se envia).
5. `version = version + 1`

## 5.2 `resume/play` desde `paused`

Actualizar:

1. `state = 'working'`
2. `active_mode` se mantiene (o se cambia solo si request lo indica explicitamente)
3. Si modo `stopwatch`:
   1. `stopwatch_started_at_utc = now_utc`
   2. `stopwatch_ended_at_utc = null`
4. Si modo `timer`:
   1. `timer_started_at_utc = now_utc`
   2. `timer_ended_at_utc = null`
5. `version = version + 1`

## 5.3 `pause` desde `working`

Calcular `elapsed_segment_seconds` segun `active_mode`:

1. Stopwatch:
   1. `elapsed_segment = now_utc - stopwatch_started_at_utc`
   2. `stopwatch_elapsed_seconds += elapsed_segment`
   3. `stopwatch_ended_at_utc = now_utc`
   4. `stopwatch_started_at_utc = null`
2. Timer:
   1. `elapsed_segment = now_utc - timer_started_at_utc`
   2. `timer_remaining_seconds = max(0, timer_remaining_seconds - elapsed_segment)`
   3. `timer_ended_at_utc = now_utc`
   4. `timer_started_at_utc = null`

Siempre:

1. `state = 'paused'`
2. `total_tracked_seconds += elapsed_segment`
3. `version = version + 1`
4. Insertar snapshot en `focus_time_entries` (seccion 6)

## 5.4 `stop` (boton cuadrado) desde `working` o `paused`

Regla de UI: al detener, la tarea queda en `idle` y contador reiniciado.

Si venia de `working`, primero calcular segmento igual que en `pause`.

Luego reset segun modo activo:

1. Si `active_mode = timer`:
   1. `timer_remaining_seconds = 0`
   2. `timer_started_at_utc = null`
   3. `timer_ended_at_utc = null`
2. Si `active_mode = stopwatch`:
   1. `stopwatch_elapsed_seconds = 0`
   2. `stopwatch_started_at_utc = null`
   3. `stopwatch_ended_at_utc = null`

Siempre:

1. `state = 'idle'`
2. `active_mode` se mantiene (no se borra)
3. `total_tracked_seconds` conserva acumulado historico
4. `version = version + 1`
5. Insertar snapshot en `focus_time_entries` (seccion 6)

## 6) Snapshot en `focus_time_entries`

Insertar fila en `pause` y `stop` con:

1. `user_id`
2. `focus_task_id_nullable = focus_tasks.id`
3. `task_title_snapshot = focus_tasks.name`
4. `task_icon_snapshot = focus_tasks.icon_tag`
5. `task_color_snapshot = focus_tasks.color_tag`
6. `timer_target_snapshot_seconds = focus_tasks.timer_initial_seconds` (nullable)
7. `mode_snapshot = focus_tasks.active_mode`
8. `started_at_utc = started_at_runtime_actual` (timestamp de inicio/reanudacion del tramo)
9. `ended_at_utc = now_utc`
10. `elapsed_seconds = elapsed_segment_seconds` (>= 0)
11. `stop_reason`:
    1. `paused` cuando accion fue pause
    2. `stopped` cuando accion fue stop
    3. opcional: `stopped_from_paused` si stop llego desde paused

Nota:

1. Si `stop` llega desde `paused` y no hay tramo activo, se permite `elapsed_seconds = 0` para auditoria de transicion.

## 7) Propuesta minima de endpoints

Para no romper integracion existente:

1. `POST /api/v1/focus-sessions/start` (play desde idle)
2. `POST /api/v1/focus-sessions/pause`
3. `POST /api/v1/focus-sessions/resume`
4. `POST /api/v1/focus-sessions/stop`

Opcional recomendado:

1. `GET /api/v1/focus-sessions/active` para hidratar estado al recargar.

## 8) Payload minimo sugerido

## 8.1 start

```json
{
  "task_id": "12",
  "timer_mode": "timer"
}
```

## 8.2 pause

```json
{
  "expected_version": 8
}
```

## 8.3 resume

```json
{
  "expected_version": 9
}
```

## 8.4 stop

```json
{
  "expected_version": 10,
  "stop_reason": "stopped"
}
```

## 9) Respuesta minima sugerida

En comandos runtime devolver:

```json
{
  "data": {
    "server_now_utc": "2026-03-06T12:00:00Z",
    "task": {
      "id": "12",
      "state": "paused",
      "active_mode": "stopwatch",
      "version": 9
    }
  }
}
```

## 10) Ajustes de BD recomendados

1. Check `focus_tasks.state in ('idle','working','paused')`.
2. Check `focus_tasks.active_mode in ('timer','stopwatch')`.
3. Check `focus_time_entries.mode_snapshot in ('timer','stopwatch')`.
4. Indice unico parcial por usuario para `state='working'`.
5. Defaults:
   1. `stopwatch_elapsed_seconds = 0`
   2. `total_tracked_seconds = 0`
   3. `timer_remaining_seconds` nullable o 0 (segun modelo elegido)

## 11) Criterios de aceptacion (QA)

1. `play` desde idle pone task en `working` y setea timestamp `*_started_at_utc`.
2. `pause` desde working pone task en `paused`, calcula elapsed, suma `total_tracked_seconds`, inserta snapshot.
3. `resume` desde paused vuelve a `working` con nuevo `*_started_at_utc`.
4. `stop` desde working o paused deja task en `idle`, resetea contador del modo activo e inserta snapshot.
5. Si hay otra task en working, `start` responde `409`.
6. `version` incrementa en cada transicion valida.

## 12) Nota de frontend (solo referencia)

Frontend opera local-first para UX inmediata; backend confirma y persiste.  
Si backend no responde, frontend mostrara pantalla bloqueada de "sin conexion" (esto se maneja del lado frontend).
