'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getBillingRecords,
  updateBillingRecord,
  deleteBillingRecord,
  formatIQD,
  VISIT_TYPE_CONFIGS,
  type BillingRecord,
} from '@/lib/api/billing'
import { BillingEntryModal } from './billing-entry-modal'
import { ReceiptPrintModal } from './receipt-print-modal'
import {
  Receipt,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'

interface PatientBillingCardProps {
  patientId: number
  patientHospitalId: string
  patientName: string
}

export function PatientBillingCard({
  patientId,
  patientHospitalId,
  patientName,
}: PatientBillingCardProps) {
  const [bills, setBills] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<BillingRecord | null>(null)
  const [printBill, setPrintBill] = useState<BillingRecord | null>(null)

  const loadBills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBillingRecords({ patient_id: patientId })
      setBills(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    loadBills()
  }, [loadBills])

  const handleTogglePaid = async (bill: BillingRecord) => {
    try {
      const updated = await updateBillingRecord(bill.id, {
        is_paid: bill.is_paid ? 0 : 1,
      })
      setBills((prev) => prev.map((b) => (b.id === bill.id ? updated : b)))
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status')
    }
  }

  const handleDelete = async (billId: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    try {
      await deleteBillingRecord(billId)
      setBills((prev) => prev.filter((b) => b.id !== billId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice')
    }
  }

  const totalPaid = bills.filter((b) => b.is_paid).reduce((sum, b) => sum + b.final_iqd, 0)
  const totalPending = bills.filter((b) => !b.is_paid).reduce((sum, b) => sum + b.final_iqd, 0)

  return (
    <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[22px] shadow-[var(--glass-lift)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-weak)] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Receipt className="h-4 w-4" />
            </div>
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">
              Consultation Fees & Invoices
            </h2>
            <Badge variant="outline" className="text-xs">
              {bills.length} {bills.length === 1 ? 'Bill' : 'Bills'}
            </Badge>
          </div>
          <p className="text-[12px] text-[var(--ink-muted)] mt-1">
            Patient payment history, official receipts, and pending clinic balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditingBill(null)
              setModalOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Record Fee / Bill
          </Button>
        </div>
      </div>

      {/* Quick Summary Chips */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          <div className="p-3 rounded-xl border border-[var(--line-weak)] bg-[var(--surface)]">
            <span className="text-[11px] text-[var(--ink-muted)] block">Total Paid to Date</span>
            <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {formatIQD(totalPaid)}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-[var(--line-weak)] bg-[var(--surface)]">
            <span className="text-[11px] text-[var(--ink-muted)] block">Pending Balance</span>
            <span
              className={`text-sm font-bold font-mono ${
                totalPending > 0 ? 'text-amber-600' : 'text-[var(--ink-muted)]'
              }`}
            >
              {formatIQD(totalPending)}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-[var(--line-weak)] bg-[var(--surface)]">
            <span className="text-[11px] text-[var(--ink-muted)] block">Total Consultations</span>
            <span className="text-sm font-bold text-[var(--ink)]">
              {bills.length} Visits Logged
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[var(--ink-muted)] py-6 text-center">Loading invoices...</p>
      ) : error ? (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : bills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line-weak)] p-8 text-center bg-[var(--surface)]">
          <Receipt className="h-8 w-8 text-emerald-600/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-[var(--ink)]">No invoices logged for this patient</p>
          <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">
            Record a consultation fee, ultrasound charge, or generate an official receipt for insurance.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingBill(null)
              setModalOpen(true)
            }}
            className="mt-4 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Record First Bill
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-[var(--line-weak)] border border-[var(--line-weak)] rounded-xl overflow-hidden bg-[var(--surface)]">
          {bills.map((bill) => {
            const config = VISIT_TYPE_CONFIGS[bill.visit_type] || {
              label: bill.visit_type,
              badgeColor: 'text-gray-700 bg-gray-100',
            }

            return (
              <div
                key={bill.id}
                className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--surface-wide)] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--ink)]">
                      {bill.bill_number}
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-semibold ${config.badgeColor}`}>
                      {config.label}
                    </Badge>
                    <span className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {bill.visit_date ? format(new Date(bill.visit_date), 'd MMM yyyy') : '—'}
                    </span>
                  </div>
                  {bill.notes && (
                    <p className="text-[11px] text-[var(--ink-muted)] italic">{bill.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[var(--ink)] block">
                      {formatIQD(bill.final_iqd)}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] capitalize block">
                      via {bill.payment_method}
                    </span>
                  </div>

                  {/* Paid / Pending Badge Toggle */}
                  <button
                    type="button"
                    onClick={() => handleTogglePaid(bill)}
                    title="Click to toggle Paid/Pending"
                    className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                      bill.is_paid
                        ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                    }`}
                  >
                    {bill.is_paid ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" /> Pending
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPrintBill(bill)}
                      className="h-7 px-2 text-xs gap-1 text-[var(--ink-muted)] hover:text-emerald-700"
                      title="Print Official Receipt"
                    >
                      <Printer className="h-3.5 w-3.5" /> Receipt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(bill.id)}
                      className="h-7 px-1.5 text-xs text-[var(--ink-muted)] hover:text-red-500"
                      title="Delete Invoice"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Entry Modal */}
      <BillingEntryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingBill={editingBill}
        preselectedPatient={{
          id: patientId,
          patientId: patientHospitalId,
          name: patientName,
        }}
        onSuccess={() => loadBills()}
      />

      {/* Print Receipt Modal */}
      <ReceiptPrintModal
        open={!!printBill}
        onOpenChange={(open) => !open && setPrintBill(null)}
        bill={printBill}
      />
    </section>
  )
}
