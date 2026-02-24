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

  const compactHourMinuteSecondMatch = value.match(
    /^(\d+)\s*h(?:r|rs)?s?\s+(\d+)\s*m(?:in|ins)?s?(?:\s+(\d+)\s*s(?:ec|ecs|econd|econds)?s?)?$/,
  )
  if (compactHourMinuteSecondMatch) {
    const hours = Number(compactHourMinuteSecondMatch[1])
    const minutes = Number(compactHourMinuteSecondMatch[2])
    const seconds = Number(compactHourMinuteSecondMatch[3] ?? '0')
    return hours * 3600 + minutes * 60 + seconds
  }

  const hourOnlyMatch = value.match(/^(\d+)\s*h(?:r|rs)?s?$/)
  if (hourOnlyMatch) {
    return Number(hourOnlyMatch[1]) * 3600
  }

  const minuteSecondMatch = value.match(/^(\d+)\s*m(?:in|ins)?s?\s+(\d+)\s*s(?:ec|ecs|econd|econds)?s?$/)
  if (minuteSecondMatch) {
    const minutes = Number(minuteSecondMatch[1])
    const seconds = Number(minuteSecondMatch[2])
    return minutes * 60 + seconds
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

export function formatSecondsCompact(totalSeconds: number) {
  const boundedSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(boundedSeconds / 3600)
  const minutes = Math.floor((boundedSeconds % 3600) / 60)
  const seconds = boundedSeconds % 60

  if (hours === 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
}

export function formatSecondsHms(totalSeconds: number) {
  const boundedSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(boundedSeconds / 3600)
  const minutes = Math.floor((boundedSeconds % 3600) / 60)
  const seconds = boundedSeconds % 60

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function getSupportedTimeZones() {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[]
  }

  try {
    const values = intlWithSupportedValues.supportedValuesOf?.('timeZone')
    if (values && values.length > 0) {
      return values
    }
  } catch {
    // Fallback list below
  }

  return [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Mexico_City',
    'America/Guatemala',
    'America/Bogota',
    'America/Lima',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Athens',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland',
  ]
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })

    const parts = formatter.formatToParts(date)
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value

    const year = Number(getPart('year'))
    const month = Number(getPart('month'))
    const day = Number(getPart('day'))
    const hour = Number(getPart('hour'))
    const minute = Number(getPart('minute'))
    const second = Number(getPart('second'))

    if (![year, month, day, hour, minute, second].every(Number.isFinite)) {
      return date.getTimezoneOffset()
    }

    const asUtcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second)
    return (date.getTime() - asUtcTimestamp) / 60_000
  } catch {
    return date.getTimezoneOffset()
  }
}

export function formatUtcOffsetForTimeZone(date: Date, timeZone: string) {
  return formatUtcOffset(getTimeZoneOffsetMinutes(date, timeZone))
}

export function toIsoDateStringInTimeZone(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value

    if (year && month && day) {
      return `${year}-${month}-${day}`
    }
  } catch {
    // fallback below
  }

  const fallbackDate = new Date(date)
  const year = fallbackDate.getFullYear()
  const month = `${fallbackDate.getMonth() + 1}`.padStart(2, '0')
  const day = `${fallbackDate.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
