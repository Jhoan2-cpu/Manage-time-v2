# Velor Frontend - Integracion Modulo 7 (Realtime / WebSocket con Reverb) - Handoff

## Objetivo

Integrar sincronizacion realtime del contador entre dispositivos usando WebSocket, manteniendo:

- **HTTP** como canal de comandos (`start/pause/resume/switch-task/stop/heartbeat`)
- **WebSocket** como canal de notificacion/snapshot
- **backend** como fuente de verdad del contador

Con M7:

- cambios del contador en un dispositivo se reflejan en otro dispositivo del mismo usuario
- polling/heartbeat de M5 queda como fallback
- historial M6 se invalida mas rapido usando el campo `created_time_entry_id` de eventos de foco

---

## Estado actual del backend (M7 implementado)

## Canal privado realtime (exacto)

- Canal (backend): `user.{userId}.focus`
- Canal wire-level (Pusher/Reverb private): `private-user.{userId}.focus`

### Autorizacion del canal (implementada)

- route auth: `POST /broadcasting/auth` (tambien acepta `GET`)
- middleware: `web` + `auth:sanctum`
- guards del canal: `sanctum`, `web`

## Eventos realtime implementados (exactos)

- `focus_session.updated`
- `focus_session.stopped`

### No implementado en backend (por ahora)

- `history.updated` (opcional del handoff backend, **no existe aun**)

---

## Endpoints relacionados (sin cambios de M5/M6)

### Comandos / snapshot HTTP (fuente de verdad)

- `GET /api/v1/focus-sessions/active`
- `POST /api/v1/focus-sessions/start`
- `POST /api/v1/focus-sessions/pause`
- `POST /api/v1/focus-sessions/resume`
- `POST /api/v1/focus-sessions/switch-task`
- `POST /api/v1/focus-sessions/stop`
- `POST /api/v1/focus-sessions/heartbeat`

### Auth / session (Sanctum)

- `GET /sanctum/csrf-cookie`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

---

## Cambio de flujo frontend (respecto a M5/M6)

## Antes (M5/M6)

- comandos por HTTP
- sincronizacion entre dispositivos por polling / heartbeat / `GET /active`

## Ahora (M7)

1. iniciar sesion (Sanctum)
2. obtener `auth/me`
3. suscribirse al canal privado `user.{userId}.focus`
4. seguir usando HTTP para comandos del contador
5. aplicar snapshots realtime recibidos por WS
6. mantener `heartbeat`/`GET /active` como fallback si WS falla

### Importante

El dispositivo que dispara el comando **tambien puede recibir** el evento realtime (no hay exclusion por socket implementada).  
La UI debe ser idempotente: si ya aplicaste el snapshot HTTP y luego llega el mismo snapshot por WS, no pasa nada.

---

## Contrato realtime real implementado (payload exacto)

Todos los eventos M7 tienen este envelope:

```json
{
  "type": "focus_session.updated",
  "data": {
    "server_now_utc": "2026-03-03T18:25:10Z",
    "active_focus_session": {
      "id": "uuid-session",
      "task_id": "uuid-task",
      "timer_mode": "timer",
      "session_state": "running",
      "target_seconds": 1500,
      "started_at_utc": "2026-03-03T18:00:00Z",
      "last_resumed_at_utc": "2026-03-03T18:05:00Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 300,
      "version": 7
    },
    "stopped_session_summary": null,
    "created_time_entry_id": null
  },
  "meta": {
    "workspace_id": "uuid-workspace",
    "user_id": "uuid-user",
    "emitted_at_utc": "2026-03-03T18:25:10Z"
  }
}
```

## Garantias utiles del payload (implementacion real)

- `data` usa el mismo shape base de M5/M6 (`FocusSessionStateResource`)
- `data.stopped_session_summary` **siempre existe** en eventos realtime (null si no aplica)
- `data.created_time_entry_id` **siempre existe** en eventos realtime (null si no aplica)
- `meta.user_id` y `meta.workspace_id` vienen para debug/telemetria/invalidacion

