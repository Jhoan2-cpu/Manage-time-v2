# Velor Backend - Modulo 4 (Tareas / Task Carousel CRUD) - Handoff para equipo Laravel

## Objetivo del modulo

Implementar persistencia y manejo de tareas del carrusel principal (`Task Carousel / Registro de tareas`) mediante endpoints dedicados:

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{taskId}`
- `DELETE /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks/reorder` (recomendado en este modulo; puede entrar como subentrega si hace falta)

Este modulo permite que el frontend deje de manejar las tareas solo en estado local y las sincronice con backend.

## Dependencias directas

Este modulo depende de:

- **Modulo 1 (Auth)** operativo
  - sesion via Sanctum (cookie)
  - `users`
  - `workspaces`
  - `workspace_members`
- **Modulo 2 (`/app/bootstrap`)** operativo (recomendado)
  - para que `/app/bootstrap` lea las tareas reales de BD
- **Modulo 3 (Preferences)** operativo (recomendado)
  - para mantener timezone/locale sincronizados, aunque no bloquea CRUD de tareas

Referencias:
- `docs/backend/module-1-auth-laravel-handoff.md`
- `docs/backend/module-2-app-bootstrap-laravel-handoff.md`
- `docs/backend/module-3-preferences-laravel-handoff.md`

---

## Alcance (MVP)

### Incluido
- listar tareas del usuario/workspace actual
- crear tarea
- editar tarea (update parcial)
- eliminar tarea (soft delete recomendado)
- reordenar tareas (`sort_order`)
- validaciones de enums (`color_tag`, `icon_tag`)
- persistencia de:
  - titulo
  - color
  - icono
  - duracion objetivo (segundos)
  - hora de alarma local (`HH:mm:ss`)

### Opcional en esta entrega (si da tiempo)
- `POST /api/v1/tasks/{taskId}/duplicate`
- `POST /api/v1/tasks/{taskId}/activate` (normalmente mejor dejarlo para Modulo 5)
- endpoint de restore de soft deleted tasks

### Fuera de alcance (este modulo)
- contador server-authoritative (Modulo 5)
- time entries / historial (Modulo 6)
- realtime WebSocket (Modulo 7)
- estadisticas agregadas en tiempo real por tarea (Modulo 6/7)

---

## Decisiones tecnicas (obligatorias)

## 1. Auth y scoping (SaaS-safe)
- Endpoints protegidos con `auth:sanctum`
- Las tareas deben estar scopeadas por `workspace_id`
- No aceptar `workspace_id` ni `user_id` desde frontend
- Resolver `workspace_id` desde la sesion / membership activo

> Aunque hoy el flujo sea workspace personal 1:1, el modulo debe quedar listo para SaaS multiusuario.

## 2. Contrato de recurso alineado con `/app/bootstrap`
- Recomendado: que `TaskResource` use el mismo shape base de `bootstrap.tasks[]`
- Esto reduce adapters en frontend y evita duplicar contratos

Campos esperados en response:
- `id`
- `title`
- `color_tag`
- `icon_tag`
- `target_duration_seconds`
- `alarm_time_local`
- `sort_order`
- `focus_time_total_seconds`
- `focus_sessions_count`

## 3. Duracion objetivo y alarma (formatos canonicos)
- `target_duration_seconds`
  - entero en segundos
  - `null` si la tarea no tiene temporizador objetivo
- `alarm_time_local`
  - `time` (hora local de la tarea), formato `HH:mm:ss`
  - `null` si no tiene alarma

## 4. Orden de tareas (`sort_order`)
- `sort_order` define el orden del carrusel
- debe ser unico dentro del workspace (al menos entre tareas activas/no eliminadas)
- al crear tarea nueva:
  - asignar `sort_order = max + 1`

## 5. Eliminacion (soft delete recomendado)
- Recomendado usar `deleted_at` (soft delete)
- Ventajas:
  - evita romper historico (`time_entries` futuros modulos)
  - permite restauracion/admin si se necesita luego
- `GET /tasks` no debe listar tareas eliminadas

## 6. "Descripcion de tarea" NO es requerida por el frontend actual
- El formulario actual de crear/editar tarea **ya no tiene input de descripcion**
- No exigir `details/description` en request
- Si se decide mantener campo legacy:
  - hacerlo opcional
  - ignorarlo o persistirlo sin hacerlo parte del contrato principal

## 7. Enums alineados con frontend actual

### `color_tag` permitidos
- `blue`
- `green`
- `amber`
- `rose`
- `pink`
- `violet`

### `icon_tag` permitidos
- `briefcase`
- `learning`
- `tools`
- `code`
- `book`
- `pen`
- `cart`
- `game`

---

# Endpoints (contrato de integracion)

## 1) `GET /api/v1/tasks`

### Para que sirve
Devuelve la lista de tareas del workspace actual para renderizar el carrusel.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request
- Sin body
- Sin query (MVP)

### Orden recomendado de respuesta
- ordenar por `sort_order ASC`, luego `created_at ASC`

### Response (exito, `200`)

```json
{
  "data": [
    {
      "id": "task_01HXYZ...",
      "title": "Limpieza de correos",
      "color_tag": "green",
      "icon_tag": "pen",
      "target_duration_seconds": 2700,
      "alarm_time_local": "08:00:00",
      "sort_order": 1,
      "focus_time_total_seconds": 4944,
      "focus_sessions_count": 12
    },
    {
      "id": "task_01HXYZ...",
      "title": "Revision de diseno",
      "color_tag": "violet",
      "icon_tag": "learning",
      "target_duration_seconds": 5400,
      "alarm_time_local": "14:00:00",
      "sort_order": 2,
      "focus_time_total_seconds": 0,
      "focus_sessions_count": 0
    }
  ]
}
```

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `500 Internal Server Error`
- error inesperado al consultar tareas
- loguear contexto (`user_id`, `workspace_id`)

---

## 2) `POST /api/v1/tasks`

### Para que sirve
Crea una tarea nueva del workspace actual.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request (JSON)

Ejemplo con temporizador y alarma:
```json
{
  "title": "Limpieza de correos",
  "color_tag": "green",
  "icon_tag": "pen",
  "target_duration_seconds": 2700,
  "alarm_time_local": "08:00:00"
}
```

Ejemplo sin temporizador/alarma:
```json
{
  "title": "Revisar notas",
  "color_tag": "blue",
  "icon_tag": "book",
  "target_duration_seconds": null,
  "alarm_time_local": null
}
```

### Validaciones minimas (sugeridas)
- `title`: required|string|min:1|max:120
- `color_tag`: required|in:blue,green,amber,rose,pink,violet
- `icon_tag`: required|in:briefcase,learning,tools,code,book,pen,cart,game
- `target_duration_seconds`: nullable|integer|min:1|max:86400
- `alarm_time_local`: nullable|date_format:H:i:s

### Reglas de negocio recomendadas
- `title` trim + colapsar espacios repetidos (opcional)
- autocompletar `sort_order = max(sort_order) + 1`
- `focus_time_total_seconds = 0`
- `focus_sessions_count = 0`

### Response (exito, `201`)

```json
{
  "data": {
    "id": "task_01HXYZ...",
    "title": "Limpieza de correos",
    "color_tag": "green",
    "icon_tag": "pen",
    "target_duration_seconds": 2700,
    "alarm_time_local": "08:00:00",
    "sort_order": 4,
    "focus_time_total_seconds": 0,
    "focus_sessions_count": 0
  }
}
```

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `422 Unprocessable Entity` (validacion)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["El titulo es obligatorio."],
    "color_tag": ["El color seleccionado no es valido."]
  }
}
```

