# Velor Backend - Modulo 7 (Realtime / WebSocket con Reverb) - Handoff para equipo Laravel

## Objetivo del modulo

Agregar sincronizacion en tiempo real del contador entre dispositivos (laptop/celular) usando WebSocket, manteniendo:

- **HTTP** como canal de comandos de negocio (`start/pause/resume/switch-task/stop`)
- **WebSocket** como canal de notificacion/sincronizacion de estado
- **backend** como fuente de verdad del contador (server-authoritative)

## Resultado esperado (funcional)

Con M7 listo:

- al iniciar/pausar/reanudar/cambiar tarea/detener en un dispositivo, los otros dispositivos del mismo usuario se actualizan en tiempo real
- el frontend recibe snapshots de sesion activa por WebSocket
- la sincronizacion por polling/heartbeat (M5) queda como fallback, no como mecanismo principal
- el historial (M6) se sigue alimentando desde backend; WebSocket solo ayuda a reflejar cambios mas rapido

---

## Dependencias directas

Este modulo depende de:

- **Modulo 1 (Auth)** operativo
  - Sanctum (sesion via cookie)
  - `GET /api/v1/auth/me`
- **Modulo 2 (`/app/bootstrap`)** operativo
  - `server_now_utc`
  - `active_focus_session`
- **Modulo 5 (Focus Sessions)** operativo
  - `GET /api/v1/focus-sessions/active`
  - `POST /start|pause|resume|switch-task|stop|heartbeat`
  - control de concurrencia por `version + expected_version`
- **Modulo 6 (Time Entries + History)** operativo
  - `created_time_entry_id` en `stop/switch-task` (extension M6)

Referencias:
- `docs/backend/module-1-auth-laravel-handoff.md`
- `docs/backend/module-2-app-bootstrap-laravel-handoff.md`
- `docs/backend/module-5-focus-sessions-laravel-handoff.md`
- `docs/backend/module-6-time-entries-history-laravel-handoff.md`

---

## Alcance (MVP)

### Incluido
- configuracion de broadcasting con `Laravel Reverb`
- canales privados para sincronizacion de foco por usuario
- emision de eventos realtime desde comandos de `focus-sessions`
- contrato estable de payload para frontend (snapshot completo)
- autorizacion de canal usando sesion Sanctum
- pruebas de emision de eventos y scoping por usuario
- compatibilidad con polling/heartbeat de M5 como fallback

### Opcional en esta entrega (si da tiempo)
- evento adicional de invalidez de historial (`history.updated`) cuando se crea `time_entry`
- presencia multi-dispositivo (conteo de dispositivos conectados)
- dedupe por `origin_device_id`
- compresion/serializacion custom para eventos de alto volumen

### Fuera de alcance (este modulo)
- notificaciones push (mobile/web push)
- colaboracion multiusuario en tiempo real dentro del mismo workspace
- chat, comentarios o presencia avanzada
- reconciliacion automatica de estado por jobs (eso entra en M8 hardening si hiciera falta)

---

## Decisiones tecnicas (obligatorias)

## 1. HTTP sigue siendo el canal de comando
- `start/pause/resume/switch-task/stop` se ejecutan por **HTTP**.
- WebSocket **no** reemplaza validacion, policies ni transacciones del backend.
- El frontend no debe enviar comandos del contador solo por WebSocket.

## 2. WebSocket solo difunde snapshots (estado)
- Los eventos deben incluir el snapshot autoritativo para que cualquier cliente pueda sincronizarse sin pedir estado adicional.
- El payload debe ser compatible con el envelope de M5/M6 (`server_now_utc`, `active_focus_session`, etc.).

## 3. Emitir eventos despues de commit
- Los eventos realtime deben despacharse **despues** de confirmar cambios en DB.
- Evitar emitir antes de `DB::commit()` para no enviar estados fantasma.

## 4. Scoping por usuario (canal privado)
- Recomendado para MVP: canal privado por usuario:
  - `private.user.{userId}.focus`
