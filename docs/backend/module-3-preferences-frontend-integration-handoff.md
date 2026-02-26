# Velor Frontend - Integracion Modulo 3 (Preferences / Settings) - Handoff

## Objetivo

Integrar el frontend SPA con persistencia de Settings del usuario usando endpoints dedicados:

- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences`

Este modulo permite que el frontend deje de manejar preferencias solo en estado local y las sincronice con backend.

---

## Estado actual del backend (M3 implementado)

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

- `GET /api/v1/app/bootstrap` (protegido con `auth:sanctum`)

### Modulo 3 (nuevo)

- `GET /api/v1/preferences` (protegido con `auth:sanctum`)
- `PATCH /api/v1/preferences` (protegido con `auth:sanctum`)

---

## Cambio recomendado en flujo frontend (respecto a Modulo 2)

## Antes (M2)

`preferences` llegaba desde:

- `GET /api/v1/app/bootstrap`

pero los cambios de Settings se guardaban localmente (o no estaban persistidos aun).

## Ahora (M3)

El frontend debe:

1. seguir usando `/api/v1/app/bootstrap` para hidratacion inicial de `/app`
2. usar `PATCH /api/v1/preferences` para persistir cambios de Settings
3. (opcional) usar `GET /api/v1/preferences` para recargar Settings fuera de bootstrap

### Recomendacion practica

Como `PATCH /preferences` devuelve el objeto completo y con el mismo shape que `bootstrap.preferences`, el frontend puede:

- actualizar el store local con la respuesta del `PATCH`
- evitar un refetch inmediato de `/app/bootstrap` (salvo que lo prefieran por simplicidad)

---

## Contrato real implementado (`GET /api/v1/preferences`)

## Auth

- Requiere cookie de sesion (Sanctum)
- Sin sesion -> `401 { "message": "Unauthenticated." }`

## Request

- sin body
- sin query

## Respuesta (`200`)

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

## Comportamiento importante (implementacion real)

Si falta la fila en `user_preferences` (caso legacy/importado), el backend:

- autocrea preferencias con defaults seguros (`firstOrCreate`)
- responde `200` con el objeto completo

---

## Contrato real implementado (`PATCH /api/v1/preferences`)

## Auth

- Requiere cookie de sesion (Sanctum)
- Sin sesion -> `401 { "message": "Unauthenticated." }`

## CSRF (importante)

Como es una request mutante (`PATCH`) bajo sesion/cookies:

- si la SPA no tiene CSRF cookie activa, llamar antes:
  - `GET /sanctum/csrf-cookie`

Esto ya aplica desde Modulo 1 (mismo flujo).

## Request (PATCH parcial)

Se puede enviar uno o varios campos. Solo se actualizan los presentes.

### Campos permitidos

- `locale`
- `time_zone_name`
- `time_zone_auto_detect`
- `ui_sounds_enabled`
- `background_music_enabled`
- `background_music_volume_percent`
- `confirm_task_switch_enabled`
- `sign_out_confirmation_enabled`

### Ejemplo minimo

```json
{
  "locale": "en"
}
```

### Ejemplo multiple

```json
{
  "locale": "en",
  "time_zone_name": "America/New_York",
  "time_zone_auto_detect": false,
  "ui_sounds_enabled": true,
  "background_music_enabled": true,
  "background_music_volume_percent": 40,
  "confirm_task_switch_enabled": true,
  "sign_out_confirmation_enabled": true
}
```

## Respuesta (`200`) - objeto completo

```json
{
  "data": {
    "locale": "en",
    "time_zone_name": "America/New_York",
    "time_zone_auto_detect": false,
    "ui_sounds_enabled": true,
    "background_music_enabled": true,
    "background_music_volume_percent": 40,
    "confirm_task_switch_enabled": true,
    "sign_out_confirmation_enabled": true
  }
}
```

## Regla importante (implementacion real)

El backend actualiza solo las keys presentes y devuelve siempre el objeto completo.

Esto permite hacer merge directo en store sin mantener estados parciales manuales.

---

## Validaciones y errores (M3)

## `422 Unprocessable Entity` (validacion)

Validaciones activas:

- `locale`: `es|en`
- `time_zone_name`: timezone IANA valida
- booleans para toggles
- `background_music_volume_percent`: entero `0..100`

Ejemplo de shape (Laravel):

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "time_zone_name": ["..."],
    "background_music_volume_percent": ["..."]
  }
}
```

### Nota importante para frontend

- No dependan del texto exacto del mensaje (`errors.*[]`)
- Si necesitan UX consistente, mapear por `errors.<field>` y mostrar copy propio

## `401 Unauthorized`

```json
{
  "message": "Unauthenticated."
}
```

## `500 Internal Server Error`

- error inesperado leyendo/persistiendo preferencias
- mostrar error recuperable y permitir reintento

---

## Shape de `preferences` (compatibilidad con Modulo 2)

El shape de `GET/PATCH /preferences` es el mismo que `data.preferences` dentro de `/api/v1/app/bootstrap`.

Campos implementados:

- `locale`
- `time_zone_name`
- `time_zone_auto_detect`
- `ui_sounds_enabled`
- `background_music_enabled`
- `background_music_volume_percent`
- `confirm_task_switch_enabled`
- `sign_out_confirmation_enabled`

### Aclaracion

