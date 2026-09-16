'use client'

/**
 * The result charts, built on shadcn's `ChartContainer` and Recharts —
 * the library the project already ships (components/ui/chart.tsx, recharts
 * 2.15.4). Hand-rolled div bars were tried and replaced: the real components
 * bring axes, responsive sizing and a proper tooltip layer, and they inherit
 * the theme through `ChartConfig` instead of re-implementing it.
 *
 * FORM, chosen before colour (dataviz step 1):
 *   StageDistribution  magnitude over an ORDERED category, one series → bars
 *   ConfidenceMeter    a single bounded value → a stat tile, not a chart
 *   OutOfRange         magnitude by identity, one series → horizontal bars
 *   TriageDonut        one whole genuinely split in two → donut
 *
 * `OutOfRange` occupies the slot `FeatureImportance` held until 2026-08-12,
 * and inherits its geometry unchanged — 152px axis, 34px rows, 16px bars.
 * What changed is the quantity: model-level importance, identical for every
 * patient, became this patient's own values ranked against their reference
 * limits. See `lib/assessment/out-of-range.ts` for why.
 *
 * COLOUR. None of these is a categorical palette — the validator's own scope
 * line is "categorical palettes only", and its lightness/chroma/CVD checks do
 * not apply to a single-hue chart. Each is one hue; the three clinical colours
 * appear only as STATUS, which is what they are reserved for, and never
 * without a label beside them. The check that does apply — mark contrast
 * against the surface — passes in both themes at ≥ 3:1.
 */

