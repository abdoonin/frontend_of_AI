'use client'

import { MODEL_LABEL, type ModelId } from '@/lib/assessment/models'
import type { AssessmentState } from '@/lib/assessment/use-assessment'
import { btn } from './parts'
import { OutOfRange, StageDistribution, TriageDonut } from './charts'
import { SaveToPatient } from './save-dialog'
import s from './assessment.module.css'

/**
 * Screen 4 — the three results.
 *
 * CLAUDE.md §6.4 governs every line here. The client never returns the
 * envelope's `confidence` or `risk_level`, so they cannot appear; what is
 * shown is each model's own correctly-named field, labelled with what it
 * measures. In particular `mortality_risk` is "Risk of death" and never
 * "confidence" — the old UI rendered a 71.5% mortality risk as "Confidence:
 * 71%", which is the single most damaging thing on the current screens.
 *
 * The three are also not comparable (B-17): the cancer model reads no lab
 * value at all. Each row says what kind of statement it is.
 */

interface Row {
  label: string
  sub: string
  value: string
  tone: 'critical' | 'caution' | 'normal'
}

/** B-13: sick_probability arrives as 99.9000015258789. Rounding is display work. */
const pct = (n: number) => `${n.toFixed(1)}%`

/**
 * The plain line under the clinical label.
 *
 * The LABEL itself is Ali's wording, given verbatim on 2026-08-10 and carried
 * from `stage_description` -- "Stage 3: Advanced Stage / Liver Cirrhosis". That
 * is a deliberate exception to L-026; do not translate those three strings.
 * This map is the second line beneath, which keeps the plain reading for anyone
 * who does not know what fibrosis is.
 *
 * Keyed on the DISPLAYED stage 1-3, not the raw model class 0-2.
 */
const STAGE_PLAIN: Record<number, string> = {
  1: 'Early scarring, often reversible.',
  2: 'Scarring is established.',
  3: 'Severe scarring, with the liver badly damaged.',
}

