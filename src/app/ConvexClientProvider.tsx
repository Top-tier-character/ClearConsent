"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Fall back to a placeholder URL so the app loads even if the env var is
// temporarily missing (e.g. a Vercel preview without all vars set).
// Convex queries will fail gracefully rather than crashing at module init.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';
const convex = new ConvexReactClient(convexUrl || 'https://placeholder.convex.cloud');

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
