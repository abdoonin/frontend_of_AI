'use client'

/**
 * All assessment state, in one hook.
 *
 * Replaces ten `useState` calls and eight `useEffect`s in
 * `ai-radiology-scan.tsx` (:21-290), which shuttled the same values between
 * local state, `AnalysisContext` and `sessionStorage` in both directions.
 * Five of those effects existed only to copy context back into local state.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  analyze,
  analyzeDetailed,
  AnalyzeError,
  type AnalyzeResult,
  type CancerResult,
  type FattyLiverResult,
  type GateResult,
  type HepatitisResult,
} from '@/lib/api/analyze'
import { emptyValues } from './fields'
import { readiness, type ModelId, type Readiness } from './models'
import type { Preset } from './presets'
import { ASSESSMENT_STORAGE_KEY as STORAGE_KEY } from './storage'

export type Screen = 1 | 2 | 3 | 4

export interface DetailedResults {
  cancer?: CancerResult
  fatty_liver?: FattyLiverResult
  hepatitis?: HepatitisResult
}

export interface AssessmentState {
  values: Record<string, string>
  screen: Screen
  gate: GateResult | null
  detailed: DetailedResults
  /** Models that could not run because inputs were missing. Never shown as a
   *  clean or negative result — they were not assessed at all. */
  skipped: ModelId[]
  /**
   * Every model's `results` block, merged and untouched, for persistence only.
   * `detailed_results` is stored as a JSON blob and both existing readers
   * expect this exact snake_case shape — see `lib/api/analyze.ts`.
   */
  rawResults: Record<string, unknown>
  running: boolean
  error: string | null
  readinessOf: (model: ModelId) => Readiness
  setValue: (key: string, value: string) => void
  applyPreset: (preset: Preset) => void
  goTo: (screen: Screen) => void
  runInitial: () => Promise<void>
  runDetailed: () => Promise<void>
  reset: () => void
}

export function useAssessment(): AssessmentState {
  const [values, setValues] = useState<Record<string, string>>(emptyValues)
  const [screen, setScreen] = useState<Screen>(1)
  const [gate, setGate] = useState<GateResult | null>(null)
  const [detailed, setDetailed] = useState<DetailedResults>({})
  const [skipped, setSkipped] = useState<ModelId[]>([])
  const [rawResults, setRawResults] = useState<Record<string, unknown>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * The inputs the stored results were computed from, as a signature. Empty
   * when no run has happened.
   */
  const [computedFrom, setComputedFrom] = useState('')

  const hydrated = useRef(false)

  /*
    THE WHOLE ASSESSMENT PERSISTS, not just the values.

    It used to be values only, and the reasoning was sound: "a stale model
    output shown against freshly edited inputs is worse than none." The cure
    was worse than the disease. Ali, 2026-08-12: reach the result screen, open
    Patients, come back — and the results are gone, the rail is back on step 1,
    and the analysis has to be run again. During a ten-minute demo that reads
    as the app losing your work, because it is.

    Staleness is now DETECTED rather than assumed. Every run records a
    signature of the values that produced it; on restore, results are kept only
    when the values still match. Edit one field and navigate away and the
    results are dropped exactly as before — but the typed values survive, and
    the screen falls back to the first one, so nothing stale is ever shown.
  */
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const p = JSON.parse(saved)

      // Pre-2026-08-12 sessions stored the bare values object. Restoring it as
      // values is exactly right, and it has no results to worry about.
      const restoredValues: Record<string, string> = p?.values ?? p
      if (restoredValues && typeof restoredValues === 'object') {
        setValues((v) => ({ ...v, ...restoredValues }))
      }
      if (!p?.values) return

      const fresh = p.computedFrom && p.computedFrom === JSON.stringify(restoredValues)
      if (!fresh) return

      setGate(p.gate ?? null)
      setDetailed(p.detailed ?? {})
      setSkipped(p.skipped ?? [])
      setRawResults(p.rawResults ?? {})
      setComputedFrom(p.computedFrom)

      /*
        Clamp to the furthest screen the restored data can actually render.
        Screen 2 needs a gate; screen 4 needs at least one detailed result.
        Without this, a session saved mid-run could restore to a results screen
        with nothing to show.
      */
      const hasDetail = Object.keys(p.detailed ?? {}).length > 0
      const max: Screen = hasDetail ? 4 : p.gate ? 3 : 1
      setScreen(Math.min(p.screen ?? 1, max) as Screen)
    } catch {
      /* private mode, quota, corrupt JSON -- an empty form is a fine fallback */
    }
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ values, screen, gate, detailed, skipped, rawResults, computedFrom }),
      )
    } catch {
      /* nothing here is worth failing the form over */
    }
  }, [values, screen, gate, detailed, skipped, rawResults, computedFrom])

  const setValue = useCallback((key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
  }, [])

  const applyPreset = useCallback((preset: Preset) => {
    setValues((v) => ({ ...v, ...preset.values }))
  }, [])

  const goTo = useCallback((next: Screen) => {
    setError(null)
    setScreen(next)
  }, [])

  const runInitial = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const out = await analyze('gate', values)
      if (out.mode !== 'gate') return
      setGate(out.result)
      // Results from a previous run must not survive new inputs.
      setDetailed({})
      setSkipped([])
      setRawResults(out.raw)
      // These values produced this gate. Anything typed after this makes the
      // stored result stale, and it will not be restored.
      setComputedFrom(JSON.stringify(values))
      setScreen(2)
    } catch (e) {
      setError(e instanceof AnalyzeError ? e.message : 'Something went wrong.')
    } finally {
      setRunning(false)
    }
  }, [values])

  const runDetailed = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const { results, skipped: notRun, failed } = await analyzeDetailed(values)

      const next: DetailedResults = {}
      const raw: Record<string, unknown> = {}
      for (const r of results as AnalyzeResult[]) {
        if (r.mode === 'cancer') next.cancer = r.result
        else if (r.mode === 'fatty_liver') next.fatty_liver = r.result
        else if (r.mode === 'hepatitis') next.hepatitis = r.result
        Object.assign(raw, r.raw)
      }
      setDetailed(next)
      // Merged onto the gate's block, so one saved record carries the whole
      // assessment — triage and detail — the way the old flow's did.
      setRawResults((prev) => ({ ...prev, ...raw }))
      // A model that errored is in the same position as one never called: not
      // assessed. Both are surfaced, neither is shown as a result.
      setSkipped([...notRun, ...failed.map((f) => f.mode as ModelId)])

      if (results.length === 0 && failed.length > 0) {
        setError(failed[0].message)
        return
      }
      setComputedFrom(JSON.stringify(values))
      setScreen(4)
    } catch (e) {
      setError(e instanceof AnalyzeError ? e.message : 'Something went wrong.')
    } finally {
      setRunning(false)
    }
  }, [values])

  const reset = useCallback(() => {
    setValues(emptyValues())
    setGate(null)
    setDetailed({})
    setSkipped([])
    setRawResults({})
    setComputedFrom('')
    setError(null)
    setScreen(1)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const readinessOf = useCallback((model: ModelId) => readiness(model, values), [values])

  return {
    values, screen, gate, detailed, skipped, rawResults, running, error,
    readinessOf, setValue, applyPreset, goTo, runInitial, runDetailed, reset,
  }
}
