'use client'

/**
 * The Reports charts.
 *
 * Built on shadcn's `ChartContainer` + Recharts, the same pair
 * `components/assessment/charts.tsx` already uses — the reference dashboards
 * this project measures against are built on the identical primitives, so
 * nothing new was installed for this screen.
 *
 * FORM, chosen before colour (dataviz step 1):
 *   AnalysesOverTime  a count over time, one series          → area
 *   SplitDonut        one whole genuinely divided            → donut + figures
 *   RankedBars        magnitude by identity, one series      → horizontal bars
 *   CountBars         magnitude over an ORDERED band, one    → vertical bars
 *
 * COLOUR. Only `SplitDonut` takes more than one colour, and when it does the
 * colours are either the three clinical tones (status, which is what they are
 * reserved for, always beside a label) or two steps of the single chart green.
 * Nothing here is a categorical palette, so the validator's lightness/chroma/CVD
 * checks do not apply; the check that does — mark contrast against the surface —
 * is satisfied by the tokens, which are measured in both themes (L-036).
 *
 * THESE COMPONENTS DRAW THE PLOT AND NOTHING ELSE. Card, title, description and
 * footnote belong to the page, because the page owns the 12-column composition
 * and a chart that drew its own card could not be placed in a 5-column slot
 * beside a 7-column one. It also keeps `anyNested: false` true — the single
 * highest-value finding from DESIGN_RECON.md, and the thing the retired
 * "Data Analytics Dashboard" got wrong by nesting four cards inside a card.
 */

import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  Sector,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Bucket } from '@/lib/reports/metrics'
import { HoverCard, cursorIn, type CursorPos } from './hover-card'

/* ------------------------------------------------------------------ *
 * Analyses over time
 * ------------------------------------------------------------------ */

const TIME_CONFIG = {
  count: { label: 'Analyses', color: 'var(--chart-fill)' },
} satisfies ChartConfig

/**
 * Monthly volume.
 *
 * EMPTY MONTHS ARE PLOTTED, not skipped — `monthlyVolume` emits them and this
 * draws them. April and May 2026 genuinely have no analyses, and a chart that
 * closed the gap would compress six months into four and overstate how busy the
 * clinic is. The flat stretch is the honest shape.
 *
 * An area rather than a line: the quantity is a count with a meaningful zero, so
 * the filled region between the line and the baseline means something. The fill
 * is a gradient to near-transparent, which keeps the mark thin at the top where
 * the value actually is.
 */
