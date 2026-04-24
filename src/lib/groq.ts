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
 *  llama-3.3-70b-versatile is Groq's current 70B model — reliable language and JSON instruction following.
 *  Used for document analysis where accuracy is critical.
 */
export const GROQ_MODEL = 'llama3-70b-8192';

/** Fast model for low-stakes Groq calls (narrative text, tips).
 *  ~5x faster than the 70B model. Use for simulate/confirm routes.
 */
export const GROQ_MODEL_FAST = 'llama-3.1-8b-instant';

/** Maximum document characters sent to Groq. Truncating avoids huge prompts and speeds up inference. */
export const MAX_DOC_CHARS = 4000;
