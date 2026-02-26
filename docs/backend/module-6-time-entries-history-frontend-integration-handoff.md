# Velor Frontend - Integracion Modulo 6 (Time Entries + History / Daily Log) - Handoff

## Objetivo

Integrar el frontend SPA con el historial persistido en backend (`time_entries`) para alimentar:

- `Daily Log` en `/app`
- `Settings & History` (overview, lista de dias, detalle por dia)
- creacion manual de bloques (`manual_adjustment` y `untracked`)

Con M6:

- backend = fuente de verdad del historial
- frontend ya no consolida historial final en local

---

## Estado actual del backend (M6 implementado)

## Endpoints relevantes

### Modulo 1 (Auth) - sin cambios breaking

- `GET /sanctum/csrf-cookie`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/google/redirect`
- `GET /api/v1/auth/google/callback`

### Modulo 2 (`/app/bootstrap`) - sin cambios breaking de shape

- `GET /api/v1/app/bootstrap`

### Modulo 3 (Preferences) - sin cambios breaking

- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences`

### Modulo 4 (Tasks) - sin cambios breaking

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{taskId}`
- `DELETE /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks/reorder`

### Modulo 5 (Focus Sessions) - compatible, con extension de response

- `GET /api/v1/focus-sessions/active`
- `POST /api/v1/focus-sessions/start`
- `POST /api/v1/focus-sessions/pause`
- `POST /api/v1/focus-sessions/resume`
- `POST /api/v1/focus-sessions/switch-task`
- `POST /api/v1/focus-sessions/stop`
- `POST /api/v1/focus-sessions/heartbeat`

### Modulo 6 (nuevo)

- `POST /api/v1/time-entries`
- `GET /api/v1/history/overview`
- `GET /api/v1/history/days`
- `GET /api/v1/history/days/{date}`

Todos protegidos con `auth:sanctum`.

---

## Cambios de flujo frontend (respecto a M5)

## 1. `daily_log` y `dashboard_stats` ahora vienen de `time_entries`

`/api/v1/app/bootstrap` mantiene el mismo contrato, pero internamente:

- `daily_log.entries` sale de `time_entries`
- `daily_log.tracked_seconds/untracked_seconds` salen de `time_entries`
- `dashboard_stats.tracked_seconds_today/untracked_seconds_today/tracked_sessions_count_today` salen de `time_entries`

## 2. `focus-sessions/stop` y `switch-task` ahora pueden devolver `created_time_entry_id`

No rompe el contrato M5. Es un campo adicional:

- en `stop`: cuando se persistio el bloque final (`elapsed_seconds_final > 0`)
- en `switch-task`: cuando se persistio el bloque saliente (`elapsed > 0`)

Esto permite invalidar/refetch de historial con mayor precision.

## 3. `Settings & History` ya no debe depender de logs locales

El frontend debe consumir:

- `history/overview`
- `history/days`
- `history/days/{date}`

para cualquier dato de historial mostrado en UI.

---

## Contrato real implementado (M6)

## `POST /api/v1/time-entries`

## Para que sirve

Crear bloques manuales:

- `manual_adjustment`
- `untracked`

`focus` sigue siendo generado automaticamente desde focus sessions.

## Auth + CSRF

- Requiere sesion (Sanctum)
- Requiere CSRF (`POST`)

## Request (manual_adjustment)

```json
{
  "entry_type": "manual_adjustment",
  "task_id": "uuid-task",
  "started_at_utc": "2026-03-03T14:00:00Z",
  "ended_at_utc": "2026-03-03T14:12:42Z",
  "notes": "Ajuste manual"
}
```

## Request (untracked)

```json
{
  "entry_type": "untracked",
  "task_id": null,
  "started_at_utc": "2026-03-03T14:12:42Z",
  "ended_at_utc": "2026-03-03T14:20:00Z",
  "notes": null
}
```

## Validaciones reales

- `entry_type`: `manual_adjustment | untracked`
- `task_id`: `uuid | null`
- `started_at_utc`: `date`
- `ended_at_utc`: `date` y `after:started_at_utc`
- `notes`: `string | null`, max `2000`
- regla extra: si `entry_type = untracked`, `task_id` debe ser `null`

## Response (`201`)

Nota: el backend devuelve un resumen corto (no devuelve `notes/source`).

```json
{
  "data": {
    "id": "uuid-time-entry",
    "entry_type": "manual_adjustment",
    "task_id": "uuid-task",
    "duration_seconds": 762,
    "started_at_utc": "2026-03-03T14:00:00Z",
    "ended_at_utc": "2026-03-03T14:12:42Z"
  }
}
```

## Errores esperados

- `401` sin sesion
- `404` si `task_id` no existe o no pertenece al workspace/usuario
- `422` validacion

---

## `GET /api/v1/history/overview`

## Query

- `date=YYYY-MM-DD` (opcional)
- si no se envia, backend usa "hoy" segun timezone efectivo del usuario

## Response real

```json
{
  "data": {
    "date_local": "2026-03-03",
    "server_now_utc": "2026-03-03T18:25:10Z",
    "tracked_seconds": 7200,
    "untracked_seconds": 600,
    "tracked_sessions_count": 3,
    "avg_session_seconds": 2400,
    "top_task": {
      "task_id": "uuid-task-a",
      "title": "Redaccion de reporte Q3",
      "color_tag": "blue",
      "icon_tag": "briefcase",
      "tracked_seconds": 5400,
      "sessions_count": 2
    },
    "time_by_task": [
      {
        "task_id": "uuid-task-a",
        "title": "Redaccion de reporte Q3",
        "color_tag": "blue",
        "icon_tag": "briefcase",
        "tracked_seconds": 5400,
        "sessions_count": 2
      },
      {
        "task_id": "uuid-task-b",
        "title": "Revision de diseno",
        "color_tag": "violet",
        "icon_tag": "learning",
        "tracked_seconds": 1800,
        "sessions_count": 1
      },
      {
        "task_id": null,
        "title": "Untracked Time",
        "color_tag": null,
        "icon_tag": null,
        "tracked_seconds": 600,
        "sessions_count": 1
      }
    ]
  }
}
```

## Aclaracion importante (`time_by_task`)

El backend usa el campo `tracked_seconds` tambien para la fila de `untracked` (`task_id = null`).  
No renombrar en frontend; consumirlo tal cual.

## Errores esperados

- `401`
- `422` fecha invalida

---

## `GET /api/v1/history/days`

## Query (implementado)

- `q` (opcional)
- `task_id` (opcional)
- `date_from` (`YYYY-MM-DD`, opcional)
- `date_to` (`YYYY-MM-DD`, opcional)
- `page` (opcional, default `1`)
- `per_page` (opcional, default `20`, max `100`)

## Response real

```json
{
  "data": [
    {
      "date_local": "2026-03-04",
      "tracked_seconds": 1800,
      "untracked_seconds": 0,
      "tracked_sessions_count": 1,
      "task_types_count": 1,
      "matched_tasks": [
        {
          "task_id": "uuid-task-q3",
          "title": "Reporte Q3",
          "color_tag": "green",
          "icon_tag": "pen"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 1,
    "total": 1,
    "last_page": 1
  }
}
```

## Comportamiento real (para frontend)

- `matched_tasks` normalmente viene `[]` si no envias `q`
- `q` filtra por fecha local y/o titulos snapshot de tarea
- `task_id` filtra dias que contienen entries de esa tarea

## Errores esperados

- `401`
- `422` (`date_from > date_to`, fecha invalida, `per_page > 100`, etc.)

---

## `GET /api/v1/history/days/{date}`

## Path/query

- path: `{date}` = `YYYY-MM-DD`
- query opcional: `sort=asc|desc` (default `asc`)

## Response real

```json
{
  "data": {
    "date_local": "2026-03-03",
    "server_now_utc": "2026-03-03T18:25:10Z",
    "tracked_seconds": 2700,
    "untracked_seconds": 600,
    "tracked_sessions_count": 1,
    "entries": [
      {
        "id": "uuid-entry",
        "entry_type": "focus",
        "task_id": "uuid-task",
        "task_title": "Limpieza de correos",
        "task_color_tag": "green",
        "task_icon_tag": "learning",
        "started_at_utc": "2026-03-03T13:00:00Z",
        "ended_at_utc": "2026-03-03T13:45:00Z",
        "duration_seconds": 2700,
        "started_at_local_label": "8:00:00 a. m."
      }
    ]
  }
}
```

## Comportamiento real

- `200` con `entries: []` si no hay data (no `404`)
- `entries` usa el mismo shape de `daily_log.entries` de `/app/bootstrap`
- `task_icon_tag` ya viene en formato frontend (`learning`, `tools`, `book`, etc.)

## Errores esperados

- `401`
- `422` fecha/path invalido o sort invalido

---

## Cambios concretos en contratos existentes (M5 / M2)

## `POST /api/v1/focus-sessions/stop` (M5 -> M6)

Sigue devolviendo el envelope M5, pero puede incluir:

- `created_time_entry_id: string`

Ejemplo:

```json
{
  "data": {
    "server_now_utc": "2026-03-03T15:00:00Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "uuid-task",
      "timer_mode": "stopwatch",
      "elapsed_seconds_final": 310,
      "target_seconds": null,
      "stopped_reason": "user_stop"
    },
    "created_time_entry_id": "uuid-time-entry"
  }
}
```

## `POST /api/v1/focus-sessions/switch-task` (M5 -> M6)

Sigue devolviendo el snapshot de sesion activa, pero puede incluir:

- `created_time_entry_id: string`

si se persistio el bloque saliente.

## `GET /api/v1/app/bootstrap` (M2 -> M6)

Sin cambios de shape. Cambia la fuente de datos:

- `daily_log` ahora refleja `time_entries` reales
- `dashboard_stats` ahora refleja `time_entries` reales
- `tasks.focus_time_total_seconds` y `tasks.focus_sessions_count` se actualizan cuando se persisten bloques de foco (`stop/switch-task`)

---

## Tipos TS sugeridos (M6)

```ts
export type HistoryTaskRow = {
  task_id: string | null;
  title: string | null;
  color_tag: string | null;
  icon_tag: string | null;
  tracked_seconds: number;
  sessions_count: number;
};

export type HistoryOverview = {
  date_local: string;
  server_now_utc: string;
  tracked_seconds: number;
  untracked_seconds: number;
  tracked_sessions_count: number;
  avg_session_seconds: number;
  top_task: HistoryTaskRow | null;
  time_by_task: HistoryTaskRow[];
};

export type HistoryMatchedTask = {
  task_id: string;
  title: string;
  color_tag: string | null;
  icon_tag: string | null;
};

export type HistoryDayRow = {
  date_local: string;
  tracked_seconds: number;
  untracked_seconds: number;
  tracked_sessions_count: number;
  task_types_count: number;
  matched_tasks: HistoryMatchedTask[];
};

export type HistoryDaysResponse = {
  data: HistoryDayRow[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export type DailyLogEntry = {
  id: string;
  entry_type: 'focus' | 'untracked' | 'manual_adjustment';
  task_id: string | null;
  task_title: string | null;
  task_color_tag: string | null;
  task_icon_tag: string | null;
  started_at_utc: string | null;
  ended_at_utc: string | null;
  duration_seconds: number;
  started_at_local_label: string | null;
};

export type HistoryDayDetail = {
  date_local: string;
  server_now_utc: string;
  tracked_seconds: number;
  untracked_seconds: number;
  tracked_sessions_count: number;
  entries: DailyLogEntry[];
};

export type CreateTimeEntryPayload = {
  entry_type: 'manual_adjustment' | 'untracked';
  task_id: string | null;
  started_at_utc: string; // ISO UTC
  ended_at_utc: string;   // ISO UTC
  notes?: string | null;
};

export type TimeEntryCreated = {
  id: string;
  entry_type: 'manual_adjustment' | 'untracked' | 'focus';
  task_id: string | null;
  duration_seconds: number;
  started_at_utc: string | null;
  ended_at_utc: string | null;
};
```

## Extension util en Focus Sessions (M6)

```ts
export type FocusSessionStateResponse = {
  data: {
    server_now_utc: string;
    active_focus_session: ActiveFocusSession | null;
    stopped_session_summary?: {
      task_id: string | null;
      timer_mode: 'timer' | 'stopwatch' | null;
      elapsed_seconds_final: number;
      target_seconds: number | null;
      stopped_reason: string | null;
    } | null;
    created_time_entry_id?: string;
  };
};
```

---

## Helpers `fetch` recomendados (M6)

## Base helper

```ts
async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error((body && body.message) || `HTTP ${res.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body as T;
}
```

## Time Entries

```ts
export async function createTimeEntry(payload: CreateTimeEntryPayload) {
  return apiFetch<{ data: TimeEntryCreated }>('/api/v1/time-entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
```

## History

```ts
export async function getHistoryOverview(date?: string) {
  const qs = new URLSearchParams();
  if (date) qs.set('date', date);

  return apiFetch<{ data: HistoryOverview }>(
    `/api/v1/history/overview${qs.toString() ? `?${qs}` : ''}`,
  );
}

export async function getHistoryDays(params: {
  q?: string;
  task_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}` !== '') qs.set(k, String(v));
  }

  return apiFetch<HistoryDaysResponse>(`/api/v1/history/days?${qs.toString()}`);
}

export async function getHistoryDayDetail(dateLocal: string, sort: 'asc' | 'desc' = 'asc') {
  const qs = new URLSearchParams({ sort });
  return apiFetch<{ data: HistoryDayDetail }>(`/api/v1/history/days/${dateLocal}?${qs}`);
}
```

---

## Flujo recomendado de integracion frontend

## `/app` (Dashboard / Daily Log)

1. cargar `GET /api/v1/app/bootstrap` al entrar a `/app`
2. renderizar `daily_log` y `dashboard_stats` desde bootstrap (ya persistidos en backend)
3. al hacer `focus-sessions/stop`:
   - usar `stopped_session_summary` para UX inmediata
   - si llega `created_time_entry_id`, invalidar/refetch `bootstrap` (o patch local + re-sync)
4. al hacer `focus-sessions/switch-task`:
   - si llega `created_time_entry_id`, invalidar/refetch `bootstrap` (recomendado)

## `Settings & History`

Recomendacion simple:

1. `GET /api/v1/history/overview?date=<seleccionada>`
2. `GET /api/v1/history/days` con filtros actuales
3. al abrir detalle:
   - `GET /api/v1/history/days/{date}`

## Crear ajuste manual / untracked

1. asegurarse de tener CSRF (`/sanctum/csrf-cookie`) si aun no se obtuvo
2. `POST /api/v1/time-entries`
3. al exito:
   - invalidar/refetch `history/overview`
   - invalidar/refetch `history/days`
   - si la fecha afectada es hoy local, invalidar/refetch `/app/bootstrap`

---

## Manejo de errores (frontend)

## `401 Unauthorized`

- sesion expirada o no autenticado
- redirigir a login / refrescar estado auth

## `422 Unprocessable Entity`

Casos comunes M6:

- `time-entries`: fechas invalidas, `ended_at_utc <= started_at_utc`, `task_id` invalido para `untracked`
- `history/overview`: `date` invalida
- `history/days`: `date_from/date_to` invalidas, rango invalido, `per_page > 100`
- `history/days/{date}`: path fecha invalido o `sort` invalido

Usar `errors[field]` del body Laravel para mostrar feedback.

## `404 Not Found`

- `POST /time-entries` cuando `task_id` no existe/no es accesible

## `409 Conflict` (focus sessions, no history)

Sigue aplicando el manejo de M5 (`VERSION_MISMATCH`, etc.) con re-sync del snapshot.

---

## Aclaraciones importantes (implementacion real)

## 1. `task_icon_tag` en historial/daily log ya viene normalizado para frontend

Backend convierte valores legacy de BD a tags de API:

- `graduation-cap -> learning`
- `screwdriver-wrench -> tools`
- `book-open -> book`
- `cart-shopping -> cart`
- `gamepad -> game`

## 2. `history/days/{date}` devuelve `200` con lista vacia

No asumir `404` cuando un dia no tiene entries.

## 3. `POST /time-entries` devuelve resumen corto

Si el modal/form necesita mostrar `notes` o metadata post-creacion, usar estado local o refrescar detalle/lista.

## 4. `source` de `time_entries` no se expone en API M6

La UI no depende de `source` en este modulo.

---

## Checklist de integracion frontend (M6)

- [ ] Consumir `history/overview` para el panel superior de Settings & History
- [ ] Consumir `history/days` con filtros/paginacion
- [ ] Consumir `history/days/{date}` para el detalle/overlay del dia
- [ ] Implementar `POST /time-entries` (manual_adjustment / untracked)
- [ ] Invalidar/refetch historial y bootstrap tras crear entry manual
- [ ] Manejar extension `created_time_entry_id` en `focus-sessions/stop` y `switch-task`
- [ ] Dejar de depender de historial local para Daily Log / History
- [ ] Mantener manejo de `409` de M5 sin cambios

