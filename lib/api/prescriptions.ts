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

// ── Built-in Clinical Protocols for Iraqi Practice ──
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
    name_ar: "بروتوكول تشحم الكبد (NAFLD)",
    description_ar: "مضادات أكسدة وتعديل نمط الحياة وحماية خلايا الكبد",
    diagnosis: "Non-Alcoholic Fatty Liver Disease (NAFLD)",
    follow_up: "بعد شهرين مع إعادة وظائف الكبد والسونار",
    items: [
      {
        medication_name: "Ursofalk",
        generic_name: "Ursodeoxycholic Acid",
        dose: "250mg",
        frequency: "BID (مرتين يومياً)",
        timing: "بعد الأكل",
        duration: "شهرين",
        instructions_ar: "يؤخذ بعد الأكل مع كوب ماء، مفيد لحماية خلايا الكبد وتقليل دهون الكبد",
      },
      {
        medication_name: "Legalon (Silymarin)",
        generic_name: "Milk Thistle Extract / Silymarin",
        dose: "140mg",
        frequency: "TDS (ثلاث مرات يومياً)",
        timing: "بعد الأكل",
        duration: "شهرين",
        instructions_ar: "مضاد أكسدة لحماية وتجديد خلايا الكبد",
      },
      {
        medication_name: "Neurobion (B1+B6+B12)",
        generic_name: "Vitamin B-Complex",
        dose: "1 tablet",
        frequency: "QD (مرة يومياً)",
        timing: "بعد الفطور",
        duration: "شهر",
        instructions_ar: "دعم عصبي وتحفيز الاستقلاب العام",
      },
    ],
  },
  {
    id: "ascites-cirrhosis",
    name_en: "Cirrhosis & Ascites Diuretic Protocol",
    name_ar: "بروتوكول تليف الكبد والاستسقاء (مدرات البول)",
    description_ar: "ألداكتون ولازكس بنسبة 100:40 مع حمية قليلة الصوديوم",
    diagnosis: "Decompensated Liver Cirrhosis with Ascites",
    follow_up: "بعد أسبوعين لمتابعة الوزن والأملاح ووظائف الكلى",
    items: [
      {
        medication_name: "Aldactone (Spironolactone)",
        generic_name: "Spironolactone",
        dose: "100mg",
        frequency: "QD (مرة واحدة صباحاً)",
        timing: "بعد الإفطار",
        duration: "شهر",
        instructions_ar: "مدر بول حافظ للبوتاسيوم، خط الأساس لسحب الاستسقاء مع حمية قليلة الملح",
      },
      {
        medication_name: "Lasix",
        generic_name: "Furosemide",
        dose: "40mg",
        frequency: "QD (مرة واحدة صباحاً)",
        timing: "بعد الإفطار",
        duration: "شهر",
        instructions_ar: "مدر بول مساعد للألداكتون، يؤخذ صباحاً فقط",
      },
      {
        medication_name: "Duphalac (Lactulose)",
        generic_name: "Lactulose Syrup",
        dose: "25ml",
        frequency: "BID (مرتين يومياً)",
        timing: "بعد الأكل",
        duration: "مستمر",
        instructions_ar: "للوقاية من الغيبوبة الكبدية، تضبط الجرعة للوصول إلى خروج لين 2-3 مرات يومياً",
      },
    ],
  },
  {
    id: "hepatic-encephalopathy",
    name_en: "Hepatic Encephalopathy Prophylaxis",
    name_ar: "بروتوكول الوقاية من الاعتلال الدماغي الكبدي",
    description_ar: "ريفاكسيمين ولاكتيلوز وهيپاميرز لخفض الأمونيا",
    diagnosis: "Minimal/Overt Hepatic Encephalopathy",
    follow_up: "بعد 10 أيام",
    items: [
      {
        medication_name: "Normix (Rifaximin)",
        generic_name: "Rifaximin",
        dose: "550mg",
        frequency: "BID (مرتين يومياً)",
        timing: "بعد الأكل",
        duration: "شهر",
        instructions_ar: "مضاد بكتيريا معوية غير ممتص لتقليل إنتاج الأمونيا",
      },
      {
        medication_name: "Duphalac (Lactulose)",
        generic_name: "Lactulose Syrup",
        dose: "30ml",
        frequency: "TDS (ثلاث مرات يومياً)",
        timing: "بعد الأكل",
        duration: "مستمر",
        instructions_ar: "تعديل الجرعة للحصول على 2-3 مرات تبرز لين في اليوم",
      },
      {
        medication_name: "Hepamerz",
        generic_name: "L-Ornithine L-Aspartate",
        dose: "3g كيس",
        frequency: "TDS (ثلاث مرات يومياً)",
        timing: "بعد الأكل",
        duration: "14 يوم",
        instructions_ar: "يذاب الكيس في نصف كوب ماء بعد الوجبة",
      },
    ],
  },
  {
    id: "hcv-treatment",
    name_en: "Chronic HCV Antiviral Therapy (12 Weeks)",
    name_ar: "بروتوكول علاج التهاب الكبد الفيروسي C (12 أسبوع)",
    description_ar: "سوفوسبوفير + داكلاتاسفير كورس كامل مع نسبة شفاء تفوق 95%",
    diagnosis: "Chronic Hepatitis C Infection (HCV)",
    follow_up: "بعد 4 أسابيع لإجراء فحص CBC و LFT",
    items: [
      {
        medication_name: "Sovaldi / Sofosbuvir",
        generic_name: "Sofosbuvir",
        dose: "400mg",
        frequency: "QD (مرة واحدة يومياً)",
        timing: "مع وجبة الطعام في نفس التوقيت بدقة",
        duration: "84 يوم (12 أسبوع)",
        instructions_ar: "حبّة واحدة يومياً بدون انقطاع في نفس الساعة بالضبط",
      },
      {
        medication_name: "Daklinza / Daclatasvir",
        generic_name: "Daclatasvir",
        dose: "60mg",
        frequency: "QD (مرة واحدة يومياً)",
        timing: "مع وجبة الطعام بالتزامن مع السوفالدي",
        duration: "84 يوم (12 أسبوع)",
        instructions_ar: "تؤخذ الحبة مع حبة السوفوسبوفير معاً يومياً",
      },
    ],
  },
  {
    id: "pud-gastroprotection",
    name_en: "Gastroprotection & Acid Suppression",
    name_ar: "بروتوكول حماية المعدة والقرحة والحموضة",
    description_ar: "بانتوبرازول بجرعة علاجية",
    diagnosis: "GERD / Gastritis / Peptic Ulcer",
    follow_up: "بعد شهر",
    items: [
      {
        medication_name: "Controloc / Pantodar (Pantoprazole)",
        generic_name: "Pantoprazole",
        dose: "40mg",
        frequency: "QD (مرة واحدة صباحاً)",
        timing: "قبل الفطور بنصف ساعة",
        duration: "شهر",
        instructions_ar: "تؤخذ الحبة كاملة على معدة فارغة قبل الإفطار بـ 30 دقيقة",
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
