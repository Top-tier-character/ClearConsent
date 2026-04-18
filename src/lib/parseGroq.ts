/**
 * Utility to safely parse Groq's text response into a JSON object.
 *
 * Groq sometimes wraps the JSON in markdown code fences (```json … ```) even
 * when instructed not to. This function:
 *  1. Strips any leading/trailing whitespace.
 *  2. Removes markdown fences (```json, ```, ~~~).
 *  3. Attempts JSON.parse on the cleaned string.
 *  4. Throws a descriptive error so callers can surface it cleanly.
 */
export function parseGroqJson<T = unknown>(raw: string): T {
  let cleaned = raw.trim();

  // Remove opening markdown fences: ```json or ``` or ~~~
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  // Remove closing markdown fences
  cleaned = cleaned.replace(/\s*```\s*$/i, '');
  cleaned = cleaned.replace(/^~~~(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*~~~\s*$/i, '');

  // Strip any leading text before the first '{' or '['
  const jsonStart = cleaned.search(/[{[]/);
  if (jsonStart > 0) {
    cleaned = cleaned.slice(jsonStart);
  }

  // Strip any trailing text after the last '}' or ']'
  const jsonEnd = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (jsonEnd !== -1 && jsonEnd < cleaned.length - 1) {
    cleaned = cleaned.slice(0, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse Groq response as JSON. Raw (first 500 chars): "${raw.slice(0, 500)}". Parse error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
