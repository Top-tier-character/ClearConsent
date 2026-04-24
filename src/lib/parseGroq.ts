export function parseGroqJson<T>(raw: string): T {
  // Strip markdown fences
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Find JSON object boundaries
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`No JSON object found in response: ${cleaned.slice(0, 100)}`);
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`JSON parse failed: ${err}. Raw: ${cleaned.slice(0, 200)}`);
  }
}
