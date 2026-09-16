'use client'

/**
 * The assistant.
 *
 * REBUILT 2026-08-11. The previous version never went through Phase 3: it
 * contained ZERO design tokens and survived only because Phase 3 redefined the
 * legacy utility NAMES it was written in. Measured before this rewrite —
 * `grep "var(--"` returned 0, `grep "dark:"` returned 0.
 *
 * Four things in it were direct violations rather than drift:
 *
 *   `from-blue-500 to-purple-500` on the assistant avatar — the purple-blue
 *   gradient `CLAUDE.md` §7 forbids by name, twice.
 *   `backdrop-blur-md` on the card — design rule 2, nothing in this product
 *   frosts (L-028).
 *   `bg-white/90`, `border-white/30`, `border-gray-200/50` — white surfaces on
 *   a sage ground, which is design rule 7 exactly.
 *   `animate-glow`, inert since Phase 3, still in the markup.
 *
 * Plus a fixed `h-[600px]` card floating in an otherwise empty page, and
 * `font-arabic`, whose utility was deleted with Alexandria.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE HISTORY IS SENT NOW. The old client posted `{ message }` and nothing
 * else, so the assistant had no memory and no follow-up could work. Verified
 * against the live model: with history it answers the question about a name
 * given a turn earlier; with the same request and no history it does not.
 *
 * A FAILURE LOOKS LIKE A FAILURE. The route used to return `success: true`
 * with a prose apology for every error, so a dead key and a rate limit both
 * arrived as a confident assistant message. Errors are their own kind of entry
 * here — critical tone, named cause, and a Retry that resends the same turn.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO PAGE HEADER, matching the decision Ali made on Reports the same day: the
 * shell breadcrumb already reads "Reference / Assistant", and a screen that
 * names itself twice spends its best rows repeating the navigation. What the
 * assistant is gets said once, by its opening message, where a first-time
 * reader is looking anyway (§7 — the interface has to explain itself).
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Download, Trash2, Search, MessageSquare, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CONTROL_CLASS } from '@/components/patients/data-table'

type Role = 'user' | 'assistant'

interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  /** Set when this entry is a failure rather than an answer. */
  error?: { text: string; retryable: boolean; resend: string }
}

const GREETING =
  'I am the Hepatiq assistant. Ask me about liver disease, what a set of blood ' +
  'results might mean, symptoms, or treatment options.'

const newGreeting = (): Message => ({
  id: 'greeting',
  role: 'assistant',
  content: GREETING,
  timestamp: new Date(),
})

/** Arabic still gets its direction, though the product is English (D-6). */
const isArabic = (text: string) =>
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(text)

const HISTORY_TURNS = 12

