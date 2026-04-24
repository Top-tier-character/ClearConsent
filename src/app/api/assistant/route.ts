export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildAssistantSystemPrompt } from '@/lib/prompts';
import type { Language } from '@/lib/store';
import { convexClient } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Keywords that trigger loan simulation data collection
const SIMULATE_KEYWORDS = [
  'simulate', 'borrow', 'loan amount', 'emi', 'calculate', 'interest rate',
  'tenure', 'monthly income', 'how much', 'repay', 'installment',
];

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      message,
      chat_history = [],
      context = {},
      language = 'en',
      session_id,
      paragraph_text,
    } = body ?? {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required.' }, { status: 400 });
    }

    const lang: Language =
      language === 'hi' || language === 'mr' ? (language as Language) : 'en';

    // ── 1. Build system prompt with context ────────────────────────────────
    const systemPrompt = buildAssistantSystemPrompt({
      language: lang,
      currentAnalysis: context?.currentAnalysis ?? null,
      currentSimulation: context?.currentSimulation ?? null,
    });

    // If user clicked "Ask AI About This" on a specific clause, focus entirely on it
    const paragraphFocus =
      typeof paragraph_text === 'string' && paragraph_text.trim()
        ? `\n\nFOCUS: The user is asking specifically about this text from their document:\n"${paragraph_text.trim()}"\nAnswer ONLY about this specific text. Be direct, specific, and practical.`
        : '';

    const finalSystemPrompt = systemPrompt + paragraphFocus;

    // ── 2. Build message array (history + new message) ─────────────────────
    const historyMessages: ChatMessage[] = Array.isArray(chat_history)
      ? chat_history
          .filter((m: any) => m?.role && m?.content)
          .slice(-10) // Keep last 10 turns for context
          .map((m: any) => ({ role: m.role, content: m.content }))
      : [];

    const messages: ChatMessage[] = [
      { role: 'system', content: finalSystemPrompt },
      ...historyMessages,
      { role: 'user', content: message.trim() },
    ];

    // ── 3. Detect simulation keywords ──────────────────────────────────────
    const lowerMsg = message.toLowerCase();
    const isSimulateIntent = SIMULATE_KEYWORDS.some((kw) => lowerMsg.includes(kw));

    // ── 4. Call Groq ───────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 600,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';

    // ── 5. Parse response ─────────────────────────────────────────────────
    let parsed: { reply?: string; prefill_simulate?: Record<string, number> } = {};
    try {
      parsed = parseGroqJson(rawContent);
    } catch {
      // Groq returned plain text — wrap it
      parsed = { reply: rawContent.trim() };
    }

    const reply = parsed.reply || rawContent.trim();

    // ── 6. Persist both turns to Convex ───────────────────────────────────
    if (session_id) {
      const now = Date.now();
      await convexClient().mutation(api.mutations.saveChatMessage as any, {
        session_id: String(session_id),
        timestamp: now,
        role: 'user',
        content: message.trim(),
      });
      await convexClient().mutation(api.mutations.saveChatMessage as any, {
        session_id: String(session_id),
        timestamp: now + 1,
        role: 'assistant',
        content: reply,
      });
    }

    // ── 7. Return ──────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        reply,
        ...(parsed.prefill_simulate ? { prefill_simulate: parsed.prefill_simulate } : {}),
        is_simulate_intent: isSimulateIntent,
      },
      {
        status: 200,
        headers: { 'X-Response-Time': `${Date.now() - startTime}ms` },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  }
}
