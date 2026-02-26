# Velor Frontend - Integracion Modulo 4 (Tasks / Task Carousel CRUD) - Handoff

## Objetivo

Integrar el frontend SPA con persistencia de tareas del carrusel principal usando endpoints dedicados:

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{taskId}`
- `DELETE /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks/reorder`

Este modulo permite que el frontend deje de manejar el carrusel de tareas solo en estado local y lo sincronice con backend.

---

## Estado actual del backend (M4 implementado)

## Endpoints relevantes

### Modulo 1 (Auth) - sin cambios breaking

Se mantienen sin cambios de contrato:

- `GET /sanctum/csrf-cookie`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/google/redirect`
- `GET /api/v1/auth/google/callback`

### Modulo 2 (`/app/bootstrap`) - sin cambios breaking

- `GET /api/v1/app/bootstrap`

### Modulo 3 (Preferences) - sin cambios breaking

- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences`

### Modulo 4 (nuevo)

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{taskId}`
- `DELETE /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks/reorder`

Todos protegidos con `auth:sanctum`.

---

## Cambio recomendado en flujo frontend (respecto a Modulo 2 y 3)

## Antes (M2/M3)

El frontend podia hidratar tareas desde:

- `GET /api/v1/app/bootstrap`

pero el CRUD/reordenamiento del carrusel no tenia endpoints dedicados persistentes.

## Ahora (M4)

El frontend debe:

1. seguir usando `GET /api/v1/app/bootstrap` para hidratacion inicial de `/app`
2. usar endpoints `/api/v1/tasks*` para:
   - crear
   - editar
   - eliminar
   - reordenar
3. actualizar el store local con la respuesta de cada endpoint (sin necesidad de refetch completo inmediato)

### Recomendacion practica

Usar `/app/bootstrap` como fuente inicial y `/tasks` como fuente de mutaciones del carrusel.

---

## Contrato real implementado (shape de task)

El backend devuelve el mismo shape de tarea en:

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{id}`
- `POST /api/v1/tasks/reorder`
- `data.tasks[]` de `/api/v1/app/bootstrap`

### Shape

```json
{
  "id": "uuid",
  "title": "Limpieza de correos",
  "color_tag": "green",
  "icon_tag": "pen",
  "target_duration_seconds": 2700,
  "alarm_time_local": "08:00:00",
  "sort_order": 1,
  "focus_time_total_seconds": 4944,
  "focus_sessions_count": 12
}
```

### `color_tag` permitidos

- `blue`
- `green`
- `amber`
- `rose`
- `pink`
- `violet`

### `icon_tag` permitidos (frontend-facing)

- `briefcase`
- `learning`
- `tools`
- `code`
- `book`
- `pen`
- `cart`
- `game`

### Nota importante (compatibilidad real)

El backend ya mapea internamente estos `icon_tag` a valores legacy de BD, pero la API:

- recibe los tags del frontend (arriba)
- responde los mismos tags del frontend

No necesitas adapters extra en frontend.

---

## `GET /api/v1/tasks`

## Para que sirve

Lista las tareas activas del carrusel del usuario autenticado (workspace actual).

## Auth

- Requiere cookie de sesion (Sanctum)
- Sin sesion -> `401`

## Request

- sin body
- sin query (MVP)

## Orden de respuesta (implementacion real)

- `sort_order ASC`
- `created_at ASC` (fallback)

## Response (`200`)

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Primera tarea",
      "color_tag": "blue",
      "icon_tag": "briefcase",
      "target_duration_seconds": null,
      "alarm_time_local": null,
      "sort_order": 1,
      "focus_time_total_seconds": 0,
      "focus_sessions_count": 0
    }
  ]
}
```

## Comportamiento importante

- no devuelve tareas soft deleted
- no devuelve tareas archivadas (`is_archived = true`)
- scoping por workspace del usuario autenticado (sin enviar `workspace_id`)

---

## `POST /api/v1/tasks`

## Para que sirve

Crea una nueva tarea del carrusel.

## Auth + CSRF

- Requiere sesion (Sanctum)
- Requiere flujo CSRF para mutaciones (`/sanctum/csrf-cookie`) igual que Modulo 1/3

## Request

```json
{
  "title": "Limpieza de correos",
  "color_tag": "green",
  "icon_tag": "pen",
  "target_duration_seconds": 2700,
  "alarm_time_local": "08:00:00"
}
```

Tambien acepta:

- `target_duration_seconds: null`
- `alarm_time_local: null`

## Response (`201`)

Devuelve el objeto completo de la tarea creada (mismo shape).

## Comportamiento importante (implementacion real)

