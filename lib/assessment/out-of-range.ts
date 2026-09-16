/**
 * What is abnormal in this patient, ranked.
 *
 * This replaced the feature-importance chart on the result screen, and the
 * reason is the difference between the two. Importance is a property of the
 * TRAINED MODEL: the same five bars, the same five percentages, for every
 * patient who ever runs an analysis. It answered a judge's question about how
 * the system works and a clinician's question about nothing at all.
 *
 * Everything here is computed from what the clinician typed, against the
 * reference ranges already declared in `fields.ts` — the same declaration the
 * Tools reference table reads, so the two cannot disagree. No backend change,
 * no new endpoint, and nothing on screen that is not this patient's.
 *
 * THE RANK IS DISTANCE FROM THE VALUE'S OWN LIMIT, as a fraction of that
 * limit, so values in different units are comparable: AST at 96 against a
 * ceiling of 40 is 140% above it, bilirubin at 1.5 against 1.2 is 25% above.
 * Out-of-range values are positive and sort first; in-range values are
 * negative, and the least negative — the closest to crossing — sort next.
 *
 * That last part is what fills the card to a constant five rows. The fillers
 * are not padding: they are the values a doctor would watch at the next visit.
 *
 * DIRECTION MATTERS AND IS NOT COSMETIC. Albumin, total proteins, the A/G
 * ratio and platelets are abnormal by FALLING — the liver makes albumin, so a
 * failing liver makes less of it. An earlier draft expressed everything as a
 * multiple of the limit and printed "1.1×" for an albumin 11% BELOW its floor,
 * which reads high for a value that is dangerously low. Hence `above` and
 * `below` as separate words, and a percentage rather than a multiple.
 */

import { FIELDS, FIELD_BY_KEY } from './fields'

export interface RangedValue {
  key: string
  /** The field's own label, e.g. "Total bilirubin". */
  label: string
  /** The typed value with its unit, e.g. "1.5 mg/dL". */
  reading: string
  /** Null when the value sits inside its range. */
  status: 'low' | 'high' | null
  /** "25% above", "11% below", or "within range". */
  text: string
  /**
   * Signed distance from the nearest limit, as a fraction of it. Positive is
   * outside the range. Sort key and bar length both come from this.
   */
  deviation: number
  /** Bar width as a percentage, 0–100. */
  width: number
}

/** The shortest bar drawn, so a near-zero row is still a visible bar. */
const MIN_WIDTH = 20

/**
 * Rank every entered value by how far it sits from its own reference limit.
 *
 * Fields without a range (the yes/no findings, and anything the model takes
 * that has no clinical bound) are skipped — there is no limit to measure them
 * against, and inventing one would be exactly the kind of number CLAUDE.md §2
 * forbids.
 */
export function rankByDeviation(
  values: Record<string, string>,
  limit = 5,
): RangedValue[] {
  const scored: RangedValue[] = []

  for (const field of FIELDS) {
    if (!field.range) continue

    const raw = values[field.key]
    if (raw === undefined || raw === '') continue

    const n = Number(raw)
    if (!Number.isFinite(n)) continue

    const { low, high } = field.range

    let deviation: number
    let status: 'low' | 'high' | null

    if (high !== undefined && n > high) {
      deviation = n / high - 1
      status = 'high'
    } else if (low !== undefined && low !== 0 && n < low) {
      deviation = 1 - n / low
      status = 'low'
    } else {
      // Inside the range. Negative, and the closer to a bound the nearer to
      // zero, so the tightest squeaks sort straight after the real failures.
      const slack: number[] = []
      if (high !== undefined && high !== 0) slack.push((high - n) / high)
      if (low !== undefined && low !== 0) slack.push((n - low) / low)
      deviation = slack.length > 0 ? -Math.min(...slack) : -1
      status = null
    }

    scored.push({
      key: field.key,
      label: FIELD_BY_KEY[field.key]?.label ?? field.key,
      reading: field.unit ? `${raw} ${field.unit}` : raw,
      status,
      text:
        status === null
          ? 'within range'
          : `${Math.round(deviation * 100)}% ${status === 'high' ? 'above' : 'below'}`,
      deviation,
      // Filled in below, once the whole set is known.
      width: 0,
    })
  }

  scored.sort((a, b) => b.deviation - a.deviation)
  const top = scored.slice(0, limit)
  if (top.length === 0) return top

  /*
    Bars are scaled across the rows SHOWN, not against an absolute ceiling.
    An absolute scale would draw a 25%-above bilirubin as a stub whenever it
    shared a card with a 900%-above ALT, and the card's job is to rank what is
    in front of this clinician.
  */
  const max = top[0].deviation
  const min = top[top.length - 1].deviation
  const span = max - min

  for (const row of top) {
    row.width =
      span <= 0
        ? 100
        : MIN_WIDTH + ((row.deviation - min) / span) * (100 - MIN_WIDTH)
  }

  return top
}

/** How many of the entered values are outside their range, for the subtitle. */
export function countOutOfRange(values: Record<string, string>): {
  outside: number
  measured: number
} {
  let outside = 0
  let measured = 0

  for (const field of FIELDS) {
    if (!field.range) continue
    const raw = values[field.key]
    if (raw === undefined || raw === '') continue
    const n = Number(raw)
    if (!Number.isFinite(n)) continue

    measured++
    const { low, high } = field.range
    if ((high !== undefined && n > high) || (low !== undefined && n < low)) {
      outside++
    }
  }

  return { outside, measured }
}
