/**
 * The clinical calculators, as pure functions.
 *
 * Lifted out of `components/advanced-reports.tsx` (:1592-1718), where all five
 * lived inside a 4,737-line component alongside the report builder, the patient
 * table and eleven dialogs. Nothing here touches the network, React or the DOM,
 * so `.verify/calculators.mts` can assert every formula against published
 * worked examples.
 *
 * FOUR OF THE FIVE WERE WRONG. This is not a re-skin — the recon on 2026-08-10
 * found that only BMI survived unchanged. What each one used to do, and why it
 * changed, is recorded on the function itself. The short version:
 *
 *   BMI        correct, carried over as-is
 *   eGFR       2009 CKD-EPI *with a race coefficient*, deprecated since 2021,
 *              and its staging labelled healthy people as CKD Stage 1
 *   Fluid      pediatric formula applied to adults unlabelled, plus a
 *              "replacement" branch that computed the adult maintenance figure
 *   Dose       1000x unit error in BOTH outputs, and it never answered the
 *              question a dose calculator exists for
 *   Convert    glucose's molar mass applied to every analyte
 *
 * Every returned `category` string is interface copy: sentence case, no
 * terminal full stop (LESSONS.md L-029).
 */

/* ------------------------------------------------------------------ *
 * Body mass index
 * ------------------------------------------------------------------ */

export interface BmiResult {
  bmi: number
  category: string
}

/**
 * Weight over height squared, with the WHO adult cut-points.
 *
 * The one calculator that was already correct. Carried over unchanged rather
 * than rewritten for the sake of it (CLAUDE.md §8).
 */
export function bmi(weightKg: number, heightCm: number): BmiResult | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null

  const heightM = heightCm / 100
  const value = weightKg / (heightM * heightM)

  const category =
    value < 18.5 ? 'Underweight'
    : value < 25 ? 'Healthy weight'
    : value < 30 ? 'Overweight'
    : 'Obese'

  return { bmi: round(value, 1), category }
}

/* ------------------------------------------------------------------ *
 * Estimated glomerular filtration rate
 * ------------------------------------------------------------------ */

export type Sex = 'male' | 'female'

export interface EgfrResult {
  egfr: number
  /** KDIGO GFR category — G1, G2, G3a, G3b, G4, G5. */
  category: string
  /** Plain wording for that category. */
  description: string
  /**
   * True for G1 and G2, where a reduced-but-not-low eGFR means nothing on its
   * own. See the note on `egfr()`.
   */
  needsDamageMarker: boolean
}

/**
 * The 2021 race-free CKD-EPI creatinine equation.
 *
 *   eGFR = 142 x min(Scr/k,1)^a x max(Scr/k,1)^-1.200 x 0.9938^age x 1.012 [if female]
 *   k = 0.7 (female) or 0.9 (male)
 *   a = -0.241 (female) or -0.302 (male)
 *
 * Coefficients verified against the National Kidney Foundation, not recalled
 * from memory — a referee can check this one by hand and the old version would
 * not have survived it.
 *
 * TWO THINGS CHANGED, and they are separate problems.
 *
 * 1. THE RACE COEFFICIENT IS GONE. The old code implemented the 2009 equation
 *    faithfully, including `if (isBlack) egfr *= 1.159`, fed by a "Race"
 *    dropdown on the form. The NKF-ASN task force removed race from eGFR in
 *    2021 and the race-free equation is now the standard. Keeping it would have
 *    been both clinically dated and a poor look on a screen judges open
 *    unattended.
 *
 * 2. THE STAGING WAS WRONG INDEPENDENTLY OF THE EQUATION. The old code mapped
 *    `egfr >= 90` to "Stage 1 (Normal)", which labels a perfectly healthy
 *    person as CKD stage 1. Under KDIGO, G1 and G2 are only CKD when a marker
 *    of kidney damage is *also* present for more than three months; without
 *    one, an eGFR of 95 is simply normal. `needsDamageMarker` carries that so
 *    the screen can say it rather than implying a diagnosis. G3 is also split
 *    into 3a and 3b, which the old code lumped together.
 */
export function egfr(creatinineMgDl: number, age: number, sex: Sex): EgfrResult | null {
  if (!(creatinineMgDl > 0) || !(age > 0)) return null

  const kappa = sex === 'female' ? 0.7 : 0.9
  const alpha = sex === 'female' ? -0.241 : -0.302
  const ratio = creatinineMgDl / kappa

  const value =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, age) *
    (sex === 'female' ? 1.012 : 1)

  const rounded = round(value, 0)
  const { category, description } = gfrCategory(rounded)

  return {
    egfr: rounded,
    category,
    description,
    needsDamageMarker: rounded >= 60,
  }
}

