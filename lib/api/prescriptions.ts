export interface Medication {
  id: number
  trade_name: string
  generic_name: string
  category: string
  dosage_forms: string[]
  default_dose: string
  default_freq: string
  timing: string
  notes_ar: string
  liver_warning: string | null
  is_liver_safe: boolean
  common_in_iraq: boolean
}

export interface PrescriptionItemInput {
  medication_id?: number | null
  medication_name: string
  generic_name?: string
  dose: string
  frequency: string
  timing?: string
  duration?: string
  instructions_ar?: string
}

export interface PrescriptionItem extends PrescriptionItemInput {
  id: number
}

export interface PrescriptionSummary {
  id: number
  prescription_number: string
  patient_id: number
  patient_name: string
  patient_code: string
  patient_birth_date?: string | null
  patient_phone?: string | null
  doctor_id?: number
  doctor_name: string
  diagnosis?: string
  notes?: string
  follow_up_date?: string
  status: string
  item_count: number
  created_at: string
}

export interface FullPrescription extends PrescriptionSummary {
  items: PrescriptionItem[]
}

export interface CreatePrescriptionPayload {
  patient_id: number
  diagnosis?: string
  notes?: string
  follow_up_date?: string
  items: PrescriptionItemInput[]
}

// ── Built-in Clinical Protocols ──
export interface PrescriptionProtocol {
  id: string
  name_en: string
  name_ar: string
  description_ar: string
  diagnosis: string
  follow_up: string
  items: PrescriptionItemInput[]
}

