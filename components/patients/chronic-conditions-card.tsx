'use client'

import { useState, useEffect } from 'react'
import { Activity, Plus, Edit3, Check, X, ShieldAlert, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CHRONIC_CONDITIONS_CATALOG,
  fetchPatientChronicConditions,
  updatePatientChronicConditions,
  type ChronicCondition,
} from '@/lib/api/clinical-notes'
import { useLanguage } from '@/lib/language-context'

interface ChronicConditionsCardProps {
  patientId: number | string
  initialConditions?: string | null
}

export function ChronicConditionsCard({
  patientId,
  initialConditions,
}: ChronicConditionsCardProps) {
  const [conditions, setConditions] = useState<ChronicCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editList, setEditList] = useState<ChronicCondition[]>([])
  const [customName, setCustomName] = useState('')
  const [customNotes, setCustomNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Parse initial conditions if given as JSON string or array
    if (initialConditions) {
      try {
        const parsed = JSON.parse(initialConditions)
        if (Array.isArray(parsed)) {
          setConditions(parsed)
          setLoading(false)
          return
        }
      } catch {
        // Continue to fetch from API
      }
    }

    fetchPatientChronicConditions(patientId)
      .then((data) => {
        if (!cancelled) setConditions(data)
      })
      .catch((err) => console.error('Error fetching chronic conditions:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [patientId, initialConditions])

  const openEditor = () => {
    setEditList([...conditions])
    setCustomName('')
    setCustomNotes('')
    setDialogOpen(true)
  }

  const toggleCatalogItem = (catalogItem: { name: string; default_notes: string }) => {
    const exists = editList.some((c) => c.name === catalogItem.name)
    if (exists) {
      setEditList(editList.filter((c) => c.name !== catalogItem.name))
    } else {
      setEditList([
        ...editList,
        {
          name: catalogItem.name,
          notes: catalogItem.default_notes,
          status: 'active',
        },
      ])
    }
  }

  const addCustomCondition = () => {
    if (!customName.trim()) return
    setEditList([
      ...editList,
      {
        name: customName.trim(),
        notes: customNotes.trim() || undefined,
        status: 'active',
      },
    ])
    setCustomName('')
    setCustomNotes('')
  }

  const removeEditItem = (index: number) => {
    setEditList(editList.filter((_, i) => i !== index))
  }

  const saveConditions = async () => {
    setSaving(true)
    try {
      const updated = await updatePatientChronicConditions(patientId, editList)
      setConditions(updated)
      setDialogOpen(false)
    } catch (err) {
      console.error('Failed to save chronic conditions:', err)
    } finally {
      setSaving(false)
    }
  }

  const { t } = useLanguage()

  return (
    <>
      <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[22px] shadow-[var(--glass-lift)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-[var(--accent)] text-[var(--ink)]">
              <Activity className="size-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">
                {t('Chronic Conditions & Comorbidities')}
              </h2>
              <p className="text-[12px] text-[var(--ink-muted)]">
                {t('Long-term medical history affecting liver pharmacokinetics & prognosis')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openEditor}
            className="h-8 gap-1.5 text-xs font-medium border-[var(--line-strong)] hover:bg-[var(--surface)] text-[var(--ink)]"
          >
            <Edit3 className="size-3.5" />
            {conditions.length === 0 ? t('Add Conditions') : t('Manage Conditions')}
          </Button>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs text-[var(--ink-muted)]">
            Loading conditions...
          </div>
        ) : conditions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center">
            <ShieldAlert className="size-8 text-[var(--ink-muted)]/60 mb-2" />
            <p className="text-sm font-medium text-[var(--ink)]">
              {t('No chronic illnesses recorded')}
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-md">
              {t('Document diabetes, hypertension, viral hepatitis history or renal disease to activate clinical drug safety alerts.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={openEditor}
              className="mt-3 h-8 text-xs gap-1.5"
            >
              <Plus className="size-3.5" /> {t('Record Chronic Conditions')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {conditions.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] px-3 py-2 text-xs shadow-sm transition-all hover:border-[var(--accent)]"
              >
                <span className="size-2 rounded-full bg-[var(--accent)]" />
                <div>
                  <span className="font-semibold text-[var(--ink)]">{c.name}</span>
                  {c.notes && (
                    <span className="block text-[11px] text-[var(--ink-muted)] mt-0.5">
                      {c.notes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl bg-[var(--surface-wide)] border-[var(--line-strong)] text-[var(--ink)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="size-5 text-[var(--accent)]" />
              {t('Manage Chronic Conditions & Comorbidities')}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-muted)]">
              {t('Document long-term medical conditions affecting liver disease prognosis and drug safety.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-[var(--ink)] mb-2 block">
                {t('Quick Common Conditions:')}
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border rounded-lg border-[var(--line-strong)] bg-[var(--surface)]/50">
                {CHRONIC_CONDITIONS_CATALOG.map((item, idx) => {
                  const isSelected = editList.some((c) => c.name === item.name)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleCatalogItem(item)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[var(--accent)] text-[var(--ink)] font-semibold border-[var(--accent)]'
                          : 'bg-[var(--surface)] border-[var(--line-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {isSelected ? <Check className="size-3 stroke-[3]" /> : <Plus className="size-3" />}
                      <span>{item.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[var(--ink)] mb-1.5 block">
                {t('Add Custom Chronic Illness:')}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={t('Condition Name (e.g. Chronic Kidney Disease)')}
                  className="text-xs h-9 bg-[var(--surface)] border-[var(--line-strong)] text-[var(--ink)]"
                />
                <Input
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder={t('Clinical Notes / Stage (optional)')}
                  className="text-xs h-9 bg-[var(--surface)] border-[var(--line-strong)] text-[var(--ink)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomCondition}
                  disabled={!customName.trim()}
                  className="h-9 px-3 text-xs gap-1 border-[var(--line-strong)]"
                >
                  <Plus className="size-3.5" /> {t('Add Condition')}
                </Button>
              </div>
            </div>

            {/* Currently Selected List */}
            <div>
              <Label className="text-xs font-semibold text-[var(--ink)] mb-1.5 block">
                {t('Recorded Conditions for this Patient:')} ({editList.length})
              </Label>
              {editList.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)] italic">{t('No chronic conditions added yet')}</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {editList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-[var(--surface)] border border-[var(--line-strong)] p-2 text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-[var(--ink)] truncate">{item.name}</p>
                        {item.notes && (
                          <p className="text-[11px] text-[var(--ink-muted)] truncate">{item.notes}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEditItem(idx)}
                        className="size-6 text-[var(--critical)] hover:bg-[var(--critical)]/10"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs border-[var(--line-strong)] text-[var(--ink)]"
            >
              {t('Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={saveConditions}
              disabled={saving}
              className="text-xs font-semibold bg-[var(--accent)] text-[var(--ink)] hover:brightness-105"
            >
              {saving ? t('Saving...') : t('Save changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
