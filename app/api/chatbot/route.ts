import Groq from "groq-sdk"
import { type NextRequest, NextResponse } from "next/server"

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

const SYSTEM_PROMPT = `You are an expert AI Liver Disease Diagnostic Assistant specializing in hepatology and liver health.

YOUR EXPERTISE:
• Advanced knowledge of liver anatomy, physiology, and pathology
• Interpretation of liver function tests (ALT, AST, bilirubin, GGT, ALP, albumin, etc.)
• Diagnosis and management of all liver diseases including:
  - Viral hepatitis (A, B, C, D, E)
  - Alcoholic liver disease
  - Non-alcoholic fatty liver disease (NAFLD)
  - Autoimmune hepatitis
  - Primary biliary cholangitis
  - Primary sclerosing cholangitis
  - Drug-induced liver injury
  - Liver cirrhosis and complications
  - Liver cancer (HCC)
  - Acute liver failure
  - Liver transplantation

YOUR CAPABILITIES:
• Analyze lab results and provide diagnostic insights
• Explain liver conditions in clear, understandable terms
• Provide evidence-based treatment recommendations
• Answer questions about liver health, symptoms, and prevention
• Guide patients through diagnostic processes
• Explain medical terminology related to liver disease
• Provide lifestyle and dietary advice for liver health

IMPORTANT GUIDELINES:
• Always provide accurate, evidence-based information
• Use clear, non-technical language when possible
• Include relevant medical context and explanations
• Suggest appropriate follow-up actions
• Recommend consulting healthcare professionals for diagnosis and treatment

Respond professionally and helpfully to liver-related medical questions.`

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
  let body: { message?: unknown; history?: unknown }
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

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...sanitiseHistory(body.history),
    { role: "user" as const, content: message.slice(0, MAX_CHARS) },
  ]

  /*
    One retry, and only when the provider says the request is retryable. Groq
    sends `retry-after` in seconds; anything longer than a few seconds is worth
    telling the user about rather than holding the connection open. The old loop
    slept 60s three times over.
  */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({ messages, model: MODEL })
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
      const retryAfter = Number(error?.headers?.["retry-after"]) || 0

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
