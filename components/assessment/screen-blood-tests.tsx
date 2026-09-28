'use client'

import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { GATE_KEYS } from '@/lib/assessment/models'
import type { AssessmentState } from '@/lib/assessment/use-assessment'
import { Button } from '@/components/ui/button'
import { btn, FieldGrid, PresetBar } from './parts'
import { OcrScannerDialog } from './ocr-scanner-dialog'
import s from './assessment.module.css'

/**
 * Screen 1 — the gate's ten values, and nothing else.
 *
 * The screen this replaces rendered all 30 fields before it would run a step
 * that needs 10. Ten fits one laptop viewport with no scrolling.
 */
export function ScreenBloodTests({ state }: { state: AssessmentState }) {
  const { values, setValue, applyPreset, runInitial, running, error } = state
  const [ocrOpen, setOcrOpen] = useState(false)

  const handleApplyOcr = (extractedValues: Record<string, string>) => {
    Object.entries(extractedValues).forEach(([k, v]) => {
      setValue(k, v)
    })
  }

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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <PresetBar onApply={applyPreset} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOcrOpen(true)}
          className="gap-2 text-xs font-semibold h-9 px-3.5 rounded-lg border-2 border-primary bg-background text-primary hover:bg-primary/10 hover:border-primary shadow-xs transition-all cursor-pointer"
        >
          <ScanLine className="h-4 w-4 stroke-[2.25]" />
          Scan lab report (AI OCR)
        </Button>
      </div>

      <FieldGrid keys={GATE_KEYS} values={values} onChange={setValue} />

      <div className={s.actions}>
        <button type="button" className={btn('primary')} onClick={runInitial} disabled={running}>
          {running ? 'Running…' : 'Run analysis'}
        </button>
      </div>

      <OcrScannerDialog
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onApplyValues={handleApplyOcr}
      />
    </section>
  )
}

