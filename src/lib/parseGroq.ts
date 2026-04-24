export function parseGroqJson<T>(raw: string): T {
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`No JSON found in: ${cleaned.slice(0, 100)}`);
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to fix common JSON issues: trailing commas, control chars
    const fixed = cleaned
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ');
    return JSON.parse(fixed) as T;
  }
}
