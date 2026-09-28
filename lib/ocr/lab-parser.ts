/**
 * Laboratory Report OCR Parser
 *
 * Extracts standardized clinical values from raw OCR text extracted from
 * lab reports (CBC, LFT, Lipid, Renal profile, etc.).
 *
 * Implements regex heuristics designed for laboratory report layouts
 * commonly issued by Iraqi and international diagnostic centers.
 */

export interface ExtractedField {
  key: string
  label: string
  value: string
  unit?: string
  confidence: number // 0-100
  matchedLine?: string
}

export interface ParseResult {
  fields: Record<string, string>
  extractedList: ExtractedField[]
  rawText: string
}

// Map of canonical assessment keys to regex patterns and aliases
const LAB_FIELD_PATTERNS: Array<{
  key: string
  label: string
  patterns: RegExp[]
  unit?: string
}> = [
  {
    key: "alt",
    label: "ALT (SGPT)",
    unit: "IU/L",
    patterns: [
      /(?:s\.?g\.?p\.?t|alt|alanine\s*(?:amino)?transferase)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /(?:alt|sgpt)[\s\S]{1,25}?([0-9]{1,4}(?:\.[0-9]+)?)\s*(?:iu\/l|u\/l)/i,
    ],
  },
  {
    key: "ast",
    label: "AST (SGOT)",
    unit: "IU/L",
    patterns: [
      /(?:s\.?g\.?o\.?t|ast|aspartate\s*(?:amino)?transferase)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /(?:ast|sgot)[\s\S]{1,25}?([0-9]{1,4}(?:\.[0-9]+)?)\s*(?:iu\/l|u\/l)/i,
    ],
  },
  {
    key: "bilirubin",
    label: "Total Bilirubin",
    unit: "mg/dL",
    patterns: [
      /(?:total\s+bilirubin|t\.?\s*bili(?:rubin)?|t-bil)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /bilirubin\s*\(?total\)?[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /(?:t\.?\s*bil)[\s\S]{1,20}?([0-9]+(?:\.[0-9]+)?)\s*(?:mg\/dl|µmol\/l)/i,
    ],
  },
  {
    key: "bilirubin_direct",
    label: "Direct Bilirubin",
    unit: "mg/dL",
    patterns: [
      /(?:direct\s+bilirubin|d\.?\s*bili(?:rubin)?|d-bil|conjugated\s+bili(?:rubin)?)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /bilirubin\s*\(?direct\)?[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "alp",
    label: "ALP (Alkaline Phosphatase)",
    unit: "IU/L",
    patterns: [
      /(?:alk(?:aline)?\.?\s*phos(?:phatase)?|alkp|alp)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /(?:alp|alk\.?\s*p)[\s\S]{1,25}?([0-9]{1,4}(?:\.[0-9]+)?)\s*(?:iu\/l|u\/l)/i,
    ],
  },
  {
    key: "albumin",
    label: "Albumin",
    unit: "g/dL",
    patterns: [
      /(?:s\.?\s*albumin|albumin|alb)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /albumin[\s\S]{1,20}?([0-9]+(?:\.[0-9]+)?)\s*(?:g\/dl|g\/l)/i,
    ],
  },
  {
    key: "total_proteins",
    label: "Total Protein",
    unit: "g/dL",
    patterns: [
      /(?:total\s+protein|s\.?\s*protein|t\.?\s*protein|t\.?\s*prot)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "ag_ratio",
    label: "A/G Ratio",
    patterns: [
      /(?:a\s*\/\s*g\s*ratio|albumin\s*\/\s*globulin|a:g\s*ratio)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "platelets",
    label: "Platelets (PLT)",
    unit: "×10³/µL",
    patterns: [
      /(?:platelet(?:s)?(?:\s*count)?|plt)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
      /(?:plt|platelet)[\s\S]{1,20}?([0-9]{2,4})\s*(?:x10\^?3|10\*3|\*10\^3)/i,
    ],
  },
  {
    key: "cholesterol",
    label: "Total Cholesterol",
    unit: "mg/dL",
    patterns: [
      /(?:total\s+cholesterol|s\.?\s*cholesterol|chol(?:esterol)?)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "triglycerides",
    label: "Triglycerides",
    unit: "mg/dL",
    patterns: [
      /(?:triglycerides|triglyceride|tg|trig)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "glucose",
    label: "Fasting Blood Glucose",
    unit: "mg/dL",
    patterns: [
      /(?:fasting\s+(?:blood\s+)?glucose|fbs|fbg|rbs|blood\s+sugar|glucose)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "creatinine",
    label: "Creatinine",
    unit: "mg/dL",
    patterns: [
      /(?:s\.?\s*creatinine|serum\s+creatinine|creatinine|creat)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "ggt",
    label: "GGT (Gamma GT)",
    unit: "IU/L",
    patterns: [
      /(?:gamma[\s-]*gt|ggt|gamma[\s-]*glutamyl)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "uric_acid",
    label: "Uric Acid",
    unit: "mg/dL",
    patterns: [
      /(?:s\.?\s*uric\s+acid|uric\s+acid)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "hdl",
    label: "HDL Cholesterol",
    unit: "mg/dL",
    patterns: [
      /(?:hdl[\s-]*cholesterol|hdl[\s-]*c|hdl)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "prothrombin",
    label: "Prothrombin Time (PT)",
    unit: "seconds",
    patterns: [
      /(?:prothrombin\s+time|pt\s+time|pt\s*\(sec\)|pt)[\s.:=│|]+([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    key: "age",
    label: "Patient Age",
    unit: "years",
    patterns: [
      /(?:age|العمر)[\s.:=│|]+([0-9]{1,3})/i,
      /([0-9]{1,2})\s*(?:years|yrs|year\s+old|سنة)/i,
    ],
  },
  {
    key: "gender",
    label: "Gender",
    patterns: [
      /(?:gender|sex|الجنس)[\s.:=│|]+(male|female|ذكر|أنثى|m|f)\b/i,
    ],
  },
]

/**
 * Parses raw text extracted from OCR into structured clinical fields.
 */
export function parseLabTextLocally(rawText: string): ParseResult {
  const fields: Record<string, string> = {}
  const extractedList: ExtractedField[] = []

  // Pre-process text: normalize linebreaks, replace commas used as decimal separators in numbers
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const normalizedText = lines.join("\n")

  for (const def of LAB_FIELD_PATTERNS) {
    let matchedValue: string | null = null
    let matchedLine: string | undefined

    for (const pattern of def.patterns) {
      // First try matching on individual lines (better for tabular format)
      for (const line of lines) {
        const lineMatch = line.match(pattern)
        if (lineMatch && lineMatch[1]) {
          matchedValue = lineMatch[1]
          matchedLine = line
          break
        }
      }

      if (matchedValue) break

      // Fallback: match across full text block
      const fullMatch = normalizedText.match(pattern)
      if (fullMatch && fullMatch[1]) {
        matchedValue = fullMatch[1]
        break
      }
    }

    if (matchedValue) {
      let finalVal = matchedValue.trim()

      // Normalize gender
      if (def.key === "gender") {
        const lower = finalVal.toLowerCase()
        if (lower.startsWith("m") || lower.includes("ذكر")) {
          finalVal = "Male"
        } else if (lower.startsWith("f") || lower.includes("أنثى")) {
          finalVal = "Female"
        }
      }

      fields[def.key] = finalVal
      extractedList.push({
        key: def.key,
        label: def.label,
        value: finalVal,
        unit: def.unit,
        confidence: 90,
        matchedLine,
      })
    }
  }

  // Calculate A/G ratio if albumin and total protein are present but A/G wasn't explicitly extracted
  if (!fields.ag_ratio && fields.albumin && fields.total_proteins) {
    const alb = parseFloat(fields.albumin)
    const tp = parseFloat(fields.total_proteins)
    if (tp > alb && alb > 0) {
      const globulin = tp - alb
      if (globulin > 0) {
        const calculatedRatio = (alb / globulin).toFixed(2)
        fields.ag_ratio = calculatedRatio
        extractedList.push({
          key: "ag_ratio",
          label: "A/G Ratio (Calculated)",
          value: calculatedRatio,
          confidence: 85,
        })
      }
    }
  }

  return {
    fields,
    extractedList,
    rawText,
  }
}
