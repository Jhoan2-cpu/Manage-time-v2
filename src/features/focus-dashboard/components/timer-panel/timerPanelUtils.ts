export type TimerDraftParts = {
  hours: string
  minutes: string
  seconds: string
}

export function normalizeStopwatchLabel(timeLabel: string) {
  const parts = timeLabel.trim().split(':').filter(Boolean)

  if (parts.length === 3) {
    return parts.map((part) => part.padStart(2, '0')).join(':')
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return ['00', minutes.padStart(2, '0'), seconds.padStart(2, '0')].join(':')
  }

  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    return ['00', parts[0].padStart(2, '0'), '00'].join(':')
  }

  return '00:00:00'
}

export function parseHmsLabelToDraftParts(label: string): TimerDraftParts {
  const normalized = normalizeStopwatchLabel(label)
  const [hours = '00', minutes = '00', seconds = '00'] = normalized.split(':')
  return {
    hours,
    minutes,
    seconds,
  }
}

export function parseTimerDraftPartsToSeconds(parts: TimerDraftParts) {
  const hours = Number((parts.hours || '0').trim())
  const minutes = Number((parts.minutes || '0').trim())
  const seconds = Number((parts.seconds || '0').trim())

  if (![hours, minutes, seconds].every((value) => Number.isFinite(value) && value >= 0)) {
    return null
  }

  if (minutes > 59 || seconds > 59) {
    return null
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  if (totalSeconds <= 0) {
    return null
  }

  return Math.min(Math.floor(totalSeconds), 24 * 60 * 60)
}
