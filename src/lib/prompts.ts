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
export function buildAnalyzePrompt(text: string, language: Language, simplified: boolean = false): string {
  const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
  const readingLevel = simplified
    ? 'Use extremely simple language. Short sentences. No jargon. Like explaining to a 10-year-old.'
    : 'Use clear simple language. Explain any financial term you use.';

  return `CRITICAL INSTRUCTION: You must respond ENTIRELY in ${langName}. Every single value in the JSON must be written in ${langName}. This is mandatory.

You are a financial literacy expert helping low-income users in India understand financial documents. Analyze the document below and return a JSON object.

${readingLevel}

DOCUMENT TO ANALYZE:
"""
${text.slice(0, 6000)}
"""

Return ONLY this JSON structure with no other text:
{
  "document_type": "one of: Loan Agreement, Insurance Policy, Auto-Pay Mandate, Account Opening, Rental Agreement, Credit Card Terms, Other",
  "pros": ["benefit 1", "benefit 2", "benefit 3"],
  "cons": ["obligation 1", "obligation 2", "obligation 3"],
  "hidden_clauses": ["risk 1", "risk 2", "risk 3"],
  "specific_clauses": [
    {
      "quote": "exact short quote from document max 80 chars",
      "explanation": "what this means in plain language",
      "severity": "high"
    }
  ],
  "callout_text": "Extract REAL numbers from document. Example: In total you will pay back Rs 57600 - that is Rs 7600 more than you borrowed. NEVER write Rs X or Rs Y.",
  "risk_score": 65,
  "risk_explanation": "one sentence why this score",
  "summary": "2-3 sentences plain language summary",
  "extracted_figures": {
    "loan_amount": 50000,
    "interest_rate": 18,
    "tenure_months": 12,
    "monthly_income": null
  },
  "quiz": [
    {
      "question": "question about the document",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "option A"
    },
    {
      "question": "second question",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "option B"
    }
  ]
}

RULES:
- Use ONLY real numbers found in the document for callout_text and extracted_figures
- If a number is not in the document set it to null
- pros, cons, hidden_clauses must each have 3-5 items
- specific_clauses must have 2-4 items with severity "high", "medium", or "low"
- quiz must have exactly 2 questions each with exactly 4 options
- Return ONLY the JSON object. No markdown. No backticks. No explanation.`;
}

/**
 * Stricter retry prompt for /api/analyze when the first attempt fails JSON parsing.
 */
export function buildAnalyzeRetryPrompt(text: string, language: Language, simplified = false): string {
  return (
    buildAnalyzePrompt(text, language, simplified) +
    '\n\nCRITICAL: Respond with ONE valid JSON object only. Start with { and end with }. No other text.'
  );
}

// (original buildAnalyzePrompt replaced above)
function _unused_buildAnalyzePromptOld(
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
export function buildAssistantSystemPrompt({
  language,
  currentAnalysis,
  currentSimulation,
}: {
  language: Language;
  currentAnalysis: any;
  currentSimulation: any;
}): string {
  const lang = LANGUAGE_NAMES[language];

  let contextBlock = '';

  if (currentAnalysis) {
    contextBlock = `
DOCUMENT CONTEXT — The user has analyzed a financial document. Here are the key findings:
- Document type: ${currentAnalysis.documentType ?? currentAnalysis.document_type ?? 'Financial Document'}
- Risk score: ${currentAnalysis.riskScore ?? currentAnalysis.risk_score}/100
- Risk explanation: ${currentAnalysis.risk_explanation ?? currentAnalysis.riskExplanation ?? ''}
- Key benefits: ${(currentAnalysis.pros ?? []).join(', ')}
- Key obligations: ${(currentAnalysis.cons ?? []).join(', ')}
- Hidden clauses: ${(currentAnalysis.hiddenClauses ?? currentAnalysis.hidden_clauses ?? []).join(', ')}
- Summary: ${currentAnalysis.summary ?? ''}
Answer ALL questions specifically about THIS document. Do not give generic answers.`;
  }

  if (currentSimulation) {
    contextBlock += `
SIMULATION CONTEXT — The user has simulated a loan:
- Loan amount: \u20b9${currentSimulation.loanAmount?.toLocaleString() ?? currentSimulation.loan_amount?.toLocaleString() ?? 'unknown'}
- Monthly EMI: \u20b9${currentSimulation.emi?.toLocaleString() ?? 'unknown'}
- Total repayment: \u20b9${currentSimulation.totalRepayment?.toLocaleString() ?? currentSimulation.total_repayment?.toLocaleString() ?? 'unknown'}
- EMI to income ratio: ${currentSimulation.ratio ?? currentSimulation.emiRatio ?? 'unknown'}%
- Risk level: ${currentSimulation.riskLevel ?? currentSimulation.risk_level ?? 'unknown'}
Answer ALL questions specifically about THIS simulation.`;
  }

  return `You are ClearConsent AI, a friendly and knowledgeable financial literacy assistant helping users in India understand financial documents and make informed decisions.

PERSONALITY: Warm, clear, honest. Use simple language. Never use jargon without explaining it. Be encouraging but honest about risks.

LANGUAGE: Respond entirely in ${lang}. Every response must be in ${lang} only.
${contextBlock}

CAPABILITIES:
- Explain financial terms in simple language
- Warn about risky clauses and hidden fees
- Help users understand their loan obligations
- Guide users through the platform features
- Help collect loan simulation data conversationally

SIMULATION HELPER: If the user wants to simulate a loan, ask for these values one at a time in a friendly conversational way: loan amount, annual interest rate, tenure in months, monthly income. Once you have all four values, return them as a JSON object with field prefill_simulate containing loan_amount, interest_rate, tenure_months, monthly_income as numbers.

RESPONSE FORMAT: For normal conversation respond with plain text. Only use JSON format when returning prefill_simulate data.

Keep responses concise — maximum 3 sentences for simple questions, maximum 5 sentences for complex explanations.`;
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