export function AiChatbot() {
  const [messages, setMessages] = useState<Message[]>([newGreeting()])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 60)
    return () => clearTimeout(id)
  }, [messages, isLoading])

  const shown = query
    ? messages.filter((m) => m.content.toLowerCase().includes(query.toLowerCase()))
    : messages

  function exportChat() {
    const text = messages
      .map((m) => `[${m.timestamp.toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `hepatiq-assistant-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Conversation exported')
  }

  function clearChat() {
    setMessages([newGreeting()])
    setQuery('')
    toast.success('Conversation cleared')
  }

  async function send(text: string, replacingErrorId?: string) {
    const body = text.trim()
    if (!body || isLoading) return

    /*
      THE HISTORY THAT TRAVELS. Errors are excluded — they are UI entries, not
      turns the model produced — and so is the greeting, which the server
      already covers in its system prompt. Sending either would teach the model
      that apologising is something it said.
    */
    const history = messages
      .filter((m) => !m.error && m.id !== 'greeting')
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== replacingErrorId),
      { id: `u-${Date.now()}`, role: 'user', content: body, timestamp: new Date() },
    ])
    setInput('')
    setIsLoading(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body, history }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw Object.assign(new Error(data?.error ?? `Request failed (${res.status})`), {
          retryable: data?.retryable ?? true,
        })
      }

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: data.response, timestamp: new Date() },
      ])
    } catch (e: any) {
      const aborted = e?.name === 'AbortError'
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          error: {
            text: aborted ? 'That took too long and was stopped.' : (e?.message ?? 'Something went wrong.'),
            retryable: aborted || e?.retryable !== false,
            resend: body,
          },
        },
      ])
    } finally {
      clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  return (
    /*
      Fills the page rather than floating as a 600px card in empty space. The
      shell gives 56px of header and 24/64 of padding, so 10rem is what has to
      come off the viewport; the floor keeps it usable on a short laptop.
    */
    <section className="flex h-[calc(100vh-10rem)] min-h-[460px] flex-col rounded-[var(--r-panel)] bg-[var(--surface-wide)] p-[18px] shadow-[var(--glass-lift)]">
      <h1 className="sr-only">Assistant</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this conversation..."
            aria-label="Search this conversation"
            className="h-9 pl-9"
          />
        </div>
        <span className="flex-1" />
        {/* Filled brand = an action (design rule 4). */}
        <Button variant="outline" size="sm" className={`h-9 ${CONTROL_CLASS}`} onClick={exportChat}>
          <Download />
          Export
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={clearChat}>
          <Trash2 />
          Clear
        </Button>
      </div>

      {/*
        The canvas. `rounded-lg` is 10px — shadcn's calc chain off `--radius`
        emits the specimen's own 6/8/10/14, so this is a step ON the scale
        rather than an arbitrary +2 over `--r-md`.

        `scroll-quiet` hides the rail without touching the scrolling: wheel,
        trackpad, keyboard and touch all work, and new turns still pull the view
        down through `endRef`. The page itself never grows — the panel is a
        fixed height and only this list moves.
      */}
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto rounded-lg bg-[var(--surface)] p-4">
        {shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageSquare aria-hidden="true" className="size-6 text-[var(--ink-muted)]" />
            <p className="text-[14px] text-[var(--ink)]">Nothing in this conversation matches</p>
            <p className="text-[12px] text-[var(--ink-muted)]">Try a different word, or clear the search</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {shown.map((m) =>
              m.error ? (
                /* An error is its own kind of entry, never a message the
                   assistant appears to have written. */
                <div key={m.id} className="flex flex-col items-start gap-2">
                  {/*
                    The red fill is back, on Ali's call, and it comes from
                    `--critical-surface` — a PER-THEME token, because no single
                    expression works for both.

                    Measured, three times: 12% into transparent gave 4.09 on
                    light. 9% gave 4.65 light but 4.24 dark. 15% into
                    `--surface-solid` flipped it — 4.87 dark, 4.09 light. The
                    reason is that adding red DARKENS the surface in both
                    themes, which costs contrast against dark-red text on light
                    and gains it against light-salmon text on dark. The two
                    themes want opposite strengths, so the token carries one
                    each.

                    The border does the alarm. It is a mark, so 3:1 applies to
                    it rather than 4.5, which is why it can be far stronger than
                    the fill.
                  */}
                  <div
                    className="flex max-w-[80%] items-start gap-2.5 rounded-[var(--r-card)] border bg-[var(--critical-surface)] px-3.5 py-2.5"
                    style={{ borderColor: 'color-mix(in oklab, var(--critical) 42%, transparent)' }}
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--critical)' }} />
                    <div>
                      <p className="text-[14px] leading-[20px]" style={{ color: 'var(--critical)' }}>
                        {m.error.text}
                      </p>
                      {m.error.retryable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-8"
                          onClick={() => send(m.error!.resend, m.id)}
                          disabled={isLoading}
                        >
                          <RotateCcw />
                          Try again
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : m.role === 'user' ? (
                /* The user's own words sit right and filled; the assistant's
                   sit left and quiet. Alignment carries who is speaking, so
                   neither side needs an avatar to say it. */
                <div key={m.id} className="flex justify-end">
                  <p
                    dir={isArabic(m.content) ? 'rtl' : 'ltr'}
                    className="max-w-[80%] rounded-[var(--r-card)] bg-[var(--brand)] px-3.5 py-2.5 text-[14px] leading-[21px] whitespace-pre-line text-[var(--brand-ink)]"
                  >
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)]"
                  >
                    <Bot className="size-[18px] text-[var(--ink)]" />
                  </span>
                  <p
                    dir={isArabic(m.content) ? 'rtl' : 'ltr'}
                    className="max-w-[80%] rounded-[var(--r-card)] bg-[var(--surface-chrome)] px-3.5 py-2.5 text-[14px] leading-[21px] whitespace-pre-line text-[var(--ink)]"
                  >
                    {m.content}
                  </p>
                </div>
              ),
            )}

            {isLoading && (
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)]"
                >
                  <Bot className="size-[18px] text-[var(--ink)]" />
                </span>
                <span
                  role="status"
                  className="flex items-center gap-1.5 rounded-[var(--r-card)] bg-[var(--surface-chrome)] px-3.5 py-3"
                >
                  {/* A staggered fade. The old indicator used a bouncing
                      easing, which reads as dated and which §7 rules out —
                      motion here must not draw attention to itself. Opacity
                      decelerates smoothly and says the same thing.

                      Written without naming the old utility: the detector
                      scans source TEXT, so a comment quoting the class it
                      forbids trips it. REFACTOR_WORKFLOW.md §4 records the
                      same trap catching a different check. */}
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-pulse rounded-full bg-[var(--ink-muted)]"
                      style={{ animationDelay: `${i * 0.18}s`, animationDuration: '1.1s' }}
                    />
                  ))}
                  <span className="sr-only">Thinking</span>
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line. The hint that used to
            // spell this out under the field is gone (Ali) — it is the
            // convention every chat client already uses, and the placeholder
            // is doing the explaining.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          placeholder="Ask about liver disease, blood results, symptoms or treatment..."
          aria-label="Message the assistant"
          className="max-h-32 min-h-9 flex-1 resize-none py-2"
          disabled={isLoading}
        />
        {/* Keeps its fill when disabled, stepped back — design rule 9. */}
        <Button
          type="submit"
          size="sm"
          className={`h-9 ${CONTROL_CLASS} disabled:opacity-100 disabled:bg-[color-mix(in_oklab,var(--brand)_55%,transparent)]`}
          disabled={isLoading || !input.trim()}
        >
          <Send />
          Send
        </Button>
      </form>
    </section>
  )
}
