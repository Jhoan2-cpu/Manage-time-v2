# Handoff Frontend - TaskCards CRUD (HTTP + JWT, sin realtime)

Fecha: 2026-03-06  
Estado esperado backend: modulo TaskCards listo para frontend en endpoints HTTP privados.

## 1) Alcance de este handoff

Este documento cubre solo:

1. Bootstrap inicial de TaskCards.
2. CRUD de TaskCards.
3. Reordenamiento de TaskCards.
4. Control de concurrencia por version (`if_version`).

Este documento no cubre:

1. Realtime/WebSocket/Reverb.
2. Historial diario y focus runtime.

## 2) Base de integracion

1. Base URL local backend: `http://localhost:8001`
2. Auth: `Authorization: Bearer <access_token>`
3. IDs en respuestas: `string`
4. Fechas: ISO-8601 UTC (`created_at`, `updated_at`, etc.)
5. Sin CSRF requerido para este frontend (JWT-only).

## 3) Endpoints requeridos (canonicos)

1. `GET /api/v1/app/bootstrap?include=tasks,preferences,daily_log,dashboard_stats,active_focus_session`
2. `GET /api/v1/focus/tasks`
3. `POST /api/v1/focus/tasks`
4. `PATCH /api/v1/focus/tasks/{taskId}`
5. `DELETE /api/v1/focus/tasks/{taskId}?if_version={version}`
6. `POST /api/v1/tasks/reorder`

## 4) Headers esperados por frontend

En create/update/delete frontend envia:

1. `Authorization: Bearer <access_token>`
2. `Accept: application/json`
3. `Content-Type: application/json` (cuando aplica body)
4. `X-Origin-Device-Id: web-xxxxxxxx` (trazabilidad)

En delete ademas envia:

1. Query param: `if_version={n}`
2. Header: `If-Match: {n}`

## 5) Contrato de objeto Task (CRUD)

Shape esperado en `data` para list/create/update:

```json
{
  "id": "12",
  "user_id": "1",
  "name": "Programar la alarma para manana",
  "icon_tag": "briefcase",
  "color_tag": "#F9AB00",
  "alarm_time_local": "07:00",
  "active_mode": "timer",
  "state": "stopped",
  "timer_initial_seconds": 4200,
  "timer_remaining_seconds": 4200,
  "timer_started_at_utc": null,
  "stopwatch_elapsed_seconds": 0,
  "stopwatch_started_at_utc": null,
  "target_duration_seconds": 4200,
  "version": 8,
  "created_at": "2026-03-06T05:10:00Z",
  "updated_at": "2026-03-06T05:12:00Z"
}
```

Notas:

1. `active_mode`, `state`, `timer_remaining_seconds`, `timer_started_at_utc`, `stopwatch_*` pueden venir `null`/default segun backend.
2. Frontend usa `version` para control optimista en update/delete.

## 6) Contratos por endpoint

## 6.1 GET /api/v1/focus/tasks

Response `200`:

```json
{
  "data": [ { "...task..." } ]
}
```

## 6.2 POST /api/v1/focus/tasks

Request:

```json
{
  "name": "Programar la alarma para manana",
  "color_tag": "#F9AB00",
  "icon_tag": "briefcase",
  "alarm_time_local": "07:00",
  "timer_initial_seconds": 4200,
  "target_duration_seconds": 4200
}
```

Response `201` (o `200` compatible):

```json
{
  "data": { "...task..." }
}
```

## 6.3 PATCH /api/v1/focus/tasks/{taskId}

Request:

```json
{
  "if_version": 8,
  "name": "Programar alarma para manana",
  "color_tag": "#F9AB00",
  "icon_tag": "briefcase",
  "alarm_time_local": "07:15",
  "timer_initial_seconds": 4500,
  "target_duration_seconds": 4500
}
```

Response `200`:

```json
{
  "data": { "...task..." }
}
```

## 6.4 DELETE /api/v1/focus/tasks/{taskId}?if_version={version}

Headers:

```http
If-Match: 8
```

Response canonico `204 No Content`.

## 6.5 POST /api/v1/tasks/reorder

Request:

```json
{
  "ordered_task_ids": ["12", "5", "3"]
}
```

Response `200`:

```json
{
  "data": [ { "...task..." } ]
}
```

## 6.6 GET /api/v1/app/bootstrap?...include=tasks...

`data.tasks` en bootstrap usa este shape (no es el mismo del CRUD):

```json
{
  "id": "12",
  "title": "Programar la alarma para manana",
  "color_tag": "#F9AB00",
  "icon_tag": "briefcase",
  "target_duration_seconds": 4200,
  "alarm_time_local": "07:00",
  "sort_order": 1,
  "focus_time_total_seconds": 0,
  "focus_sessions_count": 0
}
```

## 7) Errores esperados

## 7.1 401 Unauthorized

Frontend cerrara sesion local y redirige a login.

## 7.2 404 Not Found

En update/delete, frontend trata la task como ya removida en servidor.

## 7.3 422 Validation

Formato esperado:

```json
{
  "message": "The given data was invalid.",
  "code": "VALIDATION_ERROR",
  "errors": {
    "name": ["The name field is required."]
  }
}
```

## 7.4 409 Conflict (version)

Formato requerido para que frontend refresque sin romper:

```json
{
  "message": "Version conflict.",
  "code": "TASK_VERSION_CONFLICT",
  "data": {
    "current": {
      "id": "12",
      "version": 9,
      "updated_at": "2026-03-06T05:15:00Z"
    }
  }
}
```

`code` aceptado por frontend:

1. `TASK_VERSION_CONFLICT`
2. `VERSION_CONFLICT`

## 8) Reglas de negocio minimas para backend

1. Cada task pertenece a `user_id` autenticado.
2. No exponer tasks de otros usuarios.
3. En update/delete validar `if_version`.
4. Si `if_version` no coincide, responder `409` con shape de conflicto.
5. En update exitoso, incrementar `version` y actualizar `updated_at`.

## 9) QA checklist backend (obligatorio)

1. Login JWT valido -> `GET /focus/tasks` devuelve solo tasks del usuario.
2. Crear task -> aparece en list con `version >= 1`.
3. Editar task con `if_version` correcto -> `200` y `version` incrementa.
4. Editar task con `if_version` viejo -> `409` + `TASK_VERSION_CONFLICT`.
5. Delete con version correcta -> `204`.
6. Delete con version vieja -> `409` conflicto.
7. Reorder con lista valida -> `200` y orden persistido.
8. Bootstrap con `include=tasks` devuelve `data.tasks` con shape acordado.

## 10) Notas de implementacion

1. Frontend ya no depende de realtime para este modulo.
2. Todo sincroniza via HTTP contra endpoints anteriores.
3. Si backend respeta este contrato, CRUD TaskCards queda estable en frontend.
