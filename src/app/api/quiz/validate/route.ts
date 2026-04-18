import { NextRequest, NextResponse } from 'next/server';
import type { Language } from '@/lib/store';

/**
 * POST /api/quiz/validate
 *
 * A lightweight, zero-Groq route that validates a single quiz answer and
 * returns per-question feedback for the real-time green/amber UI on /confirm.
 *
 * Accepts: { question: string, user_answer: string, correct_answer: string }
 * Query param: ?lang=en|hi|mr  (defaults to "en" if missing)
 *
 * Returns: { is_correct: boolean, feedback_message: string }
 */

const FEEDBACK: Record<Language, { correct: string; wrong: string }> = {
  en: {
    correct: 'Great! You got it.',
    wrong: 'Re-read this section carefully.',
  },
  hi: {
    correct: 'शाबाश! आपने सही जवाब दिया।',
    wrong: 'इस भाग को ध्यान से दोबारा पढ़ें।',
  },
  mr: {
    correct: 'छान! तुम्ही बरोबर उत्तर दिले.',
    wrong: 'हा भाग नीट परत वाचा.',
  },
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Resolve language from query param
    const langParam = req.nextUrl.searchParams.get('lang') ?? 'en';
    const lang: Language =
      langParam === 'hi' || langParam === 'mr' ? (langParam as Language) : 'en';

    // Parse body
    let body: { question?: unknown; user_answer?: unknown; correct_answer?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // Validate required fields
    const missing: string[] = [];
    if (!body.user_answer || typeof body.user_answer !== 'string') missing.push('user_answer');
    if (!body.correct_answer || typeof body.correct_answer !== 'string') missing.push('correct_answer');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: `The following fields are required: ${missing.join(', ')}.`,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const is_correct =
      (body.user_answer as string).trim() === (body.correct_answer as string).trim();

    const feedback_message = is_correct ? FEEDBACK[lang].correct : FEEDBACK[lang].wrong;

    return NextResponse.json(
      { is_correct, feedback_message },
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
