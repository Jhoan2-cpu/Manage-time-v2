# Velor Backend - Catalogo de Endpoints (Modular)

## Objetivo

Documento de referencia para el equipo backend sobre:

- para que sirve cada endpoint
- que datos espera (request)
- que datos devuelve (response)
- respuestas de error comunes

Este documento esta alineado con una arquitectura:

- **HTTP** para comandos/CRUD
- **WebSocket** para sincronizacion realtime del contador
- **contador server-authoritative** (backend como fuente de verdad)

## Convenciones generales

### Base URL
- `https://api.tu-dominio.com`

### Versionado
- Endpoints de negocio bajo ` /api/v1/... `

### Autenticacion (SPA web)
- Laravel Sanctum con **cookie de sesion**
- No se requiere `Authorization: Bearer ...` para la SPA
- El frontend debe enviar credenciales:
  - `fetch`: `credentials: 'include'`
  - `axios`: `withCredentials: true`

### Formato de fechas y tiempo
- Timestamps operativos en UTC (`*_utc`) en formato ISO 8601
- Duraciones en **segundos**
- El backend debe incluir `server_now_utc` cuando el frontend necesite calcular tiempo visual

## Formato de respuesta recomendado

### Exito (base)
```json
{
  "data": {}
}
```

### Error (base)
```json
{
  "message": "Descripcion del error",
  "errors": {
    "campo": ["Detalle de validacion"]
  }
}
```

## Codigos de error comunes

- `400 Bad Request`: payload invalido o inconsistente
- `401 Unauthorized`: sin sesion/cookie valida
- `403 Forbidden`: recurso fuera del tenant/workspace del usuario
- `404 Not Found`: recurso no existe
- `409 Conflict`: version desfasada (contador server-authoritative)
- `422 Unprocessable Entity`: validacion de campos
- `429 Too Many Requests`: rate limit
- `500 Internal Server Error`: error no controlado

---

# Modulo 1. Auth (Login / Register / Logout / Me)

## 1. `GET /sanctum/csrf-cookie`

### Para que sirve
Inicializa la cookie CSRF requerida por Sanctum para mutaciones (`POST`, `PATCH`, `DELETE`) desde la SPA.

### Auth
- Publico

### Request
- Sin body

### Response (exito)
- `204` o `200` (segun configuracion)
- Setea cookies CSRF

### Errores comunes
- `500` si hay problema de configuracion de sesion/cookies

---

## 2. `POST /api/v1/auth/register`

### Para que sirve
Registra un nuevo usuario, crea su workspace personal y deja la sesion iniciada.

### Auth
- Publico

### Request (JSON)
```json
{
  "display_name": "Anton Rivera",
  "email": "anton@velor.app",
  "password": "secret12345",
  "password_confirmation": "secret12345",
  "locale": "es"
}
```

### Response (exito)
```json
{
  "data": {
    "user": {
      "id": "usr_01...",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "workspace": {
      "id": "ws_01...",
      "name": "Espacio personal de Velor"
    }
  }
}
```

### Errores

#### `422` Validacion
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["El correo ya esta en uso."],
    "password": ["La confirmacion de contrasena no coincide."]
  }
}
```

---

## 3. `POST /api/v1/auth/login`

### Para que sirve
Autentica al usuario con email/contrasena y crea la sesion (cookie).

### Auth
- Publico

### Request (JSON)
```json
{
  "email": "anton@velor.app",
  "password": "secret12345"
}
```

### Response (exito)
```json
{
  "data": {
    "user": {
      "id": "usr_01...",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    }
  }
}
```

### Errores

#### `422` Validacion
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["El correo es obligatorio."]
  }
}
```

#### `401` Credenciales invalidas
```json
{
  "message": "Credenciales invalidas."
}
```

---

## 4. `POST /api/v1/auth/logout`

### Para que sirve
Cierra la sesion del usuario actual.

### Auth
- Requerida (cookie de sesion)

### Request
- Sin body

### Response (exito)
```json
{
  "message": "Logged out."
}
```

### Errores
- `401` si no hay sesion valida

---

## 5. `GET /api/v1/auth/me`

### Para que sirve
Devuelve el usuario autenticado actual (bootstrap de sesion).

### Auth
- Requerida

### Request
- Sin body

### Response (exito)
```json
{
  "data": {
    "id": "usr_01...",
    "display_name": "Anton Rivera",
    "email": "anton@velor.app",
    "locale": "es"
  }
}
```

### Errores
- `401` si la sesion expiro o no existe

---

## 6. `GET /api/v1/auth/google/redirect` (opcional)

### Para que sirve
Inicia OAuth con Google (redireccion al proveedor).

### Auth
- Publico

### Request (query opcional)
- `intent=login|register`

### Response (exito)
- `302 Redirect` a Google

### Errores
- `500` configuracion OAuth faltante

