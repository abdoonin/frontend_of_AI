'use client'

import { useRef, useState } from 'react'
import { ScanLine } from 'lucide-react'
import type { Preset } from '@/lib/assessment/presets'
import { FIELD_BY_KEY } from '@/lib/assessment/fields'
import { MODEL_LABEL, type ModelId } from '@/lib/assessment/models'
import type { AssessmentState } from '@/lib/assessment/use-assessment'
import { Button } from '@/components/ui/button'
import { btn, FieldGrid, PresetBar } from './parts'
import { OcrScannerDialog } from './ocr-scanner-dialog'
import s from './assessment.module.css'

interface AnalysisSectionConfig {
  id: ModelId
  title: string
  subtitle: string
  description: string
  keys: readonly string[]
  sharedNote?: string
}

const ANALYSES: AnalysisSectionConfig[] = [
  {
    id: 'cancer',
    title: 'Cancer risk',
    subtitle: 'Lifestyle & history',
    description: 'Evaluates cancer risk based on demographic factors, lifestyle habits, and genetic history.',
    keys: ['bmi', 'smoking', 'alcohol', 'activity', 'genetic_risk', 'cancer_history'],
  },
  {
    id: 'fatty_liver',
    title: 'Fatty liver',
    subtitle: 'Laboratory blood tests',
    description: 'Evaluates hepatic steatosis and metabolic markers through lipid and enzyme profiles.',
    keys: ['cholesterol', 'triglycerides', 'hdl', 'glucose', 'creatinine', 'ggt', 'uric_acid', 'platelets'],
  },
  {
    id: 'hepatitis',
    title: 'Hepatitis C',
    subtitle: 'Staging tests & physical signs',
    description: 'Evaluates liver scarring stage, complication risk, and physical clinical signs.',
    keys: ['copper', 'prothrombin', 'ascites', 'hepatomegaly', 'spiders', 'edema'],
    sharedNote: 'Note: Hepatitis staging also utilizes Cholesterol, Triglycerides, and Platelets from Laboratory values.',
  },
]

export function ScreenDetailed({ state }: { state: AssessmentState }) {
  const { values, setValue, applyPreset, runDetailed, running, error, readinessOf, goTo } = state
  const [ocrOpen, setOcrOpen] = useState(false)

  const handleApplyOcr = (extractedValues: Record<string, string>) => {
    Object.entries(extractedValues).forEach(([k, v]) => {
      setValue(k, v)
    })
  }

  const actionsRef = useRef<HTMLDivElement>(null)

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

  const focusField = (key: string) => {
    const el = document.getElementById(`f-${key}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus()
    }
  }

  const total = ANALYSES.reduce((n, a) => n + a.keys.length, 0)

  return (
    <>
      <section className={s.card}>
        <div className={s.head}>
          <div className={s.headText}>
            <h2>Detailed analysis</h2>
            <p className={s.desc}>Values already entered are carried over. Each model requires specific clinical parameters.</p>
          </div>
          <span className={s.badge}>{total} fields total</span>
        </div>

        {error && <p role="alert" className={s.error}>{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <PresetBar onApply={applyPresetAndReveal} />
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
      </section>

      <OcrScannerDialog
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onApplyValues={handleApplyOcr}
      />

      {ANALYSES.map((analysis) => {
        const ready = readinessOf(analysis.id)
        const missingItems = ready.missing.map((key) => ({
          key,
          label: FIELD_BY_KEY[key]?.label ?? key,
        }))

        return (
          <div key={analysis.id} className={s.analysisCard} id={`analysis-card-${analysis.id}`}>
            <div className={s.analysisHead}>
              <div className={s.analysisHeadInfo}>
                <div className={s.analysisTitleRow}>
                  <h3 className={s.analysisTitle}>{analysis.title}</h3>
                  <span className={s.analysisBadge}>{analysis.subtitle}</span>
                  <span className={s.badge}>{analysis.keys.length} fields</span>
                </div>
                <p className={s.analysisDesc}>{analysis.description}</p>
              </div>
              <div className={[s.statusPill, ready.ready ? s.statusPillReady : s.statusPillMissing].join(' ')}>
                <span className={s.statusPillDot} />
                {ready.ready ? 'Ready' : `${ready.missing.length} values needed`}
              </div>
            </div>

            <FieldGrid keys={analysis.keys} values={values} onChange={setValue} />

            {analysis.sharedNote && (
              <p className={s.sharedNote}>{analysis.sharedNote}</p>
            )}

            {ready.ready ? (
              <div className={s.readyBox}>
                <span className={s.readyDot} />
                <span>{MODEL_LABEL[analysis.id]} — Ready for analysis (all required values entered)</span>
              </div>
            ) : (
              <div className={s.missingBox}>
                <div className={s.missingHeader}>
                  <span className={s.statusPillDot} />
                  <span className={s.missingTitle}>
                    {MODEL_LABEL[analysis.id]} — {ready.missing.length} value{ready.missing.length > 1 ? 's' : ''} still needed:
                  </span>
                </div>
                <div className={s.missingChips}>
                  {missingItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={s.missingChip}
                      onClick={() => focusField(item.key)}
                      title={`Click to fill ${item.label}`}
                    >
                      <span className={s.missingChipDot} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div className={s.actionsCard} ref={actionsRef}>
        <button type="button" className={btn('primary')} onClick={runDetailed} disabled={running}>
          {running ? 'Running…' : 'Run detailed analysis'}
        </button>
        <button type="button" className={btn()} onClick={() => goTo(2)}>
          Back
        </button>
      </div>
    </>
  )
}
