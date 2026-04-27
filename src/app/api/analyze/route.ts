export const runtime = 'nodejs';
export const maxDuration = 60; // seconds — requires Vercel Pro; on Hobby it caps at 10s

import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL, GROQ_MODEL_FAST } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';

// ── English analysis prompt (lean for speed) ────────────────────────────────
const ANALYZE_SYSTEM = `You are a consumer protection expert helping people in India understand financial contracts. Analyze the document and return ONLY a JSON object — no markdown, no backticks, no explanation.

{
  "document_type": "Loan Agreement | Insurance Policy | Auto-Pay Mandate | Account Opening | Credit Card Terms | Other",
  "clearconsent_score": <0-100. Start 100. Deduct: interest>15%=-20, interest>24%=-15more, prepayment penalty=-15, late fee>500=-10, auto-deduction=-20, floating rate=-15, processing fee>1%=-10, arbitration only=-15, auto-renewal=-10. Min 0>,
  "score_explanation": "<one sentence>",
  "pros": ["<benefit 1>", "<benefit 2>", "<benefit 3>"],
  "cons": ["<obligation 1>", "<obligation 2>", "<obligation 3>"],
  "risk_flags": [
    {
      "title": "<short flag name>",
      "quote": "<exact quote under 80 chars>",
      "explanation": "<plain English explanation>",
      "severity": "high|medium|low",
      "action_email": "Subject: Query on [clause]\n\nDear Sir/Madam,\n\nI am writing about the [clause] in my agreement. [Explain concern and ask for clarification or removal.]\n\nPlease respond within 7 working days.\n\nYours sincerely,\n[Your Name]"
    }
  ],
  "callout_text": "<real numbers only from document, e.g. 'You will pay back Rs 57600 — Rs 7600 more than borrowed'. Never use placeholders.>",
  "summary": "<2-3 sentence plain summary>",
  "extracted_figures": { "loan_amount": <number|null>, "interest_rate": <annual %|null>, "tenure_months": <number|null>, "monthly_income": <number|null> }
}`;

// ── Translate only user-visible text fields ──────────────────────────────────
async function translateFields(data: any, langName: string): Promise<any> {
  const toTranslate = {
    score_explanation: data.score_explanation,
    pros: data.pros,
    cons: data.cons,
    callout_text: data.callout_text,
    summary: data.summary,
    risk_flags: data.risk_flags?.map((f: any) => ({
      title: f.title,
      explanation: f.explanation,
      action_email: f.action_email,
    })),
  };

  const prompt = `Translate every string value in this JSON into ${langName}. Keep all numbers, ₹, %, Rs, and JSON structure exactly unchanged. Return ONLY valid JSON.\n\n${JSON.stringify(toTranslate)}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL_FAST,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2500,
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  const translated = parseGroqJson(raw);
  if (!translated) return data;

  return {
    ...data,
    score_explanation: translated.score_explanation ?? data.score_explanation,
    pros: translated.pros ?? data.pros,
    cons: translated.cons ?? data.cons,
    callout_text: translated.callout_text ?? data.callout_text,
    summary: translated.summary ?? data.summary,
    risk_flags: data.risk_flags?.map((flag: any, i: number) => ({
      ...flag,
      title: translated.risk_flags?.[i]?.title ?? flag.title,
      explanation: translated.risk_flags?.[i]?.explanation ?? flag.explanation,
      action_email: translated.risk_flags?.[i]?.action_email ?? flag.action_email,
    })),
  };
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    // Guard: GROQ key must exist
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured on the server. Add it in your Vercel environment variables.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const language = ['hi', 'mr'].includes(body.language) ? body.language : 'en';
    const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

    if (!text) {
      return NextResponse.json({ error: 'No document text received. Please upload a file and try again.' }, { status: 400 });
    }

    const userPrompt = `Analyze this financial document:\n\n"""\n${text.slice(0, 6000)}\n"""\n\nReturn the JSON now.`;

    // ── Phase 1: English analysis ──────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: ANALYZE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    if (!raw) throw new Error('Groq returned an empty response');

    const result = parseGroqJson(raw);
    if (!result || typeof result.clearconsent_score !== 'number') {
      throw new Error('AI response was not valid JSON. Raw: ' + raw.slice(0, 300));
    }

    let safe: any = {
      document_type: typeof result.document_type === 'string' ? result.document_type : 'Financial Document',
      clearconsent_score: Math.min(100, Math.max(0, Math.round(result.clearconsent_score ?? 50))),
      score_explanation: typeof result.score_explanation === 'string' ? result.score_explanation : '',
      pros: Array.isArray(result.pros) ? result.pros.filter((x: any) => typeof x === 'string').slice(0, 5) : [],
      cons: Array.isArray(result.cons) ? result.cons.filter((x: any) => typeof x === 'string').slice(0, 5) : [],
      risk_flags: Array.isArray(result.risk_flags) ? result.risk_flags.slice(0, 5) : [],
      callout_text: typeof result.callout_text === 'string' ? result.callout_text : '',
      summary: typeof result.summary === 'string' ? result.summary : '',
      extracted_figures: result.extracted_figures ?? null,
    };

    // ── Phase 2: Translate if Hindi/Marathi ────────────────────────────────
    if (language !== 'en') {
      try {
        safe = await translateFields(safe, langName);
      } catch (translationErr) {
        // Non-fatal — return English result rather than failing
        console.warn('Translation failed, returning English:', translationErr);
      }
    }

    return NextResponse.json(safe, {
      headers: { 'X-Response-Time': `${Date.now() - start}ms` }
    });

  } catch (err: any) {
    console.error('Analyze route error:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Analysis failed. ' + (err?.message ?? 'Unknown error') },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - start}ms` } }
    );
  }
}
