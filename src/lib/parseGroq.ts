/**
 * Utility to safely parse Groq's text response into a JSON object.
 *
 * Groq sometimes wraps the JSON in markdown code fences even when instructed
 * not to. This function strips all common leakage patterns before parsing.
 */
export function parseGroqJson<T = unknown>(raw: string): T {
  // Use the explicit replace pattern requested: strip all backtick fences
  let cleaned = raw.replace(/```json|```/g, '').trim();

  // Also strip tilde fences and opening/closing whitespace
  cleaned = cleaned.replace(/~~~(?:json)?/gi, '').trim();

  // Strip any leading text before the first '{' or '['
  const jsonStart = cleaned.search(/[{[]/);
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);

  // Strip any trailing text after the last '}' or ']'
  const jsonEnd = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (jsonEnd !== -1 && jsonEnd < cleaned.length - 1) cleaned = cleaned.slice(0, jsonEnd + 1);

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse Groq response as JSON. Raw (first 500 chars): "${raw.slice(0, 500)}". Parse error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
