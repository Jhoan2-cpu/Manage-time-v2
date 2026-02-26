# Velor Frontend - Integracion Modulo 5 (Focus Sessions / Contador server-authoritative) - Handoff

## Objetivo

Integrar el frontend SPA con el runtime del contador server-authoritative usando endpoints HTTP para controlar la sesion activa:

- `GET /api/v1/focus-sessions/active`
- `POST /api/v1/focus-sessions/start`
- `POST /api/v1/focus-sessions/pause`
- `POST /api/v1/focus-sessions/resume`
- `POST /api/v1/focus-sessions/switch-task`
- `POST /api/v1/focus-sessions/stop`
- `POST /api/v1/focus-sessions/heartbeat`

Con este modulo:

- backend = fuente de verdad del contador
- frontend = renderer del estado + emisor de comandos

---

## Estado actual del backend (M5 implementado)

## Endpoints relevantes

### Modulo 1 (Auth) - sin cambios breaking

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

### Modulo 4 (Tasks) - sin cambios breaking

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{taskId}`
- `DELETE /api/v1/tasks/{taskId}`
- `POST /api/v1/tasks/reorder`

### Modulo 5 (nuevo)

- `GET /api/v1/focus-sessions/active`
- `POST /api/v1/focus-sessions/start`
- `POST /api/v1/focus-sessions/pause`
- `POST /api/v1/focus-sessions/resume`
- `POST /api/v1/focus-sessions/switch-task`
- `POST /api/v1/focus-sessions/stop`
- `POST /api/v1/focus-sessions/heartbeat`

Todos protegidos con `auth:sanctum`.

---

## Cambio recomendado en flujo frontend (respecto a Modulo 4)

## Antes (M4)

El frontend podia renderizar:

- `tasks`
- `preferences`
- `daily_log`
- `stats`

desde `/app/bootstrap`, pero el contador era principalmente local.

## Ahora (M5)

El contador debe funcionar asi:

1. hidratar `/app` con `GET /api/v1/app/bootstrap`
2. usar `data.server_now_utc` + `data.active_focus_session` para iniciar render del contador
3. enviar comandos por HTTP (`start/pause/resume/switch-task/stop`)
4. reemplazar el snapshot local con la respuesta del backend en cada comando
5. manejar `409` (conflictos/version mismatch) re-sincronizando con el snapshot incluido

### Importante

El frontend ya no decide el tiempo final acumulado. Solo lo calcula visualmente a partir del snapshot server-authoritative.

---

## Contrato real implementado (M5)

## Envelope de exito (implementado)

Todos los endpoints M5 responden con este envelope en exito:

```json
{
  "data": {
    "server_now_utc": "2026-03-01T14:32:10Z",
    "active_focus_session": { "...": "..." }
  }
}
```

### Caso `stop`

`stop` devuelve:

- `active_focus_session: null`
- `stopped_session_summary`

```json
{
  "data": {
    "server_now_utc": "2026-03-01T14:49:12Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "uuid",
      "timer_mode": "stopwatch",
      "elapsed_seconds_final": 264,
      "target_seconds": null,
      "stopped_reason": "user_stop"
    }
  }
}
```

## Shape de `active_focus_session` (real, compartido con `/app/bootstrap`)

```json
{
  "id": "uuid",
  "task_id": "uuid",
  "timer_mode": "timer",
  "session_state": "running",
  "target_seconds": 2700,
  "started_at_utc": "2026-03-01T14:32:10Z",
  "last_resumed_at_utc": "2026-03-01T14:32:10Z",
  "last_paused_at_utc": null,
  "elapsed_seconds_total": 0,
  "version": 1
}
```

### `timer_mode`

- `timer`
- `stopwatch`

### `session_state`

- `running`
- `paused`

---

## Regla clave: como renderizar el contador en frontend

El backend entrega:

- `elapsed_seconds_total` (acumulado confirmado)
- timestamps UTC
- `server_now_utc`

El frontend debe calcular el tiempo visible (`display_elapsed`) asi:

## Si `session_state = paused`

```txt
display_elapsed = elapsed_seconds_total
```

## Si `session_state = running`

```txt
display_elapsed = elapsed_seconds_total + (server_now_actual - last_resumed_at_utc)
```

Donde `server_now_actual` no debe ser `Date.now()` directo, sino una aproximacion usando offset con `server_now_utc`.

## Helper TS recomendado (offset de reloj)

```ts
export function getServerOffsetMs(serverNowUtc: string): number {
  return Date.parse(serverNowUtc) - Date.now();
}

