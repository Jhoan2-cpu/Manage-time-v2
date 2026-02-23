type SettingToggleProps = {
  label: string
  description: string
  checked: boolean
  onChange: (nextValue: boolean) => void
}

export function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl bg-slate-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(51,65,85,0.28)]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>

      <button
        aria-pressed={checked}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-blue-500/70' : 'bg-slate-700/70'
        }`}
        onClick={(event) => {
          event.preventDefault()
          onChange(!checked)
        }}
        type="button"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}
