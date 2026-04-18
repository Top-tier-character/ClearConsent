/**
 * POST /api/tts
 *
 * Powers the 🔊 "Read Aloud" buttons on the /analyze page for the three
 * colored result cards (green, amber, red).
 *
 * This route does NOT call a third-party TTS service.
 * Instead, it returns the text and the correct BCP-47 language code so the
 * frontend can call window.speechSynthesis.speak() directly.
 *
 * Frontend usage pattern:
 *   const { text, language_code } = await fetch('/api/tts', { ... }).then(r => r.json());
 *   const utterance = new SpeechSynthesisUtterance(text);
 *   utterance.lang = language_code;   // e.g. "hi-IN"
 *   window.speechSynthesis.speak(utterance);
 *
 * Language code mapping:
 *   "en" → "en-IN"   (Indian English)
 *   "hi" → "hi-IN"   (Hindi India)
 *   "mr" → "mr-IN"   (Marathi India)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Language } from '@/lib/store';

const LANGUAGE_CODES: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: { text?: unknown; language?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 2. Validate required fields ────────────────────────────────────────
    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'Field "text" is required and must be a non-empty string.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const text = (body.text as string).trim();
    const language: Language =
      body.language === 'hi' || body.language === 'mr' ? (body.language as Language) : 'en';
    const language_code = LANGUAGE_CODES[language];

    // ── 3. Return text and BCP-47 code for browser speechSynthesis ─────────
    return NextResponse.json(
      { text, language_code },
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
