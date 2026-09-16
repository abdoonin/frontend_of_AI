'use client'

/**
 * "Save to patient" — the dialog, and the button that opens it.
 *
 * TWO MODES, and they exist together for one reason: `medical_reports` holds
 * one row per analysis, so filing a second analysis against the same patient
 * IS a second visit. That is the whole monitoring story, and until now the only
 * route to it was a clinician retyping an identifier from memory.
 *
 *   New patient       the identifier is GENERATED, not typed
 *   Existing patient  pick from the list; the analysis becomes a new visit
 *
 * A clinic issues the medical record number; a clinician does not invent one at
 * the point of saving. Typing it also meant one typo could file an analysis
 * against a different patient, silently, because the backend matches on that
 * string and reuses whatever it finds.
 *
 * Structure is shadcn's Dialog demo: `sm:max-w-sm` content, Field/FieldGroup,
 * Label + Input at their shipped sizes, DialogFooter with DialogClose. Two
 * deviations, both forced: `asChild` rather than `render={...}` because this
 * project ships the Radix build, and the `<form>` sits INSIDE DialogContent
 * because the content is portalled and a form wrapping the Dialog would not be
 * an ancestor of the inputs.
 *
 * The trigger is permission-gated on `can_create_patients`, which is what
 * `POST /patients` requires (main.py:653).
 */

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { GateResult } from '@/lib/api/analyze'
import { listPatients, type Patient } from '@/lib/api/patients'
import {
  SaveError,
  generatePatientId,
  saveAssessment,
  saveToExistingPatient,
  summarise,
  validate,
  type PatientDetails,
  type SaveField,
} from '@/lib/api/save'
import type { DetailedResults } from '@/lib/assessment/use-assessment'

const EARLIEST_BIRTH_YEAR = 1900

