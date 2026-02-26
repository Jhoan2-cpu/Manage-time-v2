# Velor Backend - Módulo 1 (Auth) - Handoff para equipo Laravel

## Objetivo del módulo

Implementar la autenticación web de Velor para la SPA (frontend web) usando **Laravel Sanctum con cookie de sesión**.

Este módulo debe permitir:
- registro de usuario
- inicio de sesión
- cierre de sesión
- recuperar usuario autenticado (`/auth/me`)
- (opcional) login/registro con Google

## Alcance (MVP)

### Incluido
- `GET /sanctum/csrf-cookie`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- creación de workspace personal al registrarse
- creación de preferencias por defecto al registrarse

### Opcional en esta entrega (si da tiempo)
- `GET /api/v1/auth/google/redirect`
- `GET /api/v1/auth/google/callback`

### Fuera de alcance (este módulo)
- `/app/bootstrap`
- tareas
- contador sincronizado
- historial

---

## Decisiones técnicas (obligatorias)

## 1. Tipo de autenticación (SPA web)
- **Laravel Sanctum + cookie de sesión**
- No usar Bearer token para la SPA web
- El frontend enviará cookies con `withCredentials` / `credentials: 'include'`

## 2. Respuesta mínima de usuario
El backend debe devolver un objeto usuario consistente en `register`, `login` y `me`:

```json
{
  "id": "uuid",
  "display_name": "Anton Rivera",
  "email": "anton@velor.app",
  "locale": "es"
}
```

## 3. Multi-tenant base desde el registro
Aunque el módulo es de auth, al registrar usuario se debe crear:
- `workspace` personal
- membresía `owner`
- `user_preferences` por defecto

Esto evita retrabajo en el módulo `/app`.

---

# Endpoints (contrato de integración)

## 1) `GET /sanctum/csrf-cookie`

### Para qué sirve
Inicializa la cookie CSRF de Sanctum para la SPA.

### Auth
- Público

### Request
- Sin body

### Response esperada
- `204` o `200`
- Cookies CSRF seteadas

### Errores
- `500` si hay mala configuración de sesión/cookies

---

## 2) `POST /api/v1/auth/register`

### Para qué sirve
Registra un usuario, crea su workspace personal y deja la sesión iniciada.

### Auth
- Público

### Request (JSON)
```json
{
  "display_name": "Anton Rivera",
  "email": "anton@velor.app",
  "password": "secret12345",
  "password_confirmation": "secret12345",
  "locale": "es"
}
```

### Validaciones mínimas
- `display_name`: required|string|min:2|max:120
- `email`: required|email|max:255|unique:users,email
- `password`: required|string|min:8|confirmed
- `locale`: nullable|in:es,en

### Response (éxito)
```json
{
  "data": {
    "user": {
      "id": "usr_01...",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "workspace": {
      "id": "ws_01...",
      "name": "Espacio personal de Velor"
    }
  }
}
```

### Errores esperados

#### `422` Validación
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["El correo ya está en uso."],
    "password": ["La confirmación de contraseña no coincide."]
  }
}
```

#### `500` Error de creación en cascada (raro)
Si falla crear `workspace` / `preferences`, el registro debe revertirse (transacción).

---

## 3) `POST /api/v1/auth/login`

### Para qué sirve
Autentica al usuario por email/contraseña y crea sesión.

### Auth
- Público

### Request (JSON)
```json
{
  "email": "anton@velor.app",
  "password": "secret12345"
}
```

### Validaciones mínimas
- `email`: required|email
- `password`: required|string

### Response (éxito)
```json
{
  "data": {
    "user": {
      "id": "usr_01...",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    }
  }
}
```

### Errores esperados

#### `401` Credenciales inválidas
```json
{
  "message": "Credenciales inválidas."
}
```

#### `422` Validación
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["El correo es obligatorio."]
  }
}
```

---

## 4) `POST /api/v1/auth/logout`

### Para qué sirve
Cierra la sesión del usuario autenticado.

### Auth
- Requerida (cookie de sesión)

### Request
- Sin body

### Response (éxito)
```json
{
  "message": "Logged out."
}
```

### Errores esperados
- `401` si no hay sesión válida

---

## 5) `GET /api/v1/auth/me`

### Para qué sirve
Devuelve el usuario autenticado actual (bootstrap de sesión).

### Auth
- Requerida

### Request
- Sin body

### Response (éxito)
```json
{
  "data": {
    "id": "usr_01...",
    "display_name": "Anton Rivera",
    "email": "anton@velor.app",
    "locale": "es"
  }
}
```

### Errores esperados
- `401` si no hay sesión

---

## 6) `GET /api/v1/auth/google/redirect` (opcional)

### Para qué sirve
Inicia el flujo OAuth con Google.

### Auth
- Público

### Request (query opcional)
- `intent=login|register`

### Response
- `302` redirect a Google

### Errores
- `500` configuración de Google incompleta

