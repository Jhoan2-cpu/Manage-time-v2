# Velor Backend - Modulo 3 (Preferencias / Settings) - Handoff para equipo Laravel

## Objetivo del modulo

Implementar la persistencia de configuraciones de usuario (Settings) para la SPA de Velor, usando endpoints dedicados:

- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences`

Este modulo permite que el frontend deje de manejar preferencias criticas solo en estado local y pueda sincronizarlas con backend.

## Dependencias directas

Este modulo depende de:

- **Modulo 1 (Auth)** operativo
  - sesion via Sanctum (cookie)
  - `users`
  - `user_preferences` creada al registrar usuario (recomendado)
- **Modulo 2 (`/app/bootstrap`)** operativo (recomendado)
  - para que los cambios de preferencias se reflejen en el bootstrap inicial

Referencias:
- `docs/backend/module-1-auth-laravel-handoff.md`
- `docs/backend/module-2-app-bootstrap-laravel-handoff.md`

---

## Alcance (MVP)

### Incluido
- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences` (update parcial)
- validacion de payload parcial
- respuesta JSON consistente
- persistencia en `user_preferences`

### Opcional en esta entrega (si da tiempo)
- soporte de `ambient_track_key` (campo future-proof)
- endpoint devuelve metadata de `supported_locales` o `time_zone_source`

### Fuera de alcance (este modulo)
- CRUD de tareas (Modulo 4)
- contador server-authoritative (Modulo 5)
- historial / stats (Modulo 6)
- realtime WebSocket (Modulo 7)

---

## Decisiones tecnicas (obligatorias)

## 1. Auth y scoping
- Endpoint protegido con `auth:sanctum`
- Las preferencias son **solo del usuario autenticado**
- No aceptar `user_id` desde frontend

## 2. PATCH parcial (no PUT)
- `PATCH /api/v1/preferences` debe aceptar uno o varios campos
- Solo actualizar campos presentes en request
- Mantener valores actuales en campos omitidos

## 3. Respuesta consistente
Recomendado (y preferido para frontend):
- `GET` devuelve **todas** las preferencias
- `PATCH` devuelve **todas** las preferencias actualizadas (no solo el subset enviado)

Esto simplifica la hidratacion del frontend y evita estados parciales.

## 4. Defaults y resiliencia
- Debe existir una fila en `user_preferences` por usuario
- Si no existe (caso legacy/importado), usar `firstOrCreate` con defaults seguros

## 5. Zona horaria (IANA)
- `time_zone_name` debe validarse como IANA timezone valida
- Si el valor es invalido:
  - responder `422` (no guardar)

## 6. Volumen de musica
- `background_music_volume_percent`:
  - entero `0..100`
- reforzar con:
  - validacion de request
  - constraint/check en DB (si es posible)

---

# Endpoints (contrato de integracion)

## 1) `GET /api/v1/preferences`

### Para que sirve
Devuelve las preferencias actuales del usuario autenticado para inicializar Settings en frontend.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request
- Sin body
- Sin query

### Response (exito, `200`)

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

### Comportamiento esperado si no existe fila de preferencias
Opcion recomendada (resiliente):
- crear fila con defaults (`firstOrCreate`)
- responder `200` con defaults

Alternativa aceptable:
- responder `500` si esto se considera inconsistencia critica (menos recomendable)

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `500 Internal Server Error`
- error inesperado al leer/crear preferencias
- debe loguear contexto (`user_id`)

---

## 2) `PATCH /api/v1/preferences`

### Para que sirve
Actualiza una o varias preferencias del usuario autenticado.

### Auth
- Requerida (cookie de sesion / Sanctum)

### Request (JSON parcial)

Ejemplo minimo:
```json
{
  "locale": "en"
}
```

Ejemplo realista:
```json
{
  "locale": "es",
  "time_zone_name": "America/Lima",
  "time_zone_auto_detect": true,
  "ui_sounds_enabled": true,
  "background_music_enabled": false,
  "background_music_volume_percent": 62,
  "confirm_task_switch_enabled": true,
  "sign_out_confirmation_enabled": true
}
```

### Campos permitidos (update parcial)
- `locale`
- `time_zone_name`
- `time_zone_auto_detect`
- `ui_sounds_enabled`
- `background_music_enabled`
- `background_music_volume_percent`
- `confirm_task_switch_enabled`
- `sign_out_confirmation_enabled`

### Validaciones minimas (sugeridas)
- `locale`: sometimes|in:es,en
- `time_zone_name`: sometimes|string|max:80|timezone
- `time_zone_auto_detect`: sometimes|boolean
- `ui_sounds_enabled`: sometimes|boolean
- `background_music_enabled`: sometimes|boolean
- `background_music_volume_percent`: sometimes|integer|min:0|max:100
- `confirm_task_switch_enabled`: sometimes|boolean
- `sign_out_confirmation_enabled`: sometimes|boolean

### Regla de negocio recomendada
Si `time_zone_auto_detect = true`, igual se puede almacenar `time_zone_name` como fallback manual.

### Response (exito, `200`) - recomendado (objeto completo)

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

### Errores esperados

#### `401 Unauthorized`
```json
{
  "message": "Unauthenticated."
}
```

#### `422 Unprocessable Entity` (validacion)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "background_music_volume_percent": ["Debe estar entre 0 y 100."],
    "time_zone_name": ["La zona horaria no es valida."]
  }
}
```

#### `500 Internal Server Error`
- error inesperado al persistir preferencias
- loguear contexto (`user_id`, payload_keys`)

---

# Impacto en BD respecto al Modulo 2 (que se agrega / que se modifica)

