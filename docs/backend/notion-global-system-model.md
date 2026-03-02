# VELOR - Modelo Global de BD (Notion)

## Regla Global de Documentacion

Cada nueva documentacion funcional debe reflejarse en este Mermaid ER global.

Regla operativa:
1. Si aparece una tabla nueva, se agrega aqui.
2. Si aparece una relacion nueva, se agrega aqui.
3. Este es el diagrama de referencia para BD global.

---

## Mermaid ER Global (BD)

```mermaid
erDiagram
USERS ||--|| USER_PREFERENCES : has
USERS ||--o{ OAUTH_ACCOUNTS : links
USERS ||--o{ TASKS : owns
USERS ||--o{ FOCUS_SESSIONS : owns
USERS ||--o| ACTIVE_UNTRACKED_SESSIONS : has_active
USERS ||--o{ TIME_ENTRIES : logs
TASKS ||--o{ FOCUS_SESSIONS : used_in
TASKS ||--o{ TIME_ENTRIES : accumulates
FOCUS_SESSIONS ||--o{ TIME_ENTRIES : materializes

USERS {
    uuid id
    string display_name
    string email
    string password_hash
    string locale
    timestamp email_verified_at
    timestamp created_at
    timestamp updated_at
}

USER_PREFERENCES {
    uuid id
    uuid user_id
    string locale
    string time_zone_name
    boolean ui_sounds_enabled
    boolean background_music_enabled
    int background_music_volume_percent
    boolean confirm_task_switch_enabled
    boolean sign_out_confirmation_enabled
    timestamp created_at
    timestamp updated_at
}

OAUTH_ACCOUNTS {
    uuid id
    uuid user_id
    string provider
    string provider_user_id
    string provider_email
    text avatar_url
    text access_token
    text refresh_token
    timestamp token_expires_at
    timestamp created_at
    timestamp updated_at
}

TASKS {
    uuid id
    uuid user_id
    string title
    string color_tag
    string icon_tag
    int target_duration_seconds
    string alarm_time_local
    int focus_time_total_seconds
    int focus_sessions_count
    timestamp created_at
    timestamp updated_at
}

FOCUS_SESSIONS {
    uuid id
    uuid user_id
    uuid task_id
    string timer_mode
    int target_seconds_snapshot
    string session_state
    timestamp started_at_utc
    timestamp last_resumed_at_utc
    timestamp last_paused_at_utc
    int elapsed_seconds_total
    int version
    timestamp stopped_at_utc
    string stopped_reason
    timestamp created_at
    timestamp updated_at
}

ACTIVE_UNTRACKED_SESSIONS {
    uuid id
    uuid user_id
    timestamp started_at_utc
    timestamp created_at
    timestamp updated_at
}

TIME_ENTRIES {
    uuid id
    uuid user_id
    uuid task_id
    uuid focus_session_id
    string entry_type
    string timer_mode_snapshot
    int target_seconds_snapshot
    timestamp started_at_utc
    timestamp ended_at_utc
    int duration_seconds
    timestamp created_at
    timestamp updated_at
}
```

---

## Cambios Aplicados (2026-03-02)

- Se agrego modulo de contador/sesiones + daily log al ER global.
- Se agregaron tablas `FOCUS_SESSIONS`, `ACTIVE_UNTRACKED_SESSIONS` y `TIME_ENTRIES`.
- Se agregaron relaciones de sesiones y registros de tiempo con `USERS` y `TASKS`.
