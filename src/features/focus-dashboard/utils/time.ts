export function formatUtcOffset(minutesOffset: number) {
  const sign = minutesOffset <= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(minutesOffset)
  const hours = Math.floor(absoluteOffset / 60)
  const minutes = absoluteOffset % 60

  if (minutes === 0) {
    return `UTC${sign}${hours}`
  }

  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`
}

export function parseDurationLabelToSeconds(durationLabel: string) {
  const value = durationLabel.trim().toLowerCase()

  const hmsMatch = value.match(/^(\d+):(\d{2}):(\d{2})$/)
  if (hmsMatch) {
    const hours = Number(hmsMatch[1])
    const minutes = Number(hmsMatch[2])
    const seconds = Number(hmsMatch[3])
    return hours * 3600 + minutes * 60 + seconds
  }

  const hourMinuteMatch = value.match(/^(\d+):(\d+)\s*h(?:r|rs)?s?$/)
  if (hourMinuteMatch) {
    const hours = Number(hourMinuteMatch[1])
    const minutes = Number(hourMinuteMatch[2])
    return hours * 3600 + minutes * 60
  }

  const hourOnlyMatch = value.match(/^(\d+)\s*h(?:r|rs)?s?$/)
  if (hourOnlyMatch) {
    return Number(hourOnlyMatch[1]) * 3600
  }

  const minuteMatch = value.match(/^(\d+)\s*min(?:s)?$/)
  if (minuteMatch) {
    return Number(minuteMatch[1]) * 60
  }

  return 0
}

export function parseDurationLabelToMinutes(durationLabel: string) {
  return Math.floor(parseDurationLabelToSeconds(durationLabel) / 60)
}

export function formatMinutesCompact(totalMinutes: number) {
  const boundedMinutes = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(boundedMinutes / 60)
  const minutes = boundedMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export function formatSecondsHms(totalSeconds: number) {
  const boundedSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(boundedSeconds / 3600)
  const minutes = Math.floor((boundedSeconds % 3600) / 60)
  const seconds = boundedSeconds % 60

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}
