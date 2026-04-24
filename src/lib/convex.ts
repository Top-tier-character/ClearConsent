import { ConvexHttpClient } from 'convex/browser';

/**
 * Creates a new ConvexHttpClient.
 * Throws immediately with a clear message if the env var is missing.
 */
export function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
  return new ConvexHttpClient(url);
}

/**
 * Lazy singleton — the client is created only on first call, never at module
 * import time. This prevents server-side crashes during static analysis and
 * in environments where the env var is not yet set (e.g. Vercel preview builds).
 */
let _client: ConvexHttpClient | null = null;
export function convexClient(): ConvexHttpClient {
  if (!_client) _client = getConvexClient();
  return _client;
}
