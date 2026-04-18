import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildConsentSummaryPrompt } from '@/lib/prompts';
import type { Language } from '@/lib/store';
import { convex } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

interface QuizAnswerItem {
  question: string;
  user_answer: string;
  correct_answer: string;
}

interface ConfirmBody {
  session_id?: unknown;
  quiz_answers?: unknown;
  confirmations?: unknown;
  simulation_data?: unknown;
  analysis_data?: unknown;
  language?: unknown;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: ConfirmBody;
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
    if (!body.session_id) missing.push('session_id');
    if (!body.quiz_answers || !Array.isArray(body.quiz_answers)) missing.push('quiz_answers');
    if (!body.confirmations || typeof body.confirmations !== 'object') missing.push('confirmations');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: `The following fields are required: ${missing.join(', ')}.`,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const quiz_answers = body.quiz_answers as QuizAnswerItem[];
    const confirmations = body.confirmations as Record<string, boolean>;
    const simulation_data = body.simulation_data ?? {};
    const analysis_data = body.analysis_data ?? {};
    const language: Language =
      body.language === 'hi' || body.language === 'mr' ? (body.language as Language) : 'en';

    // ── 3. Validate the 5-item confirmation checklist ──────────────────────
    const requiredConfirmationKeys = [
      'understands_repayment',
      'understands_clauses',
      'understands_emi',
      'voluntary_decision',
      'authorizes_processing',
    ];

    const missingConfirmations = requiredConfirmationKeys.filter(
      (key) => !confirmations[key]
    );

    if (missingConfirmations.length > 0) {
      return NextResponse.json(
        {
          error: 'Incomplete confirmation checklist',
          details: `Please confirm all required items. Missing: ${missingConfirmations.join(', ')}.`,
          missing_confirmations: missingConfirmations,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 4. Validate quiz answers ───────────────────────────────────────────
    const failed_questions: QuizAnswerItem[] = [];
    let correct_count = 0;

    for (const item of quiz_answers) {
      if (item.user_answer === item.correct_answer) {
        correct_count++;
      } else {
        failed_questions.push(item);
      }
    }

    const quiz_score =
      quiz_answers.length > 0 ? Math.round((correct_count / quiz_answers.length) * 100) : 0;

    if (quiz_score < 100) {
      return NextResponse.json(
        {
          error: 'Quiz not fully passed',
          details: 'You must answer all comprehension questions correctly to proceed.',
          quiz_passed: false,
          quiz_score,
          failed_questions,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 5. Generate consent summary via Groq ───────────────────────────────
    const summaryPrompt = buildConsentSummaryPrompt({
      language,
      simulationData: simulation_data as object,
      analysisData: analysis_data as object,
    });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.4,
      max_tokens: 180,
    });

    const rawSummary = completion.choices[0]?.message?.content ?? '{}';
    let consent_summary = '';

    try {
      const parsed = parseGroqJson<{ consent_summary?: string }>(rawSummary);
      consent_summary = parsed.consent_summary ?? '';
    } catch {
      consent_summary =
        'I understand that I am entering into a financial agreement and have reviewed all the terms presented to me.';
    }

    // ── 6. Generate consent ID ─────────────────────────────────────────────
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const consent_id = `CLR-${year}-${randomDigits}`;
    const timestamp = new Date().toISOString();

    // ── 7. Persist consent record ──────────────────────────────────────────
    const now = Date.now();
    await convex.mutation(api.mutations.saveConsentRecord, {
      consent_id,
      session_id: body.session_id as string,
      timestamp: now,
      language_used: language,
      quiz_score,
      quiz_answers,
      all_boxes_confirmed: true,
      quiz_passed: true,
      consent_summary,
      document_name: (analysis_data as any)?.document_name || (simulation_data as any)?.document_name,
      consent_type: (analysis_data as any)?.consent_type || 'loan',
      risk_score: (analysis_data as any)?.risk_score ?? 0,
      risk_level: (analysis_data as any)?.risk_level ?? 'safe',
      status: 'approved',
    });

    await convex.mutation(api.mutations.updateRiskLogConsent, {
      session_id: body.session_id as string,
      timestamp: now,
    });


    // ── 8. Return success ──────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        consent_id,
        consent_summary,
        timestamp,
        quiz_score,
      },
      {
        status: 200,
        headers: { 'X-Response-Time': `${Date.now() - startTime}ms` },
      }
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