export function AnalysesOverTime({ data }: { data: { label: string; iso: string; count: number }[] }) {
  return (
    <ChartContainer config={TIME_CONFIG} className="aspect-auto h-[200px] w-full">
      {/*
        THE SIDE MARGINS AND `interval={0}` ARE BOTH LOAD-BEARING. Measured in
        the browser at 1440 with margin 0: six data points landed at x = 0, 120,
        241, 361, 482, 602 and only FIVE ticks rendered — the first month's
        label was silently dropped, because a tick centred on x=0 would overflow
        the plot and Recharts discards it rather than let it. The chart then
        showed six points under five month names, every one of them off by one.

        This is the same defect as the results charts (PROJECT_STATE.md, "5
        bars, 3 labels desktop / 2 mobile") and it is invisible in source, which
        is why design rule 27 exists. 14px is half the width of a three-letter
        month, so the edge labels now have somewhere to sit; `interval={0}`
        stops Recharts thinning the middle ones on its own initiative.
      */}
      <AreaChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: 14 }}>
        <defs>
          <linearGradient id="reportsAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-fill)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-fill)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          stroke="var(--ink-muted)"
          fontSize={12}
        />
        <YAxis hide allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(v) => `${v} analyses`} />}
        />
        <Area
          dataKey="count"
          type="linear"
          stroke="var(--chart-fill)"
          strokeWidth={2}
          fill="url(#reportsAreaFill)"
          dot={{ r: 3, fill: 'var(--chart-fill)', strokeWidth: 0 }}
          activeDot={{ r: 4.5 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}

/**
 * The same series, small enough to sit inside a headline figure.
 *
 * No axes, no tooltip, no interaction — it is a shape, not a chart, and the
 * card's footer says what the shape is of. Hand-drawn SVG rather than a second
 * Recharts instance: `ResponsiveContainer` measures its parent on mount, and
 * four of these inside a grid that is itself still settling produced a visible
 * reflow. A path over a fixed viewBox has nothing to measure.
 */
export function Sparkline({ data }: { data: { count: number }[] }) {
  if (data.length < 2) return null

  const W = 100
  const H = 48
  /*
    THE BOX GREW; THE BAND DID NOT MOVE UP AGAIN. Two earlier attempts got this
    wrong in the same way, so the reasoning is worth keeping.

    First I lifted the floor 7px and Ali said still too low. Then I lifted it to
    14 of 34 and he said it is "still almost like a straight line" — which is
    the real diagnosis, and it is not about position at all. The series is
    1, 0, 0, 1, 5, 3: four of six months sit within one unit of each other, so
    at any scale the left two thirds are flat. Squeezing the drawing band, which
    is what raising the floor does, made that flatness WORSE while fixing the
    symptom I had been told about.

    The fix is AMPLITUDE, not position. 48px tall with a 5/9 margin gives 34px
    of vertical range against 16px before — the same shape, twice the travel,
    and the peak-to-floor difference is finally readable at this size. The 8px
    segment bars on the other three cards just centre in the taller slot.
  */
  const TOP = 5
  const FLOOR = 9
  const max = Math.max(...data.map((d) => d.count), 1)
  const step = W / (data.length - 1)
  const pt = (d: { count: number }, i: number) => [
    i * step,
    TOP + (1 - d.count / max) * (H - TOP - FLOOR),
  ]
  const line = data.map((d, i) => pt(d, i).join(',')).join(' L')

  return (
    /*
      FULL WIDTH, IN THE SAME SLOT THE OTHER CARDS PUT THEIR SEGMENT BAR.

      This was a fixed 96px shape sitting inline beside the value, and Ali was
      right that it made the card read as a different species: the other three
      figures are label / value+pill / full-width bar / footer, and this one was
      label / value+picture / footer, with the value squeezed. Same slot, same
      rhythm, and the sparkline still says the thing only it can say.

      `preserveAspectRatio="none"` so it stretches to whatever the column is,
      with `vector-effect="non-scaling-stroke"` so the stroke does not stretch
      with it — without that the line thins horizontally and thickens
      vertically as the card resizes.
    */
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-[48px] w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="reportsSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-fill)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--chart-fill)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${line} L${W},${H} L0,${H} Z`} fill="url(#reportsSparkFill)" />
      <path
        d={`M${line}`}
        fill="none"
        stroke="var(--chart-fill)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Stacked share
 * ------------------------------------------------------------------ */

export interface ShareRow {
  label: string
  /** The clinical wording under the name — the F-mapping, here. */
  sub?: string
  count: number
  color: string
}

/**
 * One whole divided across an ORDERED set of categories.
 *
 * Replaces the donut on the fibrosis card, and the reason is the data rather
 * than taste: STAGE IS ORDINAL. Stage 1 → 2 → 3 is a progression, and a donut
 * arranges categories around a circle, which has no beginning and no end — so
 * the one property that matters about this variable is the one property the
 * shape cannot express. A stacked bar reads left to right, mild to advanced, in
 * the same direction as the scale itself.
 *
 * Two things it buys that the donut had nowhere to put:
 *
 *   A HEADLINE. The share at the worst stage is the most important number on
 *   the card and it now leads. Derived from the same counts, not a new claim.
 *
 *   ROOM FOR THE F-MAPPING. PROJECT_STATE.md §3b calls the parenthetical the
 *   load-bearing half: these grades are a re-partition of METAVIR, not its
 *   first three points, so a hepatologist who is not told would read Stage 3 as
 *   F3 and take cirrhosis for a grade milder than it is. A donut legend never
 *   had space for it; a table row does.
 *
 * The other two donuts on this page stay donuts, and that is not an
 * inconsistency: they divide UNORDERED pairs, where a circle is fine.
 */
export function StackedShare({
  rows,
  headline,
  headlineColor,
}: {
  rows: ShareRow[]
  headline: string
  headlineColor?: string
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100)

  /*
    A HOVER CARD, because every other card on this page has one and this was
    the only chart that answered a cursor with nothing.

    Both the bar segments and the table rows raise it, since either is a
    reasonable thing to point at. It follows the cursor and is styled from the
    same class list as `ChartTooltipContent`, so the page has exactly one
    tooltip design across Recharts charts, the figure cards and this.
  */
  const [hover, setHover] = useState<{ row: ShareRow; pos: CursorPos } | null>(null)
  const onMove = (row: ShareRow) => (e: React.MouseEvent<HTMLElement>) => {
    const box = e.currentTarget.closest('[data-stacked-share]')?.getBoundingClientRect()
    if (!box) return
    setHover({
      row,
      pos: { x: e.clientX - box.left, y: e.clientY - box.top, w: box.width },
    })
  }

  return (
    <div data-stacked-share className="relative flex flex-col" onMouseLeave={() => setHover(null)}>
      {hover && (
        <HoverCard pos={hover.pos}>
          <span className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: hover.row.color }}
            />
            {hover.row.label}
          </span>
          <div className="grid gap-1.5">
            {hover.row.sub && <span className="text-[var(--ink-muted)]">{hover.row.sub}</span>}
            <div className="flex items-center gap-3">
              <span className="text-[var(--ink-muted)]">Analyses</span>
              <span className="ml-auto font-mono font-medium tabular-nums">{hover.row.count}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--ink-muted)]">Share</span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {Math.round(pct(hover.row.count))}%
              </span>
            </div>
          </div>
        </HoverCard>
      )}
      <p
        className="text-[30px] leading-[34px] font-medium tracking-[-0.02em] tabular-nums"
        style={{ color: headlineColor ?? 'var(--ink)' }}
      >
        {headline}
      </p>

      {/* 2px of surface between segments, the same mark spec the donut uses. */}
      <div className="mt-3.5 flex h-2.5 gap-0.5" role="img" aria-label={`${rows.map((r) => `${r.label} ${Math.round(pct(r.count))}%`).join(', ')}`}>
        {rows.map((r) => (
          <span
            key={r.label}
            className="block cursor-default rounded-[var(--r-pill)]"
            style={{ width: `${pct(r.count)}%`, background: r.color }}
            onMouseMove={onMove(r)}
          />
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[var(--ink-muted)]">
        {rows.map((r) => (
          <span key={r.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: r.color }} />
            {r.label}
          </span>
        ))}
      </div>

      {/* Ranked by size, so the card leads with what most of the cohort is. */}
      <dl className="mt-3.5 flex flex-col">
        {[...rows]
          .sort((a, b) => b.count - a.count)
          .map((r, i) => (
            <div
              key={r.label}
              onMouseMove={onMove(r)}
              className={`flex items-center gap-3 py-2.5 transition-colors duration-150 hover:bg-[var(--accent)] ${i > 0 ? 'border-t border-[var(--line)]' : ''}`}
            >
              <dt className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[var(--ink)]">{r.label}</span>
                {r.sub && <span className="block text-[12px] text-[var(--ink-muted)]">{r.sub}</span>}
              </dt>
              <dd className="w-10 text-right text-[12px] tabular-nums text-[var(--ink-muted)]">
                {Math.round(pct(r.count))}%
              </dd>
              <dd className="w-8 text-right text-[14px] font-medium tabular-nums text-[var(--ink)]">
                {r.count}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Donut with a figures table
 * ------------------------------------------------------------------ */

export interface Slice {
  label: string
  count: number
  /** A CSS colour, usually a token. */
  color: string
}

/**
 * One whole, divided, with the numbers beside it rather than in a legend.
 *
 * THE FIGURES LIST IS THE POINT, and it is the strongest thing in the reference
 * dashboards: Studio Admin's "Account Allocation" pairs a four-sector donut with
 * a right-hand list of label / value / share. A legend tells you which colour is
 * which; this tells you the numbers, so the donut only has to carry proportion.
 *
 * `centre` is the total the slices are taken from, labelled — a donut whose hole
 * is empty wastes the one place a reader looks first.
 */
export function SplitDonut({
  slices,
  centre,
  centreLabel,
}: {
  slices: Slice[]
  centre: number
  centreLabel: string
}) {
  const total = slices.reduce((sum, s) => sum + s.count, 0)
  const config: ChartConfig = Object.fromEntries(
    slices.map((s) => [s.label, { label: s.label, color: s.color }]),
  )

  /*
    THE TOOLTIP FOLLOWS THE CURSOR, AND IT HAS TO — Recharts' own pie tooltip
    cannot.

    Recharts anchors a pie tooltip at the SECTOR'S MIDPOINT, computed at radius
    (inner+outer)/2, not at the mouse. For any slice whose midpoint lands on the
    LEFT of the ring, a tooltip ~130px wide then opens rightward and lies
    straight across the hole. Ali reported it on Gender/Female; the geometry is
    general, and First check's "Further assessment" slice does exactly the same
    thing at 214°. `allowEscapeViewBox` did not help because the anchor was
    never the problem — the tooltip was not being clipped, it was being placed
    on top of the chart on purpose.

    So position comes from the wrapper's own mousemove and identity comes from
    the Pie's enter/leave. Same hover card as the figure cards and the stacked
    share, which also means this page now has exactly one tooltip design.
  */
  const [active, setActive] = useState<number | null>(null)
  const [pos, setPos] = useState<CursorPos | null>(null)
  const hovered = active !== null ? slices[active] : undefined

  return (
    /*
      DONUT CENTRED, FIGURES BENEATH IT. This was donut-left / figures-right,
      copying the reference's "Account Allocation". Ali on the built version:
      "there is so much dead space in the bottom half" — and he is right, because
      the reference card is far wider than these are. In a 4- or 5-column slot a
      124px circle beside a short list leaves the whole lower half of the card
      empty, and the taller the neighbouring cards get, the more obvious it is.

      Stacked, the donut is the centre of attention, the figures get the card's
      full width for their own columns, and there is no dead half.
    */
    <div className="flex flex-col items-center gap-4">
      {/*
        The chart and its centre label share ONE positioned box.

        An earlier version put the label in a sibling pulled back over the chart
        with `-ml-[124px]`, inside a flex row with `gap-x-5`. The gap applies
        after the negative margin, so the label sat 20px right of the hole.
        Overlaying inside one relative parent has no gap to fight.
      */}
      <div
        /*
          148px, not 132px, and the extra 16 are HEADROOM FOR THE RISE.

          Measured with a slice forced active at the old size: the active
          sector's path began at y = -3 with an outer radius of 69 in a box
          whose own maximum is 66, so the risen arc was clipped flat by the SVG
          viewport. That is the broken edge Ali photographed — the shape was
          correct and the container was too small for it.

          The radii below leave 3px of margin at full rise: 44 inner, 64 outer,
          71 when active, against a 74 maximum.
        */
        className="relative size-[148px]"
        onMouseMove={(e) => setPos(cursorIn(e))}
        onMouseLeave={() => {
          setActive(null)
          setPos(null)
        }}
      >
        <ChartContainer config={config} className="aspect-square size-full">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius={44}
              outerRadius={64}
              strokeWidth={0}
              /* A 2px gap of surface between segments — dataviz mark spec, and
                 what stops two adjacent slices reading as one arc. */
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, index) => setActive(index)}
              onMouseLeave={() => setActive(null)}
              /*
                THE HOVERED SLICE RISES; NOTHING DIMS. Ali picked this off
                shadcn's "Pie Chart - Donut Active" over the version that faded
                the other slices, and he is right that it reads better: dimming
                makes the chart look disabled and takes something away from
                three slices to say something about one. Growing the active
                sector adds to the one you are pointing at and leaves the rest
                exactly as they were.

                `activeIndex` must be `undefined` and not `-1` when nothing is
                hovered — Recharts treats any number as an index and -1 makes
                the last sector active.
              */
              activeIndex={active ?? undefined}
              activeShape={({ outerRadius = 0, ...props }: { outerRadius?: number }) => (
                <Sector {...props} outerRadius={outerRadius + 7} />
              )}
            >
              {slices.map((s) => (
                <Cell key={s.label} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {hovered && pos && (
          <HoverCard pos={pos}>
            <span className="flex items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: hovered.color }}
              />
              {hovered.label}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[var(--ink-muted)]">Analyses</span>
              <span className="ml-auto font-mono font-medium tabular-nums">{hovered.count}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--ink-muted)]">Share</span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {total === 0 ? '—' : `${Math.round((hovered.count / total) * 100)}%`}
              </span>
            </div>
          </HoverCard>
        )}

        {/* Drawn as HTML rather than an SVG <Label>: Recharts centres a Label on
            the pie's own box, which drifts as the container resizes. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[12px] text-[var(--ink-muted)]">{centreLabel}</span>
          <span className="text-[19px] leading-[24px] font-medium tabular-nums text-[var(--ink)]">
            {centre}
          </span>
        </div>
      </div>

      {/*
        Full width now, so label / count / share get real columns instead of
        being squeezed into whatever was left beside the circle.

        THE RULE CLOSES THE LIST; IT DOES NOT SPLIT IT. It used to sit between
        the rows, which put "Further assessment" below a line and "No signs"
        above one — reading as two unrelated facts when they are two halves of
        the same 13. Ali asked for both above the line. One rule under the whole
        list groups the slices together and separates them from the card's
        footnote, which is what the line was for.
      */}
      <dl className="flex w-full flex-col border-b border-[var(--line)]">
        {slices.map((s) => (
          <div key={s.label} className="flex items-baseline gap-3 py-2 text-[12px]">
            <span
              aria-hidden="true"
              className="relative top-[1px] size-2 flex-none rounded-[2px]"
              style={{ background: s.color }}
            />
            <dt className="min-w-0 flex-1 truncate text-[var(--ink-muted)]">{s.label}</dt>
            <dd className="text-[14px] font-medium tabular-nums text-[var(--ink)]">{s.count}</dd>
            <dd className="w-10 text-right tabular-nums text-[var(--ink-muted)]">
              {total === 0 ? '—' : `${Math.round((s.count / total) * 100)}%`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Ranked horizontal bars
 * ------------------------------------------------------------------ */

const RANK_CONFIG = {
  count: { label: 'Analyses', color: 'var(--chart-fill)' },
} satisfies ChartConfig

/**
 * Magnitude by identity — one series, ranked, labels inside the bars.
 *
 * The treatment Ali picked from shadcn's "Bar Chart - Custom Label": category
 * name inside the bar in the inverse ink, value outside on the right, radius 4,
 * no y-axis. It reads as a ranking rather than as a chart, which is right when
 * the categories have no order of their own.
 *
 * THE INSIDE LABEL IS DROPPED BELOW `md`. Measured at 1440 the shortest bar is
 * about a third of a 700px column, which holds "Raised ascites risk"
 * comfortably; on a phone that same bar is ~110px and the text would clip
 * against a fill it cannot be read on. Narrow viewports get the label outside,
 * where it is merely a longer chart instead of an unreadable one.
 */
export function RankedBars({ data, rowHeight = 46 }: { data: Bucket[]; rowHeight?: number }) {
  const isMobile = useIsMobile()
  const height = Math.max(data.length * rowHeight, 120)

  return (
    <ChartContainer config={RANK_CONFIG} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }}>
        <YAxis dataKey="label" type="category" hide />
        <XAxis dataKey="count" type="number" hide />
        {/*
          THE SAME TOOLTIP THE OTHER CHARTS USE. This had `indicator="line"` and
          `nameKey="label"`, which produced two faults at once: the line
          indicator drew a green rule down the left of the card, and `nameKey`
          sent the lookup to a config entry that does not exist, so the row fell
          back to the raw data key and read "count 5". Ali: not clean like the
          other bars, and the green line ruins the look.

          Default dot indicator + the config's own label + the same formatter as
          `CountBars` and `AnalysesOverTime`, so all four tooltips are one thing.
        */}
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => `${v} analyses`} />} />
        <Bar dataKey="count" fill="var(--chart-fill)" radius={4} barSize={30}>
          <LabelList
            dataKey="label"
            position={isMobile ? 'right' : 'insideLeft'}
            offset={8}
            fontSize={12}
            fill={isMobile ? 'var(--ink)' : 'var(--brand-ink)'}
          />
          {!isMobile && (
            <LabelList
              dataKey="count"
              position="right"
              offset={8}
              fontSize={12}
              fill="var(--ink)"
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ *
 * Vertical count bars
 * ------------------------------------------------------------------ */

const COUNT_CONFIG = {
  count: { label: 'Analyses', color: 'var(--chart-fill)' },
} satisfies ChartConfig

/**
 * Magnitude across an ORDERED set of bands — age groups, risk bands.
 *
 * shadcn's "Bar Chart - Label": radius 8, value above each bar, category on the
 * x-axis, no y-axis. One colour, because the bands are ordered and the ordering
 * plus the labels carry the severity. An earlier version painted the bands with
 * the clinical tones and produced two near-identical greens side by side, which
 * Ali caught — a distribution of risk is not a per-patient clinical state, so
 * the status colours did not belong there at all.
 *
 * Empty bands keep their slot and print a muted zero rather than vanishing. A
 * band that disappears when nobody falls into it makes the axis change shape
 * between two clinics, and a reader cannot tell "nobody here" from "we do not
 * measure that".
 */
export function CountBars({ data }: { data: Bucket[] }) {
  return (
    <ChartContainer config={COUNT_CONFIG} className="aspect-auto h-[180px] w-full">
      <BarChart data={data} margin={{ top: 22, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          stroke="var(--ink-muted)"
          fontSize={11}
          interval={0}
        />
        <YAxis hide allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(v) => `${v} analyses`} />}
        />
        <Bar dataKey="count" fill="var(--chart-fill)" radius={8} maxBarSize={56}>
          <LabelList
            dataKey="count"
            position="top"
            offset={8}
            fontSize={12}
            fill="var(--ink-muted)"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
