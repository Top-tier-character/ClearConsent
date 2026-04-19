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

  return `CRITICAL INSTRUCTION: You must respond ENTIRELY in ${lang}. Every single string value in your JSON response must be written in ${lang}. Do not use any other language.

You are a financial literacy expert helping low-income users in India understand financial agreements. All strings MUST be in ${lang}.

Here is the financial document:

${truncated}

Analyze this and return only the JSON object with exactly these fields:
- "pros": up to 5 short plain strings (benefits the user gets)
- "cons": up to 5 short plain strings (fees or obligations)
- "hidden_clauses": up to 4 strings (non-obvious traps, auto-renewals, penalties)
- "callout_text": one string — read the actual document text and extract real rupee figures mentioned (principal, total repayment, total cost). Use those real numbers to write the sentence. Example: if document says loan of ₹50000 repaid as ₹57600 write "In total you will pay back ₹57,600 — that is ₹7,600 more than you borrowed". If no specific figures exist write a plain sentence about the biggest financial obligation. NEVER write ₹X or ₹Y or any placeholder — always use real numbers from the document
- "risk_score": number 0-100 (0=safe, 100=very risky)
- "risk_explanation": one plain sentence explaining the score
- "summary": 2-3 plain sentences for someone who has never read a financial contract
- "quiz": exactly 2 objects, each with "question" (string), "options" (array of 4 strings), "correct_answer" (string matching one option exactly) — test comprehension of THIS document's content
- "extracted_figures": Look carefully through the document text for any financial figures. Extract these exact values if found — loan_amount (the principal amount being borrowed in rupees as a plain number with no commas or symbols), interest_rate (annual interest rate as a plain number, e.g. 12 for 12%), tenure_months (loan duration in months as a plain number — if given in years multiply by 12), monthly_income (any mentioned monthly income or salary as a plain number). If a value is not mentioned anywhere in the document set it to null. Never guess or estimate — only return values explicitly stated in the document. Shape: { "loan_amount": number|null, "interest_rate": number|null, "tenure_months": number|null, "monthly_income": number|null }

REMINDER: Every string in your JSON response must be in ${lang} only. This is mandatory.

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
