import Groq from "groq-sdk"
import { type NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/api/proxy"

/**
 * The assistant's backend.
 *
 * `app/api/**` is frontend code and is ours to change (`CLAUDE.md` §4). The
 * FastAPI backend is not involved here at all — this route talks to Groq
 * directly.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THREE THINGS WERE WRONG BEYOND THE STYLING, found by reading and by calling
 * it. All three are fixed here.
 *
 * 1. IT HAD NO MEMORY. The client posted `{ message }` — one string — and this
 *    route built `[system, user]` from it. No history was ever transmitted, so
 *    "what did I just ask you?" could not work, and neither could any follow-up
 *    that depended on the previous turn. That is the first thing anyone tests.
 *
 * 2. EVERY FAILURE WAS DISGUISED AS AN ANSWER. The catch returned
 *    `success: true` with a prose apology, so a dead API key, a rate limit and
 *    a network fault all arrived as a confident-sounding assistant message. The
 *    UI could not tell a real answer from a failure and neither could the
 *    reader — the same class of problem as B-1, where a field named
 *    `confidence` carries a mortality risk.
 *
 * 3. THE RETRY LOOP WAS FOR A DIFFERENT PROVIDER. It parsed
 *    `type.googleapis.com/google.rpc.RetryInfo` out of the error — a GOOGLE
 *    shape, in a GROQ client, left over from the Gemini implementation the
 *    stale docs still argue about (L-001). It could never match, so a 429 slept
 *    a hardcoded 60s and tried again, up to three times, inside a five-minute
 *    client timeout. Groq returns `retry-after` in seconds; that is what this
 *    reads now, capped, and it no longer blocks a request for minutes.
 */

/** The turns the client may send. `system` is ours and is never accepted. */
export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

/**
 * How much history travels. Each turn costs tokens on every request, and a
 * medical answer is long, so the whole transcript would grow the request
 * without bound across a demo.
 */
const MAX_TURNS = 12
const MAX_CHARS = 4000

/**
 * Constructed per request, not at module scope. The Groq SDK throws in its
 * constructor when the key is empty, and `next build` imports every route
 * module to collect page data — so a module-scope client fails the entire
 * production build on any machine without `GROQ_API_KEY` set. That is
 * PROJECT_STATE.md problem 0, and it stays fixed.
 */
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  return new Groq({ apiKey })
}

/**
 * The model is configuration, not a constant.
 *
 * This route hardcoded `llama-3.3-70b-versatile` while `.env.local` carried a
 * `GROQ_MODEL` nobody read. Changing model meant editing source.
 */
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