export function computeDisplayElapsedSeconds(
  session: ActiveFocusSession | null,
  serverOffsetMs: number,
): number {
  if (!session) return 0;

  const base = Math.max(0, session.elapsed_seconds_total);

  if (session.session_state !== 'running') return base;
  if (!session.last_resumed_at_utc) return base;

  const currentServerMs = Date.now() + serverOffsetMs;
  const lastResumedMs = Date.parse(session.last_resumed_at_utc);
  const deltaSeconds = Math.max(0, Math.floor((currentServerMs - lastResumedMs) / 1000));

  return base + deltaSeconds;
}
```

---

## Concurrencia y conflictos (`expected_version`)

## Regla general (implementacion real)

Estos endpoints requieren `expected_version`:

- `pause`
- `resume`
- `switch-task`
- `stop`
- `heartbeat`

Si el `expected_version` no coincide con la sesion actual:

- backend responde `409 Conflict`
- `code = "VERSION_MISMATCH"`
- incluye snapshot actualizado en `data`

## Shape de conflicto (real)

```json
{
  "message": "Focus session version mismatch.",
  "code": "VERSION_MISMATCH",
  "data": {
    "server_now_utc": "2026-03-01T14:40:00Z",
    "active_focus_session": {
      "id": "uuid",
      "version": 5
    }
  }
}
```

### Recomendacion frontend (obligatoria)

En `409`:

1. reemplazar snapshot local por `response.data.active_focus_session`
2. actualizar `serverOffsetMs` con `response.data.server_now_utc`
3. re-renderizar contador
4. decidir si reintentar la accion (segun UX)

---

## `GET /api/v1/focus-sessions/active`

## Para que sirve

Sincronizar el estado del contador al abrir `/app`, al volver a focus, o despues de un error.

## Request

- sin body
- sin query

## Response (`200`) sin sesion

```json
{
  "data": {
    "server_now_utc": "2026-03-01T14:32:10Z",
    "active_focus_session": null
  }
}
```

## Response (`200`) con sesion

Mismo envelope + `active_focus_session` completo.

---

## `POST /api/v1/focus-sessions/start`

## Para que sirve

Inicia una nueva sesion activa para una tarea.

## Auth + CSRF

- Requiere sesion (Sanctum)
- Requiere CSRF (POST)

## Request

```json
{
  "task_id": "uuid-task",
  "timer_mode": "timer",
  "target_seconds": 2700
}
```

### Variantes validas

- `timer_mode = "stopwatch"` (backend deja `target_seconds = null`)
- en `timer_mode = "timer"`, `target_seconds` se puede omitir si la tarea tiene `target_duration_seconds`

## Response (implementacion real)

- `201 Created`

## Conflicto importante (`409 ACTIVE_SESSION_EXISTS`)

Si ya existe sesion activa:

- backend no la reemplaza
- responde `409`
- incluye snapshot actual para re-sync

---

## `POST /api/v1/focus-sessions/pause`

## Para que sirve

Pausar sesion activa y consolidar tiempo acumulado hasta `server_now_utc`.

## Request

```json
{
  "expected_version": 3
}
```

## Response (`200`)

- `active_focus_session.session_state = "paused"`
- `elapsed_seconds_total` actualizado
- `version` incrementado
- `last_resumed_at_utc = null`
- `last_paused_at_utc = server_now_utc`

## Conflictos comunes (`409`)

- `VERSION_MISMATCH`
- `NO_ACTIVE_SESSION`
- `SESSION_NOT_RUNNING`

---

## `POST /api/v1/focus-sessions/resume`

## Para que sirve

Reanudar sesion pausada.

## Request

```json
{
  "expected_version": 4
}
```

## Response (`200`)

- `session_state = "running"`
- `last_resumed_at_utc = server_now_utc`
- `version` incrementado

## Conflictos comunes (`409`)

- `VERSION_MISMATCH`
- `NO_ACTIVE_SESSION`
- `SESSION_NOT_PAUSED`

---

## `POST /api/v1/focus-sessions/switch-task`

## Para que sirve

Cambiar la tarea activa y reiniciar el bloque de foco (alineado con el UX actual).

## Request (implementado)

```json
{
  "expected_version": 5,
  "task_id": "uuid-task-nueva",
  "timer_mode": "stopwatch",
  "target_seconds": null
}
```

### Nota importante (implementacion real)

- `timer_mode` es opcional en backend:
  - si no se envia, se mantiene el actual
- `target_seconds` tambien es opcional:
  - si queda `timer`, backend puede derivarlo de la tarea nueva

## Response (`200`)

- mantiene la misma fila de sesion (`id` igual)
- cambia `task_id`
- resetea:
  - `elapsed_seconds_total = 0`
  - `started_at_utc = server_now_utc`
  - `last_resumed_at_utc = server_now_utc`
  - `last_paused_at_utc = null`
- `session_state = "running"`
- `version` incrementado

---

## `POST /api/v1/focus-sessions/stop`

## Para que sirve

Finalizar la sesion activa.

## Request

```json
{
  "expected_version": 6,
  "stopped_reason": "user_stop"
}
```

### `stopped_reason` soportados

- `user_stop`
- `timer_complete`
- `task_switch`

## Response (`200`)

- `active_focus_session = null`
- `stopped_session_summary` con `elapsed_seconds_final`

## Nota de alcance (M5)

El backend **no** persiste `time_entries` al detener la sesion (queda para Modulo 6).

---

## `POST /api/v1/focus-sessions/heartbeat` (implementado)

## Para que sirve

Refrescar snapshot del contador y validar version sin mutar estado de negocio.

## Request

```json
{
  "expected_version": 6
}
```

## Response (`200`)

Mismo envelope (`server_now_utc` + `active_focus_session`).

## Uso recomendado en frontend

- re-sync periodico cuando no hay WebSocket (ej. cada 10-30s)
- re-sync al volver la pestaña a foreground
- re-sync si detectas desalineacion de UI

---

## Errores y codigos (M5)

## `401 Unauthorized`

```json
{
  "message": "Unauthenticated."
}
```

## `404 Not Found`

En `start` / `switch-task` cuando `task_id`:

- no existe
- no pertenece al workspace del usuario

## `409 Conflict` (codigos reales soportados)

- `ACTIVE_SESSION_EXISTS`
- `NO_ACTIVE_SESSION`
- `VERSION_MISMATCH`
- `SESSION_NOT_RUNNING`
- `SESSION_NOT_PAUSED`

## `422 Unprocessable Entity`

Validaciones de payload:

- `task_id`
- `timer_mode`
- `target_seconds`
- `expected_version`
- `stopped_reason`

### Caso importante

Si `timer_mode = timer` y:

- no envias `target_seconds`
- y la tarea no tiene `target_duration_seconds`

backend responde `422` sobre `target_seconds`.

## `500 Internal Server Error`

- error inesperado en transaccion/persistencia
- mostrar UI recuperable + reintento

---

## Diferencias / aclaraciones respecto al handoff original de Modulo 5

## 1) `heartbeat` ya esta implementado

El handoff lo marcaba opcional recomendado. Ya existe:

- `POST /api/v1/focus-sessions/heartbeat`

## 2) `start` responde `201 Created`

No `200`.

## 3) `stop` devuelve `stopped_session_summary`

Ya implementado y util para UI (resumen de sesion terminada).

## 4) `switch-task` permite `timer_mode` opcional

Si se omite, backend mantiene el `timer_mode` actual de la sesion.

## 5) Sin historial en M5

`stop` no crea `time_entries` (queda para M6), pero el contrato sigue compatible.

---

## Compatibilidad con `/app/bootstrap` (M2 + M5)

No hubo cambios breaking en `/api/v1/app/bootstrap`.

Lo que cambia:

- `data.active_focus_session` ahora puede venir no-null con estado real
- `data.server_now_utc` pasa a ser clave para calcular el contador

### Regla recomendada de hidratacion

Al abrir `/app`:

1. usar `GET /api/v1/app/bootstrap`
2. si `data.active_focus_session` existe:
   - inicializar store de focus session
   - calcular `serverOffsetMs` con `data.server_now_utc`

`GET /api/v1/focus-sessions/active` queda como endpoint de re-sync dedicado.

---

## Tipos TS sugeridos

```ts
export type TimerMode = 'timer' | 'stopwatch';
export type FocusSessionState = 'running' | 'paused';