export function ScreenResults({ state }: { state: AssessmentState }) {
  const { detailed, skipped, goTo, reset, values, gate, rawResults } = state
  const rows: Row[] = []

  if (detailed.cancer) {
    rows.push({
      label: 'Cancer risk',
      sub: 'Lifestyle and family history only. No blood tests or scans.',
      value: pct(detailed.cancer.riskPercentage),
      tone: detailed.cancer.riskPercentage > 70 ? 'critical' : 'caution',
    })
  }

  if (detailed.fatty_liver) {
    rows.push({
      label: 'Probability of fatty liver',
      sub: 'From 13 blood test values.',
      value: pct(detailed.fatty_liver.sickProbability),
      tone: detailed.fatty_liver.hasFattyLiver ? 'critical' : 'normal',
    })
  }

  if (detailed.hepatitis) {
    const h = detailed.hepatitis
    rows.push(
      {
        label: 'Liver scarring stage',
        // The clinical wording leads; the plain line sits under it.
        sub: h.stageDescription || STAGE_PLAIN[h.stage] || '',
        value: `Stage ${h.stage}`,
        tone: h.stage >= 3 ? 'critical' : h.stage >= 2 ? 'caution' : 'normal',
      },
      {
        /*
          Was "Risk of death", which is what the model measures and too blunt
          to put on a screen a patient may be standing next to. This is the
          same number, named for what a clinician would say out loud. What it
          must never become is "confidence" — that is the §6.4 violation the
          old UI shipped, where a 71.5% mortality risk read as "Confidence 71%".
        */
        label: 'Estimated risk to life',
        /*
          NO LONGER "uses the scarring stage as an input" — that described the
          old cascade, which predicted the stage and injected it into this
          model. The HCV status model has 18 features and Stage is not among
          them; the dependency now runs the other way, with the stage model
          taking this model's verdict. Caught in the browser after the swap,
          which is the only place it was visible.
        */
        sub: 'Mortality risk, from blood tests, examination findings and the APRI and ALBI scores.',
        value: pct(h.mortalityRisk),
        tone: h.mortalityRisk > 50 ? 'critical' : 'caution',
      },
      {
        /*
          Named for what the model actually predicts. B-25: the complications
          model trains on `y = df['Ascites']` — one specific complication, not
          complications in general. "Risk of complications" invited the
          question "which one?" from the referee most likely to ask it.
        */
        label: 'Risk of fluid build-up',
        sub: 'Fluid collecting in the abdomen, a sign of worsening liver disease.',
        value: pct(h.complicationsRisk),
        tone: h.complicationsRisk > 50 ? 'critical' : 'caution',
      },
      {
        label: 'APRI score',
        sub: 'A standard scarring calculation. Above 1.0 points to scarring.',
        value: h.apriScore.toFixed(2),
        tone: h.apriScore > 1 ? 'critical' : 'normal',
      },
      {
        /*
          Published ALBI grade boundaries: grade 1 at or below -2.60, grade 2
          above that to -1.39, grade 3 above -1.39. The tone was hardcoded to
          'caution', which painted every ALBI amber including a grade 1.
        */
        label: 'ALBI score',
        sub: 'Liver function. Lower is better; −2.60 or below is grade 1.',
        value: h.albiScore.toFixed(2),
        tone: h.albiScore > -1.39 ? 'critical' : h.albiScore > -2.6 ? 'caution' : 'normal',
      },
    )
  }

  const results = (
    <section className={s.card}>
      <div className={s.head}>
        <div className={s.headText}>
          <h2>Results</h2>
          <p className={s.desc}>Three separate results. This is not one combined diagnosis.</p>
        </div>
        {gate && (
          <SaveToPatient gate={gate} detailed={detailed} rawResults={rawResults} values={values} size="sm" />
        )}
      </div>

      <div className={s.rows}>
        {rows.map((r) => (
          <div className={s.row} key={r.label}>
            <span className={s.rowLabel}>
              <b>{r.label}</b>
              <span>{r.sub}</span>
            </span>
            <span className={s.rowValue} style={{ color: `var(--${r.tone})` }}>
              {r.value}
            </span>
          </div>
        ))}

        {/*
          Not assessed is NOT a negative result. Under two completed rows a
          bare model name reads as "no hepatitis", so the row says why it did
          not run and shows no value at all.
        */}
        {skipped.map((model: ModelId) => (
          <div className={[s.row, s.rowSkipped].join(' ')} key={model}>
            <span className={s.rowLabel}>
              <b>{MODEL_LABEL[model]}</b>
              <span>Not assessed — required values were not provided.</span>
            </span>
            <span className={s.rowValue}>Not run</span>
          </div>
        ))}
      </div>

      <p className={s.note}>
        Covers cancer risk, fatty liver and hepatitis C only. Other liver disease is not ruled out.
      </p>

      <div className={s.actions}>
        <button type="button" className={btn('primary')} onClick={reset}>Start over</button>
        <button type="button" className={btn()} onClick={() => goTo(3)}>Back</button>
      </div>
    </section>
  )

  return (
    <div className={s.resultsGrid}>
      {results}

      <div className={s.resultsSide}>
        {/*
          Chart 1 — the wide slot. Horizontal bars need room for their category
          labels, which the two square slots below do not have.

          This was the feature-importance chart until Ali replaced it: those
          bars were a property of the trained model, identical for every
          patient who ever ran an analysis, and a clinician got nothing from
          them. This one is entirely this patient's. It needs no model to be
          chosen, because it reads the values rather than the result.
        */}
        <div className={s.chartCard}>
          <OutOfRange values={values} />
        </div>

        <div className={s.resultsPair}>
          {/* Chart 2 — the richest thing the models produce, and the old UI
              discarded all of it to print one letter. */}
          {detailed.hepatitis && (
            <div className={s.chartCard}>
              <StageDistribution
                distribution={detailed.hepatitis.stageDistribution}
                predicted={detailed.hepatitis.stage}
              />
            </div>
          )}

          {/* Chart 3 — the triage step, which until now was visible only on
              screen 2 (CLAUDE.md §6.2). */}
          {gate && (
            <div className={s.chartCard}>
              <TriageDonut gate={gate} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