---

## 7. `GET /api/v1/auth/google/callback` (opcional)

### Para que sirve
Recibe el callback de Google, crea/vincula usuario e inicia sesion.

### Auth
- Publico (flujo OAuth)

### Request
- Query params de Google (`code`, `state`, etc.)

### Response (exito)
- `302 Redirect` al frontend (`/app`)

### Errores
- `400` callback invalido
- `401` OAuth fallido
- `500` error interno

---

# Modulo 2. Bootstrap del panel (`/app`)

## 8. `GET /api/v1/app/bootstrap`

### Para que sirve
Carga el estado inicial del dashboard en una sola llamada despues de autenticarse.

### Auth
- Requerida

### Request (query opcional)
- `include=tasks,preferences,daily_log,dashboard_stats,active_focus_session`

Ejemplo:
`GET /api/v1/app/bootstrap?include=tasks,preferences,daily_log,dashboard_stats,active_focus_session`

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "user": {
      "id": "usr_01...",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "workspace": {
      "id": "ws_01...",
      "name": "Espacio personal de Velor"
    },
    "preferences": {
      "locale": "es",
      "time_zone_name": "America/Lima",
      "time_zone_auto_detect": true,
      "ui_sounds_enabled": true,
      "background_music_enabled": false,
      "background_music_volume_percent": 62
    },
    "tasks": [],
    "daily_log": {
      "date_local": "2026-02-25",
      "entries": []
    },
    "dashboard_stats": {
      "tracked_seconds_today": 0,
      "untracked_seconds_today": 0
    },
    "active_focus_session": null
  }
}
```

### Errores
- `401` sin sesion
- `422` include invalido

---

# Modulo 3. Preferencias (Settings)

## 9. `GET /api/v1/preferences`

### Para que sirve
Obtiene las preferencias del usuario autenticado.

### Auth
- Requerida

### Request
- Sin body

### Response (exito)
```json
{
  "data": {
    "locale": "es",
    "time_zone_name": "America/Lima",
    "time_zone_auto_detect": true,
    "ui_sounds_enabled": true,
    "background_music_enabled": false,
    "background_music_volume_percent": 62,
    "confirm_task_switch_enabled": true,
    "sign_out_confirmation_enabled": true
  }
}
```

### Errores
- `401`

---

## 10. `PATCH /api/v1/preferences`

### Para que sirve
Actualiza una o varias preferencias del usuario.

### Auth
- Requerida

### Request (JSON parcial)
```json
{
  "locale": "en",
  "time_zone_name": "America/New_York",
  "background_music_volume_percent": 40
}
```

### Response (exito)
```json
{
  "data": {
    "locale": "en",
    "time_zone_name": "America/New_York",
    "background_music_volume_percent": 40
  }
}
```

### Errores

#### `422`
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "background_music_volume_percent": ["Debe estar entre 0 y 100."]
  }
}
```

---

# Modulo 4. Tareas (Task Carousel)

## 11. `GET /api/v1/tasks`

### Para que sirve
Lista las tareas activas del usuario (ordenadas para el carrusel).

### Auth
- Requerida

### Request (query opcional)
- `archived=false` (default)

### Response (exito)
```json
{
  "data": [
    {
      "id": "task_01...",
      "title": "Limpieza de correos",
      "color_tag": "green",
      "icon_tag": "pen",
      "target_duration_seconds": 2700,
      "alarm_time_local": "08:00:00",
      "sort_order": 2
    }
  ]
}
```

### Errores
- `401`

---

## 12. `POST /api/v1/tasks`

### Para que sirve
Crea una nueva tarea.

### Auth
- Requerida

### Request (JSON)
```json
{
  "title": "Revision de diseno",
  "details": "",
  "color_tag": "violet",
  "icon_tag": "graduation-cap",
  "target_duration_seconds": 5400,
  "alarm_time_local": "17:20:00"
}
```

### Response (exito)
```json
{
  "data": {
    "id": "task_01...",
    "title": "Revision de diseno",
    "color_tag": "violet",
    "icon_tag": "graduation-cap",
    "target_duration_seconds": 5400,
    "alarm_time_local": "17:20:00",
    "sort_order": 3
  }
}
```

### Errores
- `422` validacion (`title`, `color_tag`, `icon_tag`, `alarm_time_local`)

---

## 13. `PATCH /api/v1/tasks/{taskId}`

### Para que sirve
Actualiza una tarea existente.

### Auth
- Requerida

### Request (JSON parcial)
```json
{
  "title": "Revision de diseno final",
  "target_duration_seconds": 3600,
  "alarm_time_local": null
}
```

### Response (exito)
```json
{
  "data": {
    "id": "task_01...",
    "title": "Revision de diseno final",
    "target_duration_seconds": 3600,
    "alarm_time_local": null
  }
}
```

