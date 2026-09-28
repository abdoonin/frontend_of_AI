'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Plus,
  Stethoscope,
  Calendar,
  User,
  Heart,
  Activity,
  Weight,
  Thermometer,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  fetchClinicalNotes,
  deleteClinicalNote,
  type ClinicalNote,
} from '@/lib/api/clinical-notes'
import { ClinicalNoteBuilder } from './clinical-note-builder'
import type { Visit } from '@/lib/api/patients'
import { useLanguage } from '@/lib/language-context'

interface ClinicalNotesListProps {
  patientId: number
  patientName: string
  patientCode: string
  latestVisit?: Visit | null
}

export function ClinicalNotesList({
  patientId,
  patientName,
  patientCode,
  latestVisit,
}: ClinicalNotesListProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())

  const loadNotes = () => {
    setLoading(true)
    fetchClinicalNotes(patientId)
      .then((data) => {
        setNotes(data)
        // Expand the most recent note by default
        if (data.length > 0) {
          setExpandedNotes(new Set([data[0].id]))
        }
      })
      .catch((err) => setError(err?.message || 'Failed to load clinical notes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNotes()
  }, [patientId])

  const toggleExpand = (id: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this clinical SOAP note?')) return
    try {
      await deleteClinicalNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } catch (err: any) {
      alert(err?.message || 'Could not delete note.')
    }
  }

  // Follow-up status evaluator
  const getFollowUpStatus = (dateStr?: string | null) => {
    if (!dateStr) return null
    try {
      const target = new Date(dateStr)
      const now = new Date()
      const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        return {
          label: `Overdue by ${Math.abs(diffDays)}d (${format(target, 'd MMM yyyy')})`,
          tone: 'var(--critical)',
          bg: 'rgba(239, 68, 68, 0.12)',
        }
      } else if (diffDays <= 3) {
        return {
          label: `Due soon in ${diffDays}d (${format(target, 'd MMM yyyy')})`,
          tone: 'var(--caution)',
          bg: 'rgba(245, 158, 11, 0.12)',
        }
      } else {
        return {
          label: `Scheduled ${format(target, 'd MMM yyyy')} (${diffDays}d)`,
          tone: 'var(--accent)',
          bg: 'rgba(16, 185, 129, 0.12)',
        }
      }
    } catch {
      return null
    }
  }

  const { t } = useLanguage()

  return (
    <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[22px] shadow-[var(--glass-lift)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-xl bg-[var(--accent)] text-[var(--ink)]">
            <Stethoscope className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-[var(--ink)]">
                {t('Clinical SOAP Notes')}
              </h2>
              <Badge variant="outline" className="text-xs">
                {notes.length} {notes.length === 1 ? 'Visit' : 'Visits'}
              </Badge>
            </div>
            <p className="text-[12px] text-[var(--ink-muted)]">
              Documented patient consultations, vitals, liver signs, and follow-up plans
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setBuilderOpen(true)}
          className="h-8 gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--ink)] hover:brightness-105"
        >
          <Plus className="size-3.5" />
          {t('New SOAP Note')}
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-[var(--ink-muted)]">
          Loading clinical documentation...
        </div>
      ) : error ? (
        <div className="p-4 text-xs text-[var(--critical)] bg-[var(--critical)]/10 rounded-xl">
          {error}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] p-8 text-center">
          <FileText className="size-9 text-[var(--ink-muted)]/60 mb-2" />
          <p className="text-sm font-semibold text-[var(--ink)]">No clinical SOAP notes recorded</p>
          <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-md">
            Start documenting physical findings, vital signs, subjective complaints, and follow-up orders for this patient.
          </p>
          <Button
            size="sm"
            onClick={() => setBuilderOpen(true)}
            className="mt-3.5 h-8 text-xs gap-1.5 font-semibold bg-[var(--accent)] text-[var(--ink)]"
          >
            <Plus className="size-3.5" /> Document First Visit
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {notes.map((note) => {
            const isExpanded = expandedNotes.has(note.id)
            const followUpStatus = getFollowUpStatus(note.follow_up_date)

            return (
              <div
                key={note.id}
                className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] transition-all shadow-sm"
              >
                {/* Note Card Header */}
                <div
                  onClick={() => toggleExpand(note.id)}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--surface-hover)]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[var(--surface-wide)] border border-[var(--line-strong)] font-mono text-xs font-bold text-[var(--ink)]">
                      {note.visit_type === 'new' ? 'NEW' : note.visit_type === 'routine' ? 'ROUT' : 'F-UP'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--ink)]">
                          {note.visit_date ? format(new Date(note.visit_date), 'd MMM yyyy, HH:mm') : 'Recorded Visit'}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[11px] capitalize font-medium px-2 py-0.5"
                        >
                          {note.visit_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5 flex items-center gap-1.5">
                        <User className="size-3 text-[var(--ink-muted)]" />
                        <span>Dr. {note.doctor_name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {followUpStatus && (
                      <span
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ color: followUpStatus.tone, backgroundColor: followUpStatus.bg }}
                      >
                        <Calendar className="size-3" />
                        {followUpStatus.label}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Vitals & Liver Signs Preview Strip (Always visible or compact) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 bg-[var(--surface-wide)]/60 border-t border-[var(--line-strong)] text-xs">
                  {note.blood_pressure && (
                    <span className="flex items-center gap-1 font-mono text-[var(--ink)]">
                      <Heart className="size-3 text-[var(--critical)]" />
                      <span>BP: {note.blood_pressure}</span>
                    </span>
                  )}
                  {note.heart_rate && (
                    <span className="flex items-center gap-1 font-mono text-[var(--ink)]">
                      <Activity className="size-3 text-[var(--accent)]" />
                      <span>{note.heart_rate} bpm</span>
                    </span>
                  )}
                  {note.weight && (
                    <span className="flex items-center gap-1 font-mono text-[var(--ink)]">
                      <Weight className="size-3 text-[var(--caution)]" />
                      <span>{note.weight} kg</span>
                    </span>
                  )}
                  {note.temperature && (
                    <span className="flex items-center gap-1 font-mono text-[var(--ink)]">
                      <Thermometer className="size-3 text-orange-400" />
                      <span>{note.temperature}°C</span>
                    </span>
                  )}

                  {/* Liver Sign Badges */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {note.jaundice !== 'None' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        Jaundice: {note.jaundice}
                      </span>
                    )}
                    {note.ascites !== 'None' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Ascites: {note.ascites}
                      </span>
                    )}
                    {note.edema !== 'None' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Edema: {note.edema}
                      </span>
                    )}
                    {note.hepatomegaly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Hepatomegaly
                      </span>
                    )}
                    {note.splenomegaly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        Splenomegaly
                      </span>
                    )}
                    {note.asterixis && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/25 text-red-400 border border-red-500/40 animate-pulse">
                        Asterixis (+)
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Full SOAP Body */}
                {isExpanded && (
                  <div className="p-4 space-y-3.5 border-t border-[var(--line-strong)] text-xs">
                    {/* S: Subjective */}
                    {note.subjective && (
                      <div className="rounded-xl p-3 bg-[var(--surface-wide)] border border-[var(--line-strong)]">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] mb-1">
                          <span className="size-4.5 rounded bg-[var(--accent)] text-[var(--ink)] grid place-items-center text-[10px]">
                            S
                          </span>
                          <span>Subjective — Chief Complaint & History:</span>
                        </div>
                        <p className="text-[var(--ink)] whitespace-pre-wrap leading-relaxed pl-6">
                          {note.subjective}
                        </p>
                      </div>
                    )}

                    {/* O: Objective */}
                    {note.objective && (
                      <div className="rounded-xl p-3 bg-[var(--surface-wide)] border border-[var(--line-strong)]">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] mb-1">
                          <span className="size-4.5 rounded bg-[var(--accent)] text-[var(--ink)] grid place-items-center text-[10px]">
                            O
                          </span>
                          <span>Objective — Examination & Liver Signs:</span>
                        </div>
                        <p className="text-[var(--ink)] whitespace-pre-wrap leading-relaxed pl-6">
                          {note.objective}
                        </p>
                      </div>
                    )}

                    {/* A: Assessment */}
                    {note.assessment && (
                      <div className="rounded-xl p-3 bg-[var(--surface-wide)] border border-[var(--line-strong)]">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] mb-1">
                          <span className="size-4.5 rounded bg-[var(--accent)] text-[var(--ink)] grid place-items-center text-[10px]">
                            A
                          </span>
                          <span>Assessment & Clinical Diagnosis:</span>
                        </div>
                        <p className="text-[var(--ink)] font-mono whitespace-pre-wrap leading-relaxed pl-6 text-[12px]">
                          {note.assessment}
                        </p>
                      </div>
                    )}

                    {/* P: Plan */}
                    {note.plan && (
                      <div className="rounded-xl p-3 bg-[var(--surface-wide)] border border-[var(--line-strong)]">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] mb-1">
                          <span className="size-4.5 rounded bg-[var(--accent)] text-[var(--ink)] grid place-items-center text-[10px]">
                            P
                          </span>
                          <span>Plan & Orders:</span>
                        </div>
                        <p className="text-[var(--ink)] whitespace-pre-wrap leading-relaxed pl-6">
                          {note.plan}
                        </p>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--line-strong)]">
                      <div className="text-[11px] text-[var(--ink-muted)]">
                        {note.follow_up_date && (
                          <span>
                            Next Follow-up appointment:{' '}
                            <strong className="text-[var(--ink)]">{note.follow_up_date}</strong>
                          </span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(note.id)}
                        className="h-7 text-xs text-[var(--critical)] hover:bg-[var(--critical)]/10 gap-1"
                      >
                        <Trash2 className="size-3.5" />
                        Delete Note
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Builder Modal */}
      <ClinicalNoteBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        patientId={patientId}
        patientName={patientName}
        patientCode={patientCode}
        latestVisit={latestVisit}
        onNoteCreated={(newNote) => {
          setNotes((prev) => [newNote, ...prev])
          setExpandedNotes((prev) => new Set([...prev, newNote.id]))
        }}
      />
    </section>
  )
}
