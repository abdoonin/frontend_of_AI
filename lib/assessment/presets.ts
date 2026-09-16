/**
 * Sample cases, for demonstration.
 *
 * Lifted from the inline objects in `ai-radiology-scan.tsx:1455-1495`. These
 * are the single most valuable feature for a self-service judge: one tap
 * replaces typing thirty clinical values on a phone. They must always be
 * labelled as sample data on screen — they are not patient records.
 *
 * Two corrections against the originals, both recorded in PROJECT_STATE.md:
 *
 *  - `alp` in the normal case is 150, which IS above the 44–147 reference
 *    range — and it is left alone deliberately. Changing it to 95 was tried
 *    and REVERTED: the gate model classifies the original values as healthy
 *    and the "corrected" ones as not healthy. Its boundary is learned, not a
 *    threshold check, and it does not track reference ranges. This preset is
 *    the only sample case that reaches the healthy screen. (B-21)
 *  - `inr` has been dropped. It appeared in all three presets but no model
 *    consumes it and the form had no field for it — dead data.
 */

import { FIELD_KEYS } from './fields'

export interface Preset {
  id: 'normal' | 'moderate' | 'high'
  label: string
  values: Record<string, string>
}

export const PRESETS: Preset[] = [
  {
    id: 'normal',
    label: 'Normal values',
    values: {
      age: '25', gender: 'Male', bmi: '24', smoking: 'No', alcohol: 'Low',
      activity: 'Moderate', genetic_risk: 'Low', cancer_history: 'No',
      ascites: 'No', hepatomegaly: 'No', spiders: 'No', edema: 'None',
      bilirubin: '0.7', bilirubin_direct: '0.1', cholesterol: '180', albumin: '4.0',
      copper: '110', alp: '150', alt: '20', ast: '22', total_proteins: '7.5',
      ag_ratio: '1.10', platelets: '280000', prothrombin: '12.5', creatinine: '0.9',
      glucose: '95', ggt: '40', triglycerides: '140', uric_acid: '4.5', hdl: '55',
    },
  },
  {
    id: 'moderate',
    label: 'Moderate risk',
    values: {
      age: '35', gender: 'Female', bmi: '28', smoking: 'No', alcohol: 'Moderate',
      activity: 'Moderate', genetic_risk: 'Medium', cancer_history: 'No',
      ascites: 'No', hepatomegaly: 'Yes', spiders: 'No', edema: 'Slight',
      bilirubin: '1.8', bilirubin_direct: '0.2', cholesterol: '210', albumin: '3.8',
      copper: '130', alp: '105', alt: '85', ast: '65', total_proteins: '7.0',
      ag_ratio: '1.0', platelets: '220000', prothrombin: '13.8', creatinine: '0.8',
      glucose: '105', ggt: '95', triglycerides: '165', uric_acid: '5.2', hdl: '48',
    },
  },
  {
    id: 'high',
    label: 'High risk',
    values: {
      age: '55', gender: 'Male', bmi: '32', smoking: 'Yes', alcohol: 'High',
      activity: 'Low', genetic_risk: 'High', cancer_history: 'Yes',
      ascites: 'Yes', hepatomegaly: 'Yes', spiders: 'Yes', edema: 'Severe',
      bilirubin: '2.8', bilirubin_direct: '1.4', cholesterol: '280', albumin: '3.2',
      copper: '180', alp: '140', alt: '120', ast: '85', total_proteins: '6.8',
      ag_ratio: '0.8', platelets: '180000', prothrombin: '15.5', creatinine: '1.4',
      glucose: '140', ggt: '180', triglycerides: '220', uric_acid: '7.2', hdl: '35',
    },
  },
]

export const PRESET_BY_ID: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
)

/**
 * Every preset must cover every declared field, or a "sample data" tap leaves
 * a model unable to run. Exported so a test — or the dev console — can assert
 * it rather than trusting the tables above stay in step with `fields.ts`.
 */
export function presetGaps(preset: Preset): string[] {
  return FIELD_KEYS.filter((k) => !preset.values[k] || preset.values[k].trim() === '')
}
