import { useEffect, useMemo, useState } from 'react'
import { getCurrentIntlLocaleTag, useI18n } from '../../../i18n'
import { formatUtcOffsetForTimeZone } from '../utils/time'

export function useCurrentTime(timeZone?: string | null) {
  const { locale } = useI18n()
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  const timeLabel = useMemo(() => {
    return currentTime.toLocaleTimeString(getCurrentIntlLocaleTag(), {
      timeZone: timeZone ?? undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [currentTime, timeZone])

  const timeZoneName = useMemo(() => {
    const timeZonePart = new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
      timeZone: timeZone ?? undefined,
      timeZoneName: 'short',
    })
      .formatToParts(currentTime)
      .find((part) => part.type === 'timeZoneName')

    return timeZonePart?.value ?? (locale === 'es' ? 'Local' : 'Local')
  }, [currentTime, locale, timeZone])

  const utcOffsetLabel = useMemo(() => {
    if (timeZone) {
      return formatUtcOffsetForTimeZone(currentTime, timeZone)
    }

    return formatUtcOffsetForTimeZone(currentTime, Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [currentTime, timeZone])

  return {
    timeLabel,
    timeZoneName,
    utcOffsetLabel,
  }
}
