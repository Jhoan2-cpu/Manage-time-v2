import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_APP_LOCALE,
  SUPPORTED_APP_LOCALES,
  getBrowserAppLocale,
  messages,
  type AppLocale,
} from './messages'

type TranslationParams = Record<string, string | number>

type I18nContextValue = {
  locale: AppLocale
  setLocale: (nextLocale: AppLocale) => void
  t: (key: string, params?: TranslationParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

type I18nProviderProps = {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<AppLocale>(() => getInitialLocale())

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale)
    }
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

function getInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_LOCALE
  }

  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)
  if (stored && isSupportedLocale(stored)) {
    return stored
  }

  return getBrowserAppLocale()
}

function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_APP_LOCALES.includes(value as AppLocale)
}

function translate(locale: AppLocale, key: string, params?: TranslationParams) {
  const rawValue =
    (getNestedValue(messages[locale], key) as string | undefined) ??
    (getNestedValue(messages[DEFAULT_APP_LOCALE], key) as string | undefined) ??
    key

  if (!params) {
    return rawValue
  }

  return rawValue.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token]
    return value === undefined ? `{${token}}` : String(value)
  })
}

function getNestedValue(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[segment]
  }, source)
}
