import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartColumn,
  faChevronDown,
  faClockRotateLeft,
  faGear,
  faRightFromBracket,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

type FocusHeaderProps = {
  timeLabel: string
  timeZoneName: string
  utcOffsetLabel: string
  onOpenSettings?: () => void
  onOpenProfile?: () => void
  userName?: string
  userEmail?: string
}

export function FocusHeader({
  timeLabel,
  timeZoneName,
  utcOffsetLabel,
  onOpenSettings,
  onOpenProfile,
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
  const handleOpenProfileFromMenu = () => {
    setIsUserMenuOpen(false)
    onOpenProfile?.()
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
              className="absolute right-0 top-[calc(100%+12px)] w-[min(86vw,324px)] overflow-hidden rounded-2xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(10,19,37,0.98),rgba(6,14,29,0.98))] shadow-[0_28px_80px_rgba(1,8,22,0.68)] backdrop-blur-xl"
              role="menu"
            >
              <div className="relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-500/8 to-transparent" />

                <div className="border-b border-slate-800/90 px-5 py-5">
                  <div className="flex items-center gap-4">
                    <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-blue-500/25 via-blue-400/10 to-slate-800 text-sm font-semibold text-slate-100 ring-2 ring-blue-400/40 shadow-[0_8px_24px_rgba(59,130,246,0.18)]">
                      {userInitials}
                      <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#081122] bg-emerald-400" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-tight text-slate-100">{userName}</p>
                      <p className="truncate text-sm text-slate-400">{userEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-3">
                  <button
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800/70"
                    onClick={handleOpenProfileFromMenu}
                    role="menuitem"
                    type="button"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition group-hover:text-slate-200">
                      <FontAwesomeIcon icon={faUser} />
                    </span>
                    <span className="text-base text-slate-200">Personal Profile</span>
                  </button>

                  <button
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800/70"
                    onClick={handleOpenSettingsFromMenu}
                    role="menuitem"
                    type="button"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition group-hover:text-slate-200">
                      <FontAwesomeIcon icon={faGear} />
                    </span>
                    <span className="text-base text-slate-200">Workspace Settings</span>
                  </button>

                  <button
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800/70"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                    type="button"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition group-hover:text-slate-200">
                      <FontAwesomeIcon icon={faChartColumn} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base leading-tight text-slate-200">Focus Statistics</span>
                      <span className="block truncate text-xs text-slate-500">Weekly report available</span>
                    </span>
                  </button>
                </div>

                <div className="border-t border-slate-800/90 px-3 py-3">
                  <button
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800/70"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                    type="button"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition group-hover:text-slate-200">
                      <FontAwesomeIcon icon={faRightFromBracket} />
                    </span>
                    <span className="text-base text-slate-200">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
