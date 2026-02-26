# Velor Frontend - Integración Módulo 1 Auth (Laravel Sanctum + Google)

## Objetivo

Integrar el frontend SPA de Velor con el backend Laravel (Módulo 1 Auth) usando:

- **Sanctum + cookie de sesión** (sin Bearer token para web)
- `register`, `login`, `logout`, `auth/me`
- login con Google vía redirect/callback (Socialite)

Este documento está alineado con la implementación real del backend ya creada en `backend/`.

---

## Estado actual del backend (ya implementado)

Base local:

- `http://localhost:8000`

Endpoints disponibles:

- `GET /sanctum/csrf-cookie`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/google/redirect`
- `GET /api/v1/auth/google/callback` (lo consume Google, no el frontend directamente)

---

## Requisitos importantes en frontend (muy importante)

## 1) Usar cookies en requests

Debes enviar cookies en todas las requests al backend:

- `fetch`: `credentials: 'include'`
- `axios`: `withCredentials: true`

## 2) Pedir CSRF antes de POST/PATCH/DELETE

Antes de `register`, `login`, `logout`:

1. `GET /sanctum/csrf-cookie`
2. Luego el `POST` correspondiente

## 3) No mezclar `localhost` y `127.0.0.1`

Para evitar problemas de cookies/sesión:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

Evita usar `127.0.0.1` en uno y `localhost` en el otro.

## 4) Google OAuth se prueba desde navegador

No llames manualmente `google/callback` desde Postman para flujo normal.

El frontend debe redirigir el navegador a:

- `GET /api/v1/auth/google/redirect?intent=login`

Google regresará al backend y el backend redirige al frontend (`/app`).

---

## Variables de entorno recomendadas en frontend

Ejemplo (`.env` de Vite):

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Contrato de datos (Auth)

## Usuario (respuesta consistente)

```json
{
  "id": "uuid",
  "display_name": "Anton Rivera",
  "email": "anton@velor.app",
  "locale": "es"
}
```

## Register (`POST /api/v1/auth/register`)

Request:

```json
{
  "display_name": "Anton Rivera",
  "email": "anton@velor.app",
  "password": "secret12345",
  "password_confirmation": "secret12345",
  "locale": "es"
}
```

Response éxito (`201`):

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    },
    "workspace": {
      "id": "uuid",
      "name": "Espacio personal de Velor"
    }
  }
}
```

## Login (`POST /api/v1/auth/login`)

Request:

```json
{
  "email": "anton@velor.app",
  "password": "secret12345"
}
```

Response éxito (`200`):

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "display_name": "Anton Rivera",
      "email": "anton@velor.app",
      "locale": "es"
    }
  }
}
```

Error credenciales (`401`):

```json
{
  "message": "Credenciales inválidas."
}
```

## Me (`GET /api/v1/auth/me`)

Response éxito (`200`):

```json
{
  "data": {
    "id": "uuid",
    "display_name": "Anton Rivera",
    "email": "anton@velor.app",
    "locale": "es"
  }
}
```

Sin sesión (`401`)

## Logout (`POST /api/v1/auth/logout`)

Response éxito (`200`):

```json
{
  "message": "Logged out."
}
```

---

## Flujo frontend recomendado (MVP)

## Al abrir la app

1. Intentar `GET /api/v1/auth/me`
2. Si `200`: guardar usuario autenticado en estado global
3. Si `401`: estado `guest`

## Registro

1. `GET /sanctum/csrf-cookie`
2. `POST /api/v1/auth/register`
3. Guardar `data.user` en estado global
4. Navegar a `/app` (o pantalla siguiente)

## Login

1. `GET /sanctum/csrf-cookie`
2. `POST /api/v1/auth/login`
3. Guardar `data.user`
4. Navegar a `/app`

## Logout

1. `GET /sanctum/csrf-cookie` (recomendado)
2. `POST /api/v1/auth/logout`
3. Limpiar estado auth en frontend
4. Navegar a `/login`

## Login con Google

1. Frontend hace redirect navegador a:
   - `/api/v1/auth/google/redirect?intent=login`
2. Google autentica
3. Google vuelve a backend `/api/v1/auth/google/callback`
4. Backend crea/inicia sesión y redirige a:
   - `${FRONTEND_URL}/app`
5. En `/app`, frontend llama `GET /api/v1/auth/me` para cargar usuario actual

---

## Implementación recomendada (frontend)

## 1) Cliente HTTP base (fetch)

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function apiFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    ...init,
  });

  return response;
}

export async function ensureCsrfCookie() {
  await apiFetch('/sanctum/csrf-cookie', { method: 'GET' });
}
```

