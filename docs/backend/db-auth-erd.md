# DB ERD - Auth Simple (Usuario Personal)

Este modelo elimina multi-workspace para mantener la app simple y personal.

```mermaid
erDiagram
    USERS ||--|| USER_PREFERENCES : has
    USERS ||--o{ OAUTH_ACCOUNTS : links

    USERS {
        uuid id PK
        string display_name
        string email UK
        string password_hash
        string locale
        timestamp email_verified_at
        timestamp created_at
        timestamp updated_at
    }

    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK_UK
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
        uuid id PK
        uuid user_id FK
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
```

## Reglas recomendadas

- `users.email` unique
- `user_preferences.user_id` unique (1:1 con users)
- `oauth_accounts(provider, provider_user_id)` unique
- `oauth_accounts(user_id, provider)` unique
- `users.locale` y `user_preferences.locale`: solo `es|en`
- `user_preferences.time_zone_name`: validar con Laravel `timezone` (IANA)
