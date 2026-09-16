'use client'

/**
 * The patient list.
 *
 * Every column is derived from something the database actually holds. Two
 * columns a reader would expect are deliberately absent:
 *
 * - There is no age. `patients.birth_date` is a VARCHAR with no validation and
 *   live rows contain 2024-2026 dates, so the old screens render "Age: 0"
 *   (B-5). Age IS known per analysis, from the values entered at the time, so
 *   it belongs on the profile where it can be attributed to a visit.
 * - There is no gender. The column does not exist (B-4). It is recorded per
 *   analysis from 2026-08-09 onward, so it appears on the profile rather than
 *   here, where older patients would show a blank that reads as "unknown sex"
 *   rather than "never recorded".
 *
 * "Latest finding" is read from `detailed_results`, never from the top-level
 * `confidence`/`risk_level` columns — CLAUDE.md §6.4, and `lib/api/patients.ts`
 * does not even return them.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  archivePatient,
  listAllVisits,
  listPatients,
  restorePatient,
  type Patient,
  type Visit,
} from '@/lib/api/patients'
import { STAGE_LABEL } from '@/lib/clinical/stages'
import { CONTROL_CLASS, DataTable, type SortOption } from './data-table'

/**
 * Date filter, on the LAST ANALYSIS rather than when the patient record was
 * created — "who have I not seen in three months" is the clinical question,
 * and a patient created last year whose only analysis was yesterday is not
 * stale. Patients with no analysis at all are excluded from every window
 * except "Any time", because they have no date to be inside one.
 */
const DATE_WINDOWS: { value: string; label: string; days: number | null }[] = [
  { value: 'any', label: 'Any time', days: null },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '90', label: 'Last 90 days', days: 90 },
  { value: 'older', label: 'Over 90 days ago', days: -90 },
]

/** The Sort menu, mirroring the reference dashboards' four presets. */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Most recent analysis', id: 'last', desc: true },
  { label: 'Oldest analysis', id: 'last', desc: false },
  { label: 'Name A-Z', id: 'patient', desc: false },
  { label: 'Name Z-A', id: 'patient', desc: true },
]

interface PatientRow extends Patient {
  visitCount: number
  latestVisit: Visit | null
}

/** Two letters, from the first and last word of the name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}

/**
 * What the most recent analysis concluded, in the plain wording the results
 * screen uses. `null` means no analysis has ever been run — which is a real
 * state, not an error, and must not read as a clean result.
 */
function latestFinding(visit: Visit | null): { text: string; tone: 'critical' | 'caution' | 'normal' | 'muted' } {
  if (!visit) return { text: 'No analysis yet', tone: 'muted' }
  if (!visit.hasResults) return { text: 'No signs of liver disease', tone: 'normal' }

  if (visit.stage !== null) {
    return {
      text: `Liver scarring Stage ${visit.stage}`,
      tone: visit.stage >= 3 ? 'critical' : visit.stage >= 2 ? 'caution' : 'normal',
    }
  }
  if (visit.fattyProbabilityPct !== null && visit.fattyProbabilityPct >= 50) {
    return { text: 'Fatty liver likely', tone: 'critical' }
  }
  if (visit.cancerRiskPct !== null) {
    return {
      text: `Cancer risk ${visit.cancerRiskPct}%`,
      tone: visit.cancerRiskPct > 70 ? 'critical' : 'caution',
    }
  }
  return { text: 'Assessed', tone: 'muted' }
}

const TONE_COLOR: Record<string, string> = {
  critical: 'var(--critical)',
  caution: 'var(--caution)',
  normal: 'var(--normal)',
  muted: 'var(--ink-muted)',
}

const columns: ColumnDef<PatientRow, any>[] = [
  {
    id: 'patient',
    header: 'Patient',
    accessorFn: (row) => `${row.name} ${row.patientId}`,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 flex-none place-items-center rounded-full bg-[var(--accent)] text-[12px] font-medium text-[var(--ink)]"
        >
          {initials(row.original.name)}
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] font-medium text-[var(--ink)]">{row.original.name}</span>
          <span className="text-[12px] text-[var(--ink-muted)] tabular-nums">
            #{row.original.patientId}
          </span>
        </span>
      </div>
    ),
  },
  {
    id: 'contact',
    header: 'Contact',
    // Searchable: a receptionist looking a patient up by phone number is the
    // obvious use, and the global filter reads the accessor.
    accessorFn: (row) => [row.email, row.phone].filter(Boolean).join(' '),
    cell: ({ row }) => {
      const { email, phone } = row.original
      if (!email && !phone) {
        return <span className="text-[14px] text-[var(--ink-muted)]">—</span>
      }
      return (
        <span className="flex flex-col">
          {email && <span className="text-[14px] text-[var(--ink)]">{email}</span>}
          {phone && (
            <span className="text-[12px] tabular-nums text-[var(--ink-muted)]">{phone}</span>
          )}
        </span>
      )
    },
  },
  {
    id: 'finding',
    header: 'Latest finding',
    accessorFn: (row) => latestFinding(row.latestVisit).text,
    cell: ({ row }) => {
      const { text, tone } = latestFinding(row.original.latestVisit)
      const stage = row.original.latestVisit?.stage ?? null
      return (
        /*
          Two lines, matching the Patient and Contact columns either side --
          both already stack a 14px value over a 12px muted one, so this adds
          no row height that the table was not already sized for. Measured
          before adding: a single-line cell here was the odd one out.

          Only staged visits get the second line. A healthy or cancer-only row
          has nothing to put there, and an empty sub-line would pull those rows
          out of alignment for nothing.
        */
        <span className="flex flex-col">
          <span className="text-[14px]" style={{ color: TONE_COLOR[tone] }}>
            {text}
          </span>
          {stage !== null && STAGE_LABEL[stage] && (
            <span className="text-[12px] text-[var(--ink-muted)]">{STAGE_LABEL[stage]}</span>
          )}
        </span>
      )
    },
  },
  {
    id: 'visits',
    header: 'Analyses',
    accessorFn: (row) => row.visitCount,
    cell: ({ row }) => (
      <span className="text-[14px] tabular-nums text-[var(--ink)]">{row.original.visitCount}</span>
    ),
  },
  {
    id: 'last',
    header: 'Last analysis',
    accessorFn: (row) => row.latestVisit?.createdAt ?? '',
    cell: ({ row }) => {
      const at = row.original.latestVisit?.createdAt
      return (
        <span className="text-[14px] tabular-nums text-[var(--ink-muted)]">
          {at ? format(new Date(at), 'd MMM yyyy') : '—'}
        </span>
      )
    },
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'archived' ? 'outline' : 'secondary'}>
        {row.original.status === 'archived' ? 'Archived' : 'Active'}
      </Badge>
    ),
  },
]

