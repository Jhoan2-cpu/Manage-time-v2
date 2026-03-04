import type { AppRoute } from '../types'

export function getBrowserPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname || '/'
}

export function isKnownPath(pathname: string) {
  return pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/app'
}

export function resolveRoute(pathname: string): AppRoute {
  if (pathname === '/login') {
    return 'login'
  }

  if (pathname === '/register') {
    return 'register'
  }

  if (pathname === '/app') {
    return 'app'
  }

  return 'home'
}

export function navigateTo(pathname: string, replace = false) {
  if (typeof window === 'undefined') {
    return
  }

  const nextPath = pathname || '/'
  if (window.location.pathname === nextPath) {
    return
  }

  if (replace) {
    window.history.replaceState(null, '', nextPath)
    return
  }

  window.history.pushState(null, '', nextPath)
}
