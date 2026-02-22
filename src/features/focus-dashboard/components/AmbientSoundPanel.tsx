import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh } from '@fortawesome/free-solid-svg-icons'
import type { SoundOption } from '../types'
import { classNames } from '../utils/classNames'

type AmbientSoundPanelProps = {
  sounds: SoundOption[]
  selectedSoundId: string
  volume: number
  onSoundSelect: (soundId: string) => void
  onVolumeChange: (volume: number) => void
}

export function AmbientSoundPanel({
  sounds,
  selectedSoundId,
  volume,
  onSoundSelect,
  onVolumeChange,
}: AmbientSoundPanelProps) {
  return (
    <section className="mx-auto w-full max-w-[640px] rounded-2xl border border-slate-800 bg-slate-900/45 p-4 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Ambient Sound</h3>
        <div className="flex items-center gap-3">
          <FontAwesomeIcon className="text-blue-400" icon={faVolumeHigh} />
          <input
            className="h-1 w-28 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
            max={100}
            min={0}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            type="range"
            value={volume}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sounds.map((sound) => {
          const selected = selectedSoundId === sound.id

          return (
            <button
              className={classNames(
                'relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition',
                selected
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/40'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-200',
              )}
              key={sound.id}
              onClick={() => onSoundSelect(sound.id)}
              type="button"
            >
              {selected ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-400" /> : null}
              <FontAwesomeIcon className="text-xl" icon={sound.icon} />
              <span className="text-sm font-medium">{sound.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
