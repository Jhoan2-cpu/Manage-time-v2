# Backend Daily Log - Condicion 01 (Pause desde working + retorno de registros de hoy trackeados y no trackeados)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. Aplica cuando se ejecuta `POST /api/v1/focus-sessions/pause` sobre una sesion activa en `working`.

## 1) Objetivo

Cuando el usuario hace click en **Pause** sobre la task activa en `working`, el backend debe:

1. ejecutar el flujo normal de pause (runtime),
2. persistir el snapshot/tramo en `focus_time_entries` (si corresponde por contrato),
3. responder **en la misma peticion** con los registros del **dia local actual** para poblar `Daily Log` en frontend.

`daily_log_today` debe incluir:
1. tiempo trackeado desde `focus_time_entries`,
2. tiempo no trackeado/no registrado desde `idle_time_entries`.

Frontend usara ese payload para renderizar `Daily Log` y, para este componente, esperara la respuesta backend antes de pintar.

## 2) Endpoint

`POST /api/v1/focus-sessions/pause`

## 3) Request para esta condicion

Base (ya existente):

```json
{
  "expected_version": 21,
  "event_at_utc": "2026-03-07T20:05:44.456Z"
}
```

Adicion recomendada para resolver "hoy local" de forma deterministica:

```json
{
  "expected_version": 21,
  "event_at_utc": "2026-03-07T20:05:44.456Z",
  "time_zone_name": "America/Lima"
}
```

Reglas:
1. `expected_version` obligatorio.
2. `event_at_utc` obligatorio (ISO-8601 UTC con `Z`).
3. `time_zone_name` recomendado/obligatorio segun contrato final para calcular dia local de "hoy".
4. Si no se envia `time_zone_name`, backend puede usar preferencia del usuario; si tampoco existe, fallback UTC.

## 4) Regla de "registros de hoy"

Backend debe incluir solo entradas del mismo dia local de la peticion (dia calculado con timezone efectiva):

1. calcular `local_today_date` usando `event_at_utc` + `time_zone_name` efectivo.
2. consultar `focus_time_entries` del usuario donde `started_at_utc/ended_at_utc` caigan en ese dia local (segun regla de corte del producto).
3. consultar `idle_time_entries` del usuario con la misma regla de dia local.
4. devolver solo esos subconjuntos (no mezclar otros dias).

Nota de precision:
1. Si hoy local es `2026-03-07`, la respuesta solo debe incluir entradas mapeadas a `2026-03-07` local.

## 5) Respuesta de exito esperada

Status `200` manteniendo el payload runtime y agregando bloque de daily log:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T20:05:44Z",
    "effective_event_at_utc": "2026-03-07T20:05:44Z",
    "active_focus_session": {
      "task_id": "12",
      "timer_mode": "timer",
      "session_state": "paused",
      "target_seconds": 1500,
      "last_paused_at_utc": "2026-03-07T20:05:44Z",
      "elapsed_seconds_total": 317,
      "version": 22
    },
    "daily_log_today": {
      "date_local": "2026-03-07",
      "time_zone_name": "America/Lima",
      "focus_time_entries": [
        {
          "id": "955",
          "focus_task_id_nullable": "12",
          "task_title_snapshot": "ESTUDIAR PROGRAMACION",
          "task_icon_snapshot": "code",
          "task_color_snapshot": "#0F9D58",
          "mode_snapshot": "timer",
          "started_at_utc": "2026-03-07T19:58:12Z",
          "ended_at_utc": "2026-03-07T20:05:44Z",
          "elapsed_seconds": 452
        }
      ],
      "idle_time_entries": [
        {
          "id": "442",
          "started_at_utc": "2026-03-07T18:10:00Z",
          "ended_at_utc": "2026-03-07T18:15:30Z",
          "elapsed_seconds": 330,
          "reason": "working_to_pause"
        }
      ],
      "tracked_seconds": 452,
      "untracked_seconds": 330,
      "total_seconds": 782
    }
  }
}
```

## 6) Mapeo de datos desde `focus_time_entries` y `idle_time_entries`

Para cada item de `daily_log_today.focus_time_entries`:

1. `id` <= `focus_time_entries.id`
2. `focus_task_id_nullable` <= `focus_time_entries.focus_task_id_nullable`
3. `task_title_snapshot` <= `task_title_snapshot`
4. `task_icon_snapshot` <= `task_icon_snapshot`
5. `task_color_snapshot` <= `task_color_snapshot`
6. `mode_snapshot` <= `mode_snapshot`
7. `started_at_utc` <= `started_at_utc`
8. `ended_at_utc` <= `ended_at_utc`
9. `elapsed_seconds` <= `elapsed_seconds`

Para cada item de `daily_log_today.idle_time_entries`:

1. `id` <= `idle_time_entries.id`
2. `started_at_utc` <= `started_at_utc`
3. `ended_at_utc` <= `ended_at_utc`
4. `elapsed_seconds` <= `elapsed_seconds`
5. `reason` <= `reason`

## 7) Errores a manejar

1. `401 TOKEN_INVALID` o `401 SESSION_REVOKED`.
2. `409 FOCUS_RUNTIME_CONFLICT` / `TASK_VERSION_CONFLICT` segun flujo pause actual.
3. `422 VALIDATION_ERROR` si `event_at_utc` (o `time_zone_name` si se exige) es invalido.
4. `500` si falla persistencia/lectura de daily log.

## 8) Requisitos de consistencia

1. La escritura de pause y el snapshot deben completar antes de armar `daily_log_today`.
2. `daily_log_today` debe reflejar el estado final de la operacion (incluyendo la entrada recien creada por pause, si aplica).
3. Sin duplicados en `focus_time_entries` ni en `idle_time_entries`.
4. Orden recomendado: `started_at_utc` descendente (mas reciente primero) en ambos arreglos.
5. `tracked_seconds` = suma de `focus_time_entries.elapsed_seconds`.
6. `untracked_seconds` = suma de `idle_time_entries.elapsed_seconds`.
7. `total_seconds` = `tracked_seconds + untracked_seconds`.

## 9) Prueba de aceptacion (solo esta condicion)

Precondiciones:
1. Existe task activa en `working`.
2. Usuario tiene al menos una entrada en `focus_time_entries` del dia local actual.
3. Usuario tiene al menos una entrada en `idle_time_entries` del dia local actual.

Accion:
1. Frontend envia `POST /focus-sessions/pause` con `expected_version`, `event_at_utc` y timezone efectiva.

Resultado esperado:
1. Response `200`.
2. Runtime queda en `paused` segun condicion de pause.
3. Response incluye `daily_log_today`.
4. `daily_log_today.focus_time_entries` contiene **solo** registros trackeados del dia local actual.
5. `daily_log_today.idle_time_entries` contiene **solo** registros no trackeados del dia local actual.
6. Totales `tracked_seconds`, `untracked_seconds` y `total_seconds` consistentes.
7. Frontend usa ese bloque para pintar `Daily Log` sin pedir otro endpoint adicional en ese instante.