---

## Evento `focus_session.updated`

## Cuando llega

- `start`
- `pause`
- `resume`
- `switch-task`

### Nota

- `heartbeat` **no** emite evento realtime (por decision de backend M7)

## Payload

- `data.active_focus_session`: snapshot autoritativo (no null)
- `data.stopped_session_summary`: `null`
- `data.created_time_entry_id`:
  - normalmente `null`
  - puede venir con string en `switch-task` si se persistio bloque saliente (M6)

---

## Evento `focus_session.stopped`

## Cuando llega

- `stop` (user stop / timer complete / cualquier razon de stop backend)

## Payload

- `data.active_focus_session = null`
- `data.stopped_session_summary` con resumen final
- `data.created_time_entry_id`:
  - string si se persistio `time_entry` (M6, cuando `elapsed > 0`)
  - `null` si no se persistio entry

Ejemplo:

```json
{
  "type": "focus_session.stopped",
  "data": {
    "server_now_utc": "2026-03-03T18:25:00Z",
    "active_focus_session": null,
    "stopped_session_summary": {
      "task_id": "uuid-task",
      "timer_mode": "timer",
      "elapsed_seconds_final": 1500,
      "target_seconds": 1500,
      "stopped_reason": "timer_complete"
    },
    "created_time_entry_id": "uuid-time-entry"
  },
  "meta": {
    "workspace_id": "uuid-workspace",
    "user_id": "uuid-user",
    "emitted_at_utc": "2026-03-03T18:25:00Z"
  }
}
```

---

## Tipos TS sugeridos (M7)

```ts
export type ActiveFocusSession = {
  id: string;
  task_id: string;
  timer_mode: 'timer' | 'stopwatch';
  session_state: 'running' | 'paused';
  target_seconds: number | null;
  started_at_utc: string | null;
  last_resumed_at_utc: string | null;
  last_paused_at_utc: string | null;
  elapsed_seconds_total: number;
  version: number;
};

export type StoppedSessionSummary = {
  task_id: string | null;
  timer_mode: 'timer' | 'stopwatch' | null;
  elapsed_seconds_final: number;
  target_seconds: number | null;
  stopped_reason: string | null;
};

export type FocusRealtimeData = {
  server_now_utc: string | null;
  active_focus_session: ActiveFocusSession | null;
  stopped_session_summary: StoppedSessionSummary | null;
  created_time_entry_id: string | null;
};

export type FocusRealtimeMeta = {
  workspace_id: string | null;
  user_id: string;
  emitted_at_utc: string;
};

export type FocusSessionUpdatedEvent = {
  type: 'focus_session.updated';
  data: FocusRealtimeData;
  meta: FocusRealtimeMeta;
};

export type FocusSessionStoppedEvent = {
  type: 'focus_session.stopped';
  data: FocusRealtimeData;
  meta: FocusRealtimeMeta;
};

export type FocusRealtimeEvent =
  | FocusSessionUpdatedEvent
  | FocusSessionStoppedEvent;
```

---

## Configuracion frontend (Echo + Reverb)

## Requisitos previos (obligatorio)

Antes de abrir WebSocket:

1. `GET /sanctum/csrf-cookie`
2. login por auth M1 (o sesion ya activa)
3. `GET /api/v1/auth/me` para obtener `user.id`

Si no hay sesion valida, `/broadcasting/auth` devolvera `401/403`.

## Variables frontend (ejemplo)

Si tu frontend usa Vite:

```env
VITE_REVERB_APP_KEY=tu_app_key
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
VITE_API_BASE_URL=http://localhost:8000
```

## Inicializacion Echo (ejemplo con `pusher-js`)