export const CLINICAL_PROTOCOLS: PrescriptionProtocol[] = [
  {
    id: "fatty-liver",
    name_en: "NAFLD / Fatty Liver Protocol",
    name_ar: "NAFLD Protocol",
    description_ar: "Antioxidants, lifestyle modification, and hepatocyte cytoprotection",
    diagnosis: "Non-Alcoholic Fatty Liver Disease (NAFLD)",
    follow_up: "After 2 months with repeat LFT & Ultrasound",
    items: [
      {
        medication_name: "Ursofalk",
        generic_name: "Ursodeoxycholic Acid",
        dose: "250mg",
        frequency: "BID (Twice daily)",
        timing: "After meals",
        duration: "2 months",
        instructions_ar: "Take with water after meals. Cytoprotective and reduces hepatic fat accumulation.",
      },
      {
        medication_name: "Legalon (Silymarin)",
        generic_name: "Milk Thistle Extract / Silymarin",
        dose: "140mg",
        frequency: "TDS (Three times daily)",
        timing: "After meals",
        duration: "2 months",
        instructions_ar: "Antioxidant therapy to protect and regenerate hepatocytes.",
      },
      {
        medication_name: "Neurobion (B1+B6+B12)",
        generic_name: "Vitamin B-Complex",
        dose: "1 tablet",
        frequency: "QD (Once daily)",
        timing: "After breakfast",
        duration: "1 month",
        instructions_ar: "Neurometabolic support and general metabolism stimulation.",
      },
    ],
  },
  {
    id: "ascites-cirrhosis",
    name_en: "Cirrhosis & Ascites Diuretic Protocol",
    name_ar: "Ascites Diuretic Protocol",
    description_ar: "Spironolactone and Furosemide in 100:40 ratio with sodium restriction",
    diagnosis: "Decompensated Liver Cirrhosis with Ascites",
    follow_up: "After 2 weeks to monitor weight, electrolytes, and renal function",
    items: [
      {
        medication_name: "Aldactone (Spironolactone)",
        generic_name: "Spironolactone",
        dose: "100mg",
        frequency: "QD (Once daily in morning)",
        timing: "After breakfast",
        duration: "1 month",
        instructions_ar: "Potassium-sparing diuretic, baseline therapy with low-salt diet.",
      },
      {
        medication_name: "Lasix",
        generic_name: "Furosemide",
        dose: "40mg",
        frequency: "QD (Once daily in morning)",
        timing: "After breakfast",
        duration: "1 month",
        instructions_ar: "Loop diuretic adjunct to Aldactone; take in morning only.",
      },
      {
        medication_name: "Duphalac (Lactulose)",
        generic_name: "Lactulose Syrup",
        dose: "25ml",
        frequency: "BID (Twice daily)",
        timing: "After meals",
        duration: "Continuous",
        instructions_ar: "Encephalopathy prophylaxis; titrate to achieve 2-3 soft stools daily.",
      },
    ],
  },
  {
    id: "hepatic-encephalopathy",
    name_en: "Hepatic Encephalopathy Prophylaxis",
    name_ar: "Hepatic Encephalopathy Prophylaxis",
    description_ar: "Rifaximin, Lactulose, and LOLA for ammonia lowering",
    diagnosis: "Minimal/Overt Hepatic Encephalopathy",
    follow_up: "After 10 days",
    items: [
      {
        medication_name: "Normix (Rifaximin)",
        generic_name: "Rifaximin",
        dose: "550mg",
        frequency: "BID (Twice daily)",
        timing: "After meals",
        duration: "1 month",
        instructions_ar: "Non-absorbable gut antibiotic to reduce ammonia production.",
      },
      {
        medication_name: "Duphalac (Lactulose)",
        generic_name: "Lactulose Syrup",
        dose: "30ml",
        frequency: "TDS (Three times daily)",
        timing: "After meals",
        duration: "Continuous",
        instructions_ar: "Titrate dosage to maintain 2-3 soft bowel movements daily.",
      },
      {
        medication_name: "Hepamerz",
        generic_name: "L-Ornithine L-Aspartate",
        dose: "3g sachet",
        frequency: "TDS (Three times daily)",
        timing: "After meals",
        duration: "14 days",
        instructions_ar: "Dissolve sachet in half a glass of water after meals.",
      },
    ],
  },
  {
    id: "hcv-treatment",
    name_en: "Chronic HCV Antiviral Therapy (12 Weeks)",
    name_ar: "HCV Antiviral Protocol",
    description_ar: "Sofosbuvir + Daclatasvir 12-week course (>95% cure rate)",
    diagnosis: "Chronic Hepatitis C Infection (HCV)",
    follow_up: "After 4 weeks for CBC and LFT evaluation",
    items: [
      {
        medication_name: "Sovaldi / Sofosbuvir",
        generic_name: "Sofosbuvir",
        dose: "400mg",
        frequency: "QD (Once daily)",
        timing: "With meals at the exact same hour",
        duration: "84 days (12 weeks)",
        instructions_ar: "Take 1 tablet daily without interruption at the exact same hour.",
      },
      {
        medication_name: "Daklinza / Daclatasvir",
        generic_name: "Daclatasvir",
        dose: "60mg",
        frequency: "QD (Once daily)",
        timing: "With meals concomitantly with Sofosbuvir",
        duration: "84 days (12 weeks)",
        instructions_ar: "Take together with Sofosbuvir tablet once daily.",
      },
    ],
  },
  {
    id: "pud-gastroprotection",
    name_en: "Gastroprotection & Acid Suppression",
    name_ar: "Gastroprotection Protocol",
    description_ar: "Pantoprazole therapeutic dose",
    diagnosis: "GERD / Gastritis / Peptic Ulcer",
    follow_up: "After 1 month",
    items: [
      {
        medication_name: "Controloc / Pantodar (Pantoprazole)",
        generic_name: "Pantoprazole",
        dose: "40mg",
        frequency: "QD (Once daily in morning)",
        timing: "30 min before breakfast",
        duration: "1 month",
        instructions_ar: "Swallow whole tablet on empty stomach 30 minutes before breakfast.",
      },
    ],
  },
]

// ── Client fetch helpers ──

export async function fetchMedications(params?: { q?: string; category?: string }): Promise<Medication[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set("q", params.q)
  if (params?.category) query.set("category", params.category)

  const res = await fetch(`/api/medications${query.toString() ? `?${query.toString()}` : ""}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Failed to load medications (${res.status})`)
  }
  const data = await res.json()
  return data.medications || []
}

export async function fetchPrescriptions(patientId?: number): Promise<PrescriptionSummary[]> {
  const url = patientId ? `/api/prescriptions?patient_id=${patientId}` : "/api/prescriptions"
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Failed to load prescriptions (${res.status})`)
  }
  const data = await res.json()
  return data.prescriptions || []
}

export async function fetchPrescriptionById(id: number): Promise<FullPrescription> {
  const res = await fetch(`/api/prescriptions/${id}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Failed to load prescription #${id} (${res.status})`)
  }
  const data = await res.json()
  return data.prescription
}

export async function createPrescription(payload: CreatePrescriptionPayload): Promise<{
  success: boolean
  prescription_id: number
  prescription_number: string
}> {
  const res = await fetch("/api/prescriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Failed to create prescription (${res.status})`)
  }
  return res.json()
}

export async function deletePrescription(id: number): Promise<void> {
  const res = await fetch(`/api/prescriptions/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    throw new Error(`Failed to delete prescription #${id}`)
  }
}
