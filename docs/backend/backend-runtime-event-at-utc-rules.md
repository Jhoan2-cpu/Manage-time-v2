# Reglas Backend - Runtime Focus con `event_at_utc`

Fecha: 2026-03-06  
Estado: contrato propuesto para alinear tiempo de negocio con click del cliente.

## 1) Objetivo

En `start/pause/resume/stop`, el timestamp efectivo de negocio debe venir del frontend (`event_at_utc`) para evitar sesgo por latencia de red.

## 2) Endpoints afectados

1. `POST /api/v1/focus-sessions/start`
2. `POST /api/v1/focus-sessions/pause`
3. `POST /api/v1/focus-sessions/resume`
4. `POST /api/v1/focus-sessions/stop`

## 3) Regla obligatoria de request

1. `event_at_utc` es obligatorio en los 4 endpoints.
2. `event_at_utc` debe venir en ISO-8601 UTC.
3. `pause/resume/stop` mantienen `expected_version` obligatorio.

## 4) Validaciones obligatorias de backend

1. Validar formato de `event_at_utc`.
2. Validar desfase máximo contra `server_now_utc` (recomendado: `+-120s`).
3. Si excede la ventana permitida, responder `422 CLOCK_SKEW_TOO_LARGE`.

## 5) Orden temporal (monotonicidad)

1. Para una misma sesión, `event_at_utc` no puede ser menor que el último timestamp aplicado (`last_transition_at_utc`).
2. Si llega un evento fuera de orden, responder `409 EVENT_OUT_OF_ORDER`.

## 6) Cálculo de tiempo de negocio

1. El cálculo de elapsed/remaining usa `event_at_utc`, no `now()` del servidor.
2. No permitir deltas negativos (clamp a `0`).
3. Al pausar/detener, acumular tiempo usando el delta entre `last_resumed_at_utc` y `event_at_utc`.

## 7) Concurrencia

1. `expected_version` se valida contra `focus_tasks.version`.
2. Si no coincide, responder `409 TASK_VERSION_CONFLICT` con snapshot actual para reintento.

## 8) Respuesta mínima requerida

1. `server_now_utc`
2. `effective_event_at_utc` (timestamp finalmente aplicado por backend)
3. `active_focus_session`
4. En `stop`, incluir `stopped_session_summary` cuando aplique.

## 9) Códigos de error de contrato

1. `422 VALIDATION_ERROR`
2. `422 CLOCK_SKEW_TOO_LARGE`
3. `409 EVENT_OUT_OF_ORDER`
4. `409 TASK_VERSION_CONFLICT`
5. `409 ACTIVE_SESSION_CONFLICT`
6. `409 FOCUS_RUNTIME_CONFLICT`