- `title` se normaliza (`trim` + colapsa espacios repetidos)
- `sort_order` se asigna automaticamente al final (`max + 1`)
- `focus_time_total_seconds = 0`
- `focus_sessions_count = 0`

---

## `PATCH /api/v1/tasks/{taskId}`

## Para que sirve

Actualiza una tarea existente de forma parcial.

## Auth + CSRF

- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

## Request (PATCH parcial)

```json
{
  "title": "Limpieza de correos (AM)",
  "target_duration_seconds": 3000,
  "alarm_time_local": null
}
```

## Response (`200`)

Devuelve el objeto completo de la tarea actualizada (mismo shape).

## Comportamiento importante

- solo actualiza campos presentes en request
- campos omitidos se conservan
- responde `404` si el `taskId` no existe o no pertenece al workspace del usuario

---

## `DELETE /api/v1/tasks/{taskId}`

## Para que sirve

Elimina una tarea del carrusel (soft delete).

## Auth + CSRF

- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

## Response (implementacion real)

- `204 No Content`

## Comportamiento importante

- hace soft delete (`deleted_at`)
- luego esa tarea ya no aparece en `GET /tasks`
- responde `404` si no pertenece al workspace del usuario

---

## `POST /api/v1/tasks/reorder`

## Para que sirve

Persistir el orden visual del carrusel en una sola operacion.

## Auth + CSRF

- Requiere sesion (Sanctum)
- Requiere CSRF (mutacion)

## Request (implementado)

```json
{
  "ordered_task_ids": [
    "uuid-task-3",
    "uuid-task-1",
    "uuid-task-2"
  ]
}
```

## Regla de negocio (implementacion real)

`ordered_task_ids` debe incluir exactamente todas las tareas activas del workspace:

- sin ids faltantes
- sin ids extra
- sin duplicados

Si no cumple, responde `422`.

## Response (`200`)

Devuelve la lista completa de tareas ya ordenadas (mismo shape de `GET /tasks`).

---

## Validaciones y errores (M4)

## Validaciones activas (backend)

### Crear (`POST /tasks`)

- `title`: `required|string|min:1|max:120`
- `color_tag`: enum permitido
- `icon_tag`: enum permitido (frontend-facing)
- `target_duration_seconds`: `nullable|integer|min:1|max:86400`
- `alarm_time_local`: `nullable|date_format:H:i:s`

### Actualizar (`PATCH /tasks/{id}`)

- mismas validaciones pero con `sometimes`
- update parcial real

### Reordenar (`POST /tasks/reorder`)

- `ordered_task_ids`: array requerido
- cada item: `uuid`, `distinct`
- validacion adicional de negocio (set exacto de tareas activas)

## `401 Unauthorized`

```json
{
  "message": "Unauthenticated."
}
```

## `404 Not Found`

Para `PATCH/DELETE` cuando la tarea:

- no existe
- no pertenece al workspace del usuario autenticado

## `422 Unprocessable Entity`

Shape estandar Laravel:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["..."],
    "ordered_task_ids": ["..."]
  }
}
```

### Nota para frontend

- no dependan del texto exacto del mensaje
- mapear por `errors.<field>` y mostrar copy propio si hace falta

## `500 Internal Server Error`

- error inesperado de persistencia
- mostrar error recuperable y permitir reintento

---

## Cambios / aclaraciones respecto al handoff original de Modulo 4

## 1) No hubo cambios breaking en `/app/bootstrap`

- `data.tasks[]` mantiene el mismo shape
- ahora refleja el CRUD real de `tasks`

## 2) `icon_tag` del frontend ya esta soportado aunque la BD tenga enum legacy

Implementacion real:

- API usa tags del frontend (`learning`, `tools`, `book`, `cart`, `game`, etc.)
- backend mapea internamente a valores legacy de BD y de vuelta a API

## 3) `DELETE /tasks/{id}` responde `204`

No body de respuesta. El frontend debe remover la task del store localmente.

## 4) `reorder` devuelve la lista completa ya ordenada

No necesitas recalcular `sort_order` en frontend si usas la respuesta del backend.

## 5) `title` se normaliza en backend

Si el usuario envia espacios repetidos:

- backend los colapsa
- la respuesta puede volver con `title` normalizado

---

## Integracion frontend recomendada (M4)

## Tipos TS sugeridos

```ts
export type TaskColorTag =
  | 'blue'
  | 'green'
  | 'amber'
  | 'rose'
  | 'pink'
  | 'violet';

export type TaskIconTag =
  | 'briefcase'
  | 'learning'
  | 'tools'
  | 'code'
  | 'book'
  | 'pen'
  | 'cart'
  | 'game';

