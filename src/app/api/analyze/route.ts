import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildAnalyzePrompt, buildAnalyzeRetryPrompt } from '@/lib/prompts';
import type { Language } from '@/lib/store';

// Shape of the structured JSON Groq returns for document analysis
export interface SpecificClause {
  quote: string;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AnalyzeResult {
  document_type: string;
  pros: string[];
  cons: string[];
  hidden_clauses: string[];
  specific_clauses: SpecificClause[];
  callout_text: string;
  risk_score: number;
  risk_explanation: string;
  summary: string;
  quiz: {
    question: string;
    options: [string, string, string, string];
    correct_answer: string;
  }[];
  extracted_figures: {
    loan_amount: number | null;
    interest_rate: number | null;
    tenure_months: number | null;
    monthly_income: number | null;
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: { text?: unknown; language?: unknown; simplified?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 2. Validate ────────────────────────────────────────────────────────
    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json(
        { error: 'Missing required field', details: 'text is required and must be a non-empty string.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const text = (body.text as string).trim();
    const language: Language =
      body.language === 'hi' || body.language === 'mr' ? (body.language as Language) : 'en';
    const simplified = body.simplified === true;

    // ── 3. Groq call (with one retry on parse failure) ─────────────────────
    let result: AnalyzeResult;

    const attempt = async (retry: boolean): Promise<string> => {
      const prompt = retry
        ? buildAnalyzeRetryPrompt(text, language, simplified)
        : buildAnalyzePrompt(text, language, simplified);

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1800,
      });

      return completion.choices[0]?.message?.content ?? '';
    };

    let rawResponse = await attempt(false);

    try {
      result = parseGroqJson<AnalyzeResult>(rawResponse);
    } catch {
      rawResponse = await attempt(true);
      try {
        result = parseGroqJson<AnalyzeResult>(rawResponse);
      } catch (retryErr) {
        return NextResponse.json(
          {
            error: 'AI response parsing failed',
            details: `Could not parse AI response as JSON after two attempts. ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
          },
          { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
        );
      }
    }

    // ── 4. Return ──────────────────────────────────────────────────────────
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
