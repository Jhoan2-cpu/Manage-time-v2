# Velor Frontend - Integracion Modulo 2 (`/app/bootstrap`) - Handoff

## Objetivo

Integrar el frontend SPA con el endpoint de carga inicial del dashboard:

- `GET /api/v1/app/bootstrap`

Este endpoint ya esta implementado en el backend y permite renderizar `/app` con **una sola request** despues de autenticacion.

---

## Estado actual del backend (M2 implementado)

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

### Modulo 2 (nuevo)

- `GET /api/v1/app/bootstrap` (protegido con `auth:sanctum`)

---

## Cambio recomendado en flujo frontend (respecto a Modulo 1)

## Antes (M1)

Despues de login/register, el frontend podia:

- navegar a `/app`
- llamar `GET /api/v1/auth/me`

## Ahora (M2)

Despues de login/register o al refrescar `/app`, el frontend debe:

- llamar `GET /api/v1/app/bootstrap`

`/auth/me` sigue siendo util para checks de sesion, pero **no alcanza** para inicializar el panel completo.

---

## Contrato real implementado (`GET /api/v1/app/bootstrap`)

## Auth

- Requiere cookie de sesion (Sanctum)
- Sin sesion -> `401 { "message": "Unauthenticated." }`

## Query opcional: `include`

Permitidos:

- `tasks`
- `preferences`
- `daily_log`
- `dashboard_stats`
- `active_focus_session`

Ejemplo:

```txt
GET /api/v1/app/bootstrap?include=tasks,preferences,daily_log,dashboard_stats,active_focus_session
```

## Regla importante (implementacion real)

Aunque uses `include`, el backend **siempre devuelve todas las llaves** del contrato.

Si una seccion no se carga/omite:

- devuelve placeholders consistentes (arrays vacios / ceros / `null`)
- no rompe el shape de la respuesta

Esto es intencional para mantener contrato estable con frontend.

## `include` invalido

