import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBackwardStep,
  faForwardStep,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import type { SoundOption } from '../types'
import { classNames } from '../utils/classNames'

type AmbientSoundPanelProps = {
  sounds: SoundOption[]
  selectedSoundId: string
  isPlaying: boolean
  onSoundSelect: (soundId: string) => void
  onTogglePlayback: () => void
}

export function AmbientSoundPanel({
  sounds,
  selectedSoundId,
  isPlaying,
  onSoundSelect,
  onTogglePlayback,
}: AmbientSoundPanelProps) {
  const { locale } = useI18n()
  const [playbackProgress, setPlaybackProgress] = useState(28)
  const selectedIndex = Math.max(
    0,
    sounds.findIndex((sound) => sound.id === selectedSoundId),
  )
  const selectedSound = sounds[selectedIndex] ?? sounds[0]
  const trackDurationSeconds = 18 * 60
  const copy =
    locale === 'es'
      ? {
          ambientAudio: 'Audio ambiental',
          noSound: 'Sin sonido',
          playing: 'Reproduciendo',
          paused: 'Pausado',
          focusMix: 'Mezcla de enfoque',
          youtubeStyle: 'Estilo YouTube',
          previousSound: 'Sonido ambiental anterior',
          nextSound: 'Siguiente sonido ambiental',
          pauseSound: 'Pausar sonido ambiental',
          playSound: 'Reproducir sonido ambiental',
          timeline: 'Linea de tiempo de audio ambiental',
        }
      : {
          ambientAudio: 'Ambient Audio',
          noSound: 'No sound',
          playing: 'Playing',
          paused: 'Paused',
          focusMix: 'Focus mix',
          youtubeStyle: 'Youtube-style',
          previousSound: 'Previous ambient sound',
          nextSound: 'Next ambient sound',
          pauseSound: 'Pause ambient sound',
          playSound: 'Play ambient sound',
          timeline: 'Ambient audio timeline',
        }

  const getSoundLabel = (soundId: string, fallbackLabel: string) => {
    const labels =
      locale === 'es'
        ? {
            rain: 'Lluvia',
            forest: 'Bosque',
            cafe: 'Cafe',
            waves: 'Olas',
          }
        : {
            rain: 'Rain',
            forest: 'Forest',
            cafe: 'Cafe',
            waves: 'Waves',
          }

    return labels[soundId as keyof typeof labels] ?? fallbackLabel
  }

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const intervalId = window.setInterval(() => {
      setPlaybackProgress((current) => {
        const next = current + 100 / trackDurationSeconds
        return next >= 100 ? 0 : next
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isPlaying, trackDurationSeconds])

  useEffect(() => {
    setPlaybackProgress(0)
  }, [selectedSoundId])

  const handleSelectPrevious = () => {
    if (sounds.length === 0) {
      return
    }

    const nextIndex = (selectedIndex - 1 + sounds.length) % sounds.length
    onSoundSelect(sounds[nextIndex].id)
  }

  const handleSelectNext = () => {
    if (sounds.length === 0) {
      return
    }

    const nextIndex = (selectedIndex + 1) % sounds.length
    onSoundSelect(sounds[nextIndex].id)
  }

  const currentSeconds = Math.round((playbackProgress / 100) * trackDurationSeconds)

  const formatClock = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <section className="border-t border-slate-800 bg-[#040b18] px-4 py-4">
      <div className="rounded-2xl border border-slate-800/80 bg-[linear-gradient(180deg,rgba(9,16,31,0.9),rgba(6,12,24,0.95))] p-3 shadow-[0_12px_34px_rgba(2,8,20,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.ambientAudio}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-300">
                <FontAwesomeIcon icon={selectedSound?.icon ?? faPlay} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {selectedSound ? getSoundLabel(selectedSound.id, selectedSound.label) : copy.noSound}
                </p>
                <p className="text-[11px] text-slate-500">{isPlaying ? copy.playing : copy.paused} - {copy.focusMix}</p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {copy.youtubeStyle}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            aria-label={copy.previousSound}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            onClick={handleSelectPrevious}
            type="button"
          >
            <FontAwesomeIcon className="text-sm" icon={faBackwardStep} />
          </button>

          <button
            aria-label={isPlaying ? copy.pauseSound : copy.playSound}
            className="grid h-11 w-11 place-items-center rounded-full border border-blue-500/35 bg-blue-500/15 text-blue-100 shadow-[0_8px_20px_rgba(59,130,246,0.2)] transition hover:border-blue-400/55 hover:bg-blue-500/25"
            onClick={onTogglePlayback}
            type="button"
          >
            <FontAwesomeIcon className={classNames('text-base', !isPlaying && 'translate-x-[1px]')} icon={isPlaying ? faPause : faPlay} />
          </button>

          <button
            aria-label={copy.nextSound}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            onClick={handleSelectNext}
            type="button"
          >
            <FontAwesomeIcon className="text-sm" icon={faForwardStep} />
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium tabular-nums text-slate-500">
            <span>{formatClock(currentSeconds)}</span>
            <span>{formatClock(trackDurationSeconds)}</span>
          </div>
          <input
            aria-label={copy.timeline}
            className="ambient-progress-slider h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800"
            max={100}
            min={0}
            onChange={(event) => setPlaybackProgress(Number(event.target.value))}
            type="range"
            value={playbackProgress}
          />
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {sounds.map((sound) => {
            const selected = selectedSoundId === sound.id

            return (
              <button
                aria-label={getSoundLabel(sound.id, sound.label)}
                className={classNames(
                  'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition',
                  selected
                    ? 'border-blue-500/45 bg-blue-500/12 text-blue-200'
                    : 'border-slate-700/80 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200',
                )}
                key={sound.id}
                onClick={() => onSoundSelect(sound.id)}
                title={getSoundLabel(sound.id, sound.label)}
                type="button"
              >
                {selected ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" /> : null}
                <FontAwesomeIcon className="text-[11px]" icon={sound.icon} />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
