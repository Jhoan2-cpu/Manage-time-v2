import { useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope,
  faKey,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

type ProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  userName?: string
  userEmail?: string
}

export function ProfileModal({
  isOpen,
  onClose,
  userName = 'Anton Rivera',
  userEmail = 'anton@focusflow.app',
}: ProfileModalProps) {
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
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="modal-overlay-animate fixed inset-0 z-[84] flex items-center justify-center bg-[#020a18]/82 px-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        aria-labelledby="profile-modal-title"
        aria-modal="true"
        className="modal-card-animate w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0a1325]/95 shadow-[0_28px_90px_rgba(1,8,22,0.78)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100" id="profile-modal-title">
              Personal Profile
            </h2>
          </div>
          <button
            aria-label="Close profile"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            onClick={onClose}
            type="button"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="relative px-5 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-500/8 to-transparent" />

          <div className="relative flex items-center gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/25 p-4">
            <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500/30 via-blue-400/10 to-slate-800 text-base font-semibold text-slate-100 ring-2 ring-blue-400/35">
              {userInitials}
              <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0a1325] bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-tight text-slate-100">{userName}</p>
              <p className="truncate text-sm text-slate-400">{userEmail}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <ProfileField icon={faUser} label="Display Name" value={userName} />
            <ProfileField icon={faEnvelope} label="Email" value={userEmail} />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <FontAwesomeIcon className="text-slate-400" icon={faKey} />
              <span>Security</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Manage your account password.</p>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/16 hover:border-blue-400/35"
              data-sfx-type="off"
              type="button"
            >
              <FontAwesomeIcon className="text-xs" icon={faKey} />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-800/80 px-5 py-4">
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}

type ProfileFieldProps = {
  icon: (typeof faUser)
  label: string
  value: string
}

function ProfileField({ icon, label, value }: ProfileFieldProps) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        <FontAwesomeIcon className="text-slate-400" icon={icon} />
        <span>{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-medium text-slate-200">{value}</p>
    </div>
  )
}
