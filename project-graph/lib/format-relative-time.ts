// Largest-unit-first: each entry says how many of the current unit fit into the
// next one up, so the loop can step "seconds -> minutes -> hours" until the
// remaining duration is small enough to read naturally.
const DIVISIONS = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
] as const

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/**
 * Formats a past or future date as "3 hours ago" / "in 2 days".
 *
 * `now` is injectable so callers can render deterministically in tests.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  let duration = (date.getTime() - now.getTime()) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return formatter.format(Math.round(duration), "year")
}