```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

window.Pusher = Pusher;

export function createEcho() {
  const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
  const host = import.meta.env.VITE_REVERB_HOST ?? 'localhost';
  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase}/broadcasting/auth`,
    withCredentials: true,
  });
}
```

### Si `withCredentials` no funciona en tu setup

Usa `authorizer` custom con `fetch` o `axios` enviando cookies/CSRF manualmente.

---

## Suscripcion al canal (exacta)

El backend publica en canal privado `user.{userId}.focus`.

En frontend (Echo):

```ts
const channel = echo.private(`user.${userId}.focus`);
```

### Nombres de eventos exactos con `broadcastAs()`

Como backend usa `broadcastAs()`, escucha con prefijo `.`:

```ts
channel.listen('.focus_session.updated', (event: FocusSessionUpdatedEvent) => {
  // ...
});

channel.listen('.focus_session.stopped', (event: FocusSessionStoppedEvent) => {
  // ...
});
```

---

## Estrategia de sincronizacion recomendada (frontend)

## Estado fuente en frontend

Mantener un store de contador con:

- `activeFocusSession`
- `serverOffsetMs`
- `lastAppliedVersion` (opcional recomendado)
- `connectionState` (`connecting|connected|disconnected`)

## Regla de aplicacion de snapshots (WS y HTTP)

Usar la misma funcion para aplicar snapshots de:

- respuesta HTTP de M5
- eventos WS de M7
- `GET /active` de fallback

### Recomendacion de merge

1. actualizar `serverOffsetMs` con `data.server_now_utc`
2. reemplazar `activeFocusSession` por `data.active_focus_session`
3. si llega `stopped_session_summary`, mostrar UX de stop (toast/modal/summary)
4. si llega `created_time_entry_id`, invalidar historial/bootstrap (ver abajo)

## Deteccion basica de eventos viejos (recomendado)

Para `focus_session.updated`:

- si `event.data.active_focus_session?.version` es menor al version local actual, ignorar

Para `focus_session.stopped`:

- aplicar el stop (pone `active_focus_session = null`)
- si sospechas desorden de red, dispara `GET /api/v1/focus-sessions/active` para confirmar

---

## Integracion con M5 (HTTP commands) + M7 (WS)

## Regla principal

Sigue enviando comandos por HTTP y usando la respuesta HTTP como resultado inmediato local.

Luego el evento WS:

- confirma el estado en otros dispositivos
- puede llegar tambien al dispositivo originador (aplicacion idempotente)

## Flujo recomendado por accion

### `start/pause/resume`

1. enviar HTTP
2. aplicar snapshot HTTP
3. esperar evento WS (mismo snapshot) -> reaplicar sin problema

### `switch-task`

1. enviar HTTP
2. aplicar snapshot HTTP
3. si `created_time_entry_id` viene en HTTP o WS:
   - invalidar `history/overview`
   - invalidar `history/days`
   - invalidar `/app/bootstrap` (o patch local + refetch)

### `stop`

1. enviar HTTP
2. aplicar snapshot HTTP (`active_focus_session = null`)
3. usar `stopped_session_summary` para UI inmediata
4. si `created_time_entry_id` viene en HTTP o WS:
   - invalidar historial + bootstrap

---

## Integracion con M6 (History / Time Entries)

## Como invalidar sin `history.updated` (backend M7 actual)

Como no existe evento `history.updated`, usar:

- `focus_session.updated` / `focus_session.stopped`
- revisar `event.data.created_time_entry_id`

Si `created_time_entry_id !== null`:

- invalidar `GET /api/v1/history/overview`
- invalidar `GET /api/v1/history/days`
- invalidar `GET /api/v1/history/days/{date_abierto}` si aplica
- invalidar `GET /api/v1/app/bootstrap`

Esto cubre cambios remotos (otro dispositivo) sin polling pesado.

---

## Fallback y reconexion (M5 sigue vigente)

## Si WS falla o se desconecta

Mantener fallback:

- `GET /api/v1/focus-sessions/active` (re-sync puntual)
- `POST /api/v1/focus-sessions/heartbeat` (si la UX actual ya lo usa)

## Reconexion recomendada

Al reconectar Echo/Reverb:

1. re-suscribirse al canal `user.{userId}.focus`
2. llamar `GET /api/v1/focus-sessions/active`
3. reaplicar snapshot para cerrar gap de eventos perdidos

---

## Helpers TS recomendados

## Calculo de offset (reusar M5)

```ts
export function getServerOffsetMs(serverNowUtc: string): number {
  return Date.parse(serverNowUtc) - Date.now();
}
```

## Aplicar payload realtime a store

```ts
type ApplyFocusSnapshotInput = {
  server_now_utc: string | null;
  active_focus_session: ActiveFocusSession | null;
  stopped_session_summary: StoppedSessionSummary | null;
  created_time_entry_id: string | null;
};