### Errores
- `401`
- `403`
- `404`
- `422`

---

## 14. `DELETE /api/v1/tasks/{taskId}`

### Para que sirve
Elimina (o archiva/soft-delete) una tarea.

### Auth
- Requerida

### Request
- Sin body

### Response (exito)
```json
{
  "message": "Task deleted."
}
```

### Errores
- `401`
- `403`
- `404`
- `409` si la tarea no puede eliminarse por regla de negocio (opcional)

---

## 15. `POST /api/v1/tasks/reorder`

### Para que sirve
Actualiza el orden visual del carrusel de tareas.

### Auth
- Requerida

### Request (JSON)
```json
{
  "items": [
    { "task_id": "task_01...", "sort_order": 1 },
    { "task_id": "task_02...", "sort_order": 2 }
  ]
}
```

### Response (exito)
```json
{
  "message": "Task order updated."
}
```

### Errores
- `422` payload invalido
- `403` task fuera del workspace

---

# Modulo 5. Contador Server-Authoritative (HTTP)

## Reglas clave de este modulo
- El backend es la fuente de verdad del contador
- Solo una sesion activa por usuario
- Todas las respuestas incluyen:
  - `server_now_utc`
  - `active_focus_session`
- `pause/resume/switch-task/stop` usan `expected_version`

## 16. `GET /api/v1/focus-sessions/active`

### Para que sirve
Devuelve la sesion activa del contador (si existe) para resync/recovery.

### Auth
- Requerida

### Request
- Sin body

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": {
      "id": "fs_01...",
      "task_id": "task_01...",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds": 2700,
      "elapsed_seconds_total": 1200,
      "started_at_utc": "2026-02-25T14:10:00Z",
      "last_resumed_at_utc": "2026-02-25T14:12:00Z",
      "version": 7
    }
  }
}
```

### Errores
- `401`

---

## 17. `POST /api/v1/focus-sessions/start`

### Para que sirve
Inicia una sesion de foco para una tarea.

### Auth
- Requerida

### Request (JSON)
```json
{
  "task_id": "task_01...",
  "timer_mode": "timer",
  "target_seconds": 2700,
  "client_request_id": "cli-uuid-001"
}
```

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:32:10Z",
    "active_focus_session": {
      "id": "fs_01...",
      "task_id": "task_01...",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds": 2700,
      "elapsed_seconds_total": 0,
      "version": 1
    }
  }
}
```

### Errores
- `401`
- `404` task no existe
- `403` task fuera del workspace
- `422` validacion

---

## 18. `POST /api/v1/focus-sessions/pause`

### Para que sirve
Pausa la sesion activa.

### Auth
- Requerida

### Request (JSON)
```json
{
  "expected_version": 7,
  "client_request_id": "cli-uuid-002"
}
```

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:35:20Z",
    "active_focus_session": {
      "id": "fs_01...",
      "session_state": "paused",
      "elapsed_seconds_total": 1390,
      "version": 8
    }
  }
}
```

### Errores

#### `409` conflicto de version
```json
{
  "message": "Focus session version conflict.",
  "data": {
    "server_now_utc": "2026-02-25T14:35:20Z",
    "active_focus_session": {
      "id": "fs_01...",
      "version": 8
    }
  }
}
```

---

## 19. `POST /api/v1/focus-sessions/resume`

### Para que sirve
Reanuda una sesion pausada.

### Auth
- Requerida

### Request (JSON)
```json
{
  "expected_version": 8,
  "client_request_id": "cli-uuid-003"
}
```

### Response (exito)
- Igual estructura que `pause`, con `session_state: "running"` y `version` incrementada.

### Errores
- `401`
- `409`
- `422`

---

## 20. `POST /api/v1/focus-sessions/switch-task`

### Para que sirve
Cambia la tarea activa manteniendo el flujo de contador (cierra tramo actual y abre nueva sesion/tramo).

### Auth
- Requerida

### Request (JSON)
```json
{
  "task_id": "task_02...",
  "timer_mode": "stopwatch",
  "target_seconds": null,
  "expected_version": 9,
  "client_request_id": "cli-uuid-004"
}
```

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:40:00Z",
    "active_focus_session": {
      "id": "fs_02...",
      "task_id": "task_02...",
      "timer_mode": "stopwatch",
      "session_state": "running",
      "elapsed_seconds_total": 0,
      "version": 1
    }
  }
}
```

### Errores
- `401`
- `403`
- `404`
- `409`
- `422`

---

## 21. `POST /api/v1/focus-sessions/stop`

### Para que sirve
Detiene la sesion activa y confirma el bloque de tiempo (`time_entry` de focus).

### Auth
- Requerida

