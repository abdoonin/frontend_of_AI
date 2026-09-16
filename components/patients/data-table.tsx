'use client'

/**
 * A data table on TanStack Table v8 + shadcn primitives.
 *
 * ONE container. Title, toolbar, table and footer all sit inside a single
 * `--surface-wide` panel on the page ground, rather than floating as separate
 * blocks — the arrangement in the reference dashboards, and the same rule as
 * LESSONS.md L-023: a group of rows is one panel, separation comes from 1px
 * `--line` borders on the children, and no child paints its own fill.
 *
 * Selection is real. It exists because there are bulk actions to attach to it;
 * an earlier version left it out on the grounds that a checkbox leading
 * nowhere is a broken promise, which is still true — the answer was to build
 * the actions, not to drop the checkbox.
 */

import { useMemo, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Download,
  Search,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * A filled brand control: deep green on light, pale sage on dark, since
 * --brand flips per theme.
 *
 * Reserved for ACTIONS -- export, sort, pagination, page size, and a
 * destructive-adjacent bulk action. Filters are NOT actions: they display the
 * current state of the view, so they stay on the quiet surface the search box
 * uses, and the toolbar reads as one row of inputs with the actions picked out.
 *
 * Applied at the CALL SITES, never to `Button`'s outline variant or to
 * `SelectTrigger` globally. Those are shared: a dialog's Cancel must stay
 * quiet, and the assessment form uses the same select to show a chosen
 * clinical value, which has to read as data in --ink rather than as an action.
 */
export const CONTROL_CLASS =
  'border-transparent bg-[var(--brand)] text-[var(--brand-ink)] hover:bg-[var(--brand)] hover:opacity-90 ' +
  '[&_svg]:text-[var(--brand-ink)] data-[placeholder]:text-[var(--brand-ink)]'

/**
 * A control that has nowhere to go, without looking broken.
 *
 * `Button`'s base carries `disabled:opacity-50`, which drains a filled brand
 * button to a washed patch that reads as a rendering fault rather than as a
 * boundary. This keeps the fill and steps it back instead, so the row of
 * arrows stays one row of arrows.
 *
 * It stays genuinely `disabled`: it is not clickable and assistive tech is
 * told so. Only the appearance changes.
 */
const CONTROL_AT_LIMIT =
  'disabled:opacity-100 disabled:bg-[color-mix(in_oklab,var(--brand)_55%,transparent)] ' +
  'disabled:[&_svg]:opacity-70'

export interface SortOption {
  label: string
  id: string
  desc: boolean
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  title: string
  description?: string
  searchPlaceholder?: string
  /** Filter controls, shown beside the search box. */
  toolbar?: ReactNode
  sortOptions?: SortOption[]
  /** Rendered when rows are selected, in place of the selected-count text. */
  bulkActions?: (selected: TData[], clear: () => void) => ReactNode
  /** Turns the row into a link. Selection clicks are excluded automatically. */
  onRowClick?: (row: TData) => void
  /** Rows → CSV. Omit to hide the export control. */
  toCsvRow?: (row: TData) => Record<string, string | number>
  empty?: ReactNode
  initialPageSize?: number
}

function downloadCsv(name: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function DataTable<TData>({
  columns,
  data,
  title,
  description,
  searchPlaceholder = 'Search…',
  toolbar,
  sortOptions,
  bulkActions,
  onRowClick,
  toCsvRow,
  empty,
  initialPageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const allColumns = useMemo<ColumnDef<TData, any>[]>(() => {
    if (!bulkActions) return columns
    const select: ColumnDef<TData, any> = {
      id: 'select',
      enableSorting: false,
      size: 36,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
          aria-label="Select all rows on this page"
        />
      ),
      cell: ({ row }) => (
        // stopPropagation, or selecting a row would also open it.
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
            aria-label={`Select row ${row.index + 1}`}
          />
        </span>
      ),
    }
    return [select, ...columns]
  }, [columns, bulkActions])

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: Boolean(bulkActions),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
  })

  const rows = table.getRowModel().rows
  const filtered = table.getFilteredRowModel().rows
  const total = filtered.length
  const selected = table.getSelectedRowModel().rows.map((r) => r.original)
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = Math.max(table.getPageCount(), 1)

  const activeSort = sorting[0]

  return (
    <section className="rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[18px] shadow-[var(--glass-lift)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--ink)]">{title}</h2>
          {description && <p className="text-[12px] text-[var(--ink-muted)]">{description}</p>}
        </div>
        {toCsvRow && (
          <Button
            variant="outline"
            size="sm"
            className={CONTROL_CLASS}
            onClick={() => downloadCsv(title.toLowerCase().replace(/\s+/g, '-'), filtered.map((r) => toCsvRow(r.original)))}
            disabled={total === 0}
          >
            <Download />
            Export
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Sized, not stretched. A search field that spans the whole toolbar
            reads as a page header rather than a control. */}
        <div className="relative w-full sm:w-[280px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 pl-9"
          />
        </div>

        {toolbar}

        {sortOptions && sortOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={`ml-auto h-9 ${CONTROL_CLASS}`}>
                <ArrowUpDown />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((o) => {
                const on = activeSort?.id === o.id && activeSort?.desc === o.desc
                return (
                  <DropdownMenuItem
                    key={o.label}
                    onSelect={() => setSorting([{ id: o.id, desc: o.desc }])}
                  >
                    {o.label}
                    {on && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="overflow-x-auto rounded-[var(--r-md)] bg-[var(--surface)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="border-b border-[var(--line)] hover:bg-transparent">
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      /*
                        UPPERCASE with tracking, because size and colour alone
                        were not doing the job: the old header was
                        `text-[12px] text-[var(--ink-muted)]`, which is
                        character-for-character the style of the patient-ID
                        sub-text two rows below it. A header that matches the
                        body text is not a header.

                        Not a bigger or heavier font — hierarchy here comes
                        from CASE and letter-spacing, which is the same
                        treatment the sidebar already gives its group labels
                        (components/shell/nav.tsx). One pattern for "this is a
                        label, not content", used in both places.
                      */
                      className="h-11 text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--ink-muted)]"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          title="Sort by this column"
                          /*
                            `uppercase` is repeated here, not inherited.
                            Tailwind's Preflight resets `text-transform: none`
                            on form elements, so the th's uppercase reached the
                            one non-sortable header and stopped at every
                            button — three headers in sentence case beside one
                            in caps, which looked like a bug rather than a
                            scale.
                          */
                          className="group/sort -mx-1 inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 uppercase tracking-[0.06em] transition-colors hover:text-[var(--ink)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {/* The direction shows only on the column actually
                              sorted. Every other header reveals its chevron on
                              hover or focus -- a permanent inert chevron on all
                              seven made them look identical and broken, which is
                              exactly how Ali read it. Sorting is single-column:
                              a new one replaces the last. */}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5 text-[var(--brand)]" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5 text-[var(--brand)]" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-45 group-focus-visible/sort:opacity-45" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={allColumns.length} className="h-28 text-center align-middle">
                  {empty ?? <span className="text-[var(--ink-muted)]">Nothing to show</span>}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'link' : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            onRowClick(row.original)
                          }
                        }
                      : undefined
                  }
                  className={[
                    'border-b border-[var(--line)] last:border-0 hover:bg-[var(--accent)]',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    onRowClick ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--ink-muted)]">
        {selected.length > 0 && bulkActions ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular-nums">{selected.length} selected</span>
            {bulkActions(selected, () => setRowSelection({}))}
          </div>
        ) : (
          <span className="tabular-nums">
            {total === 0
              ? 'No rows'
              : `Showing ${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, total)} of ${total}`}
          </span>
        )}

        <div className="flex items-center gap-3">
          <label className="hidden items-center gap-2 sm:flex">
            Rows per page
            <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger size="sm" className={`w-[70px] ${CONTROL_CLASS}`} aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* 5 earns its place on a screen this small: the follow-up
                    worklist holds six rows, so it is the only option that
                    actually pages. The default stays 10. */}
                {[5, 10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <span className="tabular-nums">
            Page {Math.min(pageIndex + 1, pageCount)} of {pageCount}
          </span>

          {/* First/last only earn their place once paging one at a time is
              tedious. At two pages they duplicate prev/next exactly, which is
              what made the row read as four arrows doing two jobs. */}
          <div className="flex gap-1">
            {pageCount > 3 && (
              <Button variant="outline" size="icon-sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className={`${CONTROL_CLASS} ${CONTROL_AT_LIMIT}`} aria-label="First page">
                <ChevronsLeft />
              </Button>
            )}
            <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className={`${CONTROL_CLASS} ${CONTROL_AT_LIMIT}`} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className={`${CONTROL_CLASS} ${CONTROL_AT_LIMIT}`} aria-label="Next page">
              <ChevronRight />
            </Button>
            {pageCount > 3 && (
              <Button variant="outline" size="icon-sm" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} className={`${CONTROL_CLASS} ${CONTROL_AT_LIMIT}`} aria-label="Last page">
                <ChevronsRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
