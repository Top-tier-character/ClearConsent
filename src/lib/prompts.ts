/**
 * prompts.ts — All Groq prompt builder functions.
 *
 * Every function accepts typed parameters and returns a fully formed prompt
 * string ready to be sent to Groq. No prompt strings may live inline inside
 * route files — they must all be imported from here.
 *
 * Every prompt ends with the canonical instruction that enforces raw JSON output.
 */

import type { Language } from './store';
import type { RiskLevel } from './finance';
import { MAX_DOC_CHARS } from './groq';

const JSON_ONLY_SUFFIX =
  'Return only valid JSON. No markdown, no backticks, no text outside JSON.';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
};

// ---------------------------------------------------------------------------
// /api/analyze
// ---------------------------------------------------------------------------

/**
 * Build the system prompt for document analysis.
 * Supports `simplified` mode for class-5 reading level output.
 * Returns document_type, specific_clauses, and all standard fields.
 */
export function buildAnalyzePrompt(
  documentText: string,
  language: Language,
  simplified = false
): string {
  const lang = LANGUAGE_NAMES[language];

  const truncated =
    documentText.length > MAX_DOC_CHARS
      ? documentText.slice(0, MAX_DOC_CHARS) + '\n[...document truncated — analyse the above excerpt]'
      : documentText;

  const simplicityInstruction = simplified
    ? `IMPORTANT: Use class 5 reading level. Very short sentences. No financial jargon. Explain every term as if speaking to a child. Maximum 10 words per sentence.`
    : '';

  return `CRITICAL: Respond entirely in ${lang}. Every string value must be in ${lang}.

You are a financial literacy expert helping low-income users in India understand financial agreements.
${simplicityInstruction}

Here is the financial document:

${truncated}

Analyze this document and return ONLY a JSON object with exactly these fields:

- "document_type": string — auto-detect and name the document type (e.g. "Personal Loan Agreement", "Insurance Policy", "Mandate Form", "Account Opening Form", "Credit Card Agreement")
- "pros": array of up to 5 short plain strings — benefits the user gets
- "cons": array of up to 5 short plain strings — fees, penalties, or obligations
- "hidden_clauses": array of up to 4 strings — non-obvious traps, auto-renewals, hidden penalties, prepayment charges
- "specific_clauses": array of up to 5 objects each with:
    - "quote": exact text from the document (max 100 characters)
    - "explanation": plain language meaning of that clause in ${lang}
    - "severity": one of "high" | "medium" | "low"
- "callout_text": one string — read the actual document and extract real rupee figures. Use real numbers, e.g. "In total you will pay back ₹57,600 — that is ₹7,600 more than you borrowed". NEVER write ₹X or ₹Y or placeholder values. If no specific figures, write a plain sentence about the biggest financial obligation.
- "risk_score": number 0–100 (0=safe, 100=very risky)
- "risk_explanation": one plain sentence explaining the score in ${lang}
- "summary": 2–3 plain sentences for someone who has never read a financial contract, in ${lang}
- "quiz": exactly 2 objects each with "question" (string), "options" (array of exactly 4 strings), "correct_answer" (string matching one option exactly) — test comprehension of THIS document
- "extracted_figures": object with loan_amount (number|null), interest_rate (number|null), tenure_months (number|null), monthly_income (number|null) — only values explicitly stated in the document, never guessed

REMINDER: Every string in your JSON must be in ${lang}. This is mandatory.

${JSON_ONLY_SUFFIX}`;
}

/**
 * Stricter retry prompt for /api/analyze when the first attempt fails JSON parsing.
 */
export function buildAnalyzeRetryPrompt(
  documentText: string,
  language: Language,
  simplified = false
): string {
  return (
    buildAnalyzePrompt(documentText, language, simplified) +
    '\n\nCRITICAL: Respond with ONE valid JSON object only. Start with { and end with }. No other text.'
  );
}

// ---------------------------------------------------------------------------
// /api/simulate
// ---------------------------------------------------------------------------

/**
 * Build the prompt asking Groq to generate human-readable risk narrative and
 * advice tips from the pre-calculated simulation numbers.
 */
