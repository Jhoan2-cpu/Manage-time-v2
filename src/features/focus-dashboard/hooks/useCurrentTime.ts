import { useEffect, useMemo, useState } from 'react'
import { formatUtcOffset } from '../utils/time'

export function useCurrentTime() {
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
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [currentTime])

  const timeZoneName = useMemo(() => {
    const timeZonePart = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
    })
      .formatToParts(currentTime)
      .find((part) => part.type === 'timeZoneName')

    return timeZonePart?.value ?? 'Local'
  }, [currentTime])

  const utcOffsetLabel = useMemo(() => {
    return formatUtcOffset(currentTime.getTimezoneOffset())
  }, [currentTime])

  return {
    timeLabel,
    timeZoneName,
    utcOffsetLabel,
  }
}
