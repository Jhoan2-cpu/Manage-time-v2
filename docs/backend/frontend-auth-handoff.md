# Handoff Frontend - Integracion Auth API JWT

Fecha: 2026-03-06  
Backend status: implementado en Laravel (`/api/v1/auth/*`)

## 1) Base de integracion

- Base URL local backend: `http://localhost:8001`
- Prefijo API: `/api/v1/auth`
- Tipo de token: `Bearer`
- IDs en respuestas: `string`
- Fechas: ISO-8601 UTC

## 2) Endpoints disponibles

1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/login` (rate limit: 10/min por IP+email)
3. `POST /api/v1/auth/refresh` (rate limit: 30/min por IP+token)
4. `POST /api/v1/auth/logout` (privado)
5. `GET /api/v1/auth/me` (privado)
6. `GET /api/v1/auth/google/redirect?intent=login|register`
7. `GET /api/v1/auth/google/callback` (redirect backend -> frontend)

## 3) Contratos (request/response)

## 3.1 Register

`POST /api/v1/auth/register`

Request:

```json
{
  "display_name": "Anton Rivera",
  "email": "anton@velor.app",
  "password": "secret12345",
  "password_confirmation": "secret12345",
  "locale": "es",
  "time_zone_name": "America/Lima"
}
```

Response `201`:

```json
{
  "data": {
    "access_token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "12",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "settings": {
      "locale": "es",
      "time_zone_name": "America/Lima"
    }
  }
}
```

## 3.2 Login

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "anton@velor.app",
  "password": "secret12345"
}
```

Response `200` (misma estructura de `register`).

Error típico:
- `401` + `code: "INVALID_CREDENTIALS"`

## 3.3 Refresh

`POST /api/v1/auth/refresh`

Request:

```json
{
  "refresh_token": "jwt_refresh_token"
}
```

Response `200`:

```json
{
  "data": {
    "access_token": "new_jwt_access_token",
    "refresh_token": "new_jwt_refresh_token",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

Errores típicos:
- `401` + `code: "TOKEN_INVALID"`
- `401` + `code: "SESSION_REVOKED"`

Nota: el refresh rota token. El refresh anterior queda inválido.

## 3.4 Logout

`POST /api/v1/auth/logout`

Headers:
- `Authorization: Bearer <access_token>`

Request opcional:

```json
{
  "refresh_token": "jwt_refresh_token"
}
```

Response `200`:

```json
{
  "message": "Logged out."
}
```

## 3.5 Me

`GET /api/v1/auth/me`

Headers:
- `Authorization: Bearer <access_token>`

Response `200`:

```json
{
  "data": {
    "id": "12",
    "display_name": "Anton Rivera",
    "email": "anton@velor.app",
    "locale": "es",
    "settings": {
      "locale": "es",
      "time_zone_name": "America/Lima"
    }
  }
}
```

## 3.6 Google OAuth

Inicio:
- `GET /api/v1/auth/google/redirect?intent=login`
- `GET /api/v1/auth/google/redirect?intent=register`

Backend hace redirect a Google (`302`).

Callback:
- Google vuelve a `GET /api/v1/auth/google/callback`
- Backend finaliza con redirect `302` al frontend:
  - éxito: `FRONTEND_URL/auth/callback#access_token=...&refresh_token=...&token_type=Bearer&expires_in=900`
  - error: `FRONTEND_URL/login?auth_error=google`

## 4) Formato de errores

Validación (`422`):

```json
{
  "message": "The given data was invalid.",
  "code": "VALIDATION_ERROR",
  "errors": {
    "field_name": [
      "Validation message"
    ]
  }
}
```

Errores de auth comunes (`401`):

```json
{
  "message": "Human readable message",
  "code": "TOKEN_INVALID"
}
```

Codes usados:
- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `TOKEN_INVALID`
- `SESSION_REVOKED`

## 5) Reglas que frontend debe respetar

1. Guardar `access_token` en memoria (recomendado).
2. En requests privadas, enviar `Authorization: Bearer <access_token>`.
3. Ante `401`, intentar `refresh` una sola vez y reintentar request original.
4. Si refresh falla (`401`), limpiar sesión local y enviar a login.
5. `logout` debe limpiar estado local siempre (aunque backend falle).
6. Manejar `429` en login/refresh mostrando mensaje de rate limit.

## 6) Normalizacion frontend obligatoria

## 6.1 locale

Regla:
- Si idioma navegador empieza por `es` -> `es`
- Si empieza por `en` -> `en`
- Otro -> `es`

Ejemplo:

```ts
export function normalizeLocale(): 'es' | 'en' {
  const preferred = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  if (preferred.startsWith('es')) return 'es';
  if (preferred.startsWith('en')) return 'en';
  return 'es';
}
```

## 6.2 time_zone_name

```ts
export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
```

## 7) Flujo recomendado en frontend

1. App boot:
   - Si hay tokens en storage/memoria, llamar `GET /auth/me`.
2. Si `me` responde `401`:
   - Intentar `POST /auth/refresh`.
   - Si OK, reemplazar ambos tokens y repetir `me`.
   - Si falla, cerrar sesión local.
3. Login/Register:
   - Guardar `access_token` + `refresh_token`.
   - Cargar estado de usuario con `me` o payload recibido.
4. Sesión única:
   - Si otra sesión desplaza la actual, backend responderá `401 SESSION_REVOKED`.
   - UX esperada: notificar "Sesión iniciada en otro dispositivo" y enviar a login.

## 8) Checklist QA frontend

1. Register exitoso guarda tokens y entra al dashboard.
2. Login con credenciales inválidas muestra error de negocio.
3. Access token expirado + refresh válido recupera sesión sin relogin.
4. Refresh token viejo (rotado) falla y fuerza logout.
5. `SESSION_REVOKED` cierra sesión local.
6. Google OAuth éxito aterriza en `/auth/callback` y persiste tokens.
7. Google OAuth error aterriza en `/login?auth_error=google`.