### Request (JSON)
```json
{
  "expected_version": 10,
  "client_request_id": "cli-uuid-005"
}
```

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:55:00Z",
    "active_focus_session": null,
    "created_time_entry_id": "te_01..."
  }
}
```

### Errores
- `401`
- `409`
- `422`

---

## 22. `POST /api/v1/focus-sessions/heartbeat` (opcional recomendado)

### Para que sirve
Marca presencia/latido del cliente para diagnostico y reconexion (no cambia negocio principal).

### Auth
- Requerida

### Request (JSON)
```json
{
  "expected_version": 10
}
```

### Response (exito)
```json
{
  "data": {
    "server_now_utc": "2026-02-25T14:50:10Z",
    "active_focus_session": {
      "id": "fs_01...",
      "version": 10
    }
  }
}
```

### Errores
- `401`
- `409`

---

# Modulo 6. Historial y Registro de Tiempo

## 23. `POST /api/v1/time-entries` (opcional en MVP)

### Para que sirve
Crea un bloque de tiempo manual/ajuste (no generado por `focus-sessions/stop`).

### Auth
- Requerida

### Request (JSON)
```json
{
  "entry_type": "manual_adjustment",
  "task_id": "task_01...",
  "started_at_utc": "2026-02-25T12:00:00Z",
  "ended_at_utc": "2026-02-25T12:15:00Z",
  "notes": "Ajuste manual"
}
```

### Response (exito)
```json
{
  "data": {
    "id": "te_01...",
    "duration_seconds": 900
  }
}
```

### Errores
- `422` validacion de tiempos
- `403` task no pertenece al usuario/workspace

---

## 24. `GET /api/v1/history/overview`

### Para que sirve
Devuelve resumen del historial (cards, pie, time by task, etc.) para `Settings & History`.

### Auth
- Requerida

### Request (query)
- `date=2026-02-25` (opcional, default hoy local)

### Response (exito)
```json
{
  "data": {
    "date_local": "2026-02-25",
    "tracked_seconds": 26442,
    "untracked_seconds": 4158,
    "sessions_count": 13,
    "avg_session_seconds": 2034,
    "top_task": {
      "task_id": "task_01...",
      "title": "Q3 Report Writing",
      "tracked_seconds": 9000
    },
    "time_by_task": []
  }
}
```

### Errores
- `401`
- `422` fecha invalida

---

## 25. `GET /api/v1/history/days`

### Para que sirve
Lista dias del historial con filtros y paginacion.

### Auth
- Requerida

### Request (query)
- `q=` texto libre (fecha o tarea)
- `task_id=...`
- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`
- `page=1`
- `per_page=20`

### Response (exito)
```json
{
  "data": [
    {
      "date_local": "2026-02-25",
      "tracked_seconds": 26442,
      "untracked_seconds": 4158,
      "sessions_count": 13,
      "task_types_count": 3
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 5
  }
}
```

### Errores
- `401`
- `422`

---

## 26. `GET /api/v1/history/days/{date}`

### Para que sirve
Devuelve el detalle de sesiones/bloques de un dia especifico.

### Auth
- Requerida

### Request
- Path param: `{date}` formato `YYYY-MM-DD`

### Response (exito)
```json
{
  "data": {
    "date_local": "2026-02-25",
    "tracked_seconds": 26442,
    "untracked_seconds": 4158,
    "entries": [
      {
        "id": "te_01...",
        "entry_type": "focus",
        "task_title_snapshot": "Limpieza de correos",
        "started_at_local_label": "8:00:00 a. m.",
        "duration_seconds": 2700
      }
    ]
  }
}
```

### Errores
- `401`
- `404`
- `422`

---

# Modulo 7. Realtime (WebSocket, no HTTP)

> No son endpoints HTTP, pero se documentan aqui porque forman parte del contrato de integracion.

## Canal privado
- `private.user.{userId}.focus`

## Para que sirve
Propagar cambios del contador a otros dispositivos del mismo usuario en tiempo real.

## Eventos recomendados

### `FocusSessionStateUpdated`
Payload:
```json
{
  "server_now_utc": "2026-02-25T14:35:20Z",
  "active_focus_session": {
    "id": "fs_01...",
    "task_id": "task_01...",
    "session_state": "paused",
    "version": 8
  }
}
```

### `FocusSessionStopped`
Payload:
```json
{
  "server_now_utc": "2026-02-25T14:55:00Z",
  "active_focus_session": null,
  "created_time_entry_id": "te_01..."
}
```

## Fallback si WebSocket falla
- Polling `GET /api/v1/focus-sessions/active` cada 10-15s
- Re-sync con `GET /api/v1/app/bootstrap` al reconectar

---

# Checklist rapido para backend (por endpoint)

Cada endpoint debe entregarse con:

1. Ruta (`routes/api.php`)
2. Controller
3. Form Request (validacion)
4. Resource (response)
5. Policy / tenant scoping
6. Tests (exito + errores)
7. Rate limit (si aplica)

