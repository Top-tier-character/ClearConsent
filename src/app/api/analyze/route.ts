export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL, GROQ_MODEL_FAST } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';

// ── Phase 1: Always analyze in English ──────────────────────────────────────
const ANALYZE_SYSTEM = `You are a consumer protection expert helping ordinary people in India understand financial contracts. You are on the user's side. Your job is to find hidden traps, calculate real costs, and tell users exactly what to do.

Analyze the financial document and return ONLY this JSON object in English with no other text:

{
  "document_type": "one of: Loan Agreement, Insurance Policy, Auto-Pay Mandate, Account Opening, Credit Card Terms, Other",
  "clearconsent_score": <number 0-100. START at 100, DEDUCT: interest above 15% pa = -20, interest above 24% pa = -15 more, prepayment penalty = -15, late fee above 500 = -10, auto-deduction from bank = -20, floating rate = -15, processing fee above 1% = -10, arbitration only = -15, auto-renewal = -10. Minimum 0>,
  "score_explanation": "<one sentence why this score>",
  "pros": ["<benefit 1>", "<benefit 2>", "<benefit 3>"],
  "cons": ["<obligation 1>", "<obligation 2>", "<obligation 3>"],
  "risk_flags": [
    {
      "title": "<short flag name>",
      "quote": "<exact quote from document under 80 chars>",
      "explanation": "<plain English explanation>",
      "severity": "high or medium or low",
      "action_email": "Subject: Query regarding [clause name] in my loan agreement\n\nDear Sir/Madam,\n\n[3-4 sentences addressing this clause, asking for clarification or removal]\n\nPlease respond within 7 working days.\n\nYours sincerely,\n[Borrower Name]"
    }
  ],
  "callout_text": "<extract REAL numbers from document. Example: In total you will pay back Rs 57600 — that is Rs 7600 more than you borrowed. Use only numbers explicitly in the document. NEVER write Rs X or placeholder.>",
  "summary": "<2-3 sentence plain language summary>",
  "extracted_figures": {
    "loan_amount": <number from document or null>,
    "interest_rate": <annual rate as number or null>,
    "tenure_months": <months as number or null>,
    "monthly_income": <if mentioned or null>
  }
}`;

// ── Phase 2: Translate user-facing fields only ───────────────────────────────
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

  const prompt = `Translate every string value in the JSON below into ${langName}. Keep all numbers, symbols (₹, %, Rs), and the JSON structure exactly as-is. Only translate the string text. Return ONLY valid JSON, no markdown.\n\n${JSON.stringify(toTranslate)}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL_FAST,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  const translated = parseGroqJson(raw);
  if (!translated) return data; // fallback: return English if translation fails

  // Merge translated fields back
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
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const language = ['hi', 'mr'].includes(body.language) ? body.language : 'en';
    const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

    if (!text) {
      return NextResponse.json({ error: 'text is required and cannot be empty' }, { status: 400 });
    }

    const userPrompt = `Here is the financial document to analyze:\n\n"""\n${text.slice(0, 7000)}\n"""\n\nAnalyze it and return the JSON object now.`;

    // ── Phase 1: Analyze in English ──────────────────────────────────────────
    let result: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: ANALYZE_SYSTEM },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 3500,
        });
        const raw = completion.choices[0]?.message?.content ?? '';
        if (!raw) throw new Error('Empty response from AI');
        result = parseGroqJson(raw);
        if (result && typeof result.clearconsent_score === 'number') break;
        throw new Error('Invalid response structure');
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // Sanitize
    let safe: any = {
      document_type: typeof result.document_type === 'string' ? result.document_type : 'Financial Document',
      clearconsent_score: typeof result.clearconsent_score === 'number' ? Math.min(100, Math.max(0, Math.round(result.clearconsent_score))) : 50,
      score_explanation: typeof result.score_explanation === 'string' ? result.score_explanation : '',
      pros: Array.isArray(result.pros) ? result.pros.filter((x: any) => typeof x === 'string').slice(0, 5) : [],
      cons: Array.isArray(result.cons) ? result.cons.filter((x: any) => typeof x === 'string').slice(0, 5) : [],
      risk_flags: Array.isArray(result.risk_flags) ? result.risk_flags.slice(0, 6) : [],
      callout_text: typeof result.callout_text === 'string' ? result.callout_text : '',
      summary: typeof result.summary === 'string' ? result.summary : '',
      extracted_figures: result.extracted_figures ?? null,
    };

    // ── Phase 2: Translate if non-English ────────────────────────────────────
    if (language !== 'en') {
      try {
        safe = await translateFields(safe, langName);
      } catch {
        // Translation failed — return English result rather than failing entirely
      }
    }

    return NextResponse.json(safe, {
      headers: { 'X-Response-Time': `${Date.now() - start}ms` }
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Analysis failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - start}ms` } }
    );
  }
}
