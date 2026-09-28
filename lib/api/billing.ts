/**
 * Clinic Billing, Daily Invoicing & Financial Operations API Client
 * Phase 6: Daily Financial Reports & Clinic Billing
 */

export interface BillingRecord {
  id: number
  bill_number: string
  patient_id: number
  patient_name: string
  patient_code: string
  doctor_id?: number | null
  doctor_name: string
  visit_date: string
  visit_type: string
  fee_iqd: number
  discount_iqd: number
  final_iqd: number
  is_paid: boolean
  payment_method: 'cash' | 'card' | 'free' | 'installment' | string
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export interface BillingSummary {
  total_bills: number
  paid_count: number
  pending_count: number
  total_gross_iqd: number
  total_discount_iqd: number
  total_collected_iqd: number
  pending_amount_iqd: number
  secretary_split_percent: number
  secretary_share_iqd: number
  doctor_net_iqd: number
  by_visit_type: Record<string, { count: number; total_iqd: number }>
  by_payment_method: Record<string, { count: number; total_iqd: number }>
}

export interface BillingInput {
  patient_id: number
  visit_date?: string
  visit_type: string
  fee_iqd: number
  discount_iqd?: number
  final_iqd?: number
  is_paid?: number // 1 or 0
  payment_method?: string
  notes?: string
}

export interface VisitTypeConfig {
  id: string
  label: string
  defaultFee: number
  badgeColor: string
  iconName: string
  description: string
}

export const VISIT_TYPE_CONFIGS: Record<string, VisitTypeConfig> = {
  new_consultation: {
    id: 'new_consultation',
    label: 'New Consultation',
    defaultFee: 25000,
    badgeColor: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
    iconName: 'UserPlus',
    description: 'Initial clinic visit, full clinical evaluation & workup',
  },
  follow_up: {
    id: 'follow_up',
    label: 'Follow-up Visit',
    defaultFee: 10000,
    badgeColor: 'text-teal-700 bg-teal-500/10 border-teal-500/30',
    iconName: 'RefreshCw',
    description: 'Routine follow-up, lab check & prescription refill',
  },
  ultrasound: {
    id: 'ultrasound',
    label: 'Abdominal Ultrasound',
    defaultFee: 30000,
    badgeColor: 'text-sky-700 bg-sky-500/10 border-sky-500/30',
    iconName: 'Activity',
    description: 'B-mode liver, spleen, and portal Doppler scan',
  },
  fibroscan: {
    id: 'fibroscan',
    label: 'FibroScan / Elastography',
    defaultFee: 35000,
    badgeColor: 'text-violet-700 bg-violet-500/10 border-violet-500/30',
    iconName: 'Zap',
    description: 'Liver stiffness kPa & CAP steatosis grading',
  },
  procedure: {
    id: 'procedure',
    label: 'Clinical Procedure',
    defaultFee: 50000,
    badgeColor: 'text-amber-700 bg-amber-500/10 border-amber-500/30',
    iconName: 'Syringe',
    description: 'Diagnostic paracentesis, ascites tapping, or injection',
  },
  lab_review: {
    id: 'lab_review',
    label: 'Lab & Report Review',
    defaultFee: 5000,
    badgeColor: 'text-indigo-700 bg-indigo-500/10 border-indigo-500/30',
    iconName: 'FileText',
    description: 'Review of outside laboratory results without exam',
  },
  free_exempt: {
    id: 'free_exempt',
    label: 'Compassionate / Free',
    defaultFee: 0,
    badgeColor: 'text-rose-700 bg-rose-500/10 border-rose-500/30',
    iconName: 'HeartHandshake',
    description: 'Fee waiver, emergency relief, or humanitarian exemption',
  },
}

export function formatIQD(amount: number): string {
  return `${amount.toLocaleString()} IQD`
}

const API_BASE = 'http://localhost:8000'

export async function getBillingRecords(filters?: {
  patient_id?: number
  date?: string
  start_date?: string
  end_date?: string
  is_paid?: number
}): Promise<BillingRecord[]> {
  const params = new URLSearchParams()
  if (filters?.patient_id != null) params.set('patient_id', String(filters.patient_id))
  if (filters?.date) params.set('date', filters.date)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.is_paid != null) params.set('is_paid', String(filters.is_paid))

  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE}/billing${qs}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to fetch billing records (${res.status})`)
  }

  return await res.json()
}

export async function getBillingSummary(filters?: {
  date?: string
  start_date?: string
  end_date?: string
  secretary_split?: number
}): Promise<BillingSummary> {
  const params = new URLSearchParams()
  if (filters?.date) params.set('date', filters.date)
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.secretary_split != null) params.set('secretary_split', String(filters.secretary_split))

  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE}/billing/summary${qs}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to fetch financial summary (${res.status})`)
  }

  return await res.json()
}

export async function createBillingRecord(payload: BillingInput): Promise<BillingRecord> {
  const res = await fetch(`${API_BASE}/billing`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to create billing record (${res.status})`)
  }

  const data = await res.json()
  return data.bill
}

export async function updateBillingRecord(
  billId: number,
  payload: Partial<BillingInput>
): Promise<BillingRecord> {
  const res = await fetch(`${API_BASE}/billing/${billId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to update billing record (${res.status})`)
  }

  const data = await res.json()
  return data.bill
}

export async function deleteBillingRecord(billId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/billing/${billId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to delete billing record (${res.status})`)
  }
}
