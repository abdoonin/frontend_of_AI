'use client'

import { useState } from 'react'
import {
  FileText,
  Activity,
  Calendar,
  Sparkles,
  Stethoscope,
  Heart,
  Thermometer,
  Weight,
  Plus,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  CHIEF_COMPLAINT_PRESETS,
  PHYSICAL_EXAM_PRESETS,
  createClinicalNote,
  type ClinicalNote,
  type ClinicalNoteCreatePayload,
} from '@/lib/api/clinical-notes'
import type { Visit } from '@/lib/api/patients'
import { STAGE_LABEL } from '@/lib/clinical/stages'
import { useLanguage } from '@/lib/language-context'

interface ClinicalNoteBuilderProps {
  patientId: number
  patientName: string
  patientCode: string
  latestVisit?: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onNoteCreated?: (note: ClinicalNote) => void
}

export function ClinicalNoteBuilder({
  patientId,
  patientName,
  patientCode,
  latestVisit,
  open,
  onOpenChange,
  onNoteCreated,
}: ClinicalNoteBuilderProps) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Visit details
  const [visitType, setVisitType] = useState('follow_up')

  // Vitals
  const [bloodPressure, setBloodPressure] = useState('120/80')
  const [heartRate, setHeartRate] = useState<string>('75')
  const [weight, setWeight] = useState<string>('78')
  const [temperature, setTemperature] = useState<string>('37.0')

  // SOAP
  const [subjective, setSubjective] = useState('')
  const [objective, setObjective] = useState('')
  const [assessment, setAssessment] = useState('')
  const [plan, setPlan] = useState('')

  // Liver Exam Signs
  const [jaundice, setJaundice] = useState('None')
  const [ascites, setAscites] = useState('None')
  const [edema, setEdema] = useState('None')
  const [hepatomegaly, setHepatomegaly] = useState(false)
  const [splenomegaly, setSplenomegaly] = useState(false)
  const [spiderAngioma, setSpiderAngioma] = useState(false)
  const [asterixis, setAsterixis] = useState(false)

  // Follow-up
  const [followUpDate, setFollowUpDate] = useState('')

  // Quick complaint chip click
  const appendComplaint = (complaint: { label: string; en: string }) => {
    const textToAdd = complaint.en
    setSubjective((prev) => {
      if (!prev.trim()) return textToAdd
      if (prev.includes(complaint.label)) return prev
      return `${prev}, ${textToAdd}`
    })
  }

  // Quick exam preset click
  const appendExamPreset = (preset: { label: string; text: string }) => {
    const textToAdd = preset.text
    setObjective((prev) => {
      if (!prev.trim()) return textToAdd
      if (prev.includes(preset.label)) return prev
      return `${prev}\n• ${textToAdd}`
    })
  }

  // Quick follow up date helpers
  const setFollowUpInDays = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setFollowUpDate(d.toISOString().split('T')[0])
  }

  // Auto-fill from AI Analysis
  const autoFillAI = () => {
    if (!latestVisit) return

    const parts: string[] = []
    if (latestVisit.diagnosis) {
      parts.push(`Clinical Diagnosis: ${latestVisit.diagnosis}`)
    }
    if (latestVisit.stage !== null) {
      const stageName = STAGE_LABEL[latestVisit.stage] || `Stage ${latestVisit.stage}`
      parts.push(`AI Liver Fibrosis Stage: ${stageName} (Stage ${latestVisit.stage})`)
    }
    if (latestVisit.fattyProbabilityPct !== null) {
      parts.push(`AI Fatty Liver Probability: ${latestVisit.fattyProbabilityPct}%`)
    }
    if (latestVisit.cancerRiskPct !== null) {
      parts.push(`AI Cancer Risk Score: ${latestVisit.cancerRiskPct}%`)
    }
    if (latestVisit.mortalityRiskPct !== null) {
      parts.push(`Mortality Risk (Cirrhosis): ${latestVisit.mortalityRiskPct}%`)
    }
    if (latestVisit.ascitesRiskPct !== null) {
      parts.push(`Ascites Complication Probability: ${latestVisit.ascitesRiskPct}%`)
    }
    if (latestVisit.apriScore !== null) {
      parts.push(`APRI Biochemical Score: ${latestVisit.apriScore.toFixed(2)}`)
    }

    const aiSummary = parts.join('\n• ')
    setAssessment((prev) => {
      const prefix = prev ? `${prev}\n\n[AI Machine Learning Assessment Insights]:\n• ` : `[AI Machine Learning Assessment Insights]:\n• `
      return `${prefix}${aiSummary}`
    })
  }

  const handleSave = async () => {
    if (!subjective.trim() && !objective.trim() && !assessment.trim()) {
      setError('Please provide at least a complaint (Subjective) or assessment findings.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload: ClinicalNoteCreatePayload = {
        patient_id: patientId,
        visit_type: visitType,
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        blood_pressure: bloodPressure.trim() || undefined,
        heart_rate: heartRate ? parseInt(heartRate, 10) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        jaundice,
        ascites,
        edema,
        hepatomegaly: hepatomegaly ? 1 : 0,
        splenomegaly: splenomegaly ? 1 : 0,
        spider_angioma: spiderAngioma ? 1 : 0,
        asterixis: asterixis ? 1 : 0,
        follow_up_date: followUpDate || undefined,
      }

      const note = await createClinicalNote(payload)
      onNoteCreated?.(note)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save clinical note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink)] p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--ink)]">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[var(--ink)]">
                  {t('Clinical SOAP Note & Encounter Documentation')}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--ink-muted)]">
                  {t('Patient')}: <strong className="text-[var(--ink)]">{patientName}</strong> (<span dir="ltr">#{patientCode}</span>)
                </DialogDescription>
              </div>
            </div>

            {/* Visit Type Selector */}
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface)] p-1 border border-[var(--line-strong)] text-xs">
              <button
                type="button"
                onClick={() => setVisitType('follow_up')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  visitType === 'follow_up' ? 'bg-[var(--accent)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
                }`}
              >
                {t('Follow-up Consultation')}
              </button>
              <button
                type="button"
                onClick={() => setVisitType('new')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  visitType === 'new' ? 'bg-[var(--accent)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
                }`}
              >
                {t('New Consultation')}
              </button>
              <button
                type="button"
                onClick={() => setVisitType('routine')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  visitType === 'routine' ? 'bg-[var(--accent)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
                }`}
              >
                {t('Routine Monitoring')}
              </button>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--critical)]/10 border border-[var(--critical)]/20 p-3 text-xs text-[var(--critical)]">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Section: Vitals ── */}
        <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3.5">
          <p className="text-[12px] font-semibold text-[var(--ink)] mb-2.5 flex items-center gap-1.5">
            <Activity className="size-3.5 text-[var(--accent)]" />
            {t('Vital Signs at Encounter:')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
                <Heart className="size-3 text-[var(--critical)]" /> {t('Blood Pressure')}
              </Label>
              <Input
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="120/80"
                className="h-8 text-xs bg-[var(--surface-wide)] border-[var(--line-strong)] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
                <Activity className="size-3 text-[var(--accent)]" /> {t('Pulse (bpm)')}
              </Label>
              <Input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="75"
                className="h-8 text-xs bg-[var(--surface-wide)] border-[var(--line-strong)] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
                <Weight className="size-3 text-[var(--caution)]" /> {t('Weight (kg)')}
              </Label>
              <Input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="78"
                className="h-8 text-xs bg-[var(--surface-wide)] border-[var(--line-strong)] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
                <Thermometer className="size-3 text-orange-400" /> {t('Temp (°C)')}
              </Label>
              <Input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="37.0"
                className="h-8 text-xs bg-[var(--surface-wide)] border-[var(--line-strong)] mt-1"
              />
            </div>
          </div>
        </div>

        {/* ── Section S: Subjective ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
              <span className="grid size-5 place-items-center rounded bg-[var(--accent)] text-[11px] font-extrabold text-[var(--ink)]">
                S
              </span>
              {t('Subjective — Chief Complaint & Patient Narrative:')}
            </Label>
            <span className="text-[11px] text-[var(--ink-muted)]">{t('Click quick-chips below to add:')}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)]/50">
            {CHIEF_COMPLAINT_PRESETS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => appendComplaint(item)}
                className="text-[11px] px-2 py-1 rounded-md bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all flex items-center gap-1"
              >
                <Plus className="size-2.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <Textarea
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
            rows={2}
            placeholder="e.g. Patient presents with 2-week history of dull right upper quadrant discomfort, mild scleral icterus, and progressive nocturnal pruritus..."
            className="text-xs bg-[var(--surface)] border-[var(--line-strong)]"
          />
        </div>

        {/* ── Section O: Objective ── */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded bg-[var(--accent)] text-[11px] font-extrabold text-[var(--ink)]">
              O
            </span>
            {t('Objective — Physical Exam & Liver-Specific Signs:')}
          </Label>

          {/* Liver Signs Bar */}
          <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Jaundice */}
              <div>
                <Label className="text-[11px] font-medium text-[var(--ink-muted)] block mb-1">
                  {t('Jaundice')}:
                </Label>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {['None', 'Mild', 'Moderate', 'Severe'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setJaundice(val)}
                      className={`py-1 rounded border transition-all text-center ${
                        jaundice === val
                          ? 'bg-[var(--accent)] text-[var(--ink)] font-bold border-[var(--accent)]'
                          : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {t(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ascites */}
              <div>
                <Label className="text-[11px] font-medium text-[var(--ink-muted)] block mb-1">
                  {t('Ascites')}:
                </Label>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {['None', 'Mild', 'Moderate', 'Severe'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAscites(val)}
                      className={`py-1 rounded border transition-all text-center ${
                        ascites === val
                          ? 'bg-[var(--accent)] text-[var(--ink)] font-bold border-[var(--accent)]'
                          : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {t(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lower Limb Edema */}
              <div>
                <Label className="text-[11px] font-medium text-[var(--ink-muted)] block mb-1">
                  {t('Lower Limb Edema')}:
                </Label>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {['None', 'Mild', 'Moderate', 'Severe'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEdema(val)}
                      className={`py-1 rounded border transition-all text-center ${
                        edema === val
                          ? 'bg-[var(--accent)] text-[var(--ink)] font-bold border-[var(--accent)]'
                          : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {t(val)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Organomegaly & Stigmata Toggles */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--line-strong)]">
              <button
                type="button"
                onClick={() => setHepatomegaly(!hepatomegaly)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  hepatomegaly
                    ? 'bg-[var(--caution)] text-black font-semibold border-[var(--caution)]'
                    : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                }`}
              >
                {hepatomegaly ? <Check className="size-3.5 stroke-[3]" /> : <Plus className="size-3.5" />}
                {t('Hepatomegaly')}
              </button>

              <button
                type="button"
                onClick={() => setSplenomegaly(!splenomegaly)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  splenomegaly
                    ? 'bg-[var(--caution)] text-black font-semibold border-[var(--caution)]'
                    : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                }`}
              >
                {splenomegaly ? <Check className="size-3.5 stroke-[3]" /> : <Plus className="size-3.5" />}
                {t('Splenomegaly')}
              </button>

              <button
                type="button"
                onClick={() => setSpiderAngioma(!spiderAngioma)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  spiderAngioma
                    ? 'bg-[var(--critical)] text-white font-semibold border-[var(--critical)]'
                    : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                }`}
              >
                {spiderAngioma ? <Check className="size-3.5 stroke-[3]" /> : <Plus className="size-3.5" />}
                {t('Spider Angiomas')}
              </button>

              <button
                type="button"
                onClick={() => setAsterixis(!asterixis)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  asterixis
                    ? 'bg-[var(--critical)] text-white font-semibold border-[var(--critical)]'
                    : 'bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink-muted)]'
                }`}
              >
                {asterixis ? <Check className="size-3.5 stroke-[3]" /> : <Plus className="size-3.5" />}
                {t('Asterixis (Flap)')}
              </button>
            </div>
          </div>

          {/* Quick Exam Findings */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)]/40">
            {PHYSICAL_EXAM_PRESETS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => appendExamPreset(item)}
                className="text-[11px] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--accent)]"
              >
                + {item.label}
              </button>
            ))}
          </div>

          <Textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            placeholder={t("Additional physical examination findings and abdominal palpation notes...")}
            className="text-xs bg-[var(--surface)] border-[var(--line-strong)]"
          />
        </div>

        {/* ── Section A: Assessment ── */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
              <span className="grid size-5 place-items-center rounded bg-[var(--accent)] text-[11px] font-extrabold text-[var(--ink)]">
                A
              </span>
              {t('Assessment & Clinical Diagnosis:')}
            </Label>
            {latestVisit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={autoFillAI}
                className="h-7 text-xs gap-1.5 border-[var(--accent)] text-[var(--ink)] bg-[var(--accent)]/15 hover:bg-[var(--accent)]/30 font-semibold"
              >
                <Sparkles className="size-3.5 text-[var(--accent)]" />
                {t('Auto-fill from Recent AI Assessment')}
              </Button>
            )}
          </div>

          <Textarea
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            rows={3}
            placeholder="e.g. Compensated Liver Cirrhosis (F4) secondary to Chronic HCV. Ascites mild controlled on Spironolactone. No overt hepatic encephalopathy."
            className="text-xs bg-[var(--surface)] border-[var(--line-strong)] font-mono text-[12px]"
          />
        </div>

        {/* ── Section P: Plan ── */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded bg-[var(--accent)] text-[11px] font-extrabold text-[var(--ink)]">
              P
            </span>
            {t('Plan & Orders:')}
          </Label>

          <Textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            rows={3}
            placeholder="1. Ordered: CBC, LFT, INR, Serum Albumin, Abdominal Ultrasound.&#10;2. Continue Ursofalk 250mg BID + Lasix 40mg QD.&#10;3. Diet: Low sodium, adequate protein, avoid hepatotoxic medications."
            className="text-xs bg-[var(--surface)] border-[var(--line-strong)] font-mono text-[12px]"
          />

          {/* Follow-up Appointment Picker */}
          <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <Label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[var(--accent)]" />
                {t('Next Follow-Up Visit Date:')}
              </Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFollowUpInDays(7)}
                  className="text-[11px] px-2 py-0.5 rounded border border-[var(--line-strong)] bg-[var(--surface-wide)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--accent)]"
                >
                  {t('+1 Week')}
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpInDays(14)}
                  className="text-[11px] px-2 py-0.5 rounded border border-[var(--line-strong)] bg-[var(--surface-wide)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--accent)]"
                >
                  {t('+2 Weeks')}
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpInDays(30)}
                  className="text-[11px] px-2 py-0.5 rounded border border-[var(--line-strong)] bg-[var(--surface-wide)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--accent)]"
                >
                  {t('+1 Month')}
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpInDays(90)}
                  className="text-[11px] px-2 py-0.5 rounded border border-[var(--line-strong)] bg-[var(--surface-wide)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--accent)]"
                >
                  {t('+3 Months')}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-9 text-xs bg-[var(--surface-wide)] border-[var(--line-strong)] max-w-xs"
              />
              {followUpDate && (
                <span className="text-xs text-[var(--accent)] font-medium">
                  {new Date(followUpDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[var(--line-strong)]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs border-[var(--line-strong)] text-[var(--ink)]"
          >
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-semibold bg-[var(--accent)] text-[var(--ink)] hover:brightness-105"
          >
            {saving ? t('Saving Note...') : t('Save Clinical Note')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