export function applyFocusRealtimeEvent(
  event: FocusRealtimeEvent,
  ctx: {
    setFocusSnapshot: (s: {
      activeFocusSession: ActiveFocusSession | null;
      serverOffsetMs?: number;
      stoppedSummary?: StoppedSessionSummary | null;
    }) => void;
    invalidateHistory: () => void;
    invalidateBootstrap: () => void;
    currentVersion: () => number | null;
  }
) {
  const data = event.data;

  const incomingVersion = data.active_focus_session?.version ?? null;
  const localVersion = ctx.currentVersion();

  if (
    event.type === 'focus_session.updated' &&
    incomingVersion !== null &&
    localVersion !== null &&
    incomingVersion < localVersion
  ) {
    return; // snapshot viejo
  }

  ctx.setFocusSnapshot({
    activeFocusSession: data.active_focus_session,
    serverOffsetMs: data.server_now_utc ? getServerOffsetMs(data.server_now_utc) : undefined,
    stoppedSummary: data.stopped_session_summary,
  });

  if (data.created_time_entry_id) {
    ctx.invalidateHistory();
    ctx.invalidateBootstrap();
  }
}
```

---

## Manejo de errores / casos practicos

## HTTP errors (sin cambios)

Sigue igual que M5/M6:

- `401` sesion expirada
- `409` conflictos de version/estado
- `422` validacion

Los errores de negocio **no** se resuelven por WS.

## WebSocket / auth del canal

Casos comunes:

- `401/403` en `/broadcasting/auth`: sesion no valida o cookies no enviadas
- conexion abre pero no llegan eventos: canal/alias de evento incorrecto
- reconexiones frecuentes: host/port/scheme mal configurados o Reverb no corriendo

## Checklist rapido si no conecta

1. `BROADCAST_CONNECTION=reverb` en backend
2. `php artisan reverb:start`
3. Echo usa `reverb` y `VITE_REVERB_APP_KEY` correcto
4. `authEndpoint = http://localhost:8000/broadcasting/auth`
5. `withCredentials = true`
6. sesion Sanctum activa (probar `GET /api/v1/auth/me`)
7. escuchar eventos con `.`:
   - `.focus_session.updated`
   - `.focus_session.stopped`

---

## Checklist de integracion frontend (M7)

- [ ] Inicializar Echo/Reverb despues de login (no antes)
- [ ] Suscribirse a `private(user.{userId}.focus)` via `echo.private(...)`
- [ ] Escuchar `.focus_session.updated`
- [ ] Escuchar `.focus_session.stopped`
- [ ] Aplicar snapshots realtime con la misma logica que snapshots HTTP
- [ ] Mantener fallback M5 (`GET /active` / `heartbeat`)
- [ ] Invalidar historial/bootstrap cuando `created_time_entry_id` no sea null
- [ ] Manejar reconexion + re-sync (`GET /active`)
- [ ] Tolerar duplicados (mismo comando -> HTTP + WS)

---

## Nota para el siguiente paso

Si quieres, el siguiente handoff puede incluir una version "ready-to-code" para tu stack exacto (React + Zustand/Context) con archivos concretos:

- `echoClient.ts`
- `focusRealtimeBridge.ts`
- `useFocusRealtime.ts`
- integracion con `focusStore` + invalidacion de queries (TanStack Query / SWR)

