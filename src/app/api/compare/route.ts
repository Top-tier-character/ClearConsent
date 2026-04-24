import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildComparePrompt } from '@/lib/prompts';
import type { Language } from '@/lib/store';

/**
 * POST /api/compare
 * Accepts: { text1: string, text2: string, language: string }
 * Returns a full dual-document analysis with a comparison table.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { text1, text2, language } = body ?? {};

    // ── Validate ───────────────────────────────────────────────────────────
    if (!text1 || typeof text1 !== 'string' || !text1.trim()) {
      return NextResponse.json({ error: 'text1 is required.' }, { status: 400 });
    }
    if (!text2 || typeof text2 !== 'string' || !text2.trim()) {
      return NextResponse.json({ error: 'text2 is required.' }, { status: 400 });
    }

    const lang: Language =
      language === 'hi' || language === 'mr' ? (language as Language) : 'en';

    // ── Build prompt ───────────────────────────────────────────────────────
    const prompt = buildComparePrompt(text1.trim(), text2.trim(), lang);

    // ── Call Groq ──────────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';

    // ── Parse (with one retry) ─────────────────────────────────────────────
    let result: unknown;
    try {
      result = parseGroqJson(raw);
    } catch {
      // Retry with a simpler follow-up
      const retry = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content:
              'Your previous response was not valid JSON. Please return ONLY the JSON object, starting with { and ending with }. No other text.',
          },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      });
      const retryRaw = retry.choices[0]?.message?.content ?? '{}';
      try {
        result = parseGroqJson(retryRaw);
      } catch {
        return NextResponse.json(
          { error: 'AI response parsing failed after two attempts.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result, {
      status: 200,
      headers: { 'X-Response-Time': `${Date.now() - startTime}ms` },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  }
}
