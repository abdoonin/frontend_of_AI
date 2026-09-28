export interface ClinicalNote {
  id: number
  patient_id: number
  patient_name: string
  patient_code: string
  patient_birth_date?: string | null
  patient_phone?: string | null
  doctor_id?: number | null
  doctor_name: string
  visit_date: string
  visit_type: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  blood_pressure?: string
  heart_rate?: number | null
  weight?: number | null
  temperature?: number | null
  jaundice: string
  ascites: string
  edema: string
  hepatomegaly: boolean
  splenomegaly: boolean
  spider_angioma: boolean
  asterixis: boolean
  follow_up_date?: string | null
  created_at: string
  updated_at?: string | null
}

export interface ClinicalNoteCreatePayload {
  patient_id: number
  visit_type?: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  blood_pressure?: string
  heart_rate?: number | null
  weight?: number | null
  temperature?: number | null
  jaundice?: string
  ascites?: string
  edema?: string
  hepatomegaly?: number
  splenomegaly?: number
  spider_angioma?: number
  asterixis?: number
  follow_up_date?: string | null
}

export interface ChronicCondition {
  name: string
  status?: "active" | "managed" | "resolved"
  notes?: string
  diagnosed_year?: string
}

// ── Quick Pick Presets for Fast Clinical Documentation ──

export const CHIEF_COMPLAINT_PRESETS = [
  { label: "RUQ Abdominal Pain", en: "Right Upper Quadrant Abdominal Pain" },
  { label: "Scleral Icterus / Jaundice", en: "Scleral Icterus & Jaundice" },
  { label: "Severe Pruritus", en: "Persistent Severe Pruritus (Itching)" },
  { label: "Abdominal Distension", en: "Abdominal Distension / Suspected Ascites" },
  { label: "Lower Limb Edema", en: "Bilateral Lower Extremity Edema" },
  { label: "Fatigue & Malaise", en: "Chronic Generalized Fatigue & Malaise" },
  { label: "Anorexia & Weight Loss", en: "Loss of Appetite & Unintentional Weight Loss" },
  { label: "Nausea & Vomiting", en: "Recurrent Nausea & Episodic Vomiting" },
  { label: "Easy Bruising", en: "Easy Bruising & Spontaneous Gum Bleeding" },
  { label: "Confusion / Lethargy", en: "Mental Confusion & Sleep Cycle Inversion" },
  { label: "Routine Follow-up", en: "Routine Scheduled Follow-up Examination" },
]

export const PHYSICAL_EXAM_PRESETS = [
  { label: "Scleral Icterus", text: "Evident scleral icterus on examination" },
  { label: "Palmar Erythema", text: "Bilateral prominent palmar erythema present" },
  { label: "Spider Angiomas", text: "Multiple spider angiomas on upper thorax and neck" },
  { label: "Hepatomegaly", text: "Hepatomegaly palpable 2 cm below right costal margin" },
  { label: "Splenomegaly", text: "Splenomegaly palpable on deep inspiration" },
  { label: "Shifting Dullness", text: "Positive shifting dullness indicating peritoneal ascites" },
  { label: "Pitting Edema +2", text: "Bilateral +2 pitting edema up to mid-tibia" },
  { label: "Asterixis (+)", text: "Positive asterixis (grade 1 hepatic encephalopathy)" },
  { label: "Soft Abdomen", text: "Abdomen soft, non-tender, no guarding or rigidity" },
]

export const CHRONIC_CONDITIONS_CATALOG = [
  { name: "Type 2 Diabetes Mellitus", default_notes: "Metformin / Insulin" },
  { name: "Systemic Hypertension", default_notes: "Amlodipine / ARB" },
  { name: "Chronic Hepatitis C (HCV)", default_notes: "SVR achieved / on follow-up" },
  { name: "Chronic Hepatitis B (HBV)", default_notes: "On Tenofovir / Entecavir" },
  { name: "MASLD / NAFLD (Fatty Liver)", default_notes: "Diet & Lifestyle modification" },
  { name: "Coronary Artery Disease", default_notes: "Cardiology follow-up" },
  { name: "Chronic Kidney Disease", default_notes: "eGFR & Creatinine monitoring" },
  { name: "Thalassemia Trait", default_notes: "Hemoglobinopathy follow-up" },
  { name: "Hypothyroidism", default_notes: "Levothyroxine therapy" },
  { name: "Dyslipidemia", default_notes: "Statin therapy" },
]

// ── API Functions ──

export async function fetchClinicalNotes(
  patientId?: number | string,
  limit = 100,
): Promise<ClinicalNote[]> {
  const query = new URLSearchParams()
  if (patientId) query.set("patient_id", String(patientId))
  if (limit) query.set("limit", String(limit))

  const res = await fetch(`/api/clinical-notes?${query.toString()}`)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to load clinical notes")
  }
  const data = await res.json()
  return data.notes || []
}

export async function fetchClinicalNote(id: number): Promise<ClinicalNote> {
  const res = await fetch(`/api/clinical-notes/${id}`)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to load clinical note")
  }
  const data = await res.json()
  return data.note
}

export async function createClinicalNote(
  payload: ClinicalNoteCreatePayload,
): Promise<ClinicalNote> {
  const res = await fetch("/api/clinical-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to create clinical note")
  }

  const data = await res.json()
  return data.note
}

export async function updateClinicalNote(
  id: number,
  payload: Partial<ClinicalNoteCreatePayload>,
): Promise<ClinicalNote> {
  const res = await fetch(`/api/clinical-notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to update clinical note")
  }

  const data = await res.json()
  return data.note
}

export async function deleteClinicalNote(id: number): Promise<void> {
  const res = await fetch(`/api/clinical-notes/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to delete clinical note")
  }
}

export async function fetchPatientChronicConditions(
  patientId: number | string,
): Promise<ChronicCondition[]> {
  const res = await fetch(`/api/patients/${patientId}/chronic-conditions`)
  if (!res.ok) {
    return []
  }
  const data = await res.json()
  return data.conditions || []
}

export async function updatePatientChronicConditions(
  patientId: number | string,
  conditions: ChronicCondition[],
): Promise<ChronicCondition[]> {
  const res = await fetch(`/api/patients/${patientId}/chronic-conditions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conditions }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to save chronic conditions")
  }

  const data = await res.json()
  return data.conditions || []
}
