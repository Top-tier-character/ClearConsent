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
  'Return only a valid JSON object. Do not include markdown formatting, backticks, code fences, or any text outside the JSON object.';

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
 * Instructs Groq to behave as a financial literacy expert for low-income
 * Indian users and return a strictly typed JSON object.
 *
 * The document text is truncated to MAX_DOC_CHARS to keep the prompt fast —
 * key terms (interest rate, principal, penalties) almost always appear early.
 */
export function buildAnalyzePrompt(documentText: string, language: Language): string {
  const lang = LANGUAGE_NAMES[language];

  // Truncate to keep the prompt fast — most key terms appear in the first 4000 chars
  const truncated =
    documentText.length > MAX_DOC_CHARS
      ? documentText.slice(0, MAX_DOC_CHARS) + '\n[...document truncated — analyse the above excerpt]'
      : documentText;

  return `You are a financial literacy expert helping low-income users in India understand financial agreements. Analyse the document below and return a JSON object. All strings MUST be in ${lang}.

DOCUMENT:
"""
${truncated}
"""

Return JSON with exactly these fields:
- "pros": up to 5 short plain strings (benefits the user gets)
- "cons": up to 5 short plain strings (fees or obligations)
- "hidden_clauses": up to 4 strings (non-obvious traps, auto-renewals, penalties)
- "callout_text": one string — if repayment figures exist: "In total you will pay back ₹X — that is ₹Y more than you borrowed", else a plain obligation summary
- "risk_score": number 0-100 (0=safe, 100=very risky)
- "risk_explanation": one plain sentence explaining the score
- "summary": 2-3 plain sentences for someone who has never read a financial contract
- "quiz": exactly 2 objects, each with "question" (string), "options" (array of 4 strings), "correct_answer" (string matching one option exactly) — test comprehension of THIS document's content

All string values must be in ${lang}.

${JSON_ONLY_SUFFIX}`;
}

/**
 * Stricter retry prompt for /api/analyze when the first attempt fails JSON parsing.
 */
export function buildAnalyzeRetryPrompt(documentText: string, language: Language): string {
  return (
    buildAnalyzePrompt(documentText, language) +
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

  return `You are a financial counselor. Based on the loan data below, write a risk narrative and 3 advice tips in ${lang}.

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

  // Compact JSON — no pretty-print, capped to 800 chars each to keep prompt small
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
 * Instructs Groq to preserve all financial figures and use simple everyday
 * vocabulary — not formal banking language.
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
