# Auth API (JWT) - Frontend <-> Backend (Desde Cero)

Fecha: 2026-03-06  
Estado: contrato propuesto para nueva implementacion backend JWT.

## 1) Scope

Este documento define el modulo de autenticacion para un backend nuevo con JWT:

- Register
- Login
- Refresh token
- Logout
- Me (sesion actual)
- Google OAuth (redirect/callback)
- Regla de sesion unica por usuario (single active session)

No cubre runtime focus, taskcards ni preferencias avanzadas fuera de `user_settings`.

## 2) Base y convenciones

- Base URL local backend: `http://localhost:8001`
- Version API: `/api/v1`
- IDs en JSON: siempre `string` (aunque DB use `bigint`)
- Fechas/timestamps: ISO-8601 UTC (`2026-03-06T06:30:00Z`)
- Respuesta de exito: envelope `{"data": ...}` (excepto logout con mensaje simple)

## 3) Modelo de datos auth (alineado al esquema)

Tablas del esquema usadas por auth:

- `users`
- `user_settings`
- `user_oauth_identities`

Relaciones relevantes:

- `users 1:1 user_settings` (`user_settings.user_id` unique)
- `users 1:N user_oauth_identities`

Regla de locale:

- `user_settings.locale` = fuente de verdad
- `users.locale` = copia denormalizada (debe mantenerse sincronizada en la misma transaccion)

## 4) Modelo JWT

### 4.1 Tipos de token

- Access token JWT (corto): recomendado `15m`
- Refresh token JWT u opaque (largo): recomendado `30d`

### 4.2 Sesion unica por usuario (obligatorio)

Objetivo: un usuario solo puede tener 1 sesion activa.

Regla:

- En cada login exitoso se invalida la sesion/token previo del mismo usuario.
- Solo el ultimo `session_jti` emitido es valido.

Implementacion sugerida (sin cambiar tablas de dominio):

- Guardar `session_jti` actual en store tecnico (Redis recomendado):  
  `auth:user:{userId}:current_session_jti = <uuid>`
- Incluir `session_jti` en access/refresh.
- Middleware valida que el `session_jti` del token coincida con el actual.

Si no coincide:

- `401 Unauthorized`
- `code: "SESSION_REVOKED"`

## 5) Normalizacion frontend obligatoria

### 5.1 locale

- `navigator.language`/`navigator.languages` (BCP-47)
- Si empieza con `es` -> `es`
- Si empieza con `en` -> `en`
- Otro -> `es`

### 5.2 time_zone_name

- `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Debe ser IANA (ej: `America/Lima`)

## 6) Endpoints

## 6.1 Register

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

Validaciones backend:

- `display_name`: `required|string|min:2|max:120`
- `email`: `required|email|max:255|unique:users,email`
- `password`: `required|string|min:8|confirmed`
- `locale`: `required|in:es,en`
- `time_zone_name`: `required|timezone`

Efectos:

- Crear `users`
- Crear `user_settings`
- Sincronizar `users.locale` con `user_settings.locale`
- Emitir access/refresh token
- Aplicar politica de sesion unica
- Todo en transaccion

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

Errores:

- `422` validacion
- `500` interno

## 6.2 Login

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "anton@velor.app",
  "password": "secret12345"
}
```

Response `200`:

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

Errores:

- `401` credenciales invalidas (`code: INVALID_CREDENTIALS`)
- `423` usuario bloqueado/inactivo (si aplica)

## 6.3 Refresh

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

Regla:

- Rotacion de refresh token (invalidar el anterior).

Errores:

- `401` token invalido/expirado/revocado (`code: TOKEN_INVALID`)

## 6.4 Logout

`POST /api/v1/auth/logout`

Headers:

- `Authorization: Bearer <access_token>`

Request (opcional):

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

Efecto:

- Revocar sesion actual (`session_jti`) y refresh token asociado.

## 6.5 Me

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

Errores:

- `401` no autenticado/token invalido

## 6.6 Google OAuth

### Redirect

`GET /api/v1/auth/google/redirect?intent=login`  
`GET /api/v1/auth/google/redirect?intent=register`

Response:

- `302` hacia Google

### Callback

`GET /api/v1/auth/google/callback`

Efectos:

- Crear/vincular `user_oauth_identities`
- Crear usuario y `user_settings` si no existe
- Emitir JWT tokens
- Aplicar sesion unica

Salida recomendada:

- `302` a `FRONTEND_URL/auth/callback#access_token=...&refresh_token=...`
  (o codigo temporal one-time si no quieres exponer tokens en fragment)

Error:

- `302` a `FRONTEND_URL/login?auth_error=google`

## 7) Formato de error estandar

`4xx/5xx`:

```json
{
  "message": "Human readable error.",
  "code": "MACHINE_READABLE_CODE",
  "errors": {
    "field_name": [
      "Validation message"
    ]
  }
}
```

`errors` solo cuando aplica (422).

## 8) Criterios de aceptacion minimos

1. Register crea `users` + `user_settings` en una transaccion.
2. Login invalida sesion previa del mismo usuario (single active session).
3. Access token vencido + refresh valido -> refresh `200`.
4. Token viejo de sesion desplazada -> `401 SESSION_REVOKED`.
5. `users.locale` y `user_settings.locale` siempre sincronizados.
6. IDs en responses siempre como `string`.

## 9) Checklist frontend

1. Guardar `access_token` en memoria (preferido).
2. Adjuntar `Authorization: Bearer ...` en requests privadas.
3. Al recibir `401`, intentar `refresh` una vez y reintentar request.
4. Si refresh falla, limpiar sesion local y redirigir a login.
5. En register enviar `locale` y `time_zone_name` normalizados.

## 10) Checklist backend

1. Middleware JWT para rutas privadas.
2. Emision y verificacion de `session_jti`.
3. Store tecnico para sesion unica por usuario.
4. Rotacion/blacklist de refresh tokens.
5. Rate limit en login/refresh.
6. Tests integracion para register/login/refresh/logout/me + sesion unica.

