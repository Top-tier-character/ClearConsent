/**
 * Shared Groq client instance.
 * Initialized once with the GROQ_API_KEY from environment variables.
 * All API routes must import from this file — never create local Groq instances.
 */
import Groq from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables.');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default groq;

/** The model used for all Groq completions across every route.
 *  llama-3.3-70b-versatile is Groq's current 70B model (replaces decommissioned llama3-70b-8192).
 *  Follows language and JSON instructions reliably.
 */
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Maximum document characters sent to Groq. Truncating avoids huge prompts and speeds up inference. */
export const MAX_DOC_CHARS = 4000;
