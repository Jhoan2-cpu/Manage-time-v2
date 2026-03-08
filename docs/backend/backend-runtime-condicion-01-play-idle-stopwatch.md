# Backend Runtime - Condicion 01 (Play desde idle en stopwatch)

Fecha: 2026-03-06  
Alcance: **solo esta condicion**. No incluye pause, resume, stop ni otros casos.

## 1) Objetivo

Cuando el usuario hace click en **Play** sobre el taskcard seleccionado (o desde el timer panel) y:

1. ese taskcard esta en `state = idle`,
2. no existe ningun otro taskcard del usuario en `state = working`,
3. el modo solicitado es `stopwatch`,

el backend debe iniciar la sesion usando como tiempo efectivo el timestamp enviado por cliente: `event_at_utc`.

## 2) Endpoint

`POST /api/v1/focus-sessions/start`

## 3) Request obligatorio para esta condicion

```json
{
  "task_id": "12",
  "timer_mode": "stopwatch",
  "event_at_utc": "2026-03-07T18:25:31.123Z"
}
```

Reglas:
1. `task_id` obligatorio y perteneciente al usuario autenticado.
2. `timer_mode` obligatorio y debe ser `stopwatch`.
3. `event_at_utc` obligatorio (ISO-8601 UTC) y se usa como tiempo de negocio.

## 4) Fuente de tiempo

1. En esta condicion, **no usar `now()` del servidor** para el inicio de sesion.
2. Usar `event_at_utc` como timestamp efectivo de inicio.
3. `server_now_utc` puede devolverse en response solo para referencia/diagnostico.

## 5) Transicion esperada en BD (focus_tasks)

Si la condicion aplica y la operacion es valida:

1. `state`: `idle -> working`
2. `active_mode`: `stopwatch`
3. `stopwatch_started_at_utc`: `event_at_utc`
4. `stopwatch_ended_at_utc`: `null`
5. `stopwatch_elapsed_seconds`: mantener valor actual (normalmente `0` en idle limpio)
6. `version`: incrementar en `+1`
7. `updated_at`: actualizar normalmente

## 6) Respuesta minima esperada

`200` o `201`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T18:25:31.400Z",
    "effective_event_at_utc": "2026-03-07T18:25:31.123Z",
    "active_focus_session": {
      "task_id": "12",
      "timer_mode": "stopwatch",
      "session_state": "working",
      "last_resumed_at_utc": "2026-03-07T18:25:31.123Z",
      "version": 9
    }
  }
}
```

## 7) Conflictos para esta condicion

1. Si ya existe otro task en `working` para ese usuario: `409 ACTIVE_SESSION_CONFLICT`.
2. Si `task_id` no existe o no pertenece al usuario: `404`.
3. Si `event_at_utc` invalido/faltante: `422 VALIDATION_ERROR`.

## 8) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Task A en `idle`.
2. Ningun task del usuario en `working`.
3. Modo `stopwatch`.

Accion:
1. Frontend envia `POST /focus-sessions/start` con `event_at_utc` del click local.

Resultado esperado:
1. Response `200/201`.
2. `focus_tasks.state = working` para Task A.
3. `focus_tasks.stopwatch_started_at_utc = event_at_utc` enviado por cliente.
4. No hay otro task en `working` para el mismo usuario.

