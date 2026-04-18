import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildTranslatePrompt } from '@/lib/prompts';

/**
 * POST /api/translate
 *
 * Powers the language switcher when a user changes language mid-session.
 * Sends text to Groq for accurate translation into Hindi or Marathi
 * while preserving all financial figures and using plain everyday language
 * — NOT formal banking terminology.
 *
 * Accepts: { text: string, target_language: "hi" | "mr" }
 * Returns: { translated_text: string }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: { text?: unknown; target_language?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 2. Validate required fields ────────────────────────────────────────
    const missing: string[] = [];
    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) missing.push('text');
    if (body.target_language !== 'hi' && body.target_language !== 'mr')
      missing.push('target_language (must be "hi" or "mr")');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing or invalid required fields',
          details: `The following fields are required or invalid: ${missing.join(', ')}.`,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const text = (body.text as string).trim();
    const target_language = body.target_language as 'hi' | 'mr';

    // ── 3. Call Groq ───────────────────────────────────────────────────────
    const prompt = buildTranslatePrompt(text, target_language);

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = parseGroqJson<{ translated_text?: string }>(raw);

    return NextResponse.json(
      { translated_text: parsed.translated_text ?? '' },
      { status: 200, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  }
}