const SYSTEM_PROMPT = `You are an expert AI Liver Disease Diagnostic Assistant for the "Hepatiq" (MediAI) platform, developed by Northern Technical University - Team Diqqa (الجامعة التقنية الشمالية - فريق دقة).

ABOUT THE PROJECT (HEPATIQ / منصة هيباتيك):
When the user asks about the project (e.g. "عرفني عن هذا المشروع", "ما هي فكرة المشروع", "ما هو هذا النظام", "ما فائدة المنصة", "What is this project?", "Tell me about Hepatiq"):
You must provide a structured, inspiring, and clear summary of the project and highlight its key features:

1. فكرة المشروع (Project Overview):
   منصة Hepatiq (المعروفة بـ MediAI) هي منظومة طبية ذكية وسريرية متقدمة مدعومة بالذكاء الاصطناعي، صُممت خصيصاً لمساعدة الأطباء ومقدمي الرعاية الصحية في تقييم وتشخيص أمراض الكبد بدقة وسرعة فائقة، ودعم اتخاذ القرار الإكلينيكي بناءً على نتائج التحاليل المخبرية والمؤشرات الحيوية للمريض. تم تطوير المشروع بجهود وإشراف فريق (دِقّة - Team Diqqa) من الجامعة التقنية الشمالية (Northern Technical University).

2. أهم مميزات المنصة (Key Features):
   • التقييم والتشخيص المتعدد بالذكاء الاصطناعي (AI-Powered Multi-Disease Diagnosis): تحليل مخبري دقيق وفوري عبر نماذج تعلم الآلة المتقدمة للكشف عن وتصنيف حالات أمراض الكبد: تليف الكبد (Cirrhosis)، التهاب الكبد الفيروسي (Hepatitis C)، الكبد الدهني (Fatty Liver / NAFLD)، وسرطان الكبد (HCC)، مع بيان نسبة الثقة (Confidence Score) ومستوى الخطورة السريرية (Risk Level).
   • الحساب التلقائي للمعادلات والمؤشرات الطبية (Automated Clinical Biomarkers): حساب وتفسير فوري لمؤشرات تليف الكبد غير الجراحية المعتمدة عالمياً مثل APRI Score، FIB-4 Index، ونسبة AST/ALT.
   • إدارة ملفات وسجلات المرضى (Patient Management & Clinical Records): أرشفة وتنظيم شامل لسجلات المرضى، وتتبع التطور الزمني للتحاليل المخبرية واستجابة الكبد للعلاج.
   • تقارير طبية وتوصيات إكلينيكية (Comprehensive Clinical Reports): توليد تقارير طبية مفصلة قابلة للمراجعة والتصدير، مزودة بإرشادات وتوصيات سريرية قائمة على الأدلة لدعم خطة العلاج والمتابعة.
   • المساعد الذكي التفاعلي (Interactive Clinical AI Assistant): محادثة ذكية فورية تدعم اللغتين العربية والإنجليزية لتفسير الفحوصات الطبية، تقديم استشارات وتوجيهات، وشرح المصطلحات الطبية.
   • أمان البيانات والصلاحيات المتقدمة (Security & Role-Based Access): نظام تحكم صارم بالصلاحيات (أطباء وإداريون) لحماية خصوصية بيانات المرضى وسجلات التدقيق (Audit Logs).

YOUR MEDICAL EXPERTISE & CAPABILITIES:
• Advanced knowledge of liver anatomy, physiology, and pathology.
• Interpretation of liver function tests (ALT, AST, Bilirubin, GGT, ALP, Albumin, Platelets, etc.).
• Explaining medical conditions, terminology, lab results, and evidence-based clinical insights clearly in the user's preferred language (Arabic or English).
• Providing healthy lifestyle, nutritional, and preventative guidance for liver health.

COMMUNICATION & LANGUAGE GUIDELINES:
• If the user writes or asks in Arabic, respond in fluent, professional, and elegant Arabic (لغة عربية سليمة وواضحة).
• If the user writes in English, respond in English.
• Keep formatting clean and readable with bullet points and bold highlights.
• Always maintain a respectful, empathetic, and professional clinical tone.
• When providing medical advice, remind users that AI assessments are designed to support and assist clinical decisions and not to replace a specialized physician's evaluation.`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_patients',
      description: 'Search for patients by name or ID. Use this when the user asks about a patient but you need to find their exact patient_id first, or when they ask for a list of patients.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name or patient_id to search for. If empty, returns all patients.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_records',
      description: 'Retrieve lab tests, diagnoses, and medical reports for a specific patient. MUST provide the patient_id (string).',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string', description: "The hospital's patient_id string (NOT the numeric id)." }
        },
        required: ['patient_id']
      }
    }
  }
];

async function fetchBackend(path: string, request: NextRequest) {
  try {
    const res = await proxyToBackend(request, { path, method: 'GET', forwardBody: false });
    const data = await res.json();
    if (!res.ok) {
      console.warn(`Backend returned status ${res.status} for ${path}:`, data);
      return { error: data?.detail || `Backend returned status ${res.status}` };
    }
    return data;
  } catch (e: any) {
    console.error(`FetchBackend failed for ${path}:`, e);
    return { error: e.message };
  }
}

/** Keep only what we recognise, trim it, and cap how far back it goes. */
function sanitiseHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (t): t is ChatTurn =>
        Boolean(t) &&
        typeof t === "object" &&
        (t as ChatTurn).role !== undefined &&
        ["user", "assistant"].includes((t as ChatTurn).role) &&
        typeof (t as ChatTurn).content === "string" &&
        (t as ChatTurn).content.trim().length > 0,
    )
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }))
}