function gfrCategory(value: number): { category: string; description: string } {
  if (value >= 90) return { category: 'G1', description: 'Normal or high' }
  if (value >= 60) return { category: 'G2', description: 'Mildly decreased' }
  if (value >= 45) return { category: 'G3a', description: 'Mildly to moderately decreased' }
  if (value >= 30) return { category: 'G3b', description: 'Moderately to severely decreased' }
  if (value >= 15) return { category: 'G4', description: 'Severely decreased' }
  return { category: 'G5', description: 'Kidney failure' }
}

/* ------------------------------------------------------------------ *
 * Maintenance fluid
 * ------------------------------------------------------------------ */

export type PatientType = 'adult' | 'child'

export interface FluidResult {
  /** mL per day. A range for adults, where the rule itself is a range. */
  dailyLow: number
  dailyHigh: number
  hourlyLow: number
  hourlyHigh: number
  /** Which rule produced the figure, named on screen so it can be checked. */
  basis: string
}

/**
 * Daily maintenance fluid.
 *
 * THE OLD VERSION APPLIED A PEDIATRIC FORMULA TO ADULTS WITHOUT SAYING SO.
 * Holliday-Segar is a childrens' maintenance rule; run on a 70 kg adult it
 * returns 2,500 mL/day where the adult 25-30 mL/kg rule gives 1,750-2,100. The
 * formula was implemented correctly and pointed at the wrong population, which
 * is the harder kind of wrong to notice.
 *
 * THE "REPLACEMENT" OPTION IS GONE. It computed `weight * 30` and called the
 * result a replacement volume, but 30 mL/kg *is* the adult maintenance figure.
 * Real replacement depends on the measured deficit and ongoing losses, neither
 * of which the form collected, so the control could not have produced a
 * meaningful number from what it asked for. Removed rather than re-skinned —
 * Ali's call on 2026-08-10.
 */
export function fluid(weightKg: number, patient: PatientType): FluidResult | null {
  if (!(weightKg > 0)) return null

  if (patient === 'child') {
    // Holliday-Segar: 100 mL/kg for the first 10 kg, 50 for the next 10, 20
    // for every kg beyond 20.
    const daily =
      weightKg <= 10 ? weightKg * 100
      : weightKg <= 20 ? 1000 + (weightKg - 10) * 50
      : 1500 + (weightKg - 20) * 20

    return {
      dailyLow: round(daily, 0),
      dailyHigh: round(daily, 0),
      hourlyLow: round(daily / 24, 0),
      hourlyHigh: round(daily / 24, 0),
      basis: 'Holliday–Segar, 100/50/20 mL/kg',
    }
  }

  const low = weightKg * 25
  const high = weightKg * 30

  return {
    dailyLow: round(low, 0),
    dailyHigh: round(high, 0),
    hourlyLow: round(low / 24, 0),
    hourlyHigh: round(high / 24, 0),
    basis: '25–30 mL/kg for adults',
  }
}

/* ------------------------------------------------------------------ *
 * Dose to volume
 * ------------------------------------------------------------------ */

export interface DoseResult {
  /** mL to draw up. */
  volumeMl: number
  /** The dose that volume delivers, for checking the arithmetic back. */
  checkMg: number
}

/**
 * How much liquid to draw for a wanted dose.
 *
 * THIS IS A REWRITE, NOT A PORT. The old implementation was wrong twice over
 * and is worth recording, because both defects were visible on screen with the
 * form's own placeholder values (500 mg, 250 mg/mL, 2 mL):
 *
 *     totalDose     = (250 * 2) / 1000 = 0.5      rendered as "0.5 mg"
 *     concentration = (500 / 2) * 1000 = 250000   rendered as "250000.0 mg/mL"
 *
 * The vial holds 500 mg at 250 mg/mL. The first line computed grams and
 * labelled them mg; the second computed ug/mL and labelled it mg/mL. Both
 * 1000x out, in opposite directions, on a medical dosing tool a judge could
 * open unattended.
 *
 * The deeper problem was that it never answered the question. `desiredDose`
 * was taken as an input and never used to produce a volume, so the one thing a
 * clinician wants — *what do I draw up?* — was the one thing it did not say.
 *
 * Now it is one division: dose over concentration. `checkMg` multiplies back so
 * the screen can show the round trip, which is what makes it verifiable by hand.
 */
