'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileImage,
  Layers,
  Plus,
  Printer,
  Trash2,
  Edit,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UltrasoundExam,
  listUltrasounds,
  deleteUltrasound,
  getFibrosisInfo,
  getSteatosisInfo,
} from '@/lib/api/ultrasound'
import { UltrasoundEntryModal } from './ultrasound-entry-modal'
import { UltrasoundPrintModal } from './ultrasound-print-modal'

interface UltrasoundListProps {
  patientId: number
  patientName: string
  patientCode: string
}

export function UltrasoundList({ patientId, patientName, patientCode }: UltrasoundListProps) {
  const [exams, setExams] = useState<UltrasoundExam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<UltrasoundExam | null>(null)

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printingExam, setPrintingExam] = useState<UltrasoundExam | null>(null)

  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listUltrasounds(patientId)
      setExams(data)
    } catch (err: any) {
      setError(err?.message || 'Could not load ultrasound exams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [patientId])

  const handleDelete = async (examId: number) => {
    if (!confirm('Are you sure you want to delete this ultrasound record?')) return
    try {
      await deleteUltrasound(examId)
      setExams((prev) => prev.filter((e) => e.id !== examId))
    } catch (err: any) {
      alert(err?.message || 'Failed to delete record')
    }
  }

  const handleOpenEdit = (exam: UltrasoundExam) => {
    setEditingExam(exam)
    setEntryModalOpen(true)
  }

  const handleOpenNew = () => {
    setEditingExam(null)
    setEntryModalOpen(true)
  }

  const handleOpenPrint = (exam: UltrasoundExam) => {
    setPrintingExam(exam)
    setPrintModalOpen(true)
  }

  const handleModalSuccess = (saved: UltrasoundExam) => {
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = saved
        return copy
      }
      return [saved, ...prev]
    })
  }

  return (
    <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[22px] shadow-[var(--glass-lift)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-weak)] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Activity className="h-4 w-4" />
            </div>
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">
              Ultrasound, FibroScan & Imaging History
            </h2>
            <Badge variant="outline" className="text-xs">
              {exams.length} {exams.length === 1 ? 'Exam' : 'Exams'}
            </Badge>
          </div>
          <p className="text-[12px] text-[var(--ink-muted)] mt-1">
            Serial liver parenchymal assessment, portal hemodynamics, splenomegaly & transient elastography
          </p>
        </div>

        <Button
          onClick={handleOpenNew}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" /> Document Ultrasound
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--ink-muted)] py-6 text-center">Loading imaging records…</p>
      ) : error ? (
        <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-500 border border-red-500/20">
          {error}
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line-weak)] p-8 text-center bg-[var(--surface)]">
          <Activity className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-[var(--ink)]">No ultrasound or imaging documented yet</p>
          <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-md mx-auto">
            Document liver size, fatty infiltration grade, portal vein diameter, splenomegaly, or FibroScan stiffness
            in 10 seconds.
          </p>
          <Button onClick={handleOpenNew} size="sm" variant="outline" className="mt-4 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Document First Ultrasound
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const fibrosis = getFibrosisInfo(exam.fibroscan_kpa)
            const steatosis = getSteatosisInfo(exam.fibroscan_cap)
            const isPvDilated = exam.portal_vein_mm != null && exam.portal_vein_mm > 13.0
            const isSplenomegaly = exam.spleen_size_cm != null && exam.spleen_size_cm > 12.5

            return (
              <div
                key={exam.id}
                className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface)] p-4 hover:border-emerald-500/30 transition-all shadow-sm"
              >
                {/* Exam Title & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-weak)] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      {exam.exam_date ? format(new Date(exam.exam_date), 'd MMM yyyy, HH:mm') : '—'}
                    </span>
                    <Badge variant="outline" className="text-[11px] uppercase tracking-wider font-semibold">
                      {exam.exam_type}
                    </Badge>
                    <span className="text-[11px] text-[var(--ink-muted)]">by {exam.doctor_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPrint(exam)}
                      className="h-7 px-2 text-xs gap-1 text-[var(--ink-muted)] hover:text-emerald-600"
                      title="Print Report"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(exam)}
                      className="h-7 px-2 text-xs gap-1 text-[var(--ink-muted)] hover:text-emerald-600"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exam.id)}
                      className="h-7 px-2 text-xs gap-1 text-[var(--ink-muted)] hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mb-3 text-xs">
                  {/* Liver Size */}
                  <div className="rounded-lg bg-[var(--surface-wide)] p-2 border border-[var(--line-weak)]">
                    <span className="text-[11px] text-[var(--ink-muted)] block">Liver Size</span>
                    <span className="font-semibold text-[var(--ink)]">{exam.liver_size}</span>
                  </div>

                  {/* Echogenicity */}
                  <div className="rounded-lg bg-[var(--surface-wide)] p-2 border border-[var(--line-weak)]">
                    <span className="text-[11px] text-[var(--ink-muted)] block">Echogenicity</span>
                    <span className="font-semibold text-[var(--ink)] line-clamp-1">{exam.echogenicity}</span>
                  </div>

                  {/* Portal Vein */}
                  <div className={`rounded-lg p-2 border ${
                    isPvDilated
                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                      : 'bg-[var(--surface-wide)] border-[var(--line-weak)] text-[var(--ink)]'
                  }`}>
                    <span className="text-[11px] text-[var(--ink-muted)] block">Portal Vein</span>
                    <span className="font-semibold">
                      {exam.portal_vein_mm != null ? `${exam.portal_vein_mm} mm` : '—'}
                      {isPvDilated && ' (HTN)'}
                    </span>
                  </div>

                  {/* Spleen */}
                  <div className={`rounded-lg p-2 border ${
                    isSplenomegaly
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-[var(--surface-wide)] border-[var(--line-weak)] text-[var(--ink)]'
                  }`}>
                    <span className="text-[11px] text-[var(--ink-muted)] block">Spleen</span>
                    <span className="font-semibold">
                      {exam.spleen_size_cm != null ? `${exam.spleen_size_cm} cm` : '—'}
                      {isSplenomegaly && ' (Splenomegaly)'}
                    </span>
                  </div>

                  {/* Ascites */}
                  <div className={`rounded-lg p-2 border ${
                    exam.ascites !== 'None'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-[var(--surface-wide)] border-[var(--line-weak)] text-[var(--ink)]'
                  }`}>
                    <span className="text-[11px] text-[var(--ink-muted)] block">Ascites</span>
                    <span className="font-semibold">{exam.ascites}</span>
                  </div>

                  {/* FibroScan kPa */}
                  <div className="rounded-lg bg-[var(--surface-wide)] p-2 border border-[var(--line-weak)]">
                    <span className="text-[11px] text-[var(--ink-muted)] block">FibroScan (E)</span>
                    <span className="font-semibold" style={{ color: fibrosis.color }}>
                      {exam.fibroscan_kpa != null ? `${exam.fibroscan_kpa} kPa` : '—'}{' '}
                      {fibrosis.stage !== '—' ? `(${fibrosis.stage})` : ''}
                    </span>
                  </div>
                </div>

                {/* Focal Lesion Alert Banner if present */}
                {exam.focal_lesion !== 'None' && (
                  <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Focal Lesion: {exam.focal_lesion}</span>
                      {exam.focal_lesion_desc && <p className="mt-0.5">{exam.focal_lesion_desc}</p>}
                    </div>
                  </div>
                )}

                {/* Impression */}
                {exam.impression && (
                  <div className="text-xs mb-2">
                    <span className="font-semibold text-[var(--ink)] block mb-0.5">Impression:</span>
                    <p className="text-[var(--ink-muted)] leading-relaxed">{exam.impression}</p>
                  </div>
                )}

                {/* Recommendations */}
                {exam.recommendations && (
                  <div className="text-xs mb-2 text-emerald-700 dark:text-emerald-400">
                    <span className="font-semibold block mb-0.5">Plan / Recommendations:</span>
                    <p className="leading-relaxed">{exam.recommendations}</p>
                  </div>
                )}

                {/* Image thumbnails */}
                {exam.image_urls && exam.image_urls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[var(--line-weak)]">
                    <span className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1 mb-2">
                      <FileImage className="h-3.5 w-3.5 text-emerald-600" /> Attached Scans ({exam.image_urls.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {exam.image_urls.map((url, idx) => {
                        const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`
                        const isPdf = url.toLowerCase().endsWith('.pdf')
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImagePreview(fullUrl)}
                            className="relative h-14 w-20 rounded-md border border-[var(--line-weak)] overflow-hidden bg-black/5 hover:opacity-80 transition-opacity"
                          >
                            {isPdf ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-red-500">
                                <FileImage className="h-4 w-4 mb-0.5" />
                                <span>PDF</span>
                              </div>
                            ) : (
                              <img src={fullUrl} alt="Scan preview" className="w-full h-full object-cover" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Entry / Edit Modal */}
      <UltrasoundEntryModal
        open={entryModalOpen}
        onOpenChange={setEntryModalOpen}
        patientId={patientId}
        patientName={patientName}
        patientCode={patientCode}
        existingExam={editingExam}
        onSuccess={handleModalSuccess}
      />

      {/* Print / Export Modal */}
      <UltrasoundPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        exam={printingExam}
        patientName={patientName}
        patientCode={patientCode}
      />

      {/* Lightbox Image Preview Modal */}
      {activeImagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActiveImagePreview(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-black p-2">
            <img src={activeImagePreview} alt="Enlarged scan" className="max-w-full max-h-[85vh] object-contain mx-auto" />
          </div>
        </div>
      )}
    </section>
  )
}
