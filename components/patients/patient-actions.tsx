'use client'

/**
 * Edit, archive and delete for one patient.
 *
 * Each control is gated on the permission the backend actually checks, so
 * nothing here can 403 on click: `can_edit_patients` for edit,
 * `can_delete_patients` for delete.
 *
 * DELETE IS GATED ON `archived` TOO, and that is the backend's rule, not a
 * design preference — `main.py:634` refuses with "Cannot delete active
 * patient. Archive first." Offering it on an active patient would guarantee a
 * 400. It is also genuinely permanent: the handler cascades to every
 * medical_report the patient owns, so the confirmation says how many analyses
 * are about to go with them rather than asking "are you sure?".
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
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
import { useAuth } from '@/lib/auth-context'
import { CONTROL_CLASS } from './data-table'
import {
  archivePatient,
  deletePatient,
  restorePatient,
  updatePatient,
  type Patient,
  type PatientEdit,
} from '@/lib/api/patients'

export function PatientActions({
  patient,
  visitCount,
  onChanged,
}: {
  patient: Patient
  visitCount: number
  onChanged: (next: Patient) => void
}) {
  const { hasPermission } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<PatientEdit>({
    name: patient.name,
    patientId: patient.patientId,
    birthDate: patient.birthDate ?? '',
    email: patient.email ?? '',
    phone: patient.phone ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof PatientEdit, string>>>({})

  const archived = patient.status === 'archived'

  const set = (key: keyof PatientEdit, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found: Partial<Record<keyof PatientEdit, string>> = {}
    if (!form.name.trim()) found.name = 'Enter the patient’s name'
    if (!form.patientId.trim()) found.patientId = 'Enter a patient ID'
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      found.email = 'Enter a valid email address'
    }
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }

    setBusy(true)
    try {
      await updatePatient(patient.id, form)
      toast.success('Patient updated')
      setEditOpen(false)
      const movedId = form.patientId.trim() !== patient.patientId
      onChanged({
        ...patient,
        name: form.name.trim(),
        patientId: form.patientId.trim(),
        birthDate: form.birthDate || null,
        email: form.email || null,
        phone: form.phone || null,
      })
      // The route is keyed on the identifier, so changing it changes the URL.
      if (movedId) router.replace(`/patients/${encodeURIComponent(form.patientId.trim())}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the patient')
    } finally {
      setBusy(false)
    }
  }

  const toggleArchive = async () => {
    setBusy(true)
    try {
      if (archived) {
        await restorePatient(patient.id)
        onChanged({ ...patient, status: 'active' })
        toast.success('Patient restored')
      } else {
        await archivePatient(patient.id)
        onChanged({ ...patient, status: 'archived' })
        toast.success('Patient archived')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update this patient')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deletePatient(patient.id)
      toast.success(`${patient.name} deleted`)
      router.replace('/patients')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete this patient')
      setBusy(false)
    }
  }

  const FIELDS: { key: keyof PatientEdit; label: string; type: string }[] = [
    { key: 'name', label: 'Full name', type: 'text' },
    { key: 'patientId', label: 'Patient ID', type: 'text' },
    { key: 'birthDate', label: 'Date of birth', type: 'date' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasPermission('can_edit_patients') && (
        <Dialog open={editOpen} onOpenChange={(next) => !busy && setEditOpen(next)}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className={CONTROL_CLASS}>
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit patient</DialogTitle>
              <DialogDescription>
                Changing the patient ID changes the address of this page
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitEdit} noValidate>
              <FieldGroup>
                {FIELDS.map((f) => (
                  <Field key={f.key} data-invalid={Boolean(errors[f.key])}>
                    <Label htmlFor={`edit-${f.key}`}>{f.label}</Label>
                    <Input
                      id={`edit-${f.key}`}
                      type={f.type}
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      aria-invalid={Boolean(errors[f.key])}
                    />
                    <FieldError>{errors[f.key]}</FieldError>
                  </Field>
                ))}
              </FieldGroup>
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={busy}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Button variant="outline" size="sm" className={CONTROL_CLASS} onClick={toggleArchive} disabled={busy}>
        {archived ? 'Restore' : 'Archive'}
      </Button>

      {/* Only once archived — see the header. Showing it earlier would be a
          control that always fails. */}
      {archived && hasPermission('can_delete_patients') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={busy}>
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {patient.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the patient and
                {visitCount === 1 ? ' their 1 analysis' : ` all ${visitCount} of their analyses`}.
                It cannot be undone
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={remove}
                className="bg-[var(--critical)] text-white hover:opacity-90"
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
