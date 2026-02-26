import { useEffect, useMemo, useState } from 'react'
import { getCurrentIntlLocaleTag, useI18n } from '../../../i18n'
import { formatUtcOffsetForTimeZone } from '../utils/time'

export function useCurrentTime(timeZone?: string | null, serverNowUtc?: string | null) {
  const { locale } = useI18n()
  const serverClockOffsetMs = useMemo(() => {
    if (typeof serverNowUtc !== 'string' || !serverNowUtc.trim()) {
      return 0
    }

    const parsed = new Date(serverNowUtc).getTime()
    if (!Number.isFinite(parsed)) {
      return 0
    }

    return parsed - Date.now()
  }, [serverNowUtc])
  const [currentTime, setCurrentTime] = useState(() => new Date(Date.now() + serverClockOffsetMs))

  useEffect(() => {
    setCurrentTime(new Date(Date.now() + serverClockOffsetMs))
  }, [serverClockOffsetMs])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverClockOffsetMs))
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [serverClockOffsetMs])

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