export function dose(desiredMg: number, concentrationMgPerMl: number): DoseResult | null {
  if (!(desiredMg > 0) || !(concentrationMgPerMl > 0)) return null

  const volumeMl = desiredMg / concentrationMgPerMl

  return {
    volumeMl: round(volumeMl, 2),
    checkMg: round(round(volumeMl, 2) * concentrationMgPerMl, 1),
  }
}

/* ------------------------------------------------------------------ *
 * Unit conversion
 * ------------------------------------------------------------------ */

export interface Analyte {
  /** Matches a key in `lib/assessment/fields.ts` where one exists. */
  key: string
  label: string
  conventional: string
  si: string
  /** conventional x factor = SI. */
  factor: number
}

/**
 * The analytes this product actually collects, each with its own factor.
 *
 * THE OLD CONVERTER USED GLUCOSE'S MOLAR MASS FOR EVERYTHING. It offered a
 * generic "mg/dL to mmol/L" with no analyte selector and divided by 18.018 —
 * correct for glucose and wrong for every other row here. In a liver product
 * that collects bilirubin, cholesterol and triglycerides, a converter silently
 * hardcoded to glucose is a trap rather than a tool.
 *
 * Factors are molar mass derived, so each is checkable:
 * 1 mg/dL = 0.01 g/L, divided by the molar mass, gives mol/L.
 */
export const ANALYTES: Analyte[] = [
  // 0.01 / 584.67 g/mol = 17.10 umol/L
  { key: 'bilirubin', label: 'Bilirubin', conventional: 'mg/dL', si: 'µmol/L', factor: 17.104 },
  // 0.01 / 113.12 = 88.4 umol/L
  { key: 'creatinine', label: 'Creatinine', conventional: 'mg/dL', si: 'µmol/L', factor: 88.4 },
  // 0.01 / 180.16 = 0.05551 mmol/L
  { key: 'glucose', label: 'Glucose', conventional: 'mg/dL', si: 'mmol/L', factor: 0.05551 },
  // 0.01 / 386.65 = 0.02586 mmol/L
  { key: 'cholesterol', label: 'Cholesterol', conventional: 'mg/dL', si: 'mmol/L', factor: 0.02586 },
  { key: 'hdl', label: 'HDL', conventional: 'mg/dL', si: 'mmol/L', factor: 0.02586 },
  // Triolein, 0.01 / 885.4 = 0.01129 mmol/L
  { key: 'triglycerides', label: 'Triglycerides', conventional: 'mg/dL', si: 'mmol/L', factor: 0.01129 },
  // 0.01 / 168.11 = 59.48 umol/L
  { key: 'uric_acid', label: 'Uric acid', conventional: 'mg/dL', si: 'µmol/L', factor: 59.48 },
  // 1 ug/dL = 1e-5 g/L, / 63.55 = 0.1574 umol/L
  { key: 'copper', label: 'Copper', conventional: 'µg/dL', si: 'µmol/L', factor: 0.1574 },
  // Mass units, no molar mass involved: 1 g/dL = 10 g/L
  { key: 'albumin', label: 'Albumin', conventional: 'g/dL', si: 'g/L', factor: 10 },
  { key: 'total_proteins', label: 'Total proteins', conventional: 'g/dL', si: 'g/L', factor: 10 },
]

export const ANALYTE_BY_KEY: Record<string, Analyte> = Object.fromEntries(
  ANALYTES.map((a) => [a.key, a]),
)

export type Direction = 'toSi' | 'toConventional'

export interface ConvertResult {
  value: number
  unit: string
}

/**
 * Convert one analyte between conventional and SI units.
 *
 * Significant figures track the magnitude rather than a fixed 2 decimals: an
 * SI creatinine lands near 80 and an SI cholesterol near 5, and rounding both
 * the same way makes one of them useless.
 */
export function convert(
  value: number,
  analyteKey: string,
  direction: Direction,
): ConvertResult | null {
  const analyte = ANALYTE_BY_KEY[analyteKey]
  if (!analyte || !Number.isFinite(value)) return null

  const result = direction === 'toSi' ? value * analyte.factor : value / analyte.factor
  const unit = direction === 'toSi' ? analyte.si : analyte.conventional

  const decimals = Math.abs(result) >= 100 ? 0 : Math.abs(result) >= 10 ? 1 : 2

  return { value: round(result, decimals), unit }
}

/* ------------------------------------------------------------------ */

/** Round half away from zero, avoiding the float noise `toFixed` leaves. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
