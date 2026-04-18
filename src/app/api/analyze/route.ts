import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildAnalyzePrompt, buildAnalyzeRetryPrompt } from '@/lib/prompts';
import type { Language } from '@/lib/store';

// Shape of the structured JSON Groq must return for document analysis
export interface AnalyzeResult {
  pros: string[];
  cons: string[];
  hidden_clauses: string[];
  callout_text: string;
  risk_score: number;
  risk_explanation: string;
  summary: string;
  quiz: {
    question: string;
    options: [string, string, string, string];
    correct_answer: string;
  }[];
}

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
    const missing: string[] = [];
    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) missing.push('text');
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: `The following fields are required: ${missing.join(', ')}.`,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const text = (body.text as string).trim();
    const language: Language =
      body.language === 'hi' || body.language === 'mr' ? (body.language as Language) : 'en';

    // ── 3. First Groq attempt ──────────────────────────────────────────────
    let result: AnalyzeResult;

    const attempt = async (retry: boolean): Promise<string> => {
      const prompt = retry
        ? buildAnalyzeRetryPrompt(text, language)
        : buildAnalyzePrompt(text, language);

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      });

      return completion.choices[0]?.message?.content ?? '';
    };

    let rawResponse = await attempt(false);

    try {
      result = parseGroqJson<AnalyzeResult>(rawResponse);
    } catch (parseError) {
      // ── 4. Retry once with stricter prompt ──────────────────────────────
      rawResponse = await attempt(true);
      try {
        result = parseGroqJson<AnalyzeResult>(rawResponse);
      } catch (retryParseError) {
        return NextResponse.json(
          {
            error: 'AI response parsing failed',
            details: `Could not parse the AI response as JSON after two attempts. ${retryParseError instanceof Error ? retryParseError.message : String(retryParseError)}`,
          },
          { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
        );
      }
    }

    // ── 5. Return the structured analysis ──────────────────────────────────
    return NextResponse.json(result, {
      status: 200,
      headers: { 'X-Response-Time': `${Date.now() - startTime}ms` },
    });
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
