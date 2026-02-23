import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faClockRotateLeft,
  faGear,
  faRightFromBracket,
  faSliders,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

type FocusHeaderProps = {
  timeLabel: string
  timeZoneName: string
  utcOffsetLabel: string
  onOpenSettings?: () => void
  userName?: string
  userEmail?: string
}

export function FocusHeader({
  timeLabel,
  timeZoneName,
  utcOffsetLabel,
  onOpenSettings,
  userName = 'Anton',
  userEmail = 'anton@focusflow.app',
}: FocusHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const userInitials = useMemo(() => {
    const parts = userName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)

    if (parts.length === 0) {
      return 'U'
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'
  }, [userName])

  useEffect(() => {
    if (!isUserMenuOpen) {
      return
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (userMenuRef.current?.contains(target)) {
        return
      }

      setIsUserMenuOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isUserMenuOpen])

  const handleOpenSettingsFromMenu = () => {
    setIsUserMenuOpen(false)
    onOpenSettings?.()
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#071125]/95 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/20">
          <FontAwesomeIcon icon={faClockRotateLeft} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">FocusFlow</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right leading-tight md:block">
          <p className="tabular-nums text-sm font-semibold text-slate-200">{timeLabel}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {timeZoneName} ({utcOffsetLabel})
          </p>
        </div>

        <div className="hidden h-8 w-px bg-slate-800 md:block" />

        <button
          aria-label="Open settings"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          onClick={onOpenSettings}
          type="button"
        >
          <FontAwesomeIcon icon={faGear} />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label="Open user menu"
            className="flex items-center gap-2 rounded-full pl-1 pr-2 text-slate-200 transition hover:bg-slate-800/90"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            type="button"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-500/35 via-indigo-500/20 to-slate-800 text-xs font-semibold text-slate-100 ring-1 ring-blue-400/25">
              {userInitials}
              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-[#071125] bg-emerald-400" />
            </span>
            <FontAwesomeIcon
              className={`text-[11px] text-slate-400 transition ${isUserMenuOpen ? 'rotate-180' : ''}`}
              icon={faChevronDown}
            />
          </button>

          {isUserMenuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0a1325]/95 shadow-[0_20px_50px_rgba(1,8,22,0.6)] backdrop-blur-xl"
              role="menu"
            >
              <div className="border-b border-slate-800/90 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-sm font-semibold text-blue-100 ring-1 ring-blue-400/20">
                    {userInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">{userName}</p>
                    <p className="truncate text-xs text-slate-400">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800/80"
                  onClick={() => setIsUserMenuOpen(false)}
                  role="menuitem"
                  type="button"
                >
                  <FontAwesomeIcon className="w-4 text-slate-400" icon={faUser} />
                  <span>Profile</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800/80"
                  onClick={handleOpenSettingsFromMenu}
                  role="menuitem"
                  type="button"
                >
                  <FontAwesomeIcon className="w-4 text-slate-400" icon={faSliders} />
                  <span>Settings</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-500/10"
                  onClick={() => setIsUserMenuOpen(false)}
                  role="menuitem"
                  type="button"
                >
                  <FontAwesomeIcon className="w-4 text-rose-300" icon={faRightFromBracket} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