export function SaveToPatient({
  gate,
  detailed,
  rawResults,
  values,
  size = 'default',
}: {
  gate: GateResult
  detailed: DetailedResults
  rawResults: Record<string, unknown>
  values: Record<string, string>
  size?: 'default' | 'sm'
}) {
  const { hasPermission } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [patient, setPatient] = useState<PatientDetails>(() => ({
    name: '',
    patientId: generatePatientId(),
    birthDate: '',
    email: '',
    phone: '',
  }))
  const [birthDate, setBirthDate] = useState<Date | undefined>()
  const [errors, setErrors] = useState<Partial<Record<SaveField, string>>>({})
  const [saving, setSaving] = useState(false)

  const [existing, setExisting] = useState<Patient[]>([])
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Patient | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  // Loaded on demand: a clinician saving a brand-new patient never needs it.
  useEffect(() => {
    if (!open || mode !== 'existing' || existing.length > 0) return
    listPatients('active')
      .then(setExisting)
      .catch((e) => setListError(e?.message ?? 'Could not load patients'))
  }, [open, mode, existing.length])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? existing.filter((p) => `${p.name} ${p.patientId}`.toLowerCase().includes(q))
      : existing
    return pool.slice(0, 6)
  }, [existing, query])

  if (!hasPermission('can_create_patients')) return null

  const set = (key: SaveField, value: string) => {
    setPatient((p) => ({ ...p, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const pickDate = (date: Date | undefined) => {
    setBirthDate(date)
    // birth_date is stored as a plain string (B-5) and every existing row is
    // ISO, so new rows match.
    set('birthDate', date ? format(date, 'yyyy-MM-dd') : '')
  }

  const reset = () => {
    setPatient({ name: '', patientId: generatePatientId(), birthDate: '', email: '', phone: '' })
    setBirthDate(undefined)
    setErrors({})
    setChosen(null)
    setQuery('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const analysis = summarise(gate, detailed, rawResults, values)

    setSaving(true)
    try {
      if (mode === 'existing') {
        if (!chosen) {
          setListError('Choose a patient first')
          setSaving(false)
          return
        }
        await saveToExistingPatient(chosen.id, analysis)
        toast.success('Analysis saved')
      } else {
        const found = validate(patient)
        if (Object.keys(found).length > 0) {
          setErrors(found)
          setSaving(false)
          return
        }
        // 'regenerate': the identifier was generated, so a clash must mint a
        // new one rather than file this against whoever already holds it.
        await saveAssessment(patient, analysis, 'regenerate')
        toast.success('Analysis saved')
      }
      setOpen(false)
      reset()
    } catch (e) {
      if (e instanceof SaveError && e.field) setErrors({ [e.field]: e.message })
      else toast.error(e instanceof SaveError ? e.message : 'Could not save the analysis')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      <DialogTrigger asChild>
        <Button size={size === 'sm' ? 'sm' : 'default'}>Save to patient</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save to patient</DialogTitle>
          <DialogDescription>
            File this analysis against a new record, or add it as a visit for someone already
            seen
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'new' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New patient</TabsTrigger>
            <TabsTrigger value="existing">Existing patient</TabsTrigger>
          </TabsList>

          <form onSubmit={submit} noValidate>
            <TabsContent value="new" className="mt-4">
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name)}>
                  <Label htmlFor="save-name">Full name</Label>
                  <Input
                    id="save-name"
                    name="name"
                    value={patient.name}
                    onChange={(e) => set('name', e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                  />
                  <FieldError>{errors.name}</FieldError>
                </Field>

                {/*
                  Read-only, deliberately. The clinic issues the number and the
                  clinician confirms it. Regenerate covers the one case that
                  matters -- a clash, or a printed label already carrying a
                  different code -- without reopening the field to a typo that
                  would file this analysis against someone else.
                */}
                <Field data-invalid={Boolean(errors.patientId)}>
                  <Label htmlFor="save-patientId">Patient ID</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="save-patientId"
                      name="patientId"
                      value={patient.patientId}
                      readOnly
                      aria-describedby="save-patientId-hint"
                      className="tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Generate a different patient ID"
                      title="Generate a different patient ID"
                      onClick={() => set('patientId', generatePatientId())}
                    >
                      <RefreshCw />
                    </Button>
                  </div>
                  <p id="save-patientId-hint" className="text-muted-foreground text-sm">
                    Generated automatically
                  </p>
                  <FieldError>{errors.patientId}</FieldError>
                </Field>

                <Field data-invalid={Boolean(errors.birthDate)}>
                  <Label htmlFor="save-birthDate">Date of birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="save-birthDate"
                        type="button"
                        variant="outline"
                        aria-invalid={Boolean(errors.birthDate)}
                        className={cn(
                          'justify-start text-left font-normal',
                          !birthDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon />
                        {birthDate ? format(birthDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={pickDate}
                        captionLayout="dropdown"
                        startMonth={new Date(EARLIEST_BIRTH_YEAR, 0)}
                        endMonth={new Date()}
                        defaultMonth={birthDate ?? new Date(1980, 0)}
                        disabled={{ after: new Date() }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldError>{errors.birthDate}</FieldError>
                </Field>

                <Field data-invalid={Boolean(errors.email)}>
                  <Label htmlFor="save-email">Email</Label>
                  <Input
                    id="save-email"
                    name="email"
                    type="email"
                    value={patient.email}
                    onChange={(e) => set('email', e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                  />
                  <FieldError>{errors.email}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="save-phone">Phone</Label>
                  <Input
                    id="save-phone"
                    name="phone"
                    type="tel"
                    value={patient.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="existing" className="mt-4">
              <FieldGroup>
                <Field>
                  <Label htmlFor="save-search">Find the patient</Label>
                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    />
                    <Input
                      id="save-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Name or patient ID"
                      className="pl-9"
                    />
                  </div>
                </Field>

                <div className="flex flex-col overflow-hidden rounded-[var(--r-md)] bg-[var(--surface)]">
                  {matches.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-center text-sm">
                      {listError ?? (existing.length === 0 ? 'Loading' : 'No patient matches that')}
                    </p>
                  ) : (
                    matches.map((p) => {
                      const active = chosen?.id === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setChosen(p)
                            setListError(null)
                          }}
                          aria-pressed={active}
                          className={cn(
                            'flex flex-col items-start gap-0.5 border-b border-[var(--line)] px-4 py-3 text-left last:border-0',
                            'transition-colors hover:bg-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                            active && 'bg-[var(--accent)]',
                          )}
                        >
                          <span className="text-[14px] font-medium text-[var(--ink)]">
                            {p.name}
                          </span>
                          <span className="text-[12px] tabular-nums text-[var(--ink-muted)]">
                            #{p.patientId}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>

                {chosen && (
                  <p className="text-muted-foreground text-sm">
                    Saves as a new visit for {chosen.name}
                  </p>
                )}
              </FieldGroup>
            </TabsContent>

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving || (mode === 'existing' && !chosen)}>
                {saving ? 'Saving…' : 'Save analysis'}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
