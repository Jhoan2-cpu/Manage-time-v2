# Backend Runtime - Regla Global de Redondeo (780ms) para Timer y Stopwatch

Fecha: 2026-03-07  
Alcance: regla transversal de calculo de segundos para runtime y persistencia en PostgreSQL.

## 1) Objetivo

Unificar frontend y backend en el mismo redondeo de tiempo transcurrido:

1. si la fraccion de segundo es menor a `780ms`, se mantiene el segundo actual,
2. si la fraccion es `>= 780ms`, se cuenta el siguiente segundo.

Ejemplo:

1. `3.779s` => `3s`
2. `3.780s` => `4s`

## 2) Regla canonica

Para cualquier tramo calculado desde timestamps:

1. `delta_ms = max(0, event_at_ms - anchor_at_ms)`
2. `whole_seconds = floor(delta_ms / 1000)`
3. `remainder_ms = delta_ms % 1000`
4. `delta_seconds_rounded = whole_seconds + (remainder_ms >= 780 ? 1 : 0)`

Observaciones:

1. no usar redondeo tradicional `round(x)` ni truncado puro `floor(x)` para runtime,
2. la regla aplica igual para modo `timer` y `stopwatch`,
3. si el endpoint usa `event_at_utc` del cliente como tiempo de negocio, ese valor se respeta para este calculo.

## 3) SQL de referencia (PostgreSQL)

```sql
-- event_at_utc y anchor_at_utc son timestamptz
WITH diff AS (
  SELECT GREATEST(
           0,
           FLOOR(EXTRACT(EPOCH FROM (event_at_utc - anchor_at_utc)) * 1000)
         )::bigint AS delta_ms
)
SELECT
  (delta_ms / 1000)
  + CASE WHEN (delta_ms % 1000) >= 780 THEN 1 ELSE 0 END
AS delta_seconds_rounded
FROM diff;
```

## 4) Donde aplicar en runtime

Aplicar `delta_seconds_rounded` en toda transicion que derive segundos desde timestamps:

1. `working -> paused` (timer y stopwatch),
2. `working -> idle` por `stop` (timer y stopwatch),
3. cierre por `timer_completed`/auto-stop,
4. cualquier recalc de `elapsed_seconds_total` en sesion activa.

No aplica a:

1. valores ya enteros almacenados en DB (no volver a redondear un entero),
2. contadores de configuracion (`timer_initial_seconds`, `target_seconds`) que ya son enteros.

## 5) Integracion por modo

### 5.1 Stopwatch

1. `elapsed_final = elapsed_base + delta_seconds_rounded`
2. mantener monotonia (`elapsed_final >= elapsed_base`)

### 5.2 Timer

1. `consumed = min(remaining_actual, delta_seconds_rounded)` (evitar sobreconsumo),
2. `remaining_new = max(0, remaining_actual - consumed)`,
3. `elapsed_total = target_seconds - remaining_new` (si el contrato usa este derivado).

## 6) Persistencia y consistencia

1. `focus_time_entries.elapsed_seconds` debe persistirse con esta regla,
2. `focus_tasks.total_tracked_seconds` debe incrementarse con el mismo `delta_seconds_rounded`,
3. no debe existir doble conteo al combinar pause/stop sobre el mismo tramo.

## 7) Casos de prueba minimos (aceptacion)

Usando mismo `anchor_at_utc`:

1. `event_at_utc = anchor + 3.100s` => `delta=3`
2. `event_at_utc = anchor + 3.779s` => `delta=3`
3. `event_at_utc = anchor + 3.780s` => `delta=4`
4. `event_at_utc = anchor + 3.999s` => `delta=4`
5. `event_at_utc < anchor` => `delta=0`

Timer adicional:

1. `remaining_actual=2`, `delta=4` => `consumed=2`, `remaining_new=0` (nunca negativo).

## 8) Compatibilidad de contrato

1. No cambia el formato de request/response.
2. Solo cambia la politica de calculo interno de segundos.
3. Recomendado exponer en changelog que desde esta fecha el runtime usa umbral `780ms`.