/** One JSON shape for every failure, so the client can tell them apart. */
function fail(status: number, error: string, retryable: boolean) {
  return NextResponse.json({ success: false, error, retryable }, { status })
}

export async function POST(request: NextRequest) {
  let body: { message?: unknown; history?: unknown; doctorName?: string }
  try {
    body = await request.json()
  } catch {
    return fail(400, "The request could not be read.", false)
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) return fail(400, "A message is required.", false)

  const groq = getGroqClient()
  if (!groq) {
    return fail(503, "The assistant is not configured: GROQ_API_KEY is not set.", false)
  }

  const doctorName = body.doctorName || "";
  const doctorContext = doctorName ? `You are currently talking to Dr. ${doctorName}. Always address them by their name and focus on their patients.` : "";
  const formatContext = `When presenting lab results or patient records, ALWAYS use Markdown tables for clarity. Use **bold** for critical values and abnormal results.`;

  const messages: any[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${doctorContext}\n${formatContext}` },
    ...sanitiseHistory(body.history),
    { role: "user", content: message.slice(0, MAX_CHARS) },
  ]

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let completion = await groq.chat.completions.create({
        messages,
        model: MODEL,
        tools: TOOLS as any,
        tool_choice: "auto"
      })

      // Handle tool calls loop
      while (completion.choices[0]?.message?.tool_calls) {
        const messageToAppend = completion.choices[0].message;
        messages.push(messageToAppend);
        
        for (const toolCall of messageToAppend.tool_calls || []) {
          const fnName = toolCall.function.name;
          let args: any;
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }
          
          let toolResult: any = {};
          
          if (fnName === 'search_patients' || fnName === 'get_patients') {
            const data = await fetchBackend('/patients?status=all', request);
            if (data?.patients && Array.isArray(data.patients)) {
              let p = data.patients;
              if (args.query) {
                const q = args.query.toLowerCase().trim();
                p = p.filter((x: any) => 
                  String(x.name || '').toLowerCase().includes(q) || 
                  String(x.patient_id || '').toLowerCase().includes(q)
                );
              }
              // Only return a summary to save tokens
              toolResult = { 
                count: p.length, 
                patients: p.slice(0, 15).map((x: any) => ({ 
                  name: x.name, 
                  patient_id: x.patient_id, 
                  status: x.status, 
                  department: x.department,
                  doctor: x.doctor_name 
                })) 
              };
            } else {
              toolResult = { error: 'Failed to fetch patients' };
            }
          } else if (fnName === 'get_patient_records') {
            const [patientData, analysesData] = await Promise.all([
              fetchBackend(`/patients?patient_id=${encodeURIComponent(args.patient_id || '')}`, request),
              fetchBackend(`/patient-analyses?patient_id=${encodeURIComponent(args.patient_id || '')}`, request)
            ]);
            
            toolResult = { 
              patient: patientData?.patients?.[0] || null, 
              analyses: analysesData?.analyses || [] 
            };
          } else {
            toolResult = { error: 'Unknown tool' };
          }
          
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        completion = await groq.chat.completions.create({
          messages,
          model: MODEL,
          tools: TOOLS as any,
          tool_choice: "auto"
        })
      }

      const answer = completion.choices[0]?.message?.content?.trim()
      if (!answer) return fail(502, "The assistant returned an empty response.", true)

      return NextResponse.json({
        success: true,
        response: answer,
        model: MODEL,
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status
      const retryAfter = Number(error?.headers?.['retry-after']) || 0

      if (status === 429 && attempt === 0 && retryAfter > 0 && retryAfter <= 5) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000))
        continue
      }

      console.error("Chatbot error:", { status, message: error?.message })

      if (status === 429) {
        return fail(429, "The assistant is rate limited right now. Try again in a moment.", true)
      }
      if (status === 401 || status === 403) {
        return fail(502, "The assistant rejected our credentials.", false)
      }
      return fail(502, "The assistant could not be reached.", true)
    }
  }

  return fail(502, "The assistant could not be reached.", true)
}