export type ActiveFocusSession = {
  id: string;
  task_id: string;
  timer_mode: TimerMode;
  session_state: FocusSessionState;
  target_seconds: number | null;
  started_at_utc: string;
  last_resumed_at_utc: string | null;
  last_paused_at_utc: string | null;
  elapsed_seconds_total: number;
  version: number;
};

export type FocusSessionStateResponse = {
  data: {
    server_now_utc: string;
    active_focus_session: ActiveFocusSession | null;
    stopped_session_summary?: {
      task_id: string | null;
      timer_mode: TimerMode | null;
      elapsed_seconds_final: number;
      target_seconds: number | null;
      stopped_reason: 'user_stop' | 'timer_complete' | 'task_switch' | null;
    } | null;
  };
};

export type FocusSessionConflictResponse = {
  message: string;
  code:
    | 'ACTIVE_SESSION_EXISTS'
    | 'NO_ACTIVE_SESSION'
    | 'VERSION_MISMATCH'
    | 'SESSION_NOT_RUNNING'
    | 'SESSION_NOT_PAUSED';
  data: {
    server_now_utc: string;
    active_focus_session: ActiveFocusSession | null;
  };
};
```

---

## API helpers (fetch) recomendados

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getActiveFocusSession() {
  const res = await fetch(`${API_BASE_URL}/api/v1/focus-sessions/active`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401) return null;

  const json = await parseJson<FocusSessionStateResponse>(res);
  if (!res.ok) throw json;
  return json;
}

export async function startFocusSession(payload: {
  task_id: string;
  timer_mode: TimerMode;
  target_seconds?: number | null;
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/focus-sessions/start`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) return null;

  const json = await parseJson<FocusSessionStateResponse | FocusSessionConflictResponse>(res);
  if (!res.ok) throw json;
  return json as FocusSessionStateResponse;
}