## Estado actual esperado (Modulo 2 ya implementado)
Tablas ya existentes:
- `users`
- `workspaces`
- `workspace_members`
- `user_preferences`
- `tasks` (si M2 se implemento completo)
- `time_entries` (opcional en M2)
- `active_focus_sessions` (opcional en M2)

## Tablas que se agregan para Modulo 3
- **Ninguna obligatoria**

Este modulo trabaja sobre `user_preferences`.

## Tabla que se usa (obligatoria)

### `user_preferences`
Debe existir con al menos estos campos:

```txt
user_preferences(
  user_id: uuid (PK, FK -> users.id)
  locale: enum("es","en")
  time_zone_name: varchar(80)
  time_zone_auto_detect: boolean
  ui_sounds_enabled: boolean
  background_music_enabled: boolean
  background_music_volume_percent: smallint(0..100)
  confirm_task_switch_enabled: boolean
  sign_out_confirmation_enabled: boolean
  created_at: timestamp
  updated_at: timestamp
)
```

## Que se modifica (si viene de Modulo 1 con version minima)

### Caso A: `user_preferences` ya tiene todas las columnas
- No hay cambios de esquema obligatorios
- Solo implementar endpoints + validacion

### Caso B: `user_preferences` existe pero incompleta
Agregar columnas faltantes (si aplica):
- `ui_sounds_enabled`
- `background_music_enabled`
- `background_music_volume_percent`
- `confirm_task_switch_enabled`
- `sign_out_confirmation_enabled`
- `time_zone_auto_detect`

### Caso C: constraint de volumen aun no existe
Agregar check recomendado:

```sql
CHECK (background_music_volume_percent >= 0 AND background_music_volume_percent <= 100)
```

## Indices
- PK sobre `user_id` es suficiente para este modulo
- No se requieren indices extra

---

## Defaults recomendados (DB / aplicacion)

Valores recomendados para creacion (registro o autocreacion):
- `locale = 'es'`
- `time_zone_name = 'UTC'` (o timezone detectada en backend si la tienen)
- `time_zone_auto_detect = true`
- `ui_sounds_enabled = true`
- `background_music_enabled = false`
- `background_music_volume_percent = 60`
- `confirm_task_switch_enabled = true`
- `sign_out_confirmation_enabled = true`

> Importante: Modulo 2 (`/app/bootstrap`) ya devuelve `preferences`.
> Este modulo debe mantener el mismo shape/campos para compatibilidad.

---

## Orden de migraciones / cambios (si hace falta alterar BD)

### Camino recomendado (sin interrupciones)
1. Crear migracion aditiva para completar `user_preferences` (si faltan columnas)
2. Backfill defaults en filas existentes (si hay nulls legacy)
3. Agregar constraints/checks (volumen 0..100)
4. Deploy backend con endpoints `GET/PATCH /preferences`
5. Verificar que `/app/bootstrap` (Modulo 2) siga respondiendo `preferences` con mismo contrato

---

## Implementacion Laravel esperada (entregables)

## Rutas (`routes/api.php`)
- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences`

Ambas bajo middleware:
- `auth:sanctum`

## Controllers
- `PreferencesController`
  - `show()`
  - `update(UpdatePreferencesRequest $request)`

## Form Requests
- `UpdatePreferencesRequest`
  - reglas `sometimes`
  - sanitizacion opcional (trim strings)

## Resources
- `UserPreferencesResource`
  - debe devolver el shape exacto del contrato (Modulo 2 / frontend)

## Services (opcional, recomendado)
- `UserPreferencesService`
  - `getOrCreateForUser(User $user)`
  - `updateForUser(User $user, array $payload)`

Esto evita duplicar logica entre `GET /preferences` y `/app/bootstrap`.

---

## Flujo de backend recomendado

## `GET /api/v1/preferences`
1. Resolver usuario autenticado
2. Obtener preferencias (`firstOrCreate`)
3. Responder `UserPreferencesResource`

## `PATCH /api/v1/preferences`
1. Validar payload parcial (`UpdatePreferencesRequest`)
2. Resolver preferencias del usuario (`firstOrCreate`)
3. Aplicar solo keys presentes
4. Guardar
5. Responder `UserPreferencesResource` completo

---

## Pruebas (Feature tests) obligatorias

## `GET /api/v1/preferences`
- `401` sin sesion
- `200` con sesion
- autocreacion si no existe fila (si adoptan estrategia `firstOrCreate`)

## `PATCH /api/v1/preferences`
- `401` sin sesion
- `200` update parcial de 1 campo (`locale`)
- `200` update multiple campos
- `422` timezone invalida
- `422` volumen fuera de rango
- no debe permitir actualizar preferencias de otro usuario (scoping por auth)

## Integracion con Modulo 2
- tras `PATCH /preferences`, `GET /api/v1/app/bootstrap` debe reflejar valores actualizados

---

## Criterios de aceptacion (QA funcional)

- [ ] `GET /api/v1/preferences` responde el objeto completo de preferencias
- [ ] `PATCH /api/v1/preferences` acepta payload parcial
- [ ] Validaciones de `locale`, `time_zone_name`, `background_music_volume_percent` funcionan
- [ ] Los cambios persisten en DB
- [ ] `/app/bootstrap` sigue devolviendo `preferences` con los cambios aplicados
- [ ] Endpoints protegidos con Sanctum (`401` sin sesion)

---

## Nota para equipo backend (compatibilidad con frontend actual)

El frontend actual (post Modulo 2) ya consume `preferences` desde `/app/bootstrap`.

Al integrar Modulo 3:
- el frontend empezara a persistir cambios de Settings con `PATCH /api/v1/preferences`
- luego podra rehidratar desde `/app/bootstrap` o `GET /api/v1/preferences`

Mantener el **mismo shape de `preferences`** evita cambios breaking en frontend.