- Todos los dispositivos del mismo usuario se suscriben a ese canal.
- No exponer eventos de un usuario a otro.

## 5. Version de sesion sigue siendo el orden de verdad
- `active_focus_session.version` se mantiene como referencia para orden y conflictos.
- El frontend puede ignorar snapshots mas antiguos si recibe uno fuera de orden.

## 6. Heartbeat M5 se mantiene como fallback
- Aunque M7 este activo, **no** eliminar `heartbeat` inmediatamente.
- El frontend puede seguir usando `GET /active` / `heartbeat` si WebSocket falla o se desconecta.

---

# Stack y configuracion del modulo (Laravel)

## Stack recomendado

- `Laravel Reverb`
- `Laravel Broadcasting`
- `Redis` (broadcast / queue / cache)
- `Laravel Echo` (frontend)

## Configuracion base esperada

### `.env` (backend)
```env
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=redis
CACHE_STORE=redis

REVERB_APP_ID=velor
REVERB_APP_KEY=xxxx
REVERB_APP_SECRET=xxxx
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
```

### Laravel
- `config/broadcasting.php` con conexion `reverb`
- `routes/channels.php` para canales privados
- `php artisan reverb:start` en desarrollo
- workers/cola operativos en produccion si se emiten eventos queued

> Recomendacion: usar Redis + queue workers desde el inicio para evitar bloquear requests HTTP si el volumen crece.

---

# Canal realtime del modulo

## Canal MVP recomendado

### `private.user.{userId}.focus`

### Proposito
- difundir cambios del contador del usuario autenticado a todos sus dispositivos

### Autorizacion (ejemplo conceptual)
```php
Broadcast::channel('user.{userId}.focus', function ($user, string $userId) {
    return (string) $user->id === (string) $userId;
});
```

### Reglas
- Requiere sesion valida (`auth:sanctum`)
- Solo el mismo usuario puede suscribirse a su canal

---

# Eventos del modulo (contrato realtime)

## Formato general recomendado

Todos los eventos de foco deben enviar un payload alineado a M5/M6:

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

> El frontend ya entiende el shape base de `data` por M5.  
> `type/meta` pueden ser extras para debug/telemetria (recomendado).

---

## Evento 1 (obligatorio): `focus_session.updated`

### Para que sirve
Evento generico para cambios de estado de la sesion activa:

- `start`
- `pause`
- `resume`
- `switch-task`
- `heartbeat` (opcional; normalmente no hace falta emitir)

### Payload
- `data.server_now_utc`
- `data.active_focus_session` (snapshot autoritativo, puede ser `null` solo si el comando finaliza sesion)
- `data.stopped_session_summary` (normalmente `null`)
- `data.created_time_entry_id` (opcional, sobre todo en `switch-task` si persistio bloque saliente por M6)

### Evento de ejemplo (`switch-task` con persistencia)
```json
{
  "type": "focus_session.updated",
  "data": {
    "server_now_utc": "2026-03-03T18:31:42Z",
    "active_focus_session": {
      "id": "uuid-session",
      "task_id": "uuid-task-b",
      "timer_mode": "stopwatch",
      "session_state": "running",
      "target_seconds": null,
      "started_at_utc": "2026-03-03T18:00:00Z",
      "last_resumed_at_utc": "2026-03-03T18:31:42Z",
      "last_paused_at_utc": null,
      "elapsed_seconds_total": 0,
      "version": 12
    },
    "stopped_session_summary": null,
    "created_time_entry_id": "uuid-time-entry"
  }
}
```

---

## Evento 2 (obligatorio): `focus_session.stopped`

### Para que sirve
Difundir que la sesion activa termino (user stop o timer complete).

### Payload
- `data.server_now_utc`
- `data.active_focus_session = null`
- `data.stopped_session_summary`
- `data.created_time_entry_id` (opcional, esperado en M6 cuando `elapsed > 0`)

