import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { parseLabTextLocally } from "@/lib/ocr/lab-parser"

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  return new Groq({ apiKey })
}

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawText = body.rawText || ""

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ success: false, error: "No text provided" }, { status: 400 })
    }

    // 1. Try local regex extraction first
    const localResult = parseLabTextLocally(rawText)

    // 2. Try Groq AI extraction if available for complex tabular text
    const groq = getGroqClient()
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an expert clinical laboratory data extraction system.
Extract laboratory test values from the raw text provided.
Only include fields that are explicitly found in the text. Do not invent or hallucinate values.
Format each numeric value as a clean string (e.g. "35.5", "1.2", "145").
For gender, output "Male" or "Female".
Available keys:
- alt (IU/L, SGPT)
- ast (IU/L, SGOT)
- bilirubin (mg/dL, Total Bilirubin)
- bilirubin_direct (mg/dL, Direct Bilirubin)
- alp (IU/L, Alkaline Phosphatase)
- total_proteins (g/dL, Total Protein)
- albumin (g/dL, Albumin)
- ag_ratio (A/G Ratio)
- platelets (PLT, Platelet count)
- cholesterol (mg/dL)
- triglycerides (mg/dL)
- glucose (mg/dL, FBS, RBS)
- creatinine (mg/dL)
- ggt (IU/L)
- uric_acid (mg/dL)
- hdl (mg/dL)
- prothrombin (PT, seconds)
- age (years)
- gender ("Male" or "Female")

Output JSON shape:
{
  "fields": {
    "alt": "...",
    "ast": "..."
  }
}`,
            },
            {
              role: "user",
              content: `Laboratory report text:\n\n${rawText.slice(0, 4000)}`,
            },
          ],
          temperature: 0.1,
        })

        const aiResponse = completion.choices[0]?.message?.content
        if (aiResponse) {
          const parsed = JSON.parse(aiResponse)
          if (parsed.fields && typeof parsed.fields === "object") {
            // Merge AI fields with local fields (AI overrides)
            const merged = { ...localResult.fields, ...parsed.fields }
            return NextResponse.json({
              success: true,
              fields: merged,
              source: "ai_enhanced",
              rawText,
            })
          }
        }
      } catch (aiErr) {
        console.warn("Groq lab extraction failed, using local parser:", aiErr)
      }
    }

    // Return local heuristic extraction if AI is unavailable or failed
    return NextResponse.json({
      success: true,
      fields: localResult.fields,
      source: "local_regex",
      rawText,
    })
  } catch (error: any) {
    console.error("OCR parse route error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
