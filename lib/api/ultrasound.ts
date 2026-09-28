/**
 * Liver Ultrasound, FibroScan & Abdominal Imaging API client
 * Phase 5: Ultrasound & Imaging Documentation
 */

export interface UltrasoundExam {
  id: number
  patient_id: number
  patient_name: string
  patient_code: string
  doctor_id?: number | null
  doctor_name: string
  exam_date: string
  exam_type: 'ultrasound' | 'fibroscan' | 'ct' | 'mri'
  liver_size: string
  echogenicity: string
  surface_contour: string
  portal_vein_mm?: number | null
  portal_flow: string
  spleen_size_cm?: number | null
  ascites: string
  focal_lesion: string
  focal_lesion_desc: string
  gallbladder: string
  cbd_diameter_mm?: number | null
  fibroscan_kpa?: number | null
  fibroscan_cap?: number | null
  fibrosis_stage: string
  steatosis_grade: string
  impression: string
  recommendations: string
  image_urls: string[]
  created_at: string
  updated_at?: string | null
}

export interface UltrasoundExamInput {
  patient_id: number
  exam_date?: string
  exam_type?: string
  liver_size?: string
  echogenicity?: string
  surface_contour?: string
  portal_vein_mm?: number | null
  portal_flow?: string
  spleen_size_cm?: number | null
  ascites?: string
  focal_lesion?: string
  focal_lesion_desc?: string
  gallbladder?: string
  cbd_diameter_mm?: number | null
  fibroscan_kpa?: number | null
  fibroscan_cap?: number | null
  fibrosis_stage?: string
  steatosis_grade?: string
  impression?: string
  recommendations?: string
  image_urls?: string[]
}

// ── Preset Templates for Rapid 10-Second Documentation ──

export interface ExamPreset {
  id: string
  title: string
  badge: string
  description: string
  data: Partial<UltrasoundExamInput>
}

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'normal',
    title: 'Normal Liver Ultrasound',
    badge: 'Normal',
    description: 'Normal size, homogenous parenchymal echogenicity, normal portal vein & spleen',
    data: {
      exam_type: 'ultrasound',
      liver_size: 'Normal',
      echogenicity: 'Normal',
      surface_contour: 'Smooth',
      portal_vein_mm: 10.5,
      portal_flow: 'Normal',
      spleen_size_cm: 10.2,
      ascites: 'None',
      focal_lesion: 'None',
      focal_lesion_desc: '',
      gallbladder: 'Normal',
      cbd_diameter_mm: 4.5,
      impression: 'Unremarkable abdominal ultrasound. Normal liver size and echotexture with no focal lesions or signs of portal hypertension.',
      recommendations: 'Routine surveillance as clinically indicated.',
    },
  },
  {
    id: 'fatty-grade-2',
    title: 'Hepatic Steatosis (Grade II)',
    badge: 'Steatosis',
    description: 'Diffuse increased echogenicity with posterior beam attenuation, moderate fatty liver',
    data: {
      exam_type: 'ultrasound',
      liver_size: 'Hepatomegaly',
      echogenicity: 'Grade II Moderate Fatty',
      surface_contour: 'Smooth',
      portal_vein_mm: 11.2,
      portal_flow: 'Normal',
      spleen_size_cm: 11.5,
      ascites: 'None',
      focal_lesion: 'None',
      focal_lesion_desc: '',
      gallbladder: 'Normal',
      cbd_diameter_mm: 5.0,
      fibroscan_cap: 285,
      steatosis_grade: 'S3 (Severe)',
      fibroscan_kpa: 6.2,
      fibrosis_stage: 'F0-F1',
      impression: 'Diffuse hepatic steatosis (Moderate to Severe Grade II-III) with mild hepatomegaly. No focal liver lesions or ascites identified.',
      recommendations: 'Metabolic evaluation, dietary weight management, and repeat ultrasound/FibroScan in 6-12 months.',
    },
  },
  {
    id: 'cirrhosis-phtn',
    title: 'Cirrhosis + Portal HTN',
    badge: 'Cirrhosis',
    description: 'Coarse parenchymal texture, nodular surface, dilated portal vein & splenomegaly',
    data: {
      exam_type: 'ultrasound',
      liver_size: 'Shrunken / Atrophic',
      echogenicity: 'Coarse / Cirrhotic',
      surface_contour: 'Irregular / Nodular',
      portal_vein_mm: 14.8,
      portal_flow: 'Slowed',
      spleen_size_cm: 15.4,
      ascites: 'Moderate',
      focal_lesion: 'None',
      focal_lesion_desc: 'No discrete mass suspicious for HCC identified on current view.',
      gallbladder: 'Thickened Wall',
      cbd_diameter_mm: 5.8,
      fibroscan_kpa: 19.5,
      fibrosis_stage: 'F4 (Cirrhosis)',
      impression: 'Ultrasound features consistent with established liver cirrhosis, portal hypertension (dilated portal vein & splenomegaly), and moderate ascites.',
      recommendations: 'Diagnostic paracentesis if indicated, upper GI endoscopy for variceal screening, and HCC surveillance (AFP + US every 6 months).',
    },
  },
  {
    id: 'hcc-surveillance',
    title: 'Suspicious Focal Lesion / HCC Screening',
    badge: 'Surveillance',
    description: 'Coarse liver background with focal nodule requiring contrast characterization',
    data: {
      exam_type: 'ultrasound',
      liver_size: 'Normal',
      echogenicity: 'Coarse / Cirrhotic',
      surface_contour: 'Irregular / Nodular',
      portal_vein_mm: 12.8,
      portal_flow: 'Normal',
      spleen_size_cm: 12.6,
      ascites: 'Trace / Mild',
      focal_lesion: 'Suspicious HCC',
      focal_lesion_desc: 'Well-circumscribed 2.4 x 2.1 cm hypoechoic nodule identified in liver segment VI with peripheral halo.',
      gallbladder: 'Normal',
      cbd_diameter_mm: 5.2,
      fibroscan_kpa: 14.0,
      fibrosis_stage: 'F4 (Cirrhosis)',
      impression: 'Cirrhotic liver architecture with a solitary 2.4 cm suspicious solid nodule in segment VI, concerning for Hepatocellular Carcinoma (HCC).',
      recommendations: 'Urgent multiphase contrast-enhanced CT / dynamic MRI liver protocol, and serum Alpha-Fetoprotein (AFP) level.',
    },
  },
]

