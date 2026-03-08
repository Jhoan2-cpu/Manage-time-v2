# Backend Runtime - Condicion 01 (Play desde idle en timer con duracion asignada)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. No incluye pause, resume, stop ni casos de stopwatch.

## 1) Objetivo

Cuando el usuario hace click en **Play** sobre el taskcard seleccionado (o desde el timer panel) y:

1. ese taskcard esta en `state = idle`,
2. no existe ningun otro taskcard del usuario en `state = working`,
3. el modo solicitado es `timer`,
4. la task tiene duracion configurada (`timer_initial_seconds > 0`, o alias `target_duration_seconds > 0`),

el backend debe iniciar la sesion de timer usando como tiempo efectivo el timestamp enviado por cliente: `event_at_utc`.

## 2) Endpoint

`POST /api/v1/focus-sessions/start`

## 3) Request obligatorio para esta condicion

```json
{
  "task_id": "12",
  "timer_mode": "timer",
  "event_at_utc": "2026-03-07T19:40:15.123Z"
}
```

Reglas:
1. `task_id` obligatorio y perteneciente al usuario autenticado.
2. `timer_mode` obligatorio y debe ser `timer`.
3. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`) y se usa como tiempo de negocio.
4. En esta condicion **no enviar `target_seconds`**; backend debe tomar la duracion ya configurada en la task.

## 4) Fuente de tiempo

1. En esta condicion, **no usar `now()` del servidor** para inicio de sesion.
2. Usar `event_at_utc` como timestamp efectivo de inicio.
3. `server_now_utc` puede devolverse en response solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks)

Si la condicion aplica y la operacion es valida:

1. `state`: `idle -> working`
2. `active_mode`: `timer`
3. `timer_started_at_utc`: `event_at_utc`
4. `timer_ended_at_utc`: `null`
5. `timer_initial_seconds`: conservar valor configurado en la task
6. `timer_remaining_seconds`: iniciar en `timer_initial_seconds`
7. `stopwatch_*`: sin cambios funcionales para esta condicion
8. `version`: incrementar en `+1`
9. `updated_at`: actualizar normalmente

## 6) Respuesta minima esperada

`200` o `201`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T19:40:15Z",
    "effective_event_at_utc": "2026-03-07T19:40:15Z",
    "active_focus_session": {
      "task_id": "12",
      "timer_mode": "timer",
      "session_state": "working",
      "target_seconds": 1500,
      "last_resumed_at_utc": "2026-03-07T19:40:15Z",
      "elapsed_seconds_total": 0,
      "version": 21
    }
  }
}
```

## 7) Conflictos para esta condicion

1. Si ya existe otro task en `working` para ese usuario: `409 ACTIVE_SESSION_CONFLICT`.
2. Si `task_id` no existe o no pertenece al usuario: `404`.
3. Si la task no tiene duracion valida para timer (`timer_initial_seconds <= 0`): `409 FOCUS_RUNTIME_CONFLICT`.
4. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Task A en `idle`.
2. Task A con `timer_initial_seconds > 0`.
3. Ningun task del usuario en `working`.
4. Modo `timer`.

Accion:
1. Frontend envia `POST /focus-sessions/start` con `task_id`, `timer_mode = timer` y `event_at_utc` del click local.

Resultado esperado:
1. Response `200/201`.
2. `focus_tasks.state = working` para Task A.
3. `focus_tasks.timer_started_at_utc = event_at_utc` enviado por cliente.
4. `focus_tasks.timer_remaining_seconds` inicia con el valor configurado de la task.
5. No hay otro task en `working` para el mismo usuario.