### Evento de ejemplo (`timer_complete`)
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
  }
}
```

---

## Evento 3 (opcional recomendado): `history.updated`

### Para que sirve
Avisar a frontend que invalide `history/overview`, `history/days` y/o `/app/bootstrap` cuando se crea un `time_entry`.

### Cuando emitir
- `focus-sessions/stop` (si genero `time_entry`)
- `focus-sessions/switch-task` (si genero `time_entry`)
- `POST /time-entries` manual

### Payload sugerido
```json
{
  "type": "history.updated",
  "data": {
    "server_now_utc": "2026-03-03T18:25:10Z",
    "time_entry_id": "uuid-time-entry",
    "affected_date_local": "2026-03-03"
  }
}
```

> Este evento es opcional porque el frontend ya puede re-sync por respuestas HTTP (M6).  
> Aun asi es util para reflejar cambios hechos en otro dispositivo sin polling.

---

# Integracion con Modulo 5 (Focus Sessions)

## Donde emitir eventos (hook points)

Los eventos realtime deben despacharse desde el servicio/controlador de `focus-sessions` **despues del commit**:

- `POST /focus-sessions/start` -> `focus_session.updated`
- `POST /focus-sessions/pause` -> `focus_session.updated`
- `POST /focus-sessions/resume` -> `focus_session.updated`
- `POST /focus-sessions/switch-task` -> `focus_session.updated`
- `POST /focus-sessions/stop` -> `focus_session.stopped`
- `POST /focus-sessions/heartbeat` -> **normalmente no emitir**

## Recomendacion de implementacion

### Opcion A (simple y valida)
- Construir el payload usando el mismo envelope que ya devuelve el endpoint HTTP.
- Reusar un mapper/serializer comun:
  - `FocusSessionResponseBuilder`
  - `FocusSessionSnapshotResource`

### Opcion B (mas limpia)
- Centralizar la logica de snapshot en un service:
  - `FocusSessionSnapshotFactory`
- El endpoint HTTP y el evento broadcast comparten esa salida.

> Evitar duplicar mapeos del snapshot en controller + event.

---

# Integracion con Modulo 6 (Time Entries / History)

## Cambio esperado en comportamiento (sin romper contratos)

Cuando `stop` o `switch-task` persisten un bloque `focus` (M6):

- la respuesta HTTP ya puede traer `created_time_entry_id`
- el evento WebSocket debe incluir **el mismo campo** para permitir invalidacion remota en frontend

## Recomendacion
- Si se implementa `history.updated`, emitirlo junto con `focus_session.updated/stopped` cuando exista `created_time_entry_id`.
- Si no se implementa `history.updated`, al menos incluir `created_time_entry_id` en el evento de foco.

---

# Impacto en BD respecto a Modulo 6 (que se agrega / modifica)

## Tablas nuevas (obligatorias)
- **Ninguna** para MVP de M7.

## Tablas existentes reutilizadas
- `active_focus_sessions` (M5)
- `focus_session_events` (M5, si ya existe)
- `time_entries` (M6, solo para contexto de `created_time_entry_id`)

## Modificaciones de BD (obligatorias)
- **Ninguna** para MVP.

## Modificaciones opcionales (si quieren trazabilidad mejorada)

### `focus_session_events` (si existe)
Agregar alguno(s) de estos campos:

```txt
focus_session_events (opcionales)
- broadcast_event_name: varchar(80), nullable
- broadcasted_at_utc: timestamptz, nullable
- origin_device_id: varchar(100), nullable
- command_request_id: varchar(100), nullable
```

### Para que sirve
- auditar que evento se emitio por comando
- dedupe / observabilidad
- diagnosticar problemas multi-dispositivo

> Esto es opcional. M7 puede salir sin cambios de schema si el equipo quiere minimizar riesgo.

---

# Contrato de errores y comportamiento

## HTTP (sin cambios)
- Se mantienen errores M5/M6:
  - `401` (sesion expirada)
  - `404`
  - `409` (version mismatch, etc.)
  - `422`

## WebSocket

### Recomendacion practica
- No enviar "errores de negocio" por WebSocket.
- Los errores de negocio se resuelven por la respuesta HTTP del comando.
- WebSocket solo difunde estados confirmados.

### Casos esperados
- cliente desconectado -> frontend fallback por polling/heartbeat
- reconexion -> frontend re-suscribe y puede pedir `GET /focus-sessions/active`

---

# Entregables Laravel esperados (Modulo 7)

## 1. Configuracion y runtime
- `reverb` configurado y corriendo
- `broadcasting` configurado con `reverb`
- `routes/channels.php` con canal privado `user.{userId}.focus`

## 2. Eventos
- `FocusSessionUpdated` (broadcast)
- `FocusSessionStopped` (broadcast)
- (opcional) `HistoryUpdated`

## 3. Integracion en servicios/controladores M5/M6
- dispatch de eventos despues de commit
- payloads consistentes con snapshot M5/M6

## 4. Seguridad
- autorizacion de canales por usuario
- no filtrar datos de otros usuarios/workspaces

## 5. Tests
- tests de autorizacion de canal
- tests de emision de eventos por `start/pause/resume/switch-task/stop`
- tests de payload shape (campos minimos)
- tests de no-emision en rollback/error

## 6. Documentacion operativa minima
- como levantar `reverb` en local
- variables de entorno requeridas
- como probar sincronizacion multi-dispositivo

---

# Pruebas recomendadas (QA tecnico)

## Caso 1: Start en laptop, reflejo en celular
1. Login en laptop y celular con mismo usuario
2. Suscripcion WS en ambos
3. `start` desde laptop
4. Celular recibe `focus_session.updated` con misma `task_id`, `version`, `timer_mode`

## Caso 2: Pause / Resume cross-device
1. Sesion corriendo
2. `pause` desde laptop
3. Celular refleja estado `paused`
4. `resume` desde celular
5. Laptop refleja estado `running`

## Caso 3: Switch task con persistencia M6
1. Sesion corriendo con tiempo acumulado > 0
2. `switch-task`
3. Evento incluye `created_time_entry_id`
4. Frontend invalida/refresca historial (si ya esta integrado M7 frontend)

## Caso 4: Stop por timer complete
1. Temporizador llega a 0
2. `stop` backend
3. Evento `focus_session.stopped`
4. `active_focus_session = null`

## Caso 5: Aislamiento de usuarios
1. Usuario A y B conectados
2. A ejecuta `start/pause`
3. B no recibe eventos de A

---

# Criterios de aceptacion del modulo

- [ ] `Reverb` operativo en local y entorno de integracion
- [ ] Canal privado `user.{userId}.focus` autorizado correctamente
- [ ] `start/pause/resume/switch-task/stop` emiten evento realtime despues de commit
- [ ] Payload del evento incluye `server_now_utc` y `active_focus_session` (y `stopped_session_summary` en `stop`)
- [ ] `created_time_entry_id` viaja en eventos cuando aplique (M6)
- [ ] No hay fugas de datos entre usuarios
- [ ] Polling/heartbeat M5 sigue funcionando como fallback si WS falla

---

# Orden de implementacion recomendado (backend M7)

1. Configurar `Reverb` + broadcasting
2. Crear canal privado y su policy de autorizacion
3. Crear eventos (`FocusSessionUpdated`, `FocusSessionStopped`)
4. Integrar dispatch post-commit en M5 (`start/pause/resume/switch-task/stop`)
5. (Opcional) `HistoryUpdated` desde M6
6. Tests de seguridad + payloads + dispatch
7. Validacion manual con dos navegadores/dispositivos

---

## Nota para el siguiente paso (frontend)

Cuando backend entregue M7, el handoff para frontend debe incluir:

- nombre exacto del canal
- nombre exacto de eventos broadcast
- payload final exacto
- auth endpoint para broadcasting (si usan endpoint custom)
- estrategia de reconexion (si usan Echo defaults o custom)

