/**
 * The reference material on /tools.
 *
 * DERIVED FROM `lib/assessment/fields.ts`, NOT RESTATED. That file is already
 * the single declaration of every value this product collects, including units
 * and reference ranges, and it is the same data the models are fed. A second
 * hand-written table would drift from it within a week — which is exactly what
 * the old screen had.
 *
 * What was there before: a generic five-row table (glucose, haemoglobin,
 * creatinine, ALT, cholesterol) inside `advanced-reports.tsx` at :3466, beside
 * panels of drug dosages and pediatric vital signs. None of it was fabricated —
 * the values were genuine textbook figures — but three of the four panels were
 * general medicine in a liver-specialist product, and the drug panel led with
 * acetaminophen, the most hepatotoxic drug in common use, carrying only a
 * generic "adjust for hepatic impairment" footnote.
 *
 * Ali's call on 2026-08-10: keep the lab ranges and the abbreviations, scoped
 * to what this product actually uses. Drop drug dosages and vital signs.
 */

import { fieldsIn, rangeLabel, type FieldDef } from '@/lib/assessment/fields'

export interface ReferenceRow {
  key: string
  label: string
  unit: string
  range: string
}

/**
 * Every laboratory value the analysis collects, with its reference range.
 *
 * Fields with no declared range are dropped rather than shown with an empty
 * cell — a row that says nothing is worse than no row.
 */
export function labReference(): ReferenceRow[] {
  return fieldsIn('labs')
    .map((f: FieldDef) => ({
      key: f.key,
      label: f.label,
      unit: f.unit ?? '',
      range: rangeLabel(f.key),
    }))
    .filter((row) => row.range !== '')
}

export interface Abbreviation {
  short: string
  full: string
}

/**
 * ONLY the abbreviations this product puts on screen.
 *
 * The old panel listed CBC, BMP, LFT and a column of general clinical terms
 * the app never shows. These are the ones a reader actually meets here: the
 * eight lab abbreviations on the analysis form, plus the four derived scores
 * the results screen reports.
 *
 * Lab abbreviations deliberately stay abbreviated everywhere else in the
 * product — they are what is printed on the blood test the doctor is copying
 * from, and "alanine aminotransferase" is not plainer, only longer
 * (LESSONS.md L-026). This table is where they get expanded once.
 */
export const ABBREVIATIONS: Abbreviation[] = [
  { short: 'ALT', full: 'Alanine aminotransferase, a liver enzyme' },
  { short: 'AST', full: 'Aspartate aminotransferase, a liver enzyme' },
  { short: 'ALP', full: 'Alkaline phosphatase, raised in bile duct problems' },
  { short: 'GGT', full: 'Gamma-glutamyl transferase, sensitive to alcohol and fatty liver' },
  { short: 'HDL', full: 'High-density lipoprotein, the protective cholesterol' },
  { short: 'A/G', full: 'Albumin to globulin ratio' },
  { short: 'INR', full: 'International normalised ratio, how fast blood clots' },
  { short: 'BMI', full: 'Body mass index, weight over height squared' },
  { short: 'APRI', full: 'AST to platelet ratio index, a scarring estimate' },
  { short: 'ALBI', full: 'Albumin-bilirubin score, a liver function grade' },
  { short: 'eGFR', full: 'Estimated glomerular filtration rate, kidney function' },
]
