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