// ── FibroScan / Elastography Helpers ──

export function getFibrosisInfo(kpa: number | null | undefined): { stage: string; tag: string; color: string; desc: string } {
  if (kpa === null || kpa === undefined || isNaN(kpa) || kpa <= 0) {
    return { stage: '—', tag: 'Not done', color: 'var(--ink-muted)', desc: 'No elastography recorded' }
  }
  if (kpa < 7.0) {
    return { stage: 'F0 - F1', tag: 'Minimal / Mild', color: 'var(--normal, #10b981)', desc: 'No significant liver fibrosis (< 7.0 kPa)' }
  }
  if (kpa < 9.5) {
    return { stage: 'F2', tag: 'Moderate Fibrosis', color: 'var(--warning, #f59e0b)', desc: 'Clinically significant fibrosis (7.0 - 9.4 kPa)' }
  }
  if (kpa < 12.5) {
    return { stage: 'F3', tag: 'Severe Fibrosis', color: 'var(--accent, #f97316)', desc: 'Advanced bridging fibrosis (9.5 - 12.4 kPa)' }
  }
  return { stage: 'F4 (Cirrhosis)', tag: 'Cirrhosis', color: 'var(--critical, #ef4444)', desc: 'High probability of liver cirrhosis (>= 12.5 kPa)' }
}

export function getSteatosisInfo(cap: number | null | undefined): { grade: string; tag: string; color: string; desc: string } {
  if (cap === null || cap === undefined || isNaN(cap) || cap <= 0) {
    return { grade: '—', tag: 'Not done', color: 'var(--ink-muted)', desc: 'No CAP measured' }
  }
  if (cap < 248) {
    return { grade: 'S0', tag: 'Normal', color: 'var(--normal, #10b981)', desc: 'Normal hepatic fat content (< 248 dB/m)' }
  }
  if (cap < 268) {
    return { grade: 'S1', tag: 'Mild Steatosis', color: 'var(--warning, #f59e0b)', desc: 'Mild fatty infiltration 11-33% (248-267 dB/m)' }
  }
  if (cap < 280) {
    return { grade: 'S2', tag: 'Moderate Steatosis', color: 'var(--accent, #f97316)', desc: 'Moderate fatty infiltration 34-66% (268-279 dB/m)' }
  }
  return { grade: 'S3', tag: 'Severe Steatosis', color: 'var(--critical, #ef4444)', desc: 'Severe fatty infiltration >66% (>= 280 dB/m)' }
}

// ── API Methods ──

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function listUltrasounds(patientId?: string | number): Promise<UltrasoundExam[]> {
  const url = new URL(`${API_BASE}/ultrasounds`)
  if (patientId !== undefined && patientId !== null && patientId !== '') {
    url.searchParams.set('patient_id', String(patientId))
  }

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Authentication required')
    throw new Error(`Failed to load ultrasound exams (${res.status})`)
  }

  const data = await res.json()
  return data.exams ?? []
}

export async function createUltrasound(payload: UltrasoundExamInput): Promise<UltrasoundExam> {
  const res = await fetch(`${API_BASE}/ultrasounds`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to create ultrasound examination (${res.status})`)
  }

  const data = await res.json()
  return data.exam
}

export async function updateUltrasound(examId: number, payload: Partial<UltrasoundExamInput>): Promise<UltrasoundExam> {
  const res = await fetch(`${API_BASE}/ultrasounds/${examId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to update ultrasound examination (${res.status})`)
  }

  const data = await res.json()
  return data.exam
}

export async function deleteUltrasound(examId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/ultrasounds/${examId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to delete exam (${res.status})`)
  }
}

export async function uploadUltrasoundFile(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/ultrasounds/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to upload image (${res.status})`)
  }

  return await res.json()
}