export type Task = {
  id: string;
  title: string;
  color_tag: TaskColorTag;
  icon_tag: TaskIconTag;
  target_duration_seconds: number | null;
  alarm_time_local: string | null; // HH:mm:ss
  sort_order: number;
  focus_time_total_seconds: number;
  focus_sessions_count: number;
};

export type TasksListResponse = { data: Task[] };
export type TaskResponse = { data: Task };

export type CreateTaskPayload = {
  title: string;
  color_tag: TaskColorTag;
  icon_tag: TaskIconTag;
  target_duration_seconds: number | null;
  alarm_time_local: string | null;
};

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export type ReorderTasksPayload = {
  ordered_task_ids: string[];
};
```

---

## API helpers (fetch)

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function getTasks(): Promise<Task[] | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401) return null;

  const json = (await res.json()) as TasksListResponse;
  if (!res.ok) throw json;
  return json.data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) return null;

  const json = await res.json();
  if (!res.ok) throw json;
  return (json as TaskResponse).data;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<Task | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) return null;

  const json = await res.json();
  if (!res.ok) throw json;
  return (json as TaskResponse).data;
}

export async function deleteTask(taskId: string): Promise<'deleted' | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401) return null;
  if (res.status === 204) return 'deleted';

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // no-op
  }

  if (!res.ok) throw json;
  return 'deleted';
}

export async function reorderTasks(taskIdsInOrder: string[]): Promise<Task[] | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/reorder`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ordered_task_ids: taskIdsInOrder }),
  });

  if (res.status === 401) return null;

  const json = await res.json();
  if (!res.ok) throw json;
  return (json as TasksListResponse).data;
}
```

## Recordatorio CSRF (mutaciones)

Antes del primer `POST/PATCH/DELETE` de la sesion:

```ts
await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
  method: 'GET',
  credentials: 'include',
});
```

---

## Integracion con store global (recomendada)

## Patron recomendado

1. Hidratar `tasks` inicialmente desde `GET /api/v1/app/bootstrap`
2. Crear tarea:
   - `POST /api/v1/tasks`
   - insertar/reemplazar en store usando respuesta
3. Editar tarea:
   - `PATCH /api/v1/tasks/{id}`
   - reemplazar item en store por `id`
4. Eliminar tarea:
   - `DELETE /api/v1/tasks/{id}` (`204`)
   - remover item del store local
5. Reordenar carrusel:
   - actualizar orden visual local (optimista, opcional)
   - `POST /api/v1/tasks/reorder`
   - reemplazar lista de tasks con la respuesta ordenada del backend

## Recomendacion para drag-and-drop

Para evitar desalineacion de `sort_order`:

- usar la respuesta de `reorder` como fuente de verdad final

---

## Integracion con `/app/bootstrap` (M2)

Despues de cualquier mutacion de tasks, `/api/v1/app/bootstrap` reflejara:

- altas
- ediciones
- borrados (ya no listadas)
- reordenamiento (`sort_order`)

No es obligatorio refetchear bootstrap despues de cada cambio si actualizas bien el store con respuestas de `/tasks`.

---

## Manejo de errores frontend (M4)

## `401`

- Sesion expirada
- redirigir a `/login`

## `404` (PATCH/DELETE)

- la tarea ya no existe o no pertenece al workspace del usuario
- UX recomendada:
  - remover del UI si aplica
  - mostrar toast breve y refrescar lista si queda inconsistente

## `422`

- errores de formulario (title, color, icon, duracion, alarma)
- errores de `reorder` (ids faltantes/duplicados)

## `500`

- mostrar error recuperable
- permitir reintento

---

## Checklist de integracion (frontend) - Modulo 4

- [ ] El frontend sigue usando `/app/bootstrap` para hidratacion inicial de `/app`
- [ ] El carrusel usa `/api/v1/tasks` para CRUD y reorder
- [ ] Requests usan `credentials: 'include'`
- [ ] Se asegura CSRF antes de mutaciones (`/sanctum/csrf-cookie`)
- [ ] UI usa `icon_tag` y `color_tag` del contrato frontend (sin adapters extras)
- [ ] UI soporta `target_duration_seconds` y `alarm_time_local` en `null`
- [ ] `DELETE` maneja `204 No Content`
- [ ] Reorder envia `ordered_task_ids` con todas las tareas activas
- [ ] Tras reorder, el store reemplaza la lista con la respuesta del backend
- [ ] Manejo de `404` en edicion/eliminacion de tareas ya borradas/no accesibles

---

## Nota para el equipo frontend

Con Modulo 4, el carrusel de tareas ya puede ser totalmente persistente sin depender de estado local como fuente de verdad.

La recomendacion es:

- bootstrap para carga inicial del dashboard
- endpoints `/tasks` para mutaciones de UI del carrusel
- usar la respuesta del backend para consolidar estado y `sort_order`