Aunque en BD existe `ambient_track_key`, el backend **no lo expone** en el resource actual (fuera de alcance del contrato frontend M3).

---

## Diferencias / aclaraciones respecto al handoff original de Modulo 3

## 1) No hubo cambios breaking en M1/M2

- Auth se mantiene igual
- `/app/bootstrap` se mantiene igual

## 2) `PATCH /preferences` ya sincroniza `user.locale`

Implementacion real:

- si actualizas `preferences.locale`, el backend tambien sincroniza `users.locale`

Impacto positivo para frontend:

- `/api/v1/app/bootstrap` refleja el cambio tanto en:
  - `data.preferences.locale`
  - `data.user.locale`

## 3) `GET /preferences` autocrea fila si falta

Esto reduce fallos en cuentas legacy/importadas.

## 4) `PATCH` parcial real (bug corregido)

Se corrigio el comportamiento para que enviar solo un campo (ej. `locale`) no dispare validacion de campos omitidos.

---

## Integracion frontend recomendada (M3)

## Tipos TS sugeridos

```ts
export type UserPreferences = {
  locale: 'es' | 'en';
  time_zone_name: string;
  time_zone_auto_detect: boolean;
  ui_sounds_enabled: boolean;
  background_music_enabled: boolean;
  background_music_volume_percent: number;
  confirm_task_switch_enabled: boolean;
  sign_out_confirmation_enabled: boolean;
};

export type PreferencesResponse = {
  data: UserPreferences;
};

export type UpdatePreferencesPayload = Partial<UserPreferences>;
```

## Helpers de API (fetch)

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function getPreferences(): Promise<UserPreferences | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/preferences`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (res.status === 401) return null;

  const json = (await res.json()) as PreferencesResponse;
  if (!res.ok) throw json;
  return json.data;
}

export async function updatePreferences(
  payload: UpdatePreferencesPayload,
): Promise<UserPreferences | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/preferences`, {
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
  return (json as PreferencesResponse).data;
}
```

## Recomendacion para CSRF con `fetch`

Antes del primer `PATCH`/`POST`/`DELETE` en una sesion, aseguren:

```ts
await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
  method: 'GET',
  credentials: 'include',
});
```

Si su wrapper no agrega `X-XSRF-TOKEN` automaticamente, reutilicen el helper definido en Modulo 1.

---

## Integracion con store global (recomendada)

## Opcion A (preferida): bootstrap como hidratacion inicial + PATCH para persistencia

1. Al entrar a `/app`, usar `GET /api/v1/app/bootstrap`
2. Guardar `data.preferences` en store
3. En Settings, al guardar cambios:
   - llamar `PATCH /api/v1/preferences`
   - reemplazar `store.preferences` con `response.data`
4. (opcional) si cambiaron `locale`, actualizar tambien `store.user.locale` localmente

### Nota

El backend ya sincroniza `users.locale`, asi que un siguiente `/app/bootstrap` devolvera ambos alineados.

## Opcion B: refetch de bootstrap despues de guardar

Mas simple, menos eficiente:

1. `PATCH /api/v1/preferences`
2. `GET /api/v1/app/bootstrap`
3. rehacer hidratacion parcial/total del store

---

## Ejemplos de uso en UI (patron recomendado)

## Guardado de Settings con merge directo

```ts
async function onSaveSettings(patch: UpdatePreferencesPayload) {
  try {
    const updated = await updatePreferences(patch);

    if (updated === null) {
      // sesion expirada
      router.navigate('/login');
      return;
    }

    appStore.setState((s) => ({
      ...s,
      preferences: updated,
      user:
        patch.locale && s.user
          ? { ...s.user, locale: updated.locale }
          : s.user,
    }));
  } catch (error: any) {
    if (error?.errors) {
      // mapear por campo para mostrar mensajes propios
      return;
    }

    // error 500 / red
  }
}
```

---

## Manejo de errores frontend (M3)

## `401`

- Sesion expirada
- Redirigir a `/login`
- Opcional: limpiar store de auth/app

## `422`

- Mostrar errores por campo en formulario de Settings
- No depender del texto exacto del backend

## `500`

- Mostrar toast/banner de error recuperable
- Permitir reintento de guardado

---

## Checklist de integracion (frontend) - Modulo 3

- [ ] El frontend mantiene `/app/bootstrap` como fuente principal de hidratacion inicial
- [ ] Settings usa `PATCH /api/v1/preferences` para persistir cambios
- [ ] Requests usan `credentials: 'include'`
- [ ] Antes de mutaciones existe flujo de CSRF (`/sanctum/csrf-cookie`)
- [ ] UI soporta `PATCH` parcial (guardar solo campos cambiados)
- [ ] UI maneja `422` por campo (`locale`, `time_zone_name`, `background_music_volume_percent`)
- [ ] Tras guardar, el store actualiza `preferences` con la respuesta completa
- [ ] Si cambia `locale`, UI actualiza tambien `user.locale` local o rehidrata desde bootstrap
- [ ] `GET /api/v1/preferences` puede usarse para recarga puntual de Settings (opcional)

---

## Nota para el equipo frontend

Con Modulo 3, `preferences` deja de ser solo parte del bootstrap y pasa a tener endpoints propios de lectura/escritura.

La recomendacion es:

- usar `/app/bootstrap` para cargar la app
- usar `/preferences` para gestionar Settings en tiempo real sin refetch completo del dashboard

