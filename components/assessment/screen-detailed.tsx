'use client'

import { useRef } from 'react'
import type { Preset } from '@/lib/assessment/presets'
import { fieldsIn } from '@/lib/assessment/fields'
import { GATE_KEYS, MODEL_LABEL, type ModelId } from '@/lib/assessment/models'
import type { AssessmentState } from '@/lib/assessment/use-assessment'
import { btn, FieldGrid, PresetBar } from './parts'
import s from './assessment.module.css'

/**
 * Screen 3 — one form, three labelled sections, one submit.
 *
 * The three models were sub-tabs; they are sections now. They keep their
 * clinical identity and lose their role as navigation, which is what made the
 * old screen ambiguous — a clinician had to work out that each card opened its
 * own form, and choosing between them implied choosing the patient's disease.
 *
 * 20 further values, not 23: fatty liver and hepatitis share cholesterol,
 * triglycerides and platelets. `detailedKeys()` computes that.
 */

/*
  No "used for cancer risk" hint on the section headings. The readiness line
  under each section already names the model it feeds, so the hint restated it
  one line above — and the section titles are self-explanatory.
*/
const SECTIONS: { title: string; group: Parameters<typeof fieldsIn>[0]; model: ModelId }[] = [
  { title: 'Lifestyle & history', group: 'lifestyle', model: 'cancer' },
  { title: 'Laboratory values', group: 'labs', model: 'fatty_liver' },
  { title: 'Physical signs', group: 'signs', model: 'hepatitis' },
]

export function ScreenDetailed({ state }: { state: AssessmentState }) {
  const { values, setValue, applyPreset, runDetailed, running, error, readinessOf, goTo } = state

  const actionsRef = useRef<HTMLDivElement>(null)

  /*
    A preset fills all 20 fields at once, so the only thing left to do is the
    submit — and that sits 539px below the fold on a laptop, further on a
    phone. Measured on the real screen: the button is at 1395px in a 956px
    viewport. Leaving the reader at the top of a form that is already complete
    is the one moment in this flow where the next action is genuinely hidden.

    Honours prefers-reduced-motion: the jump still happens, without the travel.
  */
  const applyPresetAndReveal = (preset: Preset) => {
    applyPreset(preset)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      actionsRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'center',
      })
    })
  }

  const gateKeys = new Set<string>(GATE_KEYS)
  const total = SECTIONS.reduce(
    (n, sec) => n + fieldsIn(sec.group).filter((f) => !gateKeys.has(f.key)).length,
    0,
  )

  return (
    <section className={s.card}>
      <div className={s.head}>
        <div className={s.headText}>
          <h2>Detailed analysis</h2>
          <p className={s.desc}>Values already entered are carried over.</p>
        </div>
        <span className={s.badge}>{total} fields</span>
      </div>

      {error && <p role="alert" className={s.error}>{error}</p>}

      <PresetBar onApply={applyPresetAndReveal} />

      {SECTIONS.map((section, sectionIndex) => {
        // The gate's values are already in hand -- never ask twice
        // (WCAG 2.2 §3.3.7 Redundant Entry).
        const keys = fieldsIn(section.group)
          .map((f) => f.key)
          .filter((k) => !gateKeys.has(k))
        const ready = readinessOf(section.model)

        return (
          <div key={section.group}>
            <div className={[s.sectionHead, sectionIndex === 0 ? s.sectionHeadFirst : ''].join(' ')}>
              <h3>{section.title}</h3>
            </div>
            <FieldGrid keys={keys} values={values} onChange={setValue} />
            <p className={[s.ready, ready.ready ? '' : s.readyNo].join(' ')}>
              {ready.ready
                ? `${MODEL_LABEL[section.model]} — ready`
                : `${MODEL_LABEL[section.model]} — ${ready.missing.length} value${ready.missing.length > 1 ? 's' : ''} still needed`}
            </p>
          </div>
        )
      })}

      <div className={s.actions} ref={actionsRef}>
        <button type="button" className={btn('primary')} onClick={runDetailed} disabled={running}>
          {running ? 'Running…' : 'Run detailed analysis'}
        </button>
        <button type="button" className={btn()} onClick={() => goTo(2)}>
          Back
        </button>
      </div>
    </section>
  )
}