export function buildSimulateNarrativePrompt(params: {
  language: Language;
  emi: number;
  totalRepayment: number;
  totalInterest: number;
  emiRatio: number;
  riskLevelValue: RiskLevel;
  monthlyIncome: number;
  loanAmount: number;
  tenureMonths: number;
  annualRate: number;
}): string {
  const lang = LANGUAGE_NAMES[params.language];
  const { emi, totalRepayment, totalInterest, emiRatio, riskLevelValue, monthlyIncome, loanAmount, tenureMonths, annualRate } = params;

  return `CRITICAL INSTRUCTION: Respond entirely in ${lang}. Every string in your JSON must be in ${lang}.

You are a financial counselor. Based on the loan data below, write a risk narrative and 3 advice tips in ${lang}.

EMI: ₹${emi.toFixed(0)} | Total Repayment: ₹${totalRepayment.toFixed(0)} | Interest: ₹${totalInterest.toFixed(0)} | Income: ₹${monthlyIncome.toFixed(0)} | EMI/Income: ${emiRatio.toFixed(1)}% | Risk: ${riskLevelValue.toUpperCase()} | Loan: ₹${loanAmount.toFixed(0)} | Rate: ${annualRate}% | Tenure: ${tenureMonths}mo

Return JSON:
- "risk_narrative": 2-3 plain sentences explaining the risk in ${lang}
- "advice_tips": array of exactly 3 short advice strings in ${lang} (protective if DANGER, encouraging if SAFE, balanced if CAUTION)

${JSON_ONLY_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// /api/confirm
// ---------------------------------------------------------------------------

/**
 * Build the prompt for generating the consent summary paragraph.
 * Data is compacted (no pretty-print) to reduce prompt size.
 */
export function buildConsentSummaryPrompt(params: {
  language: Language;
  simulationData: object;
  analysisData: object;
}): string {
  const lang = LANGUAGE_NAMES[params.language];

  const simJson = JSON.stringify(params.simulationData).slice(0, 800);
  const anaJson = JSON.stringify(params.analysisData).slice(0, 800);

  return `Write a 3-4 sentence first-person consent summary in ${lang} for a user who just agreed to a financial document on ClearConsent. Start with "I understand that I am...". Use plain language for a low-literacy adult.

Data: ${simJson} | ${anaJson}

Return JSON with one field:
- "consent_summary": the paragraph as a string in ${lang}

${JSON_ONLY_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// /api/translate
// ---------------------------------------------------------------------------

/**
 * Build the prompt for translating UI text mid-session.
 */
export function buildTranslatePrompt(text: string, targetLanguage: 'hi' | 'mr'): string {
  const langName = targetLanguage === 'hi' ? 'Hindi' : 'Marathi';

  return `Translate the text below into ${langName}. Rules: keep all numbers/amounts/percentages unchanged; use simple everyday ${langName}, not formal banking terms; do not add or remove information.

TEXT:
"""
${text}
"""

Return JSON with one field:
- "translated_text": the translated string

${JSON_ONLY_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// /api/assistant
// ---------------------------------------------------------------------------

/**
 * Build the system prompt for the AI assistant.
 * Injects analysis and simulation context when available.
 * Handles loan simulation detection for prefill_simulate.
 */
export function buildAssistantSystemPrompt(params: {
  language: Language;
  currentAnalysis?: Record<string, unknown> | null;
  currentSimulation?: Record<string, unknown> | null;
}): string {
  const lang = LANGUAGE_NAMES[params.language];

  const lines: string[] = [
    `You are ClearConsent AI, a friendly financial literacy assistant helping users in India understand financial documents. You speak in simple, clear language. Always respond in ${lang}.`,
    '',
    'Your job is to help users understand loan agreements, insurance policies, EMI calculations, hidden fees, and their rights as borrowers.',
    '',
  ];

  if (params.currentAnalysis) {
    const summary = JSON.stringify({
      document_type: params.currentAnalysis.document_type,
      risk_score: params.currentAnalysis.risk_score,
      summary: params.currentAnalysis.summary,
      callout_text: params.currentAnalysis.callout_text,
      hidden_clauses: params.currentAnalysis.hidden_clauses,
      extracted_figures: params.currentAnalysis.extracted_figures,
    }).slice(0, 1200);
    lines.push(`The user has analyzed a document. Here is the analysis: ${summary}`);
    lines.push('Answer questions specifically about this document when relevant.');
    lines.push('');
  }

  if (params.currentSimulation) {
    const simSummary = JSON.stringify({
      loan_amount: params.currentSimulation.loan_amount,
      interest_rate: params.currentSimulation.interest_rate,
      tenure_months: params.currentSimulation.tenure_months,
      monthly_income: params.currentSimulation.monthly_income,
      emi: params.currentSimulation.emi,
      total_repayment: params.currentSimulation.total_repayment,
      risk_level: params.currentSimulation.risk_level,
      risk_score: params.currentSimulation.risk_score,
    }).slice(0, 800);
    lines.push(`The user has simulated a loan with these details: ${simSummary}`);
    lines.push('Answer questions about this specific loan simulation when relevant.');
    lines.push('');
  }

  lines.push(
    `SIMULATION DETECTION: If the user's message contains keywords like "simulate", "calculate", "borrow", "loan amount", "EMI", "interest rate", "tenure", "how much" — ask conversationally to collect: loan_amount, interest_rate (annual %), tenure_months, monthly_income. Once you have all four values, include a JSON field called "prefill_simulate" in your response with those exact keys and values.`,
    '',
    `RESPONSE FORMAT: Always return a JSON object with:`,
    `- "reply": your response text in ${lang} (friendly, simple, conversational)`,
    `- "prefill_simulate": (optional) object with loan_amount, interest_rate, tenure_months, monthly_income — only when all four values are known from the conversation`,
    '',
    JSON_ONLY_SUFFIX
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// /api/compare
// ---------------------------------------------------------------------------

/**
 * Build the prompt for comparing two financial documents side by side.
 */
export function buildComparePrompt(
  text1: string,
  text2: string,
  language: Language
): string {
  const lang = LANGUAGE_NAMES[language];

  const t1 = text1.slice(0, 2000);
  const t2 = text2.slice(0, 2000);

  return `CRITICAL: Respond entirely in ${lang}. Every string value must be in ${lang}.

You are a financial literacy expert. Compare the two financial documents below and return a structured comparison.

DOCUMENT 1:
"""
${t1}
"""

DOCUMENT 2:
"""
${t2}
"""

Return ONLY a JSON object with exactly these fields:

- "doc1": full analysis object with fields: document_type, pros (array), cons (array), hidden_clauses (array), risk_score (number), risk_explanation (string), summary (string), callout_text (string), extracted_figures (object with loan_amount, interest_rate, tenure_months, monthly_income — number or null)
- "doc2": same structure as doc1
- "comparison": object with:
    - "winner": "doc1" | "doc2" | "equal"
    - "verdict": string in ${lang} — plain language explanation of which document is better and why
    - "table": array of objects each with "parameter" (string), "doc1_value" (string), "doc2_value" (string), "winner" ("doc1" | "doc2" | "equal")
      Compare these parameters: Interest Rate, Total Cost, Monthly Payment, Hidden Clauses Count, Risk Score, Flexibility

${JSON_ONLY_SUFFIX}`;
}
