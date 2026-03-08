# Backend Daily Log - Condicion 00 (Carga inicial de /app + registros de hoy)

Fecha: 2026-03-07  
Alcance: **solo esta condicion**. Aplica en la carga inicial de `GET /api/v1/app-bootstrap` para poblar `Daily Log` del frontend.

## 1) Objetivo

Cuando el usuario abre `/app`, el backend debe devolver en el bootstrap el bloque `daily_log` con **todos los registros del dia local actual** (no de otros dias), para que frontend pinte `Daily Log` inmediatamente sin llamada adicional.

## 2) Endpoint

`GET /api/v1/app-bootstrap`

Query recomendado:

`?include=tasks,preferences,daily_log,dashboard_stats,active_focus_session`

## 3) Regla de timezone y "hoy"

Para determinar que es "hoy":

1. usar `user.settings.time_zone_name` como timezone efectiva,
2. si no existe, fallback `UTC`.

Con esa timezone, backend calcula `date_local` del momento de la peticion y filtra solo registros de ese dia.

## 4) Fuente de datos para daily log

`daily_log` se arma desde:

1. `focus_time_entries` del usuario (tramos de foco),
2. `idle_time_entries` del usuario (tiempo no trackeado), si aplica segun contrato actual.

Reglas:

1. incluir solo entradas del dia local actual,
2. incluir entradas cerradas y tambien abiertas si el contrato lo permite (duracion calculada al momento de respuesta),
3. no duplicar entradas.

## 5) Respuesta de exito esperada (fragmento)

Status `200`:

```json
{
  "data": {
    "server_now_utc": "2026-03-07T23:10:00Z",
    "preferences": {
      "time_zone_name": "America/Lima"
    },
    "daily_log": {
      "date_local": "2026-03-07",
      "tracked_seconds": 452,
      "untracked_seconds": 120,
      "entries": [
        {
          "id": "955",
          "entry_type": "focus",
          "task_id": "12",
          "task_title": "ESTUDIAR PROGRAMACION",
          "task_color_tag": "#0F9D58",
          "task_icon_tag": "code",
          "started_at_utc": "2026-03-07T19:58:12Z",
          "ended_at_utc": "2026-03-07T20:05:44Z",
          "duration_seconds": 452,
          "started_at_local_label": "2:58:12 p. m."
        }
      ]
    }
  }
}
```

## 6) Mapeo recomendado

Para entradas `entry_type = focus`:

1. `id` <= `focus_time_entries.id`
2. `task_id` <= `focus_task_id_nullable`
3. `task_title` <= `task_title_snapshot`
4. `task_icon_tag` <= `task_icon_snapshot`
5. `task_color_tag` <= `task_color_snapshot`
6. `started_at_utc` <= `started_at_utc`
7. `ended_at_utc` <= `ended_at_utc`
8. `duration_seconds` <= `elapsed_seconds`

Para entradas `entry_type = untracked` (si aplica):

1. `id` <= `idle_time_entries.id`
2. `task_id = null`
3. `started_at_utc` <= `started_at_utc`
4. `ended_at_utc` <= `ended_at_utc`
5. `duration_seconds` <= `elapsed_seconds`

## 7) Orden de entries

Para consistencia con UI:

1. ordenar por `started_at_utc` descendente (mas reciente primero).

## 8) Errores a manejar

1. `401 TOKEN_INVALID` o `401 SESSION_REVOKED`
2. `500` error interno armando bootstrap/daily log

## 9) Prueba de aceptacion (solo esta condicion)

Precondiciones:

1. Usuario autenticado con timezone configurada (`America/Lima`, por ejemplo).
2. Existen registros en `focus_time_entries` del dia local actual y de otro dia previo.

Accion:

1. Frontend carga `/app` y solicita `GET /api/v1/app-bootstrap?include=...daily_log...`.

Resultado esperado:

1. Response `200`.
2. `data.daily_log` presente en bootstrap.
3. `data.daily_log.entries` contiene **solo** registros del dia local actual.
4. Frontend pinta `Daily Log` con ese payload inicial, sin pedir endpoint extra para primer render.

