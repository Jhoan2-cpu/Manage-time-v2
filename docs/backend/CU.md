# Casos de Uso (Backend - Iteración Inicial)

## Objetivo

Definir las primeras funcionalidades a implementar en backend para integrar la web por módulos, empezando por:

- autenticación (inicio de sesión / registro)
- carga inicial del panel luego de autenticarse (bootstrap)

## Observaciones de mejora sobre la versión original

- Se corrigieron problemas de codificación (acentos/ñ).
- Se ordenó el contenido con formato legible.
- Se separó `C02.5` en un caso de uso propio de carga inicial del panel.
- Se unificó la numeración a un formato más claro (`CU-01`, `CU-02`, `CU-03`).

## Alcance de esta iteración

- Login con email/contraseña
- Registro con email/contraseña
- Login/registro con Google (opcional en esta fase, pero contemplado)
- Redirección al panel principal
- Carga inicial de datos del panel (`/app bootstrap`)

## CU-01: Iniciar sesión

### Descripción
El usuario ingresa sus credenciales (`email` y `contraseña`) y el sistema valida los datos.  
Si son correctos, se inicia sesión y el usuario es redirigido al panel principal.

### Alternativa
- El usuario puede iniciar sesión con Google.

### Flujo principal
1. El usuario abre la pantalla de inicio de sesión.
2. Ingresa `email` y `contraseña`.
3. El frontend envía la solicitud al backend.
4. El backend valida las credenciales.
5. Si son válidas, crea la sesión autenticada.
6. El frontend redirige a `/app`.

### Flujo de error
1. Si las credenciales son inválidas, el backend responde error.
2. El frontend muestra un mensaje claro al usuario.

### Resultado esperado
- Sesión iniciada correctamente.
- Cookie de sesión activa (Sanctum SPA).
- Usuario listo para cargar el panel.

## CU-02: Registrar usuario

### Descripción
El usuario ingresa sus datos (`nombre`, `email`, `contraseña`) para crear una cuenta.  
Si el registro es válido, el sistema crea la cuenta e inicia sesión automáticamente.

### Alternativa
- El usuario puede registrarse con Google.

### Flujo principal
1. El usuario abre la pantalla de registro.
2. Ingresa `nombre`, `email`, `contraseña` (y confirmación de contraseña).
3. El frontend envía la solicitud al backend.
4. El backend valida los datos.
5. Si son válidos, crea el usuario y su sesión.
6. El frontend redirige a `/app`.

### Flujo de error
1. Si el email ya existe, el backend responde error.
2. Si los datos son inválidos (email, contraseña, etc.), responde error de validación.
3. El frontend muestra el mensaje correspondiente.

### Resultado esperado
- Usuario creado correctamente.
- Sesión iniciada automáticamente.
- Usuario listo para cargar el panel.

## CU-03: Cargar panel principal luego de autenticación (Bootstrap)

### Descripción
Luego de iniciar sesión o registrarse, el sistema carga automáticamente el estado inicial del panel principal con los datos necesarios para mostrar la UI sin pasos manuales.

### Datos que deben cargarse en la respuesta de bootstrap
- Tarjetas de tareas registradas del usuario
- Registro diario del día actual
- Totales del día:
  - tiempo registrado (tracked)
  - tiempo no registrado (untracked)
- Preferencias del usuario:
  - idioma
  - sonidos UI (click/escritura)
  - volumen de música de fondo
  - confirmación de cambio de tarea
  - confirmación de cierre de sesión
  - zona horaria (manual / auto-detect)
- Contador/sesión activa en progreso (si existe):
  - misma tarea activa
  - mismo modo (`timer` / `stopwatch`)
  - mismo estado (`running` / `paused`)
  - tiempo sincronizado

### Flujo principal
1. El usuario queda autenticado (por login o registro).
2. El frontend navega a `/app`.
3. El frontend solicita bootstrap al backend.
4. El backend responde el estado inicial del dashboard.
5. El frontend renderiza:
   - tasks
   - daily log
   - stats/totales
   - preferencias
   - sesión activa (si existe)

### Caso especial
- Si no existen tareas registradas:
  - el frontend muestra un estado vacío (empty state) indicando que no hay tareas.

### Resultado esperado
- El usuario entra al panel con todo lo necesario cargado.
- Si existe un contador en progreso (desde laptop/celular), se visualiza sincronizado.

## Relación con módulos backend (recomendado)

Para evitar interrupciones en la implementación, estos casos de uso conviene dividirlos en módulos:

### Módulo 1: Auth
- CU-01 (Iniciar sesión)
- CU-02 (Registrar usuario)

### Módulo 2: Bootstrap de `/app`
- CU-03 (Carga inicial del panel)

## Endpoints mínimos involucrados (referencia rápida)

### Auth (Módulo 1)
- `GET /sanctum/csrf-cookie`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Bootstrap (Módulo 2)
- `GET /api/v1/app/bootstrap`

## Notas técnicas importantes para este documento

- La autenticación web debe ser con **Laravel Sanctum (cookie de sesión)**.
- El contador debe ser **server-authoritative** para sincronizar laptop/celular.
- El bootstrap debe incluir:
  - `server_now_utc`
  - `active_focus_session`

