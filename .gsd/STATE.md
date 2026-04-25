# STATE.md — Session Memory

> **Status**: Active (initialized 2026-04-25)

## Current Position

**Phase**: 5 — Production Hardening
**Task**: Not yet started — waiting for /plan 5
**Last Action**: /execute 4 and /verify 4 completed

## Project Summary

ClearConsent is a brownfield Next.js 14 App Router project — substantial working code exists.
Phases 1, 2, 3, and 4 are complete. The codebase has a full analyze pipeline, Convex DB, NextAuth, and the core UI bugs have been addressed, along with History, Profile polish, Simulate, and Compare features.

## Known Blockers

*(None currently. All previous blockers from Phase 3 were resolved.)*

## Key Architecture Decisions

- **Convex for BaaS** — All persistence goes through Convex (not a traditional DB). Use `getConvexClient()` from `src/lib/convex.ts` for server-side queries.
- **Groq LLM** — Primary AI provider. All prompts in `src/lib/prompts.ts`. Parse responses with `src/lib/parseGroq.ts`.
- **NextAuth v4 JWT** — Session stored as JWT, not DB sessions. Access via `getServerSession(authOptions)` in server components.
- **Zustand** — Client-side state for current analysis result and history. Does NOT persist to localStorage by default.
- **pnpm** — Package manager. Use `pnpm` not `npm` for installs.

## Context Dump

### Files Most Likely to Need Changes in Phase 4
- `src/app/history/page.tsx` — Load history from Convex
- `src/app/profile/page.tsx` — Add user settings
- `src/app/simulate/page.tsx` — Build EMI simulation page

### Convex Pattern
```ts
// Server-side (API routes, server components)
import { getConvexClient } from '@/lib/convex';
import { api } from '../../convex/_generated/api';
const client = getConvexClient();
const result = await client.query(api.queries.someQuery, { ... });
```

### Groq Pattern
```ts
import Groq from 'groq-sdk';
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
// See src/lib/groq.ts for singleton
```

## Next Steps (Recommended)

1. `/plan 5` — Create detailed execution plan for Phase 5
2. `/execute 5` — Implement rate limiting, error monitoring, and testing