#### `500 Internal Server Error`
- error inesperado al crear
- loguear contexto (`user_id`, `workspace_id`, payload_keys`)

---

## 3) `PATCH /api/v1/tasks/{taskId}`

### Para que sirve
Actualiza una tarea existente (update parcial).

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request (PATCH parcial)

Ejemplo:
```json
{
  "title": "Limpieza de correos (AM)",
  "target_duration_seconds": 3000,
  "alarm_time_local": null
}
```

### Validaciones minimas (sugeridas)
- `title`: sometimes|string|min:1|max:120
- `color_tag`: sometimes|in:blue,green,amber,rose,pink,violet
- `icon_tag`: sometimes|in:briefcase,learning,tools,code,book,pen,cart,game
- `target_duration_seconds`: sometimes|nullable|integer|min:1|max:86400
- `alarm_time_local`: sometimes|nullable|date_format:H:i:s

### Regla obligatoria
- Solo actualizar campos presentes en request

### Response (exito, `200`)
```json
{
  "data": {
    "id": "task_01HXYZ...",
    "title": "Limpieza de correos (AM)",
    "color_tag": "green",
    "icon_tag": "pen",
    "target_duration_seconds": 3000,
    "alarm_time_local": null,
    "sort_order": 1,
    "focus_time_total_seconds": 4944,
    "focus_sessions_count": 12
  }
}
```

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `404 Not Found`
- `taskId` no existe o no pertenece al workspace del usuario

#### `422 Unprocessable Entity`
- payload invalido

#### `500 Internal Server Error`
- error inesperado al actualizar

---

## 4) `DELETE /api/v1/tasks/{taskId}`

### Para que sirve
Elimina una tarea del workspace actual (soft delete recomendado).

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request
- Sin body

### Recomendacion de comportamiento
- soft delete (`deleted_at`)
- si mas adelante existe sesion activa con esa tarea (Modulo 5), responder `409` o exigir switch/stop antes de borrar
- en Modulo 4 (sin contador server-authoritative), se puede permitir borrado directo

### Response (exito)

Opcion A (recomendada, mas simple):
- `204 No Content`

Opcion B (aceptable):
```json
{
  "message": "Task deleted."
}
```

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `404 Not Found`
- `taskId` no existe o no pertenece al workspace del usuario

#### `409 Conflict` (opcional / future-proof)
```json
{
  "message": "Task cannot be deleted while it is active.",
  "code": "TASK_ACTIVE"
}
```

#### `500 Internal Server Error`
- error inesperado al eliminar

---

## 5) `POST /api/v1/tasks/reorder`

### Para que sirve
Actualiza el orden visual de las tareas del carrusel en una sola operacion.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request (recomendado)

```json
{
  "ordered_task_ids": [
    "task_01A...",
    "task_01B...",
    "task_01C..."
  ]
}
```

### Regla de negocio (obligatoria)
- `ordered_task_ids` debe contener **todas** las tareas activas del workspace (sin repetir)
- si faltan ids o sobran ids -> `422`

### Alternativa aceptable (si prefieren mas explicita)
```json
{
  "items": [
    { "id": "task_01A...", "sort_order": 1 },
    { "id": "task_01B...", "sort_order": 2 },
    { "id": "task_01C...", "sort_order": 3 }
  ]
}
```

> Para frontend actual, `ordered_task_ids` suele ser mas simple.

### Response (exito, `200`) - recomendado
Devolver lista completa ya ordenada (mismo shape de `GET /tasks`):

```json
{
  "data": [
    {
      "id": "task_01A...",
      "title": "Primera tarea",
      "color_tag": "blue",
      "icon_tag": "briefcase",
      "target_duration_seconds": 1500,
      "alarm_time_local": null,
      "sort_order": 1,
      "focus_time_total_seconds": 0,
      "focus_sessions_count": 0
    }
  ]
}
```

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `422 Unprocessable Entity`
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "ordered_task_ids": ["Debe incluir todas las tareas activas del workspace sin duplicados."]
  }
}
```

#### `500 Internal Server Error`
- error inesperado en reordenamiento (debe hacerse en transaccion)

---

# Impacto en BD respecto al Modulo 3 (que se agrega / que se modifica)

## Estado actual esperado (Modulo 3 ya implementado)
Tablas existentes:
- `users`
- `workspaces`
- `workspace_members`
- `user_preferences`

Tablas que pueden existir ya (si Modulo 2 se implemento con datos reales):
- `tasks`
- `time_entries`
- `active_focus_sessions`

## Tablas que se agregan para Modulo 4
- `tasks` (**obligatoria** si aun no existe)

## Tablas que se modifican para Modulo 4 (si `tasks` ya existe por Modulo 2)
- `tasks` (agregar constraints, soft delete, indices, columnas faltantes)

## Tabla `tasks` (schema minimo recomendado)

```txt
tasks
- id (string/uuid/ulid, pk)
- workspace_id (string/uuid/ulid, fk -> workspaces.id)
- owner_user_id (string/uuid/ulid, fk -> users.id) [opcional pero recomendado]
- title (varchar(120))
- color_tag (varchar(16))                -- enum app-level
- icon_tag (varchar(24))                 -- enum app-level
- target_duration_seconds (integer, nullable)
- alarm_time_local (time, nullable)
- sort_order (integer)
- focus_time_total_seconds (bigint, default 0)
- focus_sessions_count (integer, default 0)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp, nullable)       -- soft delete recomendado
```

### Constraints recomendadas
- `check (target_duration_seconds is null or target_duration_seconds between 1 and 86400)`
- `check (focus_time_total_seconds >= 0)`
- `check (focus_sessions_count >= 0)`

### Unicidad / indices recomendados
- indice: `(workspace_id, deleted_at, sort_order)`
- indice: `(workspace_id, deleted_at)`
- indice: `(owner_user_id, deleted_at)` (si `owner_user_id` existe)
- unicidad recomendada (si soft delete):
  - partial unique index en `(workspace_id, sort_order)` donde `deleted_at is null`

---

## Cambios esperados en `/app/bootstrap` (Modulo 2) despues de M4

No hay cambio breaking de contrato.

Lo que cambia:
- `data.tasks[]` deja de ser mock/seed o lectura parcial y pasa a salir del CRUD real de `tasks`
- `sort_order`, `target_duration_seconds`, `alarm_time_local` deben reflejar lo persistido por M4

---

## Orden de migraciones recomendado (si M4 llega despues de M3)

### Camino A (si `tasks` no existe)
1. crear `tasks`
2. agregar indices / partial unique index

### Camino B (si `tasks` ya existe por M2)
1. `alter table tasks` agregar columnas faltantes (`deleted_at`, contadores, etc.)
2. backfill defaults / normalizacion de `sort_order`
3. agregar constraints e indices
4. validar que `/app/bootstrap` siga respondiendo shape compatible

---

## Implementacion Laravel esperada (entregables del equipo backend)

## Rutas (`routes/api.php`)
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{task}`
- `DELETE /api/v1/tasks/{task}`
- `POST /api/v1/tasks/reorder`

## Controllers
- `TaskController`
  - `index`
  - `store`
  - `update`
  - `destroy`
  - `reorder`

## Form Requests (minimos)
- `StoreTaskRequest`
- `UpdateTaskRequest`
- `ReorderTasksRequest`

## Resource
- `TaskResource`
- (opcional) `TaskCollection`

## Servicios (recomendado)
- `TaskService`
  - create task + assign `sort_order`
  - update parcial
  - soft delete
  - reorder en transaccion

## Policies / autorizacion
- `TaskPolicy`
  - validar pertenencia a `workspace_id` del usuario

## Notas de implementacion recomendadas
- usar `DB::transaction()` en `reorder`
- usar route model binding con scoping manual por workspace (no por id global a secas)
- normalizar `title` (`trim`) en request/service

---

## Pruebas minimas (Feature tests)

## `GET /tasks`
- devuelve solo tareas del workspace del usuario autenticado
- ordenadas por `sort_order`
- no devuelve soft deleted
- responde `401` sin sesion

## `POST /tasks`
- crea tarea con payload valido
- asigna `sort_order` al final
- valida enums y formatos
- responde `422` con payload invalido

## `PATCH /tasks/{id}`
- update parcial funciona
- no pisa campos omitidos
- responde `404` si no pertenece al workspace

## `DELETE /tasks/{id}`
- soft delete de tarea
- ya no aparece en `GET /tasks`
- responde `404` si no pertenece al workspace

## `POST /tasks/reorder`
- actualiza orden completo correctamente
- valida que no falten ids / no haya duplicados
- responde `422` si request inconsistente
- ejecuta en transaccion

---

## Criterios de aceptacion (Modulo 4)

- [ ] Frontend puede crear tareas y verlas persistidas tras recargar `/app`
- [ ] Frontend puede editar titulo, color, icono, duracion y alarma
- [ ] Frontend puede eliminar tareas sin romper `/app/bootstrap`
- [ ] El orden del carrusel se persiste (`sort_order`)
- [ ] `GET /api/v1/tasks` y `bootstrap.tasks[]` usan el mismo shape compatible
- [ ] Endpoints estan protegidos con `auth:sanctum`
- [ ] Scoping por `workspace_id` aplicado (sin fuga entre usuarios/workspaces)
- [ ] Validaciones retornan `422` con shape estandar Laravel

---

## Nota para el equipo backend

Este modulo prepara la base del carrusel de tareas, pero **no** convierte aun el contador en server-authoritative.

En el siguiente modulo (Modulo 5):
- `active_focus_session` pasara a ser la fuente de verdad del contador
- `tasks` se integrara con los comandos `start/pause/resume/switch-task/stop`

