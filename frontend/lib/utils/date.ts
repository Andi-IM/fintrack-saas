/**
 * Formats an ISO date string to a datetime-local input value (YYYY-MM-DDTHH:MM).
 * Returns the original string if the input is not a valid date.
 */
export function formatDateForInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Gets the browser's current timezone offset formatted as an ISO 8601 offset (e.g. +07:00 or -05:00).
 */
export function getBrowserTimezoneOffset(): string {
  const offsetMinutes = new Date().getTimezoneOffset()
  const absOffset = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const mins = String(absOffset % 60).padStart(2, '0')
  return `${offsetMinutes <= 0 ? '+' : '-'}${hours}:${mins}`
}
