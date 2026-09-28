'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileImage,
  Layers,
  Sparkles,
  Upload,
  X,
  Zap,
  Info,
} from 'lucide-react'
import {
  UltrasoundExam,
  UltrasoundExamInput,
  EXAM_PRESETS,
  getFibrosisInfo,
  getSteatosisInfo,
  createUltrasound,
  updateUltrasound,
  uploadUltrasoundFile,
} from '@/lib/api/ultrasound'

interface UltrasoundEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number
  patientName: string
  patientCode: string
  existingExam?: UltrasoundExam | null
  onSuccess: (exam: UltrasoundExam) => void
}

const LIVER_SIZE_OPTIONS = ['Normal', 'Hepatomegaly', 'Shrunken / Atrophic']

const ECHOGENICITY_OPTIONS = [
  { id: 'Normal', label: 'Normal', note: 'Homogenous' },
  { id: 'Grade I Mild Fatty', label: 'Grade I', note: 'Mild steatosis' },
  { id: 'Grade II Moderate Fatty', label: 'Grade II', note: 'Moderate steatosis' },
  { id: 'Grade III Severe Fatty', label: 'Grade III', note: 'Severe attenuation' },
  { id: 'Coarse / Cirrhotic', label: 'Coarse', note: 'Cirrhotic texture' },
]

const SURFACE_OPTIONS = ['Smooth', 'Irregular / Nodular']

const PORTAL_FLOW_OPTIONS = ['Normal', 'Slowed', 'Reversed', 'Thrombosed']

const ASCITES_OPTIONS = ['None', 'Trace / Mild', 'Moderate', 'Severe / Tense']

const FOCAL_LESION_OPTIONS = [
  'None',
  'Simple Cyst',
  'Hemangioma',
  'Suspicious HCC',
  'Multiple Nodules',
  'Metastatic Lesion',
]

const GALLBLADDER_OPTIONS = ['Normal', 'Cholelithiasis (Stones)', 'Sludge', 'Thickened Wall', 'Cholecystectomy']

const IMPRESSION_SNIPPETS = [
  'Normal liver size and homogeneous echotexture with no focal lesions or ascites.',
  'Diffuse hepatic steatosis (Grade II moderate) with mild hepatomegaly.',
  'Cirrhotic liver morphology with portal hypertension (dilated portal vein & splenomegaly).',
  'Coarse liver parenchyma with a discrete suspicious focal nodule requiring contrast imaging.',
]

const RECOMMENDATION_SNIPPETS = [
  'Routine surveillance ultrasound in 12 months.',
  'Dietary lifestyle modification and repeat FibroScan in 6 months.',
  'Upper GI endoscopy for variceal screening and 6-month HCC surveillance (US + AFP).',
  'Urgent multiphase contrast-enhanced CT / MRI liver protocol.',
]

