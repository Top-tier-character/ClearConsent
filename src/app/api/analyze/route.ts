export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildAnalyzePrompt } from '@/lib/prompts';
import type { Language } from '@/lib/store';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const language: Language = (['hi', 'mr'] as const).includes(body.language) ? body.language : 'en';
    const simplified = body.simplified === true;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const systemPrompt = buildAnalyzePrompt(text, language, simplified);
    const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

    let result: any = null;
    let lastError = '';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Analyze the document and return the JSON object now. Respond in ${langName}.`,
            },
          ],
          temperature: attempt === 0 ? 0.2 : 0.1,
          max_tokens: 2500,
        });
        const raw = completion.choices[0]?.message?.content ?? '';
        result = parseGroqJson(raw);
        break;
      } catch (e) {
        lastError = String(e);
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Analysis failed after 3 attempts', details: lastError },
        { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // risk_flags (new schema) or specific_clauses (old schema) — both are supported
    const riskFlags: any[] = Array.isArray(result.risk_flags)
      ? result.risk_flags
      : Array.isArray(result.specific_clauses)
      ? result.specific_clauses
      : [];

    // clearconsent_score = 100 means fully safe → riskScore = 0
    // clearconsent_score = 0 means predatory  → riskScore = 100
    const riskScore =
      typeof result.clearconsent_score === 'number'
        ? Math.min(100, Math.max(0, 100 - result.clearconsent_score))
        : typeof result.risk_score === 'number'
        ? Math.min(100, Math.max(0, result.risk_score))
        : 50;

    const safe = {
      document_type:
        typeof result.document_type === 'string' ? result.document_type : 'Financial Document',
      risk_score: riskScore,
      risk_explanation:
        typeof result.score_explanation === 'string'
          ? result.score_explanation
          : typeof result.risk_explanation === 'string'
          ? result.risk_explanation
          : '',
      pros: Array.isArray(result.pros) ? result.pros.filter((x: any) => typeof x === 'string') : [],
      cons: Array.isArray(result.cons) ? result.cons.filter((x: any) => typeof x === 'string') : [],
      hidden_clauses: Array.isArray(result.hidden_clauses)
        ? result.hidden_clauses.filter((x: any) => typeof x === 'string')
        : [],
      // Both field names so old and new page code works
      specific_clauses: riskFlags,
      risk_flags: riskFlags,
      action_plan: Array.isArray(result.action_plan) ? result.action_plan : [],
      callout_text: typeof result.callout_text === 'string' ? result.callout_text : '',
      summary: typeof result.summary === 'string' ? result.summary : '',
      extracted_figures: result.extracted_figures ?? {
        loan_amount: null,
        interest_rate: null,
        tenure_months: null,
        monthly_income: null,
      },
      paragraph_explanations: Array.isArray(result.paragraph_explanations)
        ? result.paragraph_explanations
        : [],
      suggested_questions: Array.isArray(result.suggested_questions)
        ? result.suggested_questions
        : [],
      clearconsent_score:
        typeof result.clearconsent_score === 'number' ? result.clearconsent_score : 100 - riskScore,
    };

    // ── Non-blocking Convex persistence ───────────────────────────────────
    try {
      const { convexClient } = await import('@/lib/convex');
      const { api } = await import('../../../../convex/_generated/api');
      await convexClient().mutation(api.mutations.saveDocumentAnalysis, {
        session_id: typeof body.session_id === 'string' ? body.session_id : 'guest',
        timestamp: Date.now(),
        document_type: safe.document_type,
        clearconsent_score: safe.clearconsent_score,
        risk_flags: safe.risk_flags,
        extracted_figures: safe.extracted_figures,
        summary: safe.summary,
        language,
        document_hash: text.slice(0, 100),
      });
    } catch {
      // Non-blocking — never fail the main response if Convex save fails
    }

    return NextResponse.json(safe, {

      headers: { 'X-Response-Time': `${Date.now() - startTime}ms` },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  }
}
