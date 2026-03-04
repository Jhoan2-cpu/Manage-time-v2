import type { AppLocale } from '../../i18n/messages'

export type AppSessionUser = {
  id: string
  displayName: string
  email: string
  locale: AppLocale
}

export type AppRoute = 'home' | 'login' | 'register' | 'app'
export type AuthStatus = 'loading' | 'guest' | 'authenticated'
