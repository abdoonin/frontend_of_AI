'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  getBillingRecords,
  getBillingSummary,
  updateBillingRecord,
  deleteBillingRecord,
  formatIQD,
  VISIT_TYPE_CONFIGS,
  type BillingRecord,
  type BillingSummary,
} from '@/lib/api/billing'
import { BillingEntryModal } from './billing-entry-modal'
import { ReceiptPrintModal } from './receipt-print-modal'
import { DailyClosingModal } from './daily-closing-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Receipt,
  Plus,
  Printer,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Wallet,
  Users,
  Building2,
  RefreshCw,
  Trash2,
  Edit,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'all'

export function BillingDashboard() {
  const [bills, setBills] = useState<BillingRecord[]>([])
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const [secretarySplit, setSecretarySplit] = useState<number>(20)
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<BillingRecord | null>(null)
  const [printBill, setPrintBill] = useState<BillingRecord | null>(null)
  const [closingModalOpen, setClosingModalOpen] = useState(false)

  // Compute filter dates based on preset
  const dateFilters = useMemo(() => {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')

    switch (datePreset) {
      case 'today':
        return { date: todayStr }
      case 'yesterday':
        return { date: format(subDays(today, 1), 'yyyy-MM-dd') }
      case 'week':
        return {
          start_date: format(startOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
          end_date: todayStr,
        }
      case 'month':
        return {
          start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
          end_date: todayStr,
        }
      case 'all':
      default:
        return {}
    }
  }, [datePreset])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [recordsData, summaryData] = await Promise.all([
        getBillingRecords(dateFilters),
        getBillingSummary({ ...dateFilters, secretary_split: secretarySplit }),
      ])
      setBills(recordsData)
      setSummary(summaryData)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial data')
    } finally {
      setLoading(false)
    }
  }, [dateFilters, secretarySplit])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTogglePaid = async (bill: BillingRecord) => {
    try {
      const updated = await updateBillingRecord(bill.id, {
        is_paid: bill.is_paid ? 0 : 1,
      })
      setBills((prev) => prev.map((b) => (b.id === bill.id ? updated : b)))
      // Reload summary
      getBillingSummary({ ...dateFilters, secretary_split: secretarySplit }).then(setSummary)
    } catch (err: any) {
      alert(err.message || 'Failed to toggle payment status')
    }
  }

  const handleDelete = async (billId: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    try {
      await deleteBillingRecord(billId)
      setBills((prev) => prev.filter((b) => b.id !== billId))
      getBillingSummary({ ...dateFilters, secretary_split: secretarySplit }).then(setSummary)
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice')
    }
  }

  // Filtered bills by search and status
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (statusFilter === 'paid' && !b.is_paid) return false
      if (statusFilter === 'pending' && b.is_paid) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = b.patient_name.toLowerCase().includes(q)
        const matchesCode = b.patient_code.toLowerCase().includes(q)
        const matchesNum = b.bill_number.toLowerCase().includes(q)
        if (!matchesName && !matchesCode && !matchesNum) return false
      }
      return true
    })
  }, [bills, statusFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line-weak)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-[var(--ink)] tracking-tight">
              Clinic Billing & Financial Management
            </h1>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            Real-time consultation revenue, diagnostics cashier ledger, and daily shift settlement
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setClosingModalOpen(true)}
            className="gap-1.5 h-9 text-xs border-[var(--line-weak)] hover:bg-[var(--surface-wide)]"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-700" /> Daily Shift Closing Sheet
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingBill(null)
              setEntryModalOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" /> New Patient Bill
          </Button>
        </div>
      </div>

      {/* ── Filters & Time Horizon Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--line-weak)] bg-[var(--surface-wide)]">
        {/* Date presets */}
        <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--line-weak)]">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Records' },
          ].map((preset) => {
            const active = datePreset === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id as DatePreset)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Secretary Cut Split Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--ink-muted)] flex items-center gap-1 font-medium">
            <Percent className="h-3.5 w-3.5 text-emerald-600" /> Secretary Cut:
          </span>
          <select
            value={secretarySplit}
            onChange={(e) => setSecretarySplit(Number(e.target.value))}
            className="h-8 rounded-lg border border-[var(--line-weak)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--ink)]"
          >
            <option value={20}>20% (Standard)</option>
            <option value={15}>15% Split</option>
            <option value={10}>10% Split</option>
            <option value={25}>25% Split</option>
            <option value={0}>0% (Physician 100%)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--line-weak)] text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-semibold'
                : 'text-[var(--ink-muted)]'
            }`}
          >
            All ({bills.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              statusFilter === 'paid'
                ? 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-semibold'
                : 'text-[var(--ink-muted)]'
            }`}
          >
            Paid ({summary?.paid_count ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-500/15 text-amber-800 font-semibold'
                : 'text-[var(--ink-muted)]'
            }`}
          >
            Pending ({summary?.pending_count ?? 0})
          </button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="h-8 w-8 p-0 text-[var(--ink-muted)] hover:text-emerald-700"
          title="Refresh Financial Ledger"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── 4 KPI Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Collected */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[var(--surface)] to-transparent p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-600" /> Collected Cash & Card
              </span>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 font-mono text-[10px]">
                {summary.paid_count} Cleared
              </Badge>
            </div>
            <div className="text-2xl font-black font-mono text-[var(--ink)] tracking-tight">
              {formatIQD(summary.total_collected_iqd)}
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Gross billed: {formatIQD(summary.total_gross_iqd)} (
              {summary.total_discount_iqd > 0
                ? `-${formatIQD(summary.total_discount_iqd)} waived`
                : 'No discounts'}
              )
            </p>
          </div>

          {/* Card 2: Doctor Net Share */}
          <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-[var(--surface)] to-transparent p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-teal-600" /> Doctor Net Income
              </span>
              <span className="text-[11px] font-mono text-teal-700 font-bold">
                {100 - summary.secretary_split_percent}% Share
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-[var(--ink)] tracking-tight">
              {formatIQD(summary.doctor_net_iqd)}
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Net income ready for personal bank / cash extraction
            </p>
          </div>

          {/* Card 3: Secretary Share */}
          <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-[var(--surface)] to-transparent p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-sky-800 dark:text-sky-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-sky-600" /> Reception / Secretary
              </span>
              <span className="text-[11px] font-mono text-sky-700 font-bold">
                {summary.secretary_split_percent}% Split
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-[var(--ink)] tracking-tight">
              {formatIQD(summary.secretary_share_iqd)}
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Shift commission or clinic operating overhead allocation
            </p>
          </div>

          {/* Card 4: Pending Balances */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[var(--surface)] to-transparent p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" /> Pending Receivables
              </span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-700 font-mono text-[10px]">
                {summary.pending_count} Unpaid
              </Badge>
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 tracking-tight">
              {formatIQD(summary.pending_amount_iqd)}
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Outstanding bills awaiting cashier collection or settlement
            </p>
          </div>
        </div>
      )}

      {/* ── Services Breakdown ── */}
      {summary && Object.keys(summary.by_visit_type).length > 0 && (
        <div className="rounded-2xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-5 space-y-3">
          <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center justify-between">
            <span>Volume & Revenue by Medical Service Category</span>
            <span className="text-[11px] font-normal text-[var(--ink-muted)]">
              Total: {summary.total_bills} Patient Consultations
            </span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(summary.by_visit_type).map(([key, item]) => {
              const cfg = VISIT_TYPE_CONFIGS[key] || {
                label: key,
                badgeColor: 'text-gray-700 bg-gray-100',
              }
              const percent =
                summary.total_collected_iqd > 0
                  ? Math.round((item.total_iqd / summary.total_collected_iqd) * 100)
                  : 0

              return (
                <div
                  key={key}
                  className="rounded-xl border border-[var(--line-weak)] bg-[var(--surface)] p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--ink)]">{cfg.label}</span>
                    <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                      {item.count}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {formatIQD(item.total_iqd)}
                  </div>
                  <div className="w-full bg-[var(--line-weak)] h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Transactions Ledger Table ── */}
      <div className="rounded-2xl border border-[var(--line-weak)] bg-[var(--surface-wide)] p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--ink)]">
              Daily Ledger & Itemized Transactions
            </h2>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Showing {filteredBills.length} records matching current filter
            </p>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <Input
              type="text"
              placeholder="Search by patient, code, or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-[var(--surface)]"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-[var(--ink-muted)] py-8 text-center">Loading ledger records...</p>
        ) : filteredBills.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line-weak)] p-8 text-center bg-[var(--surface)]">
            <Receipt className="h-8 w-8 text-emerald-600/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--ink)]">No billing records found</p>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Adjust your date filter or create a new consultation bill.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingBill(null)
                setEntryModalOpen(true)
              }}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Create First Bill
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[var(--line-weak)] rounded-xl overflow-hidden divide-y divide-[var(--line-weak)]">
              <thead className="bg-[var(--surface)] text-[11px] font-semibold text-[var(--ink-muted)]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Service Category</th>
                  <th className="p-3">Base Fee</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Final Due</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-weak)] bg-[var(--surface)]">
                {filteredBills.map((b) => {
                  const cfg = VISIT_TYPE_CONFIGS[b.visit_type] || {
                    label: b.visit_type,
                    badgeColor: 'text-gray-700 bg-gray-100',
                  }

                  return (
                    <tr key={b.id} className="hover:bg-[var(--surface-wide)] transition-colors">
                      <td className="p-3 font-mono font-bold text-[11px] text-emerald-800 dark:text-emerald-400">
                        {b.bill_number}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/patients/${encodeURIComponent(b.patient_code)}?from=billing`}
                          className="font-semibold text-[var(--ink)] hover:text-emerald-600 block transition-colors"
                        >
                          {b.patient_name}
                        </Link>
                        <span className="text-[10px] text-[var(--ink-muted)] font-mono">
                          ID: {b.patient_code}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-[var(--ink-muted)] whitespace-nowrap">
                        {b.visit_date ? format(new Date(b.visit_date), 'd MMM yyyy, HH:mm') : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.badgeColor}`}>
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[var(--ink-muted)]">
                        {formatIQD(b.fee_iqd)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[var(--ink-muted)]">
                        {b.discount_iqd > 0 ? (
                          <span className="text-emerald-700">-{formatIQD(b.discount_iqd)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-[12px] text-[var(--ink)]">
                        {formatIQD(b.final_iqd)}
                      </td>
                      <td className="p-3 text-[11px] capitalize text-[var(--ink-muted)]">
                        {b.payment_method}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(b)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                            b.is_paid
                              ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                          }`}
                        >
                          {b.is_paid ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" /> Pending
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrintBill(b)}
                            className="h-7 px-2 text-xs gap-1 text-[var(--ink-muted)] hover:text-emerald-700"
                            title="Print Official Patient Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBill(b)
                              setEntryModalOpen(true)
                            }}
                            className="h-7 px-2 text-xs text-[var(--ink-muted)] hover:text-emerald-700"
                            title="Edit Bill"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(b.id)}
                            className="h-7 px-2 text-xs text-[var(--ink-muted)] hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <BillingEntryModal
        open={entryModalOpen}
        onOpenChange={setEntryModalOpen}
        existingBill={editingBill}
        onSuccess={() => loadData()}
      />

      <ReceiptPrintModal
        open={!!printBill}
        onOpenChange={(open) => !open && setPrintBill(null)}
        bill={printBill}
      />

      <DailyClosingModal
        open={closingModalOpen}
        onOpenChange={setClosingModalOpen}
        date={dateFilters.date || format(new Date(), 'yyyy-MM-dd')}
        summary={summary}
        bills={bills}
      />
    </div>
  )
}