Si `include` trae valores no permitidos, responde `422`:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "include": ["El parametro include contiene valores no permitidos."]
  }
}
```

---

## Respuesta (shape estable)

```json
{
  "data": {
    "server_now_utc": "2026-02-26T15:00:00Z",
    "user": {
      "id": "uuid",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "workspace": {
      "id": "uuid",
      "name": "Espacio personal de Velor"
    },
    "preferences": {
      "locale": "es",
      "time_zone_name": "America/Lima",
      "time_zone_auto_detect": true,
      "ui_sounds_enabled": true,
      "background_music_enabled": false,
      "background_music_volume_percent": 62,
      "confirm_task_switch_enabled": true,
      "sign_out_confirmation_enabled": true
    },
    "tasks": [],
    "daily_log": {
      "date_local": "2026-02-26",
      "tracked_seconds": 0,
      "untracked_seconds": 0,
      "entries": []
    },
    "dashboard_stats": {
      "tracked_seconds_today": 0,
      "untracked_seconds_today": 0,
      "tracked_sessions_count_today": 0,
      "focus_time_total_seconds": 0
    },
    "active_focus_session": null
  }
}
```

---

## Detalle de campos (implementacion real)

## `server_now_utc`

- Siempre presente
- Formato ISO 8601 UTC (`...Z`)
- Usar para sincronizar render de tiempo en frontend

## `user`

Mismo contrato del Modulo 1:

- `id`
- `display_name`
- `email`
- `locale`

## `workspace`

Actualmente resuelve:

1. workspace personal owned por el usuario
2. fallback a membership activa (future-proof)

Campos:

- `id`
- `name`

## `preferences`

Siempre presente (aunque `include` no lo mencione, por contrato estable).

Campos implementados:

- `locale`
- `time_zone_name`
- `time_zone_auto_detect`
- `ui_sounds_enabled`
- `background_music_enabled`
- `background_music_volume_percent`
- `confirm_task_switch_enabled`
- `sign_out_confirmation_enabled`

### Comportamiento adicional

Si `user_preferences.time_zone_name` es invalido:

- backend hace fallback a `UTC`
- registra warning en logs

## `tasks`

Devuelve tareas activas (no archivadas) del usuario, ordenadas por:

1. `sort_order`
2. `created_at`

Campos por item:

- `id`
- `title`
- `color_tag`
- `icon_tag`
- `target_duration_seconds`
- `alarm_time_local`
- `sort_order`
- `focus_time_total_seconds`
- `focus_sessions_count`

## `daily_log`

Campos:

- `date_local`
- `tracked_seconds`
- `untracked_seconds`
- `entries[]`

### Regla de agregacion (real)

Se calcula usando la zona horaria efectiva:

- `user_preferences.time_zone_name`

El backend filtra entradas del **dia local actual** y devuelve totales.

### `daily_log.entries[]`

Campos:

- `id`
- `entry_type` (`focus|untracked|manual_adjustment`)
- `task_id`
- `task_title`
- `task_color_tag`
- `task_icon_tag`
- `started_at_utc`
- `ended_at_utc`
- `duration_seconds`
- `started_at_local_label`

### Nota importante

`task_title`, `task_color_tag`, `task_icon_tag` salen desde:

1. snapshot en `time_entries` (`*_snapshot`) si existe
2. fallback a la `task` actual si esta cargada

Esto estabiliza el historial aunque una task cambie despues.

## `dashboard_stats`

Campos:

- `tracked_seconds_today`
- `untracked_seconds_today`
- `tracked_sessions_count_today`
- `focus_time_total_seconds`

### Aclaracion de semantica (implementacion real)

- `tracked_seconds_today`, `untracked_seconds_today`, `tracked_sessions_count_today`:
  - se calculan para el **dia local actual**
- `focus_time_total_seconds`:
  - se calcula como suma de `tasks.focus_time_total_seconds` del usuario (acumulado almacenado en tareas)

## `active_focus_session`

- En M2 normalmente sera `null`
- El contrato ya existe para compatibilidad futura (Modulo 5)

Si existe registro, el shape actual implementado es:

- `id`
- `task_id`
- `timer_mode`
- `session_state`
- `target_seconds`
- `started_at_utc`
- `last_resumed_at_utc`
- `last_paused_at_utc`
- `elapsed_seconds_total`
- `version`

---

## Diferencias / aclaraciones respecto al handoff original de Modulo 2

## 1) No hubo cambios breaking en Auth (Modulo 1)

- Los endpoints de auth se mantienen
- El cambio es de **flujo frontend recomendado**: usar `/app/bootstrap` para inicializar `/app`

## 2) `include` no elimina llaves del response

Handoff pedía contrato estable y placeholders; la implementacion sigue eso.

En la practica:

- `include` controla carga de datos
- pero el response mantiene siempre todas las llaves

## 3) `preferences` se devuelve siempre

Aunque `include` soporta `preferences`, hoy el backend la devuelve siempre para mantener consistencia en bootstrap.

## 4) `active_focus_session` no solo existe como `null`

El handoff permitia `null` (M2), pero el backend ya soporta leer `active_focus_sessions` si existe data en BD.

## 5) `started_at_local_label` puede variar ligeramente en formato

El ejemplo del handoff muestra texto tipo:

- `8:00:00 a. m.`

La implementacion usa formateo localizado de Carbon. Puede variar segun locale/runtime, pero el campo existe y es utilizable en UI.

---

## Integracion frontend recomendada (M2)

## Tipo TS sugerido

```ts
export type BootstrapResponse = {
  data: {
    server_now_utc: string;
    user: {
      id: string;
      display_name: string;
      email: string;
      locale: 'es' | 'en';
    };
    workspace: {
      id: string;
      name: string;
    };
    preferences: {
      locale: 'es' | 'en';
      time_zone_name: string;
      time_zone_auto_detect: boolean;
      ui_sounds_enabled: boolean;
      background_music_enabled: boolean;
      background_music_volume_percent: number;
      confirm_task_switch_enabled: boolean;
      sign_out_confirmation_enabled: boolean;
    };
    tasks: Array<{
      id: string;
      title: string;
      color_tag: string;
      icon_tag: string;
      target_duration_seconds: number | null;
      alarm_time_local: string | null;
      sort_order: number;
      focus_time_total_seconds: number;
      focus_sessions_count: number;
    }>;
    daily_log: {
      date_local: string;
      tracked_seconds: number;
      untracked_seconds: number;
      entries: Array<{
        id: string;
        entry_type: 'focus' | 'untracked' | 'manual_adjustment';
        task_id: string | null;
        task_title: string | null;
        task_color_tag: string | null;
        task_icon_tag: string | null;
        started_at_utc: string;
        ended_at_utc: string;
        duration_seconds: number;
        started_at_local_label: string | null;
      }>;
    };
    dashboard_stats: {
      tracked_seconds_today: number;
      untracked_seconds_today: number;
      tracked_sessions_count_today: number;
      focus_time_total_seconds: number;
    };
    active_focus_session: null | {
      id: string;
      task_id: string;
      timer_mode: 'timer' | 'stopwatch';
      session_state: 'running' | 'paused';
      target_seconds: number | null;
      started_at_utc: string;
      last_resumed_at_utc: string | null;
      last_paused_at_utc: string | null;
      elapsed_seconds_total: number;
      version: number;
    };
  };
};
```

## API helper recomendado (fetch)

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function getAppBootstrap(include?: string[]) {
  const query =
    include && include.length > 0
      ? `?include=${encodeURIComponent(include.join(','))}`
      : '';

  const res = await fetch(`${API_BASE_URL}/api/v1/app/bootstrap${query}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (res.status === 401) return null;

  const json = await res.json();
  if (!res.ok) throw json;
  return json as BootstrapResponse;
}
```

## Flujo de uso en `/app`

1. Al entrar a `/app`, llamar `getAppBootstrap()`
2. Si `401`:
   - redirigir a `/login`
3. Si `200`:
   - hidratar store global (user, preferences, tasks, daily_log, stats, activeFocusSession)
4. Renderizar UI con placeholders del backend sin asumir que hay datos reales

---

## Manejo de errores frontend (M2)

## `401`

- Sesion expirada o no autenticado
- No mostrar error tecnico; redirigir a `/login`

## `422` (`include` invalido)

- Error de integracion/desarrollo
- Log en consola / observabilidad
- Fallback: reintentar sin `include`

## `500`

- Mostrar estado de error recuperable en `/app`
- Ofrecer reintento manual
- Opcional: fallback temporal a `GET /api/v1/auth/me` para mantener sesion visible

---

## Checklist de integracion (frontend) - Modulo 2

- [ ] El frontend llama `/api/v1/app/bootstrap` al cargar `/app`
- [ ] Requests usan `credentials: 'include'`
- [ ] `401` en bootstrap redirige a `/login`
- [ ] UI no asume que `tasks` o `daily_log.entries` tengan datos
- [ ] UI soporta `active_focus_session: null`
- [ ] UI usa `preferences.time_zone_name` como referencia de timezone
- [ ] UI usa `server_now_utc` como hora del servidor (no `Date.now()` como fuente unica)
- [ ] Si usan `include`, manejar `422` y reintentar sin `include`

---

## Nota para el equipo frontend

Con Modulo 2 ya no hace falta hacer multiples llamadas iniciales (`me`, `tasks`, `stats`, etc.) para renderizar `/app`.

La recomendacion es que el bootstrap sea la **fuente principal de hidratacion inicial** del dashboard.

