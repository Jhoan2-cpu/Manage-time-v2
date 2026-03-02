# Tasks Contract (Desde Cero) - Frontend <-> Laravel + Reverb

## Scope

Backend objetivo:
- CRUD de tareas por usuario autenticado
- Realtime de cambios de tareas entre dispositivos del mismo usuario (Reverb)

Frontend objetivo:
- Crear tarjeta
- Editar tarjeta
- Eliminar tarjeta
- Reflejar cambios en todas las sesiones abiertas del mismo usuario

---

## Modelo simple (usuario personal)

- No hay workspaces.
- Toda tarea pertenece a un solo usuario autenticado.
- Cada request usa cookie session (Sanctum).

---

## Estructura de tarea (contrato)

```json
{
  "id": "task_123",
  "title": "Planificacion semanal",
  "color_tag": "blue",
  "icon_tag": "briefcase",
  "target_duration_seconds": 3600,
  "alarm_time_local": "21:30",
  "sort_order": 1,
  "focus_time_total_seconds": 0,
  "focus_sessions_count": 0
}
```

---

## Validaciones backend (Laravel)

- `title`: `required|string|min:1|max:120`
- `color_tag`: `required|in:blue,green,amber,rose,pink,violet`
- `icon_tag`: `required|in:briefcase,learning,tools,code,book,pen,cart,game`
- `target_duration_seconds`: `nullable|integer|min:1|max:86400`
- `alarm_time_local`: `nullable|date_format:H:i`

Reglas de seguridad:
- siempre filtrar por `auth()->id()` en todas las consultas
- devolver `404` si la tarea no existe o no pertenece al usuario

---

## 1) Listar tareas

El frontend enviara al backend:  
`GET /api/v1/tasks`

si todo esta correcto enviara (`200`):
```json
{
  "data": [
    {
      "id": "task_123",
      "title": "Planificacion semanal",
      "color_tag": "blue",
      "icon_tag": "briefcase",
      "target_duration_seconds": 3600,
      "alarm_time_local": "21:30",
      "sort_order": 1,
      "focus_time_total_seconds": 0,
      "focus_sessions_count": 0
    }
  ]
}
```

sino (`401`):
```json
{
  "message": "Unauthenticated."
}
```

---

## 2) Crear tarea

El frontend enviara al backend:  
`POST /api/v1/tasks`

body:
```json
{
  "title": "Planificacion semanal",
  "color_tag": "blue",
  "icon_tag": "briefcase",
  "target_duration_seconds": 3600,
  "alarm_time_local": "21:30"
}
```

si todo esta correcto enviara (`201`):
```json
{
  "data": {
    "id": "task_123",
    "title": "Planificacion semanal",
    "color_tag": "blue",
    "icon_tag": "briefcase",
    "target_duration_seconds": 3600,
    "alarm_time_local": "21:30",
    "sort_order": 4,
    "focus_time_total_seconds": 0,
    "focus_sessions_count": 0
  }
}
```

sino (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": [
      "El titulo es obligatorio."
    ]
  }
}
```

---

## 3) Editar tarea

El frontend enviara al backend:  
`PATCH /api/v1/tasks/{taskId}`

body:
```json
{
  "title": "Planificacion semanal v2",
  "color_tag": "green",
  "icon_tag": "code",
  "target_duration_seconds": 5400,
  "alarm_time_local": "22:00"
}
```

si todo esta correcto enviara (`200`):
```json
{
  "data": {
    "id": "task_123",
    "title": "Planificacion semanal v2",
    "color_tag": "green",
    "icon_tag": "code",
    "target_duration_seconds": 5400,
    "alarm_time_local": "22:00",
    "sort_order": 4,
    "focus_time_total_seconds": 0,
    "focus_sessions_count": 0
  }
}
```

sino (`404`):
```json
{
  "message": "Task not found."
}
```

sino (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "color_tag": [
      "El color seleccionado no es valido."
    ]
  }
}
```

---

## 4) Eliminar tarea

El frontend enviara al backend:  
`DELETE /api/v1/tasks/{taskId}`

si todo esta correcto enviara (`204`):
```json
{}
```

sino (`404`):
```json
{
  "message": "Task not found."
}
```

---

## 5) Reordenar tareas (opcional pero recomendado)

El frontend enviara al backend:  
`POST /api/v1/tasks/reorder`

body:
```json
{
  "ordered_task_ids": [
    "task_3",
    "task_1",
    "task_2"
  ]
}
```

si todo esta correcto enviara (`200`):
```json
{
  "data": [
    {
      "id": "task_3",
      "sort_order": 1
    },
    {
      "id": "task_1",
      "sort_order": 2
    },
    {
      "id": "task_2",
      "sort_order": 3
    }
  ]
}
```

sino (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "ordered_task_ids": [
      "La lista de orden no es valida."
    ]
  }
}
```

---

## Realtime con Reverb (sincronizacion entre dispositivos)

Objetivo:
- si una tarjeta se crea/edita/elimina en un dispositivo, los demas dispositivos del mismo usuario se actualizan en tiempo real

Canal privado:
- wire-level: `private-user.{userId}.tasks`
- frontend Echo: `echo.private('user.{userId}.tasks')`

Eventos:
- `.task.created`
- `.task.updated`
- `.task.deleted`
- `.tasks.reordered`

payload base recomendado:
```json
{
  "type": "task.updated",
  "meta": {
    "user_id": "usr_123",
    "emitted_at_utc": "2026-03-02T16:20:00Z",
    "origin_device_id": "web-9c3f..."
  },
  "data": {
    "task": {
      "id": "task_123",
      "title": "Planificacion semanal v2",
      "color_tag": "green",
      "icon_tag": "code",
      "target_duration_seconds": 5400,
      "alarm_time_local": "22:00",
      "sort_order": 4,
      "focus_time_total_seconds": 0,
      "focus_sessions_count": 0
    }
  }
}
```

payload `task.deleted`:
```json
{
  "type": "task.deleted",
  "meta": {
    "user_id": "usr_123",
    "emitted_at_utc": "2026-03-02T16:22:10Z",
    "origin_device_id": "web-9c3f..."
  },
  "data": {
    "task_id": "task_123"
  }
}
```

comportamiento frontend recomendado:
- aplicar evento recibido al estado local inmediatamente
- ignorar eventos de otro `user_id`
- en reconexion websocket: ejecutar `GET /api/v1/tasks` para re-sync autoritativo
- mantener fallback por HTTP (si WS falla, el CRUD local sigue funcionando)

comportamiento backend recomendado:
- emitir evento despues de commit DB (no antes)
- autenticar canal privado por usuario
- no exponer tareas de otro usuario

---

## Configuracion adicional obligatoria

### Frontend

- `credentials: 'include'`
- para mutaciones (`POST/PATCH/DELETE`) llamar antes:
  - `GET /sanctum/csrf-cookie`
- Reverb:
  - usar `authEndpoint: /broadcasting/auth`
  - `withCredentials: true`

### Backend Laravel

- Sanctum stateful + CORS con credenciales
- Reverb configurado
- autorizacion de canal privado:
  - `user.{id}.tasks` solo si `auth()->id() === {id}`
