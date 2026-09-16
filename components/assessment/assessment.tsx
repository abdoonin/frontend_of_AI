'use client'

import { useAssessment } from '@/lib/assessment/use-assessment'
import { StepRail } from './parts'
import { ScreenBloodTests } from './screen-blood-tests'
import { ScreenInitial } from './screen-initial'
import { ScreenDetailed } from './screen-detailed'
import { ScreenResults } from './screen-results'
import s from './assessment.module.css'

/**
 * The assessment, in four screens.
 *
 * Replaces the single scrolling page in `ai-radiology-scan.tsx`, where the
 * step indicator was decorative: that code did
 * `step1 -> reveal step2 + step3 -> setStep(3)`, so step 2 was never a state
 * the user occupied. Here each screen is the only thing rendered, so the rail
 * cannot lie.
 */
export function Assessment() {
  const state = useAssessment()

  // The healthy path ends at screen 2, so the rail shows two steps, not four.
  const healthyPath = state.gate?.healthy === true

  return (
    <div className={s.wrap}>
      <StepRail current={state.screen} healthyPath={healthyPath} />
      {state.screen === 1 && <ScreenBloodTests state={state} />}
      {state.screen === 2 && <ScreenInitial state={state} />}
      {state.screen === 3 && <ScreenDetailed state={state} />}
      {state.screen === 4 && <ScreenResults state={state} />}
    </div>
  )
}
