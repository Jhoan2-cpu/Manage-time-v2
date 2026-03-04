import type { AppLocale } from '../../../i18n/messages'
import type { AuthApiUser } from '../api'
import type { AppSessionUser } from '../types'

export function deriveDisplayNameFromEmail(email: string, fallback = 'Velor User') {
  const localPart = email.trim().split('@')[0] ?? ''

  if (!localPart) {
    return fallback
  }

  const formatted = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')

  return formatted || fallback
}

export function mapAuthApiUserToSessionUser(user: AuthApiUser, fallbackDisplayName: string): AppSessionUser {
  const normalizedEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''

  return {
    id: user.id,
    email: normalizedEmail,
    displayName:
      typeof user.display_name === 'string' && user.display_name.trim()
        ? user.display_name.trim()
        : deriveDisplayNameFromEmail(normalizedEmail, fallbackDisplayName),
    locale: normalizeLocale(user.locale),
  }
}

function normalizeLocale(locale: AppLocale | undefined): AppLocale {
  return locale === 'en' ? 'en' : 'es'
}
