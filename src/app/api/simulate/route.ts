import { NextRequest, NextResponse } from 'next/server';
import groq, { GROQ_MODEL_FAST } from '@/lib/groq';
import { parseGroqJson } from '@/lib/parseGroq';
import { buildSimulateNarrativePrompt } from '@/lib/prompts';
import {
  calculateEMI,
  totalRepayment,
  totalInterest,
  emiToIncomeRatio,
  riskLevel,
  compositeRiskScore,
  buildProjection,
  buildWhatIfScenarios,
  penaltyExposure,
  estimatedLivingCost,
  type RiskLevel,
} from '@/lib/finance';
import type { Language } from '@/lib/store';
import { convex } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

interface SimulateBody {
  session_id?: unknown;

  loan_amount?: unknown;
  interest_rate?: unknown;
  tenure_months?: unknown;
  monthly_income?: unknown;
  language?: unknown;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: SimulateBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 2. Validate required numeric fields ────────────────────────────────
    const missing: string[] = [];
    if (body.loan_amount === undefined || body.loan_amount === null) missing.push('loan_amount');
    if (body.interest_rate === undefined || body.interest_rate === null) missing.push('interest_rate');
    if (body.tenure_months === undefined || body.tenure_months === null) missing.push('tenure_months');
    if (body.monthly_income === undefined || body.monthly_income === null) missing.push('monthly_income');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: `The following fields are required: ${missing.join(', ')}.`,
        },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const loan_amount = Number(body.loan_amount);
    const interest_rate = Number(body.interest_rate);
    const tenure_months = Number(body.tenure_months);
    const monthly_income = Number(body.monthly_income);
    const language: Language =
      body.language === 'hi' || body.language === 'mr' ? (body.language as Language) : 'en';

    // Validate numeric sanity
    if ([loan_amount, interest_rate, tenure_months, monthly_income].some((v) => isNaN(v) || v < 0)) {
      return NextResponse.json(
        { error: 'Invalid field values', details: 'All numeric fields must be non-negative numbers.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── 3. Server-side financial calculations ──────────────────────────────
    const emi = calculateEMI(loan_amount, interest_rate, tenure_months);
    const total_repayment = totalRepayment(emi, tenure_months);
    const total_interest = totalInterest(total_repayment, loan_amount);
    const emi_ratio = emiToIncomeRatio(emi, monthly_income);
    const risk_level_value: RiskLevel = riskLevel(emi_ratio);
    const risk_score = compositeRiskScore(emi_ratio, tenure_months, interest_rate);
    const living_cost = estimatedLivingCost(monthly_income);
    const penalty_exposure = penaltyExposure(emi);
    const projection = buildProjection(emi, monthly_income, tenure_months);
    const what_if_scenarios = buildWhatIfScenarios(emi, monthly_income);

    // ── 4. Ask Groq for narrative text ─────────────────────────────────────
    const narrativePrompt = buildSimulateNarrativePrompt({
      language,
      emi,
      totalRepayment: total_repayment,
      totalInterest: total_interest,
      emiRatio: emi_ratio,
      riskLevelValue: risk_level_value,
      monthlyIncome: monthly_income,
      loanAmount: loan_amount,
      tenureMonths: tenure_months,
      annualRate: interest_rate,
    });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL_FAST,
      messages: [{ role: 'user', content: narrativePrompt }],
      temperature: 0.5,
      max_tokens: 220,
    });

    const rawNarrative = completion.choices[0]?.message?.content ?? '{}';
    let narrativeData: { risk_narrative?: string; advice_tips?: string[] } = {};

    try {
      narrativeData = parseGroqJson(rawNarrative);
    } catch {
      // Non-fatal: return empty narrative strings rather than failing the whole request
      narrativeData = { risk_narrative: '', advice_tips: [] };
    }

    // ── 5. Save risk log ───────────────────────────────────────────────────
    if (body.session_id) {
      await convex.mutation(api.mutations.saveRiskLog, {
        session_id: String(body.session_id),
        timestamp: Date.now(),
        loan_amount,
        interest_rate,
        tenure_months,
        monthly_income,
        emi,
        total_repayment,
        total_interest,
        ratio: emi_ratio,
        risk_score,
        risk_level: risk_level_value,
        projection_data: projection,
        whatif_scenarios: what_if_scenarios,
        resulted_in_consent: false,
      });
    }

    // ── 6. Return combined response ────────────────────────────────────────
    return NextResponse.json(
      {
        // Inputs echoed back
        loan_amount,
        interest_rate,
        tenure_months,
        monthly_income,
        language,

        // Calculated figures
        emi,
        total_repayment,
        total_interest,
        emi_ratio,
        risk_level: risk_level_value,
        risk_score,
        living_cost,
        penalty_exposure,
        projection,
        what_if_scenarios,

        // Groq-generated narrative
        risk_narrative: narrativeData.risk_narrative ?? '',
        advice_tips: narrativeData.advice_tips ?? [],
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