---

## 7) `GET /api/v1/auth/google/callback` (opcional)

### Para qué sirve
Recibe callback de Google, crea/vincula usuario y deja sesión iniciada.

### Auth
- Público (flujo OAuth)

### Request
- Query params de Google (`code`, `state`, etc.)

### Response (éxito)
- `302` redirect a frontend (`/app`)

### Errores
- `400` callback inválido
- `401` OAuth fallido
- `500` error interno

---

# Esquema de BD necesario para este módulo (Módulo 1 Auth)

## Tablas de dominio (mínimas recomendadas)

## 1) `users`
```txt
users(
  id: uuid (PK)
  display_name: varchar(120)
  email: citext (unique)
  password_hash: text | null
  locale: enum("es", "en")
  avatar_url: text | null
  email_verified_at: timestamp | null
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp | null
)
```

## 2) `workspaces`
```txt
workspaces(
  id: uuid (PK)
  owner_user_id: uuid (FK -> users.id)
  kind: enum("personal", "team")
  name: varchar(160)
  slug: varchar(160) | null (unique)
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp | null
)
```

## 3) `workspace_members`
```txt
workspace_members(
  id: uuid (PK)
  workspace_id: uuid (FK -> workspaces.id)
  user_id: uuid (FK -> users.id)
  role: enum("owner", "admin", "member")
  status: enum("active", "invited", "suspended")
  invited_by_user_id: uuid | null
  joined_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
)
```

Regla:
- `UNIQUE(workspace_id, user_id)`

## 4) `user_preferences`
```txt
user_preferences(
  user_id: uuid (PK, FK -> users.id)
  locale: enum("es", "en")
  time_zone_name: varchar(80)
  time_zone_auto_detect: boolean
  ui_sounds_enabled: boolean
  background_music_enabled: boolean
  background_music_volume_percent: smallint(0..100)
  ambient_track_key: varchar(80) | null
  confirm_task_switch_enabled: boolean
  sign_out_confirmation_enabled: boolean
  created_at: timestamp
  updated_at: timestamp
)
```

## 5) `user_identities` (solo si Google entra en este módulo)
```txt
user_identities(
  id: uuid (PK)
  user_id: uuid (FK -> users.id)
  provider: enum("google")
  provider_user_id: varchar(191)
  provider_email: citext | null
  provider_avatar_url: text | null
  access_token_encrypted: text | null
  refresh_token_encrypted: text | null
  token_expires_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
)
```

Regla:
- `UNIQUE(provider, provider_user_id)`

---

## Tablas framework / infraestructura (según configuración)

Estas no son del dominio Velor, pero pueden ser necesarias:

### Laravel session storage (si usas driver `database`)
- `sessions`

### Laravel queue storage (si usas `database` para colas; si usarán Redis, no)
- `jobs`
- `job_batches`
- `failed_jobs`

### Sanctum personal access tokens
- `personal_access_tokens` **NO es necesario** para SPA con cookie de sesión
- solo si luego exponen API con tokens personales

---

# Orden de migraciones (recomendado)

1. `users`
2. `workspaces`
3. `workspace_members`
4. `user_preferences`
5. `user_identities` (si Google)

---

# Flujo backend esperado en `register` (transaccional)

## Pasos
1. Validar request
2. Crear `users`
3. Crear `workspaces` (personal)
4. Crear `workspace_members` con rol `owner`
5. Crear `user_preferences` con defaults
6. Iniciar sesión (`Auth::login(...)`)
7. Responder `user + workspace`

## Requisito
- Todo dentro de `DB::transaction(...)`
- Si algo falla, rollback total

---

# Entregables Laravel (esperados del equipo)

## Código
- `routes/api.php` (rutas `auth/*`)
- `AuthController`
- `RegisterRequest`
- `LoginRequest`
- `UserResource`
- `GoogleAuthController` (si se implementa OAuth en esta fase)

## Configuración
- Sanctum SPA (`stateful domains`, CORS, CSRF)
- Session config correcta para web
- Socialite (si Google)

## Pruebas (mínimo)
- register éxito
- register error email duplicado
- login éxito
- login credenciales inválidas
- logout éxito
- `auth/me` con sesión
- `auth/me` sin sesión -> `401`

---

# Criterios de aceptación del Módulo 1

- El frontend puede:
  - registrarse
  - iniciar sesión
  - cerrar sesión
  - obtener usuario actual con `/auth/me`
- Se crea workspace personal y preferencias en registro
- Se usa cookie de sesión (Sanctum), no Bearer token
- Las respuestas y errores coinciden con este documento

---

# Notas para integración con frontend actual

## 1. Register
El frontend actual captura confirmación de contraseña, pero debe asegurarse de enviar:
- `password_confirmation`

## 2. Login / Register -> siguiente paso
Después de auth, el siguiente módulo que consumirá frontend es:
- `GET /api/v1/app/bootstrap`