import { Bar, BarChart, Cell, Label, LabelList, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { rangeLabel } from '@/lib/assessment/fields'
import { rankByDeviation, countOutOfRange } from '@/lib/assessment/out-of-range'
import type { GateResult } from '@/lib/api/analyze'
import { useIsMobile } from '@/hooks/use-mobile'
import s from './assessment.module.css'

type Tone = 'normal' | 'caution' | 'critical'

/**
 * Stages are 1-3 since the HCV model swap on 2026-08-10, and the scale has no
 * "no disease" point any more — Stage 1 already means mild fibrosis. It still
 * takes the calm colour because it is the best outcome this model can report,
 * and the label beside it says what it is.
 */
const stageTone = (stage: number): Tone =>
  stage >= 3 ? 'critical' : stage >= 2 ? 'caution' : 'normal'

// ─────────────────────────────────────────────────────────────────────────

const STAGE_CONFIG = {
  pct: { label: 'Probability', color: 'var(--chart-fill)' },
} satisfies ChartConfig

/**
 * Probability across Stage 1–3.
 *
 * The bucket labels are NOT hardcoded to a scale any more. They are read from
 * the response, which builds them from the model's own `classes_` — so if the
 * model is ever swapped again the chart follows instead of silently mislabelling
 * every bar. Hardcoding `['F0'..'F4']` here is exactly what would have shown a
 * cirrhotic patient as "F2 — Moderate fibrosis" after the 2026-08-10 swap.
 *
 * The model produces a probability for every stage; only the argmax was ever
 * shown before. "Stage 3" and "Stage 3 at 64% with 22% on Stage 2" are
 * different clinical statements, and the second changes management.
 *
 * The predicted bar takes the clinical colour for its severity; the rest are
 * the single chart green, dimmed. Colour marks the result — the axis label
 * under each bar already carries the category.
 */
export function StageDistribution({
  distribution,
  predicted,
}: {
  distribution: Record<string, number>
  predicted: number
}) {
  // Ordered by the trailing number so "Stage 10" would not sort before
  // "Stage 2", rather than by string.
  const labels = Object.keys(distribution).sort(
    (a, b) => (parseInt(a.replace(/\D+/g, ''), 10) || 0) - (parseInt(b.replace(/\D+/g, ''), 10) || 0),
  )
  const data = labels.map((stage) => ({
    stage,
    pct: distribution[stage] ?? 0,
    predicted: (parseInt(stage.replace(/\D+/g, ''), 10) || 0) === predicted,
  }))
  const tone = stageTone(predicted)

  return (
    <div className={s.chart}>
      <div className={s.chartHead}>
        {/* Short enough to stay on ONE line in the narrow slot. Measured, the
            old title wrapped to two while its sibling card's stayed at one, so
            the two charts beneath them started at different heights. */}
        <h3>Where this patient falls</h3>
        <p>How likely each scarring stage is.</p>
      </div>

      {/* aspect-auto: ChartContainer's base class list includes `aspect-video`,
          which pins a 16/9 ratio and defeats the flex height these cards need
          in order to finish level with the results card. */}
      <ChartContainer config={STAGE_CONFIG} className="aspect-auto w-full flex-1 min-h-[120px]">
        <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="stage"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            stroke="var(--ink-muted)"
            fontSize={12}
          />
          <YAxis hide domain={[0, 100]} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} hideLabel={false} />}
          />
          {/* 4px rounded data-end, anchored to the baseline. */}
          {/* A track behind every bar. Without it a 0.2% stage renders as
              nothing and the chart reads as three-fifths empty. */}
          <Bar
            dataKey="pct"
            radius={[4, 4, 0, 0]}
            maxBarSize={64}
            background={{ fill: 'var(--surface-sunk)', radius: 4 } as never}
          >
            {data.map((d) => (
              <Cell
                key={d.stage}
                fill={d.predicted ? `var(--${tone})` : 'var(--chart-fill)'}
                fillOpacity={d.predicted ? 1 : 0.62}
              />
            ))}
            {/* Selective direct labels — values under 1% would be noise. */}
            <LabelList
              dataKey="pct"
              position="top"
              offset={8}
              fontSize={12}
              fill="var(--ink-muted)"
              formatter={(v: number) => (v >= 1 ? `${v.toFixed(0)}%` : '')}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      <p className={s.chartNote}>
        Stage 1 early, Stage 2 intermediate, Stage 3 advanced
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * The initial assessment's confidence.
 *
 * A single bounded value, so a stat tile with a meter rather than a chart —
 * the dataviz skill's own "sometimes the answer is not a chart". Both sides
 * are labelled because the interesting case is a close call: the model is only
 * ~60% sure on a clearly healthy patient, and rounding that away would
 * misrepresent it.
 *
 * Replaces a hardcoded 80 or 95 that the old UI presented as model output.
 */
export function ConfidenceMeter({
  healthy,
  confidencePct,
  probabilitySick,
}: {
  healthy: boolean
  confidencePct: number
  probabilitySick: number
}) {
  const tone: Tone = healthy ? 'normal' : 'critical'
  const sick = Math.max(0, Math.min(100, probabilitySick))

  return (
    <div className={s.meterWrap}>
      <div className={s.meterHead}>
        <span className={s.meterLabel}>Model confidence</span>
        <span className={s.meterValue} style={{ color: `var(--${tone})` }}>
          {confidencePct.toFixed(1)}%
        </span>
      </div>

      {/* One track, split at the decision boundary. The 2px gap is the surface
          showing through, per the mark spec. */}
      <div
        className={s.meterTrack}
        role="img"
        aria-label={`Not healthy ${sick.toFixed(1)} percent, healthy ${(100 - sick).toFixed(1)} percent`}
      >
        <div className={s.meterFill} style={{ width: `${sick}%`, background: 'var(--critical)' }} />
        <div className={s.meterFill} style={{ width: `${100 - sick}%`, background: 'var(--normal)' }} />
      </div>

      {/*
        These name the two ENDS of the track and carry no figures.

        They used to read "Not healthy 96%" and "Healthy 4%", which printed the
        headline number a second time in a different rounding — `confidence_pct`
        is the probability of the class actually predicted, so it IS
        probability_sick whenever the verdict is "not healthy". One number in
        two places with two roundings is what made the block read as randomly
        placed. The bar's own proportions carry the split; the labels only say
        which end is which, on the same left/right axis as the row above.
      */}
      <div className={s.meterScale}>
        <span>Not healthy</span>
        <span>Healthy</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * What the model weighs, and what THIS patient has.
 *
 * The first version of this was a plain importance bar chart. It answered a
 * developer's question — "which inputs shaped the model?" — and a clinician
 * has no use for that. This answers theirs: of the things this model cares
 * about most, what did this patient actually present with, and which of those
 * are abnormal?
 *
 * It is still GLOBAL importance, not per-patient attribution — the weight
 * column says how much the model relies on each input across everyone it was
 * trained on. The patient column is simply their value. Putting them side by
 * side is honest: it never claims this value caused this result, but a doctor
 * can see that the model leans hardest on ascites and that this patient has
 * it.
 */
const WEIGHT_CONFIG = {
  pct: { label: 'Weight', color: 'var(--chart-fill)' },
} satisfies ChartConfig

/**
 * A two-line category tick: the question the model asks, and this patient's
 * answer to it. Recharts hands us `payload.index`, which is how the answer
 * finds its row.
 *
 * The answer is text, never a bar — it is often "Yes" or "Female", which has
 * no length. Out-of-range readings are the only thing coloured here.
 */
function PatientTick({
  x,
  y,
  payload,
  data,
}: {
  x?: number
  y?: number
  payload?: { index: number }
  data: { name: string; reading: string; status: 'low' | 'high' | null }[]
}) {
  const row = payload ? data[payload.index] : undefined
  if (!row || x === undefined || y === undefined) return null

  /*
    style, NOT the `fill` attribute. Measured in the browser: `fill="var(--ink)"`
    was present on the element and computed to the muted green anyway, because
    ChartContainer ships `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground`
    and a CSS declaration always beats an SVG presentation attribute.

    Every colour on this axis was being silently discarded — the name and the
    reading rendered identically, and an out-of-range value never turned red.
    An inline style wins, so the colours mean something again.
  */
  const critical = row.status !== null

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fontSize={12} style={{ fill: 'var(--ink)' }} y={-3}>
        {row.name}
      </text>
      <text
        textAnchor="end"
        fontSize={12}
        style={{ fill: critical ? 'var(--critical)' : 'var(--ink-muted)' }}
        y={13}
      >
        {/* The word carries the meaning; the colour only reinforces it.
            WCAG 2.2 §1.4.1 and CLAUDE.md §7 both forbid colour alone. */}
        {row.reading}
        {row.status ? ` — ${row.status}` : ''}
      </text>
    </g>
  )
}

export function OutOfRange({
  values,
  limit = 5,
}: {
  values: Record<string, string>
  limit?: number
}) {
  // The axis reserves fixed pixels for its labels. On a 299px-wide chart 152px
  // of that is half the width, so it narrows below the tablet breakpoint.
  const narrow = useIsMobile()

  const rows = rankByDeviation(values, limit)
  if (rows.length === 0) return null

  const { outside, measured } = countOutOfRange(values)

  const data = rows.map((row) => ({
    name: row.label,
    pct: row.width,
    reading: row.reading,
    status: row.status,
    text: row.text,
    /* The hover has room for the thing the card does not: the range itself.
       On the card a row says "96 IU/L — high"; the hover says what "high"
       was measured against. */
    range: rangeLabel(row.key),
  }))

  return (
    <div className={s.chart}>
      <div className={s.chartHead}>
        {/*
          The heading states the finding, not the widget. With nothing outside
          its range that is a real clinical result rather than an empty state,
          and it should read like one.
        */}
        <h3>{outside === 0 ? 'Everything is within range' : 'What is abnormal in this patient'}</h3>
        <p>
          {outside === 0
            ? `All ${measured} entered values sit inside their reference range. The closest to a limit:`
            : `${outside} of ${measured} entered values are outside their range, furthest out first.`}
        </p>
      </div>

      {/*
        The height is driven by the ROW COUNT, not by whatever space is left
        over. Measured before this change: five bars rendered with three axis
        labels on desktop and TWO on mobile. Recharts' default
        `interval="preserveEnd"` drops any tick that does not fit, and a
        two-line tick needs ~30px in a slot the squashed chart had given ~16px
        — so three of five inputs were unnamed bars with a percentage.
      */}
      {/*
        A FLOOR, not a target. 34px per row is the least this chart can be and
        stay readable; on desktop it never binds, because the charts column
        stretches to the results card and hands each chart far more than that.

        It was 46, which made the column's natural height 740 against a 731px
        results card — so `stretch` had nothing left to stretch and the charts
        overhung the card by 9px. The card sets the height; these only stop the
        chart collapsing when the card is unusually short.
      */}
      <ChartContainer
        config={WEIGHT_CONFIG}
        className="aspect-auto w-full flex-1"
        style={{ minHeight: data.length * 34 }}
      >
        <BarChart
          data={data}
          layout="vertical"
          /*
            The right margin holds the end label, and "within range" is the
            longest string it can carry — ~78px at 12px, against the 34px the
            old "45.0%" needed. Too small and the words wrap into the plot.
          */
          margin={{ top: 0, right: narrow ? 84 : 96, bottom: 0, left: 0 }}
        >
          {/* Fixed 0–100: the bar width is already a percentage of the widest
              row, computed in `rankByDeviation`. Recharts must not rescale it
              again or the shortest row loses its guaranteed minimum. */}
          <XAxis type="number" dataKey="pct" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            // Every row is named, always. This is the fix for the dropped
            // labels above; without it Recharts silently thins the axis.
            interval={0}
            // 132, not 124: measured, "Fluid in the abdomen" is 116px at 12px
            // and landed at exactly x=0 against a 124px axis — flush with the
            // plot edge, with no margin left for a longer label.
            width={narrow ? 132 : 152}
            tick={<PatientTick data={data} />}
          />
          {/*
            The same hover card every other chart on this screen answers with,
            so the page has one tooltip design rather than one chart that goes
            quiet under the cursor.

            It does NOT repeat the row. The bar already prints the value and
            how far out it is; the hover adds the reference range those were
            measured against, which is the one thing a 152px axis has no room
            for.
          */}
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel={false}
                hideIndicator
                formatter={(_v, _n, item) => {
                  const row = item?.payload as
                    | { reading: string; text: string; range: string }
                    | undefined
                  if (!row) return null
                  return (
                    <span className="grid gap-0.5">
                      <span>
                        {row.reading}
                        {row.text === 'within range' ? '' : ` — ${row.text}`}
                      </span>
                      {row.range && (
                        <span className="text-[var(--ink-muted)]">normal {row.range}</span>
                      )}
                    </span>
                  )
                }}
              />
            }
          />
          {/*
            One green, one meaning: the bar ranks distance from that value's
            own limit, and nothing else. Out of range or inside it, the colour
            is the same — the red reading beneath the name is what marks a
            failure, alongside the words "high", "low" and "% above", so no
            meaning rests on colour alone (WCAG 2.2 §1.4.1).
          */}
          {/* Full opacity, like the Reports bars. The 0.8 was the other half of
              why this green read dimmer than the same token does there. */}
          <Bar dataKey="pct" radius={4} maxBarSize={16} fill="var(--chart-fill)">
            <LabelList
              dataKey="text"
              position="right"
              offset={8}
              fontSize={12}
              fill="var(--ink-muted)"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

const TRIAGE_CONFIG = {
  value: { label: 'Probability' },
  sick: { label: 'Signs of liver disease', color: 'var(--critical)' },
  healthy: { label: 'No signs found', color: 'var(--normal)' },
} satisfies ChartConfig

/**
 * The triage step, on the results screen.
 *
 * `CLAUDE.md` §6.2 asks for the Gate Model's routing to be visible on the
 * result screen — "judges reward systems that explain their own reasoning" —
 * and until now it appeared only on screen 2, so by the time a judge reached
 * the results there was no sign a triage layer existed.
 *
 * A donut is honest here for the reason it usually is not: this really is one
 * whole split in two. `probability_sick` and `probability_healthy` are the two
 * halves of a single `predict_proba` and sum to 100 by construction. Two
 * segments, both labelled, the verdict in the middle.
 */
/* `Pick`, not the whole `GateResult`: this chart reads three fields, and
   demanding the other five it never touches is what stopped the patient
   profile reusing it — a stored visit has the probabilities but not the live
   run's advice strings or feature list. */
export function TriageDonut({
  gate,
}: {
  gate: Pick<GateResult, 'probabilitySick' | 'healthy' | 'confidencePct'>
}) {
  const sick = Math.max(0, Math.min(100, gate.probabilitySick))
  const data = [
    { key: 'sick', label: 'Signs of liver disease', value: sick, fill: 'var(--critical)' },
    { key: 'healthy', label: 'No signs found', value: 100 - sick, fill: 'var(--normal)' },
  ]

  return (
    <div className={s.chart}>
      <div className={s.chartHead}>
        {/* Not "the triage decision", and not "the gate model". Both are our
            words for it, not the reader's. */}
        <h3>The first check</h3>
        <p>What the blood tests alone suggested, before the detailed models ran.</p>
      </div>

      {/* Percentage radii, not pixels: this box now grows to match its
          neighbours, and a fixed 70px ring in a tall card reads as a coin
          dropped in a field. Recharts sizes percentages off the smaller
          dimension, so it can never overflow the short axis either. */}
      <ChartContainer config={TRIAGE_CONFIG} className="aspect-auto mx-auto w-full flex-1 min-h-[120px]">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                nameKey="label"
                formatter={(v, name) => `${name}: ${Number(v).toFixed(1)}%`}
                hideLabel
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="60%"
            outerRadius="88%"
            strokeWidth={2}
            stroke="var(--surface)"
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox)) return null
                const { cx, cy, innerRadius } = viewBox as {
                  cx: number
                  cy: number
                  innerRadius?: number
                }

                /*
                  THE CENTRE TEXT IS SIZED FROM THE HOLE IT SITS IN.

                  It was a hardcoded 16px, which was fine while this chart had
                  half a results row to itself. On the patient profile it takes
                  a quarter of the row, the ring shrinks with it, and "Needs
                  review" rendered wider than the hole — the words spilled over
                  the segments on both sides.

                  A ring's usable width is a little under its inner diameter,
                  and a character averages ~0.55em, so the size that fits is
                  (1.8 x innerRadius) / (0.55 x characters). Clamped at both
                  ends: never smaller than 10px, never larger than the 16 this
                  used to be.
                */
                const verdict = gate.healthy ? 'Healthy' : 'Needs review'
                const sub = `${gate.confidencePct.toFixed(1)}% sure`
                const r = innerRadius ?? 60
                const fit = (text: string, min: number, max: number) =>
                  Math.round(Math.max(min, Math.min(max, (1.8 * r) / (0.55 * text.length))))

                const big = fit(verdict, 10, 16)
                const small = fit(sub, 9, 12)

                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx}
                      y={cy - small * 0.5}
                      fill={gate.healthy ? 'var(--normal)' : 'var(--critical)'}
                      fontSize={big}
                      fontWeight="600"
                    >
                      {verdict}
                    </tspan>
                    <tspan x={cx} y={cy + big * 0.8} fill="var(--ink-muted)" fontSize={small}>
                      {sub}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* A donut has no axis to read the categories off, so the segments are
          named here rather than left to colour alone. */}
      <div className={s.donutKey}>
        {data.map((d) => (
          <span key={d.key}>
            <i style={{ background: d.fill }} aria-hidden="true" />
            {d.label} {d.value.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  )
}
