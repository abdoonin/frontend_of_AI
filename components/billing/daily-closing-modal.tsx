'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Calendar, Building2, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import {
  formatIQD,
  VISIT_TYPE_CONFIGS,
  type BillingRecord,
  type BillingSummary,
} from '@/lib/api/billing'

interface DailyClosingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  summary: BillingSummary | null
  bills: BillingRecord[]
}

export function DailyClosingModal({
  open,
  onOpenChange,
  date,
  summary,
  bills,
}: DailyClosingModalProps) {
  if (!summary) return null

  const handlePrint = () => {
    window.print()
  }

  const formattedDate = date
    ? format(new Date(date), 'EEEE, d MMMM yyyy')
    : format(new Date(), 'EEEE, d MMMM yyyy')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[760px] w-[95vw] max-h-[92vh] overflow-y-auto bg-white text-black !p-0 rounded-2xl print:p-0 print:m-0 print:border-none print:shadow-none">
        <DialogHeader className="p-5 pb-3 border-b border-gray-200 print:hidden flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-gray-900">
            Clinic Daily Closing Statement (Shift Settlement)
          </DialogTitle>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" /> Print Settlement Sheet
          </Button>
        </DialogHeader>

        {/* Printable Shift Sheet */}
        <div id="daily-closing-sheet" className="p-8 space-y-6 text-sm text-gray-900 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-emerald-950 tracking-tight">HEPATIQ CLINIC</h1>
                <p className="text-xs text-gray-600">Daily Financial & Shift Closing Audit Report</p>
                <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 text-emerald-700" />
                  Audit Date: {formattedDate}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p className="font-semibold text-gray-800">Closing Status: OFFICIAL</p>
              <p>Generated: {format(new Date(), 'd MMM yyyy, HH:mm')}</p>
              <p>Total Consultations: {summary.total_bills}</p>
            </div>
          </div>

          {/* Key Metrics Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-800 font-semibold block">Total Collected Cash</span>
              <span className="text-base font-black text-emerald-950 font-mono mt-0.5 block">
                {formatIQD(summary.total_collected_iqd)}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">
                {summary.paid_count} cleared payments
              </span>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
              <span className="text-[11px] text-teal-800 font-semibold block">Doctor Net Share</span>
              <span className="text-base font-black text-teal-950 font-mono mt-0.5 block">
                {formatIQD(summary.doctor_net_iqd)}
              </span>
              <span className="text-[10px] text-teal-700 font-medium">
                {100 - summary.secretary_split_percent}% of collected
              </span>
            </div>

            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
              <span className="text-[11px] text-sky-800 font-semibold block">Secretary / Clinic Cut</span>
              <span className="text-base font-black text-sky-950 font-mono mt-0.5 block">
                {formatIQD(summary.secretary_share_iqd)}
              </span>
              <span className="text-[10px] text-sky-700 font-medium">
                {summary.secretary_split_percent}% agreed split
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[11px] text-amber-800 font-semibold block">Pending Receivables</span>
              <span className="text-base font-black text-amber-950 font-mono mt-0.5 block">
                {formatIQD(summary.pending_amount_iqd)}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                {summary.pending_count} pending bills
              </span>
            </div>
          </div>

          {/* Breakdown by Visit Type */}
          <div className="space-y-2">
            <h3 className="font-bold text-emerald-950 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
              Volume & Revenue by Service Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {Object.entries(summary.by_visit_type).map(([key, val]) => {
                const config = VISIT_TYPE_CONFIGS[key]
                return (
                  <div key={key} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="font-semibold text-gray-800 block text-[11px]">
                      {config?.label || key}
                    </span>
                    <div className="flex justify-between items-baseline mt-1 font-mono text-[11px]">
                      <span className="text-gray-500">{val.count} visits</span>
                      <span className="font-bold text-gray-900">{formatIQD(val.total_iqd)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-emerald-950 uppercase text-xs tracking-wider border-b border-gray-200 pb-1">
              Itemized Daily Patients Ledger ({bills.length})
            </h3>
            <table className="w-full text-left text-xs border border-gray-200 divide-y divide-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 font-semibold text-gray-700 text-[11px]">
                <tr>
                  <th className="p-2">Invoice #</th>
                  <th className="p-2">Patient</th>
                  <th className="p-2">Service</th>
                  <th className="p-2">Fee</th>
                  <th className="p-2">Disc.</th>
                  <th className="p-2">Net IQD</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="p-2 font-mono text-[10px] text-gray-600">{b.bill_number}</td>
                    <td className="p-2">
                      <span className="font-semibold text-gray-900 block">{b.patient_name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{b.patient_code}</span>
                    </td>
                    <td className="p-2 text-[11px] capitalize">
                      {VISIT_TYPE_CONFIGS[b.visit_type]?.label || b.visit_type}
                    </td>
                    <td className="p-2 font-mono">{formatIQD(b.fee_iqd)}</td>
                    <td className="p-2 font-mono text-gray-500">
                      {b.discount_iqd > 0 ? `-${formatIQD(b.discount_iqd)}` : '—'}
                    </td>
                    <td className="p-2 font-mono font-bold text-emerald-800">
                      {formatIQD(b.final_iqd)}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          b.is_paid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.is_paid ? 'PAID' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit Verification Signatures */}
          <div className="pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-xs text-gray-600">
            <div>
              <p className="font-medium text-gray-800 mb-10">Clinic Secretary / Cashier Acknowledgment</p>
              <div className="border-b border-gray-400 w-48 mb-1"></div>
              <p className="text-[11px] text-gray-500">Signed on behalf of Reception</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-800 mb-10">Attending Physician / Clinic Director</p>
              <div className="border-b border-gray-400 w-48 ml-auto mb-1"></div>
              <p className="text-[11px] text-gray-500">Settled & Verified</p>
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
            <Printer className="h-3.5 w-3.5" /> Print Settlement Sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
