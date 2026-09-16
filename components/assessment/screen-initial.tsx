'use client'

import { FIELD_BY_KEY, rangeLabel, rangePosition, rangeStatus } from '@/lib/assessment/fields'
import { GATE_KEYS } from '@/lib/assessment/models'
import type { AssessmentState } from '@/lib/assessment/use-assessment'
import { btn } from './parts'
import { ConfidenceMeter } from './charts'
import { SaveToPatient } from './save-dialog'
import s from './assessment.module.css'

/**
 * Screen 2 — the initial assessment's verdict.
 *
 * TWO RULES GOVERN THIS SCREEN, both learned the hard way (LESSONS.md L-024):
 *
 * 1. The verdict is READ from `gate.healthy`. It is never recomputed from
 *    reference ranges. Measured: the gate classifies textbook mid-range values
 *    as not healthy, and the "Normal values" preset — whose ALP sits ABOVE its
 *    reference range — as healthy. Its boundary is learned, not a threshold.
 *
 * 2. Because of (1), the readouts and the verdict WILL sometimes disagree on
 *    screen. That is not hidden. The readouts are labelled as reference ranges
 *    and the copy says plainly that the model reaches its own conclusion —
 *    which turns a contradiction into the most instructive moment in the flow.
 */
export function ScreenInitial({ state }: { state: AssessmentState }) {
  const { values, gate, goTo, error, detailed, rawResults } = state
  if (!gate) return null

  const healthy = gate.healthy
  const measured = GATE_KEYS.filter((k) => FIELD_BY_KEY[k]?.range)
  const outOfRange = measured.filter((k) => {
    const st = rangeStatus(k, values[k])
    return st === 'low' || st === 'high'
  })

  return (
    <>
      <div className={[s.verdict, healthy ? s.verdictOk : s.verdictWarn].join(' ')}>
        <div className={s.verdictTop}>
          <span className={s.vmark} aria-hidden="true">
            {healthy ? (
              <svg viewBox="0 0 24 24" stroke="currentColor"><path d="m4 12 5 5L20 6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v5" /><path d="M12 17h.01" /></svg>
            )}
          </span>
          <div>
            <h2>{healthy ? 'No signs of liver disease' : 'Further analysis recommended'}</h2>
            <p>
              {healthy
                ? 'No detailed analysis needed.'
                : 'Continue to run the three detailed models.'}
            </p>
          </div>
        </div>

        {/* The confidence qualifies THIS verdict, so it sits with it. At the
            foot of the evidence card it read as an afterthought. */}
        <ConfidenceMeter
          healthy={healthy}
          confidencePct={gate.confidencePct}
          probabilitySick={gate.probabilitySick}
        />
      </div>

      <section className={s.card}>
        <div className={s.head}>
          <div className={s.headText}>
            <h2>The values used</h2>
            <p className={s.desc}>Against standard reference ranges.</p>
          </div>
        </div>

        {error && <p role="alert" className={s.error}>{error}</p>}

        <p className={s.patient}>
          <b>{values.age || '—'}</b> years
          <span className={s.patientRule} aria-hidden="true" />
          <b>{values.gender || '—'}</b>
        </p>

        <div className={s.readouts}>
          {measured.map((key, i) => {
            const field = FIELD_BY_KEY[key]
            const raw = values[key] || '—'
            const status = rangeStatus(key, values[key])
            const out = status === 'low' || status === 'high'
            const label = rangeLabel(key)
            const frac = rangePosition(key, values[key])
            // The reference range maps to the middle 70% of the track, so an
            // out-of-range marker lands in the visible margin beyond it.
            const pos = frac === null ? null : Math.max(3, Math.min(97, 15 + frac * 70))

            return (
              <div
                key={key}
                className={[s.readout, out ? s.readoutOut : ''].join(' ')}
                style={{ ['--i' as string]: i }}
              >
                <b>{raw}</b>
                <span className={s.readoutName}>{field.label}</span>
                {pos !== null && (
                  <div className={s.track} aria-hidden="true">
                    <span className={s.marker} style={{ left: `${pos}%` }} />
                  </div>
                )}
                <span className={s.status}>
                  {status === 'high' ? `above ${label}`
                    : status === 'low' ? `below ${label}`
                    : label ? `Normal value (${label})` : ''}
                </span>
              </div>
            )
          })}
        </div>

        {/*
          The honest framing this screen exists to carry. Reference ranges and
          the model's verdict are two different things, and they can disagree
          — saying so is what stops that looking like a bug.
        */}
        <p className={s.note}>
          The model weighs these values together, so it can disagree with the ranges.
          It answers yes or no, not a percentage.
        </p>

        <div className={s.actions}>
          {healthy ? (
            <>
              <SaveToPatient gate={gate} detailed={detailed} rawResults={rawResults} values={values} />
              {/* "Start over", not "Back": the healthy path ends here, so this
                  is the end of the assessment rather than a step in it. */}
              <button type="button" className={btn()} onClick={() => goTo(1)}>Start over</button>
            </>
          ) : (
            <>
              <button type="button" className={btn('primary')} onClick={() => goTo(3)}>
                Continue to detailed analysis
              </button>
              <button type="button" className={btn()} onClick={() => goTo(1)}>Back</button>
            </>
          )}
        </div>

      </section>
    </>
  )
}
