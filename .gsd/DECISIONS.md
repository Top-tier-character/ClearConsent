# DECISIONS.md — Architecture Decision Records

## ADR-001: Convex as BaaS
**Date**: 2026-04
**Decision**: Use Convex instead of a traditional database (Postgres/Supabase)
**Rationale**: Real-time subscriptions, serverless-native, no connection pooling issues with Next.js Edge/Serverless functions
**Consequences**: Must use Convex client SDK; all queries/mutations go through generated API; schema changes require `npx convex dev`

---

## ADR-002: NextAuth v4 with JWT Strategy
**Date**: 2026-04
**Decision**: NextAuth v4 (not v5/auth.js), JWT sessions (not DB sessions)
**Rationale**: Stable v4 API, no DB session table needed, compatible with Convex pattern
**Consequences**: Session data limited to what fits in JWT; must use `getServerSession()` in server components; upgrade to v5 is a significant refactor

---

## ADR-003: Groq for LLM Inference
**Date**: 2026-04
**Decision**: Groq API (llama-3.3-70b-versatile / mixtral-8x7b) for all AI features
**Rationale**: Fastest inference speed, generous free tier, sufficient quality for document analysis
**Consequences**: All prompts in `src/lib/prompts.ts`; responses parsed by `src/lib/parseGroq.ts`; rate limit risk on heavy usage

---

## ADR-004: Zustand for Client State
**Date**: 2026-04
**Decision**: Zustand for global client-side state (current analysis, language, history)
**Rationale**: Minimal boilerplate, no context provider nesting, works well with Next.js App Router
**Consequences**: State resets on page refresh (not persisted to localStorage); history must be re-fetched from Convex on login

---

## ADR-005: pnpm as Package Manager
**Date**: 2026-04
**Decision**: pnpm (not npm or yarn)
**Rationale**: Faster installs, strict dependency resolution, disk-space efficient
**Consequences**: Always use `pnpm add`, `pnpm install`, `pnpm run dev` — never `npm install`