export function PatientsTable() {
  const router = useRouter()
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [dateWindow, setDateWindow] = useState('any')
  const [patients, setPatients] = useState<Patient[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([listPatients(status), listAllVisits()])
      .then(([p, v]) => {
        if (cancelled) return
        setPatients(p)
        setVisits(v)
      })
      .catch((e) => !cancelled && setError(e?.message ?? 'Could not load patients'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status, reloadKey])

  const rows = useMemo<PatientRow[]>(() => {
    // The analyses endpoint returns every visit once, so counting here avoids
    // one request per patient. `listVisits` returns them newest first.
    const byPatient = new Map<number, Visit[]>()
    for (const v of visits) {
      const list = byPatient.get(v.patientId)
      if (list) list.push(v)
      else byPatient.set(v.patientId, [v])
    }
    return patients.map((p) => {
      const list = byPatient.get(p.id) ?? []
      return { ...p, visitCount: list.length, latestVisit: list[0] ?? null }
    })
  }, [patients, visits])

  const visibleRows = useMemo(() => {
    const preset = DATE_WINDOWS.find((w) => w.value === dateWindow)
    if (!preset || preset.days === null) return rows
    const cutoff = Date.now() - Math.abs(preset.days) * 86_400_000
    return rows.filter((r) => {
      const at = r.latestVisit?.createdAt
      if (!at) return false
      const time = new Date(at).getTime()
      return preset.days! > 0 ? time >= cutoff : time < cutoff
    })
  }, [rows, dateWindow])

  if (error) {
    return (
      <p role="alert" className="text-[14px] text-[var(--critical)]">
        {error}
      </p>
    )
  }

  const runBulk = async (rows: PatientRow[], action: 'archive' | 'restore', clear: () => void) => {
    setBusy(true)
    // Settled, not all: one failure must not hide the successes, and the
    // count reported has to be the number that actually changed.
    const results = await Promise.allSettled(
      rows.map((r) => (action === 'archive' ? archivePatient(r.id) : restorePatient(r.id))),
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - ok
    if (ok > 0) toast.success(`${ok} patient${ok > 1 ? 's' : ''} ${action}d`)
    if (failed > 0) toast.error(`${failed} could not be ${action}d`)
    clear()
    setBusy(false)
    setReloadKey((k) => k + 1)
  }

  return (
    <DataTable
      columns={columns}
      data={loading ? [] : visibleRows}
      title="Patients"
      description="Every patient you have recorded, and what their most recent analysis found"
      searchPlaceholder="Search by name or patient ID..."
      sortOptions={SORT_OPTIONS}
      /* ?from=patients explicitly, even though it is the default: opening a
         patient from this list must OVERWRITE a remembered origin, or a
         patient last opened from Reports would keep offering "Back to
         reports" after being opened from here. */
      onRowClick={(row) =>
        router.push(`/patients/${encodeURIComponent(row.patientId)}?from=patients`)
      }
      toCsvRow={(row) => ({
        Name: row.name,
        'Patient ID': row.patientId,
        'Latest finding': latestFinding(row.latestVisit).text,
        Analyses: row.visitCount,
        'Last analysis': row.latestVisit?.createdAt
          ? format(new Date(row.latestVisit.createdAt), 'yyyy-MM-dd')
          : '',
        Email: row.email ?? '',
        Phone: row.phone ?? '',
        Status: row.status,
      })}
      bulkActions={(selected, clear) => (
        <>
          {selected.some((p) => p.status === 'active') && (
            <Button
              variant="outline"
              size="sm"
              className={CONTROL_CLASS}
              disabled={busy}
              onClick={() => runBulk(selected.filter((p) => p.status === 'active'), 'archive', clear)}
            >
              Archive
            </Button>
          )}
          {selected.some((p) => p.status === 'archived') && (
            <Button
              variant="outline"
              size="sm"
              className={CONTROL_CLASS}
              disabled={busy}
              onClick={() => runBulk(selected.filter((p) => p.status === 'archived'), 'restore', clear)}
            >
              Restore
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clear} disabled={busy}>
            Clear
          </Button>
        </>
      )}
      empty={
        loading ? (
          <span className="text-[var(--ink-muted)]">Loading...</span>
        ) : (
          <span className="text-[var(--ink-muted)]">
            {status === 'archived' ? 'No archived patients' : 'No patients yet'}
          </span>
        )
      }
      toolbar={
        <>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger size="sm" className="h-9 w-[130px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateWindow} onValueChange={setDateWindow}>
            <SelectTrigger size="sm" className="h-9 w-[160px]" aria-label="Filter by last analysis date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    />
  )
}