## 2) API Auth (fetch)

```ts
export type AuthUser = {
  id: string;
  display_name: string;
  email: string;
  locale: 'es' | 'en';
};

type RegisterPayload = {
  display_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  locale?: 'es' | 'en';
};

export async function register(payload: RegisterPayload) {
  await ensureCsrfCookie();
  const res = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw json;
  return json as { data: { user: AuthUser; workspace: { id: string; name: string } } };
}

export async function login(email: string, password: string) {
  await ensureCsrfCookie();
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();
  if (!res.ok) throw json;
  return json as { data: { user: AuthUser } };
}

export async function me() {
  const res = await apiFetch('/api/v1/auth/me', { method: 'GET' });
  if (res.status === 401) return null;

  const json = await res.json();
  if (!res.ok) throw json;
  return (json as { data: AuthUser }).data;
}

export async function logout() {
  await ensureCsrfCookie();
  const res = await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw json;
  return json as { message: string };
}

export function loginWithGoogle(intent: 'login' | 'register' = 'login') {
  window.location.href = `${API_BASE_URL}/api/v1/auth/google/redirect?intent=${intent}`;
}
```

## 3) Alternativa con Axios (si ya usas Axios)

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export async function ensureCsrfCookie() {
  await api.get('/sanctum/csrf-cookie');
}
```

---

## Estado global de autenticación (recomendado)

Estado mínimo:

- `status: 'idle' | 'loading' | 'authenticated' | 'guest'`
- `user: AuthUser | null`

Flujo recomendado:

- al montar app: `status='loading'` -> `me()` -> `authenticated|guest`
- `login/register`: actualizar `user` y `status='authenticated'`
- `logout`: `user=null`, `status='guest'`

---

## Manejo de errores (UX recomendado)

## Validación (`422`)

Laravel responde formato:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["..."],
    "password": ["..."]
  }
}
```

Frontend:

- mapear `errors` por campo
- mostrar `message` fallback si no hay errores por campo

## Auth (`401`)

- `login`: mostrar "Credenciales inválidas."
- `me`: tratar como usuario no autenticado (no mostrar toast de error)
- `logout`: si falla por sesión expirada, limpiar estado local igual

---

## Rutas/guardas en frontend (recomendado)

## Páginas públicas

- `/login`
- `/register`

## Páginas protegidas

- `/app`

## Regla simple

- Si `status='guest'` y ruta protegida -> redirect `/login`
- Si `status='authenticated'` y ruta `/login` o `/register` -> redirect `/app`

---

## Checklist de integración (frontend)

- [ ] `VITE_API_BASE_URL=http://localhost:8000`
- [ ] Requests con `credentials: 'include'` / `withCredentials: true`
- [ ] Se llama `GET /sanctum/csrf-cookie` antes de `register/login/logout`
- [ ] `me()` se ejecuta al cargar la app
- [ ] `register` envía `password_confirmation`
- [ ] Se manejan `422` por campo
- [ ] Botón "Continuar con Google" hace redirect navegador al backend
- [ ] Después de volver de Google a `/app`, frontend vuelve a llamar `me()`
- [ ] No se almacenan tokens en `localStorage` para auth web

---

## Problemas comunes y solución rápida

## 1) `401` en `login/register` después de pedir CSRF

Revisar:

- usar `localhost` en frontend y backend (no mezclar con `127.0.0.1`)
- `credentials: 'include'`
- backend corriendo en `http://localhost:8000`

## 2) Google `invalid_client`

Revisar en `backend/.env`:

- `GOOGLE_CLIENT_ID` real
- `GOOGLE_CLIENT_SECRET` real

Y luego:

```powershell
cd backend
php artisan optimize:clear
```

## 3) Google `redirect_uri_mismatch`

El URI configurado en Google Cloud debe ser **exactamente**:

- `http://localhost:8000/api/v1/auth/google/callback`

---

## Nota final (Postman)

La colección Postman sirve para probar `csrf`, `register`, `login`, `me`, `logout`.

Para Google OAuth, la prueba normal debe hacerse desde **navegador**, no con callback manual en Postman, porque el `state` depende de la sesión del flujo iniciado por `/google/redirect`.