export async function focusCommand<TBody extends object>(
  endpoint: 'pause' | 'resume' | 'switch-task' | 'stop' | 'heartbeat',
  body: TBody,
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/focus-sessions/${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) return null;

  const json = await parseJson<FocusSessionStateResponse | FocusSessionConflictResponse>(res);
  if (!res.ok) throw json;
  return json as FocusSessionStateResponse;
}
```

## Recordatorio CSRF (mutaciones)

Antes del primer `POST` del flujo de focus session en la sesion actual:

```ts
await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
  method: 'GET',
  credentials: 'include',
});
```

---

## Integracion con store global (recomendada)

## Estado recomendado en frontend

- `activeFocusSession: ActiveFocusSession | null`
- `serverOffsetMs: number`
- `lastServerNowUtc: string | null`
- `focusSessionConflict?: { code, message } | null`

## Regla de update del store

En cualquier response exitosa M5:

1. `serverOffsetMs = getServerOffsetMs(data.server_now_utc)`
2. `activeFocusSession = data.active_focus_session`
3. si existe `stopped_session_summary`, mostrar resumen/toast/summary modal

## Manejo de `409` recomendado

Si response trae:

- `code`
- `data.server_now_utc`
- `data.active_focus_session`

Entonces:

1. reemplazar snapshot local (re-sync)
2. actualizar `serverOffsetMs`
3. mostrar mensaje UX segun `code`

### Ejemplos UX por `code`

- `ACTIVE_SESSION_EXISTS`: mostrar contador actual y ofrecer "Continuar"
- `VERSION_MISMATCH`: re-sync silencioso + retry opcional
- `NO_ACTIVE_SESSION`: limpiar UI de contador
- `SESSION_NOT_RUNNING`: deshabilitar boton pause
- `SESSION_NOT_PAUSED`: deshabilitar boton resume

---

## Estrategia sin WebSocket (M5)

Como aun no hay WebSocket (Modulo 7), una estrategia simple y robusta es:

1. Hidratar desde `/app/bootstrap`
2. Al entrar/volver a la pantalla:
   - llamar `GET /api/v1/focus-sessions/active`
3. Mientras haya sesion activa:
   - tick local del contador usando `serverOffsetMs`
   - `heartbeat` cada 15-30s (opcional recomendado)
4. En `visibilitychange` (tab vuelve visible):
   - re-sync con `active` o `heartbeat`

Esto ya soporta multi-dispositivo mejor que contador local puro.

---

## Manejo de errores frontend (M5)

## `401`

- sesion expirada
- redirigir a `/login`

## `404` (start/switch-task)

- tarea no existe o no accesible
- refrescar tasks (`GET /api/v1/tasks`) y limpiar seleccion si aplica

## `409`

- no tratar como "error fatal"
- tratar como "conflicto de estado / desincronizacion"
- usar snapshot incluido para re-sync inmediato

## `422`

- errores de request (version, timer_mode, target_seconds)
- mostrar mensaje de formulario/comando segun contexto

## `500`

- mostrar error recuperable
- permitir reintento
- opcional: re-sync con `GET /focus-sessions/active`

---

## Checklist de integracion (frontend) - Modulo 5

- [ ] El frontend usa `server_now_utc` para calcular `serverOffsetMs`
- [ ] El contador visible se calcula desde `active_focus_session` + offset (no solo `Date.now()`)
- [ ] Comandos `pause/resume/switch-task/stop/heartbeat` envian `expected_version`
- [ ] En `409`, la app reemplaza snapshot local con `response.data.active_focus_session`
- [ ] `start` maneja `409 ACTIVE_SESSION_EXISTS` sin romper UI
- [ ] `stop` maneja `stopped_session_summary`
- [ ] Mutaciones usan CSRF (`/sanctum/csrf-cookie`)
- [ ] `/app/bootstrap` sigue siendo hidratacion inicial del dashboard
- [ ] `GET /focus-sessions/active` se usa para re-sync al abrir/volver a `/app`
- [ ] (Opcional recomendado) `heartbeat` se usa como sync periodico sin WebSocket

---

## Nota para el equipo frontend

Con Modulo 5, el contador ya es server-authoritative y compatible con multi-dispositivo incluso sin WebSocket.

La clave para una UI estable es:

- usar el snapshot del backend como fuente de verdad
- calcular tiempo visible con `server_now_utc`
- tratar `409` como re-sync de estado, no como error terminal

En Modulo 7 se agregara WebSocket para notificaciones en tiempo real, pero los comandos HTTP del contador pueden mantenerse.

