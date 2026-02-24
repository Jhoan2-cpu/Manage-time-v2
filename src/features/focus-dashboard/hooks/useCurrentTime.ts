import { useEffect, useMemo, useState } from 'react'
import { formatUtcOffsetForTimeZone } from '../utils/time'

export function useCurrentTime(timeZone?: string | null) {
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
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: timeZone ?? undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [currentTime, timeZone])

  const timeZoneName = useMemo(() => {
    const timeZonePart = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone ?? undefined,
      timeZoneName: 'short',
    })
      .formatToParts(currentTime)
      .find((part) => part.type === 'timeZoneName')

    return timeZonePart?.value ?? 'Local'
  }, [currentTime, timeZone])

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