export function UltrasoundEntryModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientCode,
  existingExam,
  onSuccess,
}: UltrasoundEntryModalProps) {
  const [activeTab, setActiveTab] = useState<string>('ultrasound')
  const [examType, setExamType] = useState<string>(existingExam?.exam_type ?? 'ultrasound')
  const [liverSize, setLiverSize] = useState<string>(existingExam?.liver_size ?? 'Normal')
  const [echogenicity, setEchogenicity] = useState<string>(existingExam?.echogenicity ?? 'Normal')
  const [surfaceContour, setSurfaceContour] = useState<string>(existingExam?.surface_contour ?? 'Smooth')
  const [portalVein, setPortalVein] = useState<string>(
    existingExam?.portal_vein_mm != null ? String(existingExam.portal_vein_mm) : '11.0'
  )
  const [portalFlow, setPortalFlow] = useState<string>(existingExam?.portal_flow ?? 'Normal')
  const [spleenSize, setSpleenSize] = useState<string>(
    existingExam?.spleen_size_cm != null ? String(existingExam.spleen_size_cm) : '10.5'
  )
  const [ascites, setAscites] = useState<string>(existingExam?.ascites ?? 'None')
  const [focalLesion, setFocalLesion] = useState<string>(existingExam?.focal_lesion ?? 'None')
  const [focalLesionDesc, setFocalLesionDesc] = useState<string>(existingExam?.focal_lesion_desc ?? '')
  const [gallbladder, setGallbladder] = useState<string>(existingExam?.gallbladder ?? 'Normal')
  const [cbdDiameter, setCbdDiameter] = useState<string>(
    existingExam?.cbd_diameter_mm != null ? String(existingExam.cbd_diameter_mm) : '4.5'
  )
  const [fibroscanKpa, setFibroscanKpa] = useState<string>(
    existingExam?.fibroscan_kpa != null ? String(existingExam.fibroscan_kpa) : ''
  )
  const [fibroscanCap, setFibroscanCap] = useState<string>(
    existingExam?.fibroscan_cap != null ? String(existingExam.fibroscan_cap) : ''
  )
  const [impression, setImpression] = useState<string>(existingExam?.impression ?? '')
  const [recommendations, setRecommendations] = useState<string>(existingExam?.recommendations ?? '')
  const [imageUrls, setImageUrls] = useState<string[]>(existingExam?.image_urls ?? [])

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived calculations
  const kpaNum = fibroscanKpa ? parseFloat(fibroscanKpa) : null
  const capNum = fibroscanCap ? parseFloat(fibroscanCap) : null
  const fibrosis = getFibrosisInfo(kpaNum)
  const steatosis = getSteatosisInfo(capNum)

  const pvNum = portalVein ? parseFloat(portalVein) : null
  const isPvDilated = pvNum != null && pvNum > 13.0

  const spleenNum = spleenSize ? parseFloat(spleenSize) : null
  const isSplenomegaly = spleenNum != null && spleenNum > 12.5

  const applyPreset = (preset: typeof EXAM_PRESETS[number]) => {
    const d = preset.data
    if (d.exam_type) setExamType(d.exam_type)
    if (d.liver_size) setLiverSize(d.liver_size)
    if (d.echogenicity) setEchogenicity(d.echogenicity)
    if (d.surface_contour) setSurfaceContour(d.surface_contour)
    if (d.portal_vein_mm != null) setPortalVein(String(d.portal_vein_mm))
    if (d.portal_flow) setPortalFlow(d.portal_flow)
    if (d.spleen_size_cm != null) setSpleenSize(String(d.spleen_size_cm))
    if (d.ascites) setAscites(d.ascites)
    if (d.focal_lesion) setFocalLesion(d.focal_lesion)
    if (d.focal_lesion_desc !== undefined) setFocalLesionDesc(d.focal_lesion_desc)
    if (d.gallbladder) setGallbladder(d.gallbladder)
    if (d.cbd_diameter_mm != null) setCbdDiameter(String(d.cbd_diameter_mm))
    if (d.fibroscan_kpa != null) setFibroscanKpa(String(d.fibroscan_kpa))
    if (d.fibroscan_cap != null) setFibroscanCap(String(d.fibroscan_cap))
    if (d.impression) setImpression(d.impression)
    if (d.recommendations) setRecommendations(d.recommendations)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)
    try {
      for (let i = 0; i < files.length; i++) {
        const res = await uploadUltrasoundFile(files[i])
        setImageUrls((prev) => [...prev, res.url])
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload: UltrasoundExamInput = {
        patient_id: patientId,
        exam_type: examType,
        liver_size: liverSize,
        echogenicity: echogenicity,
        surface_contour: surfaceContour,
        portal_vein_mm: portalVein ? parseFloat(portalVein) : null,
        portal_flow: portalFlow,
        spleen_size_cm: spleenSize ? parseFloat(spleenSize) : null,
        ascites: ascites,
        focal_lesion: focalLesion,
        focal_lesion_desc: focalLesionDesc,
        gallbladder: gallbladder,
        cbd_diameter_mm: cbdDiameter ? parseFloat(cbdDiameter) : null,
        fibroscan_kpa: kpaNum,
        fibroscan_cap: capNum,
        fibrosis_stage: fibrosis.stage !== '—' ? fibrosis.stage : undefined,
        steatosis_grade: steatosis.grade !== '—' ? steatosis.grade : undefined,
        impression: impression,
        recommendations: recommendations,
        image_urls: imageUrls,
      }

      let saved: UltrasoundExam
      if (existingExam) {
        saved = await updateUltrasound(existingExam.id, payload)
      } else {
        saved = await createUltrasound(payload)
      }

      onSuccess(saved)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save examination')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[920px] sm:!max-w-[920px] md:!max-w-[940px] w-[95vw] h-[90vh] max-h-[880px] flex flex-col bg-[var(--surface)] !p-0 overflow-hidden shadow-2xl border border-[var(--line-weak)] rounded-2xl">
        {/* ── Modal Header ── */}
        <DialogHeader className="p-5 pb-3 border-b border-[var(--line-weak)] bg-[var(--surface-wide)]/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-[17px] font-semibold text-[var(--ink)] tracking-tight">
                  {existingExam ? 'Edit Ultrasound / Imaging Exam' : 'Liver Ultrasound & FibroScan Documentation'}
                </DialogTitle>
                <DialogDescription className="text-[12px] text-[var(--ink-muted)]">
                  Patient: <span className="font-semibold text-[var(--ink)]">{patientName}</span> ({patientCode})
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase tracking-wide bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold px-2.5 py-1">
                {examType}
              </Badge>
            </div>
          </div>

          {/* ── 1-Click Quick Presets Toolbar ── */}
          <div className="mt-3 pt-3 border-t border-[var(--line-weak)]/60 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-[var(--ink-muted)] flex items-center gap-1 shrink-0 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Presets:
            </span>
            <div className="flex items-center gap-1.5 flex-1 min-w-max">
              {EXAM_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all flex items-center gap-1.5 shadow-sm"
                  title={p.description}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-500 border border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Main Tabbed Content ── */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation Bar */}
            <TabsList className="grid grid-cols-3 w-full h-11 bg-[var(--surface-wide)] p-1 border border-[var(--line-weak)] rounded-xl mb-4">
              <TabsTrigger
                value="ultrasound"
                className="text-xs font-medium rounded-lg data-[state=active]:bg-[var(--surface)] data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" /> 1. B-Mode Ultrasound
              </TabsTrigger>
              <TabsTrigger
                value="fibroscan"
                className="text-xs font-medium rounded-lg data-[state=active]:bg-[var(--surface)] data-[state=active]:text-purple-600 data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" /> 2. FibroScan & Elastography
              </TabsTrigger>
              <TabsTrigger
                value="impression"
                className="text-xs font-medium rounded-lg data-[state=active]:bg-[var(--surface)] data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> 3. Impression & Media
              </TabsTrigger>
            </TabsList>

            {/* ══════════════════════════════════════════════════════════
                TAB 1: B-MODE ULTRASOUND
                ══════════════════════════════════════════════════════════ */}
            <TabsContent value="ultrasound" className="space-y-4 focus-visible:outline-none">
              {/* Card 1: Liver Morphology & Parenchyma */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--line-weak)] pb-2">
                  <h4 className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" /> Liver Morphology & Parenchyma
                  </h4>
                  <span className="text-[11px] text-[var(--ink-muted)]">Organ dimensions & echotexture</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Liver Size */}
                  <div>
                    <label className="text-xs font-medium text-[var(--ink-muted)] mb-1.5 block">Liver Size</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {LIVER_SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setLiverSize(opt)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center border transition-all truncate ${
                            liverSize === opt
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700'
                              : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Surface / Contour */}
                  <div>
                    <label className="text-xs font-medium text-[var(--ink-muted)] mb-1.5 block">Surface / Contour</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SURFACE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSurfaceContour(opt)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center border transition-all truncate ${
                            surfaceContour === opt
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700'
                              : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Echogenicity / Steatosis */}
                <div>
                  <label className="text-xs font-medium text-[var(--ink-muted)] mb-1.5 block">Parenchymal Echogenicity</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {ECHOGENICITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEchogenicity(opt.id)}
                        className={`p-2 rounded-lg text-left border transition-all ${
                          echogenicity === opt.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold shadow-sm'
                            : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                        }`}
                      >
                        <span className="block text-xs">{opt.label}</span>
                        <span className="block text-[10px] text-[var(--ink-muted)] truncate">{opt.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Portal Hemodynamics & Spleen */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--line-weak)] pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-[13px] font-semibold text-[var(--ink)]">Portal System & Hemodynamics</h4>
                  </div>
                  <div className="flex gap-2">
                    {isPvDilated && (
                      <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 text-[11px] font-semibold">
                        <AlertTriangle className="h-3 w-3 mr-1 inline" /> Portal HTN (&gt;13mm)
                      </Badge>
                    )}
                    {isSplenomegaly && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-[11px] font-semibold">
                        Splenomegaly (&gt;12.5cm)
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Portal Vein mm */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-[var(--ink-muted)]">Portal Vein Caliber</label>
                      <span className="text-[10px] text-gray-400">&lt;13 mm normal</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={portalVein}
                        onChange={(e) => setPortalVein(e.target.value)}
                        className={`h-9 text-xs pr-9 ${isPvDilated ? 'border-red-500 font-bold text-red-600' : ''}`}
                        placeholder="11.0"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[var(--ink-muted)]">mm</span>
                    </div>
                  </div>

                  {/* Portal Flow */}
                  <div>
                    <label className="text-xs font-medium text-[var(--ink-muted)] mb-1 block">Doppler Portal Flow</label>
                    <div className="grid grid-cols-2 gap-1">
                      {PORTAL_FLOW_OPTIONS.map((flow) => (
                        <button
                          key={flow}
                          type="button"
                          onClick={() => setPortalFlow(flow)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center border truncate transition-all ${
                            portalFlow === flow
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700'
                              : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                          }`}
                        >
                          {flow}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Spleen Size cm */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-[var(--ink-muted)]">Spleen Bipolar Size</label>
                      <span className="text-[10px] text-gray-400">&lt;12.5 cm normal</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={spleenSize}
                        onChange={(e) => setSpleenSize(e.target.value)}
                        className={`h-9 text-xs pr-9 ${isSplenomegaly ? 'border-amber-500 font-bold text-amber-600' : ''}`}
                        placeholder="10.5"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[var(--ink-muted)]">cm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Ascites, Biliary Tree & Focal Lesions */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ascites */}
                  <div>
                    <label className="text-xs font-medium text-[var(--ink-muted)] mb-1.5 block">Ascitic Fluid</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ASCITES_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAscites(opt)}
                          className={`px-1.5 py-1.5 rounded-lg text-xs font-medium text-center border truncate transition-all ${
                            ascites === opt
                              ? opt !== 'None'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                                : 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gallbladder */}
                  <div>
                    <label className="text-xs font-medium text-[var(--ink-muted)] mb-1.5 block">Gallbladder & Biliary</label>
                    <div className="grid grid-cols-3 gap-1">
                      {GALLBLADDER_OPTIONS.slice(0, 3).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setGallbladder(opt)}
                          className={`px-1.5 py-1.5 rounded-lg text-xs font-medium text-center border truncate transition-all ${
                            gallbladder === opt
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700'
                              : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                          }`}
                        >
                          {opt.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Focal Lesions Screening */}
                <div className="pt-2 border-t border-[var(--line-weak)]">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Focal Hepatic Lesions / HCC Screening
                    </label>
                    {focalLesion !== 'None' && (
                      <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 text-[10px]">
                        Lesion Identified
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {FOCAL_LESION_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFocalLesion(opt)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center border truncate transition-all ${
                          focalLesion === opt
                            ? opt === 'Suspicious HCC'
                              ? 'bg-red-600 text-white border-red-600 font-bold'
                              : 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--line-weak)]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {focalLesion !== 'None' && (
                    <div className="mt-2.5">
                      <Input
                        value={focalLesionDesc}
                        onChange={(e) => setFocalLesionDesc(e.target.value)}
                        placeholder="Specify lesion dimensions and anatomical segment (e.g. 2.1 x 1.8 cm hypoechoic nodule in segment VI)..."
                        className="h-9 text-xs border-red-500/40 bg-red-500/5 focus:border-red-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════
                TAB 2: FIBROSCAN & ELASTOGRAPHY
                ══════════════════════════════════════════════════════════ */}
            <TabsContent value="fibroscan" className="space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Liver Stiffness (kPa) */}
                <div className="rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <h4 className="text-[13px] font-semibold text-purple-700 dark:text-purple-300">
                        Liver Stiffness (kPa)
                      </h4>
                    </div>
                    <Badge variant="outline" style={{ color: fibrosis.color, borderColor: fibrosis.color }} className="font-bold">
                      {fibrosis.stage} ({fibrosis.tag})
                    </Badge>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--ink-muted)] mb-1 block">Stiffness Value (E - kPa)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={fibroscanKpa}
                        onChange={(e) => setFibroscanKpa(e.target.value)}
                        placeholder="e.g. 7.5"
                        className="h-10 text-sm font-semibold pr-12 border-purple-500/30"
                      />
                      <span className="absolute right-3 top-3 text-xs text-purple-500 font-bold">kPa</span>
                    </div>
                  </div>

                  {/* Visual METAVIR Staging Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-emerald-500">F0-F1 (&lt;7)</span>
                      <span className="text-amber-500">F2 (7-9.4)</span>
                      <span className="text-orange-500">F3 (9.5-12.4)</span>
                      <span className="text-red-500">F4 (&ge;12.5)</span>
                    </div>
                    <div className="grid grid-cols-4 h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 gap-0.5">
                      <div className={`h-full ${kpaNum && kpaNum < 7 ? 'bg-emerald-500 ring-2 ring-emerald-400' : 'bg-emerald-500/40'}`}></div>
                      <div className={`h-full ${kpaNum && kpaNum >= 7 && kpaNum < 9.5 ? 'bg-amber-500 ring-2 ring-amber-400' : 'bg-amber-500/40'}`}></div>
                      <div className={`h-full ${kpaNum && kpaNum >= 9.5 && kpaNum < 12.5 ? 'bg-orange-500 ring-2 ring-orange-400' : 'bg-orange-500/40'}`}></div>
                      <div className={`h-full ${kpaNum && kpaNum >= 12.5 ? 'bg-red-500 ring-2 ring-red-400' : 'bg-red-500/40'}`}></div>
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)] pt-1">{fibrosis.desc}</p>
                  </div>
                </div>

                {/* Panel 2: CAP Score (Steatosis) */}
                <div className="rounded-xl border border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-transparent p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-teal-600" />
                      <h4 className="text-[13px] font-semibold text-teal-800 dark:text-teal-300">
                        Controlled Attenuation (CAP)
                      </h4>
                    </div>
                    <Badge variant="outline" style={{ color: steatosis.color, borderColor: steatosis.color }} className="font-bold">
                      {steatosis.grade} ({steatosis.tag})
                    </Badge>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--ink-muted)] mb-1 block">CAP Score (dB/m)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="1"
                        value={fibroscanCap}
                        onChange={(e) => setFibroscanCap(e.target.value)}
                        placeholder="e.g. 265"
                        className="h-10 text-sm font-semibold pr-14 border-teal-500/30"
                      />
                      <span className="absolute right-3 top-3 text-xs text-teal-600 font-bold">dB/m</span>
                    </div>
                  </div>

                  {/* Visual Steatosis Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-emerald-500">S0 (&lt;248)</span>
                      <span className="text-amber-500">S1 (248-267)</span>
                      <span className="text-orange-500">S2 (268-279)</span>
                      <span className="text-red-500">S3 (&ge;280)</span>
                    </div>
                    <div className="grid grid-cols-4 h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 gap-0.5">
                      <div className={`h-full ${capNum && capNum < 248 ? 'bg-emerald-500 ring-2 ring-emerald-400' : 'bg-emerald-500/40'}`}></div>
                      <div className={`h-full ${capNum && capNum >= 248 && capNum < 268 ? 'bg-amber-500 ring-2 ring-amber-400' : 'bg-amber-500/40'}`}></div>
                      <div className={`h-full ${capNum && capNum >= 268 && capNum < 280 ? 'bg-orange-500 ring-2 ring-orange-400' : 'bg-orange-500/40'}`}></div>
                      <div className={`h-full ${capNum && capNum >= 280 ? 'bg-red-500 ring-2 ring-red-400' : 'bg-red-500/40'}`}></div>
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)] pt-1">{steatosis.desc}</p>
                  </div>
                </div>
              </div>

              {/* Reference Guidelines Info Box */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-3 text-xs text-[var(--ink-muted)] flex items-start gap-2.5">
                <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <span className="font-semibold text-[var(--ink)]">AASLD / EASL Reference:</span> Values &lt;7.0 kPa reliably rule out advanced fibrosis. Values &ge;12.5-14.0 kPa indicate high probability of cirrhosis and warrant screening for gastroesophageal varices and surveillance for hepatocellular carcinoma.
                </p>
              </div>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════
                TAB 3: IMPRESSION, PLAN & IMAGES
                ══════════════════════════════════════════════════════════ */}
            <TabsContent value="impression" className="space-y-4 focus-visible:outline-none">
              {/* Impression */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--ink)]">Diagnostic Impression & Findings</label>
                  <span className="text-[11px] text-[var(--ink-muted)]">Click chip to insert</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {IMPRESSION_SNIPPETS.map((snippet, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImpression((prev) => (prev ? `${prev} ${snippet}` : snippet))}
                      className="px-2 py-0.5 rounded text-[11px] border border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left truncate max-w-xs"
                    >
                      + {snippet.slice(0, 35)}…
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={3}
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  placeholder="Comprehensive diagnostic conclusion of findings..."
                  className="text-xs leading-relaxed bg-[var(--surface)]"
                />
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--ink)]">Clinical Plan & Surveillance Recommendations</label>
                  <span className="text-[11px] text-[var(--ink-muted)]">Click chip to insert</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {RECOMMENDATION_SNIPPETS.map((snippet, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRecommendations((prev) => (prev ? `${prev} ${snippet}` : snippet))}
                      className="px-2 py-0.5 rounded text-[11px] border border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left truncate max-w-xs"
                    >
                      + {snippet.slice(0, 35)}…
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Follow-up instructions, surveillance frequency, endoscopy, or CT/MRI referrals..."
                  className="text-xs leading-relaxed bg-[var(--surface)]"
                />
              </div>

              {/* Scan Attachments & Images */}
              <div className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                    <FileImage className="h-4 w-4 text-emerald-600" /> Attached Scan Photos & PDF Reports ({imageUrls.length})
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading...' : 'Upload Scan Photo / PDF'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.dcm"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {imageUrls.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                    {imageUrls.map((url, idx) => {
                      const isPdf = url.toLowerCase().endsWith('.pdf')
                      const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`
                      return (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-[var(--line-weak)] aspect-square bg-black/10">
                          {isPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-red-500/5">
                              <FileImage className="h-6 w-6 text-red-500 mb-1" />
                              <span className="text-[10px] line-clamp-1 font-medium">PDF Document</span>
                            </div>
                          ) : (
                            <img src={fullUrl} alt="Ultrasound scan" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-xs text-[var(--ink-muted)] text-center py-5 border-2 border-dashed rounded-xl border-[var(--line-weak)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="h-5 w-5 text-gray-400" />
                    <p className="font-medium text-[var(--ink)]">Click to browse or drop ultrasound photos / PDF</p>
                    <p className="text-[11px]">Supports JPEG, PNG, WEBP, and DICOM/PDF reports</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Modal Footer ── */}
        <DialogFooter className="p-4 border-t border-[var(--line-weak)] bg-[var(--surface-wide)]/60 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Summary Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink)]">Summary:</span>
            <Badge variant="secondary" className="text-[11px] font-medium">
              Liver: {liverSize}
            </Badge>
            <Badge variant="secondary" className="text-[11px] font-medium">
              PV: {portalVein || '—'} mm
            </Badge>
            {fibrosis.stage !== '—' && (
              <Badge variant="outline" style={{ color: fibrosis.color, borderColor: fibrosis.color }} className="text-[11px] font-bold">
                Fibrosis: {fibrosis.stage}
              </Badge>
            )}
            {ascites !== 'None' && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[11px] font-semibold">
                Ascites: {ascites}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {activeTab !== 'ultrasound' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'impression' ? 'fibroscan' : 'ultrasound')}
                className="gap-1 h-9 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}

            {activeTab !== 'impression' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'ultrasound' ? 'fibroscan' : 'impression')}
                className="gap-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs font-semibold shadow-sm ml-1"
            >
              {saving ? 'Saving...' : existingExam ? 'Update Examination' : 'Save Examination'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
