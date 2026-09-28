'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  createBillingRecord,
  updateBillingRecord,
  VISIT_TYPE_CONFIGS,
  formatIQD,
  type BillingRecord,
} from '@/lib/api/billing'
import { listPatients, type Patient } from '@/lib/api/patients'
import {
  Receipt,
  User,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  Tag,
  FileText,
  AlertCircle,
} from 'lucide-react'

interface BillingEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingBill?: BillingRecord | null
  preselectedPatient?: { id: number; patientId: string; name: string } | null
  onSuccess: (bill: BillingRecord) => void
}

export function BillingEntryModal({
  open,
  onOpenChange,
  existingBill,
  preselectedPatient,
  onSuccess,
}: BillingEntryModalProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    preselectedPatient?.id ?? existingBill?.patient_id ?? null
  )
  const [visitType, setVisitType] = useState<string>('new_consultation')
  const [fee, setFee] = useState<number>(25000)
  const [discount, setDiscount] = useState<number>(0)
  const [isPaid, setIsPaid] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load patients list if not preselected
  useEffect(() => {
    if (open && !preselectedPatient) {
      listPatients('active')
        .then((data) => setPatients(data))
        .catch(() => {})
    }
  }, [open, preselectedPatient])

  // Populate data when editing or opening
  useEffect(() => {
    if (existingBill) {
      setSelectedPatientId(existingBill.patient_id)
      setVisitType(existingBill.visit_type)
      setFee(existingBill.fee_iqd)
      setDiscount(existingBill.discount_iqd)
      setIsPaid(existingBill.is_paid ? 1 : 0)
      setPaymentMethod(existingBill.payment_method)
      setNotes(existingBill.notes || '')
    } else {
      setSelectedPatientId(preselectedPatient?.id ?? null)
      setVisitType('new_consultation')
      setFee(VISIT_TYPE_CONFIGS.new_consultation.defaultFee)
      setDiscount(0)
      setIsPaid(1)
      setPaymentMethod('cash')
      setNotes('')
    }
    setError(null)
  }, [existingBill, preselectedPatient, open])

  // Quick preset selection
  const handleSelectPreset = (typeKey: string) => {
    setVisitType(typeKey)
    const config = VISIT_TYPE_CONFIGS[typeKey]
    if (config) {
      setFee(config.defaultFee)
      if (typeKey === 'free_exempt') {
        setDiscount(0)
        setPaymentMethod('free')
      } else if (paymentMethod === 'free') {
        setPaymentMethod('cash')
      }
    }
  }

  const finalAmount = Math.max(0, fee - discount)

  const handleSave = async () => {
    if (!selectedPatientId) {
      setError('Please select a patient for this billing record.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (existingBill) {
        const updated = await updateBillingRecord(existingBill.id, {
          visit_type: visitType,
          fee_iqd: fee,
          discount_iqd: discount,
          final_iqd: finalAmount,
          is_paid: isPaid,
          payment_method: paymentMethod,
          notes: notes.trim() || undefined,
        })
        onSuccess(updated)
      } else {
        const created = await createBillingRecord({
          patient_id: selectedPatientId,
          visit_type: visitType,
          fee_iqd: fee,
          discount_iqd: discount,
          final_iqd: finalAmount,
          is_paid: isPaid,
          payment_method: paymentMethod,
          notes: notes.trim() || undefined,
        })
        onSuccess(created)
      }
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save billing record')
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedPatientObj =
    preselectedPatient ??
    patients.find((p) => p.id === selectedPatientId) ??
    (existingBill
      ? {
          id: existingBill.patient_id,
          name: existingBill.patient_name,
          patientId: existingBill.patient_code,
        }
      : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[620px] w-[95vw] max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-[var(--line-weak)] bg-[var(--surface-wide)] shadow-2xl">
        <DialogHeader className="p-5 border-b border-[var(--line-weak)] bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[var(--ink)]">
                {existingBill ? 'Edit Clinic Invoice' : 'Create Clinic Bill & Payment'}
              </DialogTitle>
              <p className="text-xs text-[var(--ink-muted)]">
                Record consultation fee, diagnostics, or procedure charges
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Selector */}
          <div>
            <label className="text-xs font-semibold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-600" /> Patient
            </label>
            {selectedPatientObj ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--line-weak)] bg-[var(--surface)]">
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">{selectedPatientObj.name}</p>
                  <p className="text-xs text-[var(--ink-muted)] font-mono">
                    ID: {selectedPatientObj.patientId}
                  </p>
                </div>
                {!preselectedPatient && !existingBill && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-emerald-700 hover:text-emerald-800"
                    onClick={() => setSelectedPatientId(null)}
                  >
                    Change Patient
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Search patient by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-[var(--surface)]"
                />
                <div className="max-h-36 overflow-y-auto border border-[var(--line-weak)] rounded-xl divide-y divide-[var(--line-weak)] bg-[var(--surface)]">
                  {filteredPatients.length === 0 ? (
                    <p className="p-3 text-xs text-[var(--ink-muted)] text-center">No patients found</p>
                  ) : (
                    filteredPatients.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatientId(p.id)}
                        className="w-full text-left p-2.5 text-xs hover:bg-emerald-500/10 flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold text-[var(--ink)]">{p.name}</span>
                        <span className="text-[11px] text-[var(--ink-muted)] font-mono">{p.patientId}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Service / Visit Type Quick Chips */}
          <div>
            <label className="text-xs font-semibold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-emerald-600" /> Service Type & Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(VISIT_TYPE_CONFIGS).map((item) => {
                const isSelected = visitType === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPreset(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink)] hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono mt-0.5 block ${
                        isSelected ? 'text-emerald-100 font-bold' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      {item.defaultFee > 0 ? formatIQD(item.defaultFee) : 'Free'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pricing Grid: Fee, Discount, Final Amount */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-[var(--line-weak)] bg-[var(--surface)]">
            <div>
              <label className="text-[11px] font-medium text-[var(--ink-muted)] block mb-1">
                Standard Fee (IQD)
              </label>
              <Input
                type="number"
                step="1000"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value) || 0)}
                className="h-9 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--ink-muted)] block mb-1">
                Discount (IQD)
              </label>
              <Input
                type="number"
                step="1000"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-9 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--ink-muted)] block mb-1">
                Net Final Due (IQD)
              </label>
              <div className="h-9 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center px-3 font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300">
                {formatIQD(finalAmount)}
              </div>
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--ink)] mb-1.5 block">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'card', label: 'Card/POS', icon: CreditCard },
                  { id: 'free', label: 'Free', icon: Tag },
                ].map((m) => {
                  const active = paymentMethod === m.id
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition-all ${
                        active
                          ? 'border-emerald-600 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--surface-wide)]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--ink)] mb-1.5 block">
                Payment Status
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPaid(1)}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs transition-all ${
                    isPaid === 1
                      ? 'border-emerald-600 bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--surface-wide)]'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Paid & Cleared
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(0)}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs transition-all ${
                    isPaid === 0
                      ? 'border-amber-500 bg-amber-500 text-white font-semibold shadow-sm'
                      : 'border-[var(--line-weak)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--surface-wide)]'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" /> Pending Payment
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-[var(--ink)] mb-1 block flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-emerald-600" /> Administrative Notes / Exemption Reason
            </label>
            <Textarea
              rows={2}
              placeholder="e.g., Referred by Dr. Ahmed, partial payment balance, or corporate invoice reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs bg-[var(--surface)]"
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-[var(--line-weak)] bg-[var(--surface-wide)] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={loading || !selectedPatientId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Receipt className="h-3.5 w-3.5" />
            {loading ? 'Saving...' : existingBill ? 'Update Invoice' : 'Confirm & Save Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
