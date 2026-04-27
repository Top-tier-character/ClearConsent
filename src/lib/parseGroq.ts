export function parseGroqJson<T = any>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty or invalid response from AI');
  }

  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`No valid JSON object found. Response was: ${cleaned.slice(0, 200)}`);
  }

  cleaned = cleaned.slice(first, last + 1);

  // Fix bare control characters (newlines, tabs, carriage returns) inside JSON
  // string values — Groq sometimes outputs these literally, which breaks JSON.parse.
  // This regex matches each quoted JSON string and escapes internal control chars.
  cleaned = cleaned.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (_, content: string) =>
      '"' +
      content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t') +
      '"'
  );

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const fixed = cleaned
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^']*)'/g, ': "$1"');
    return JSON.parse(fixed) as T;
  }
}

