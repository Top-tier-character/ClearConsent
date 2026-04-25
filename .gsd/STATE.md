# STATE.md — Session Memory

> **Status**: Active (initialized 2026-04-25)

## Current Position

**Phase**: 3 — Bug Fixes & Feature Completion
**Task**: Not yet started — waiting for /plan 3
**Last Action**: /map + /new-project initialization complete

## Project Summary

ClearConsent is a brownfield Next.js 14 App Router project — substantial working code exists.
Phases 1 and 2 are complete. The codebase has a full analyze pipeline, Convex DB, and NextAuth.

## Known Blockers

1. **Dummy EMI calc** — `analyze/page.tsx:181` uses `loanAmount * 1.1 / 12` instead of the real formula from `src/lib/finance.ts`
2. **Disconnected UI** — "Ask AI About This" button in Action Plan tab has no onClick handler
3. **NEXTAUTH_URL hardcoded to production** — `.env.local` has `NEXTAUTH_URL=https://clearconsent-one.vercel.app` which breaks local Google OAuth callback
4. **package.json name** — Set to `"temp"` instead of `"clearconsent"`

## Key Architecture Decisions

- **Convex for BaaS** — All persistence goes through Convex (not a traditional DB). Use `getConvexClient()` from `src/lib/convex.ts` for server-side queries.
- **Groq LLM** — Primary AI provider. All prompts in `src/lib/prompts.ts`. Parse responses with `src/lib/parseGroq.ts`.
- **NextAuth v4 JWT** — Session stored as JWT, not DB sessions. Access via `getServerSession(authOptions)` in server components.
- **Zustand** — Client-side state for current analysis result and history. Does NOT persist to localStorage by default.
- **pnpm** — Package manager. Use `pnpm` not `npm` for installs.

## Context Dump

### Files Most Likely to Need Changes in Phase 3
- `src/app/analyze/page.tsx` — Fix EMI calc + wire AI button
- `src/lib/finance.ts` — Source of truth for EMI formula
- `src/components/AiAssistant.tsx` — Needs to accept external trigger
- `.env.local` — NEXTAUTH_URL needs conditional handling
- `package.json` — name field

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

1. `/plan 3` — Create detailed execution plan for Phase 3 bug fixes
2. `/execute 3` — Fix EMI calc, wire AI button, fix NEXTAUTH_URL, fix package name
3. `/verify 3` — Run build, check analyze flow end-to-end
