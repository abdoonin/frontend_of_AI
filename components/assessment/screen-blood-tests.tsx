'use client'

import { GATE_KEYS } from '@/lib/assessment/models'
import type { AssessmentState } from '@/lib/assessment/use-assessment'
import { btn, FieldGrid, PresetBar } from './parts'
import s from './assessment.module.css'

/**
 * Screen 1 — the gate's ten values, and nothing else.
 *
 * The screen this replaces rendered all 30 fields before it would run a step
 * that needs 10. Ten fits one laptop viewport with no scrolling.
 */
export function ScreenBloodTests({ state }: { state: AssessmentState }) {
  const { values, setValue, applyPreset, runInitial, running, error } = state

  return (
    <section className={s.card}>
      <div className={s.head}>
        <div className={s.headText}>
          <h2>Blood tests</h2>
          <p className={s.desc}>These decide whether a detailed analysis is needed.</p>
        </div>
        <span className={s.badge}>10 fields</span>
      </div>

      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      <PresetBar onApply={applyPreset} />

      <FieldGrid keys={GATE_KEYS} values={values} onChange={setValue} />

      <div className={s.actions}>
        <button type="button" className={btn('primary')} onClick={runInitial} disabled={running}>
          {running ? 'Running…' : 'Run analysis'}
        </button>
      </div>
    </section>
  )
}
