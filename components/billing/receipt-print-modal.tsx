'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, Download, Loader2, CheckCircle2, Clock, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { formatIQD, VISIT_TYPE_CONFIGS, type BillingRecord } from '@/lib/api/billing'
import { printElement, downloadElementAsPdf } from '@/lib/print-service'

interface ReceiptPrintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill: BillingRecord | null
}

export function ReceiptPrintModal({
  open,
  onOpenChange,
  bill,
}: ReceiptPrintModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)

  if (!bill) return null

  const handlePrint = async () => {
    try {
      setPrinting(true)
      await printElement('patient-receipt-sheet', {
        title: `Receipt - ${bill.bill_number} - ${bill.patient_name}`,
      })
    } catch (e) {
      window.print()
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true)
      const fileName = `Receipt_${bill.bill_number}_${bill.patient_name.replace(/\s+/g, '_')}.pdf`
      await downloadElementAsPdf('patient-receipt-sheet', fileName)
    } finally {
      setDownloading(false)
    }
  }

  const visitConfig = VISIT_TYPE_CONFIGS[bill.visit_type] || {
    label: bill.visit_type,
    description: 'Medical & clinical evaluation services',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[580px] w-[95vw] max-h-[90vh] overflow-y-auto bg-white text-black !p-0 rounded-2xl print:p-0 print:m-0 print:border-none print:shadow-none">
        <DialogHeader className="p-5 pb-3 border-b border-gray-200 print:hidden flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-gray-900">
            Official Patient Receipt & Invoice
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="gap-1.5 h-8 text-xs font-semibold border-emerald-600/30 text-emerald-700 hover:bg-emerald-50"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'PDF...' : 'PDF'}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={printing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold"
            >
              {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              {printing ? 'Preparing...' : 'Print'}
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Receipt Paper */}
        <div id="patient-receipt-sheet" className="p-8 space-y-6 text-sm text-gray-900 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-emerald-950 tracking-tight">HEPATIQ CLINIC</h1>
                <p className="text-xs text-gray-600">Hepatology, Gastroenterology & Clinical AI Center</p>
                <p className="text-[11px] text-gray-500">Medical District, Baghdad, Iraq</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <span className="font-mono font-bold text-emerald-800 text-sm block">
                {bill.bill_number}
              </span>
              <p className="mt-0.5">
                {bill.visit_date ? format(new Date(bill.visit_date), 'd MMM yyyy, HH:mm') : '—'}
              </p>
            </div>
          </div>

          {/* Patient & Doctor Meta */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
            <div>
              <span className="text-gray-500 block">Patient Name:</span>
              <span className="font-bold text-gray-900 text-sm">{bill.patient_name}</span>
              <span className="text-gray-500 font-mono block mt-0.5">ID: {bill.patient_code}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">Attending Physician:</span>
              <span className="font-semibold text-gray-800">{bill.doctor_name || 'Clinic Physician'}</span>
              <span className="text-gray-500 block capitalize mt-0.5">
                Payment: {bill.payment_method}
              </span>
            </div>
          </div>

          {/* Items / Services Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-emerald-950 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
              Rendered Medical Services
            </h3>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{visitConfig.label}</p>
                  <p className="text-[11px] text-gray-500">{visitConfig.description}</p>
                </div>
                <span className="font-mono font-semibold">{formatIQD(bill.fee_iqd)}</span>
              </div>

              {bill.discount_iqd > 0 && (
                <div className="py-2 flex justify-between items-center text-emerald-700">
                  <span>Special Discount / Courtesy Waiver</span>
                  <span className="font-mono">- {formatIQD(bill.discount_iqd)}</span>
                </div>
              )}
            </div>

            {/* Total Block */}
            <div className="pt-3 border-t-2 border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center text-sm font-black">
                <span className="text-gray-900">NET TOTAL DUE:</span>
                <span className="font-mono text-base text-emerald-800">
                  {formatIQD(bill.final_iqd)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status Stamp */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {bill.is_paid ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  PAID IN FULL — OFFICIAL RECEIPT
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <Clock className="h-4 w-4 text-amber-500" />
                  PAYMENT PENDING / RECEIVABLE
                </div>
              )}
            </div>

            {bill.notes && (
              <p className="text-[11px] text-gray-500 italic max-w-xs text-right">
                Note: {bill.notes}
              </p>
            )}
          </div>

          {/* Footer Signature */}
          <div className="pt-8 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
            <div>
              <p className="font-medium text-gray-700">Thank you for visiting Hepatiq Clinic</p>
              <p className="text-[10px]">Retain this receipt for insurance & follow-up claims.</p>
            </div>
            <div className="text-right">
              <div className="h-9 w-32 border-b border-gray-400 mb-1"></div>
              <p className="text-[10px]">Authorized Signature / Cashier</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-200 print:hidden flex justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
