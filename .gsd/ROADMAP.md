# ROADMAP.md

> **Current Phase**: Phase 3 — Bug Fixes & Feature Completion
> **Milestone**: v1.0 Production-Ready

## Must-Haves (from SPEC)

- [x] Document analysis API returning structured JSON
- [x] PDF upload, OCR, and paste-text input
- [x] Convex database schema (7 tables)
- [x] NextAuth with Google OAuth + credentials
- [x] Document history persistence
- [ ] Correct EMI formula in analyze page (uses dummy calc currently)
- [ ] "Ask AI About This" button wired to AI assistant
- [ ] App builds to Vercel without errors
- [ ] Local dev OAuth working (`NEXTAUTH_URL` fix)

---

## Phases

### Phase 1: Foundation — Database & Auth
**Status**: ✅ Complete
**Objective**: Convex schema, user CRUD, NextAuth integration, Google OAuth sync
**Deliverables**: schema.ts, mutations.ts, queries.ts, authOptions.ts, ConvexClientProvider

---

### Phase 2: Core Product — Analysis Engine
**Status**: ✅ Complete
**Objective**: Full analyze pipeline: upload → extract → LLM → dashboard
**Deliverables**: /api/analyze, /api/extract-pdf, /api/ocr, analyze/page.tsx (upload + dashboard phases), AiAssistant component, RiskMeter, Zustand store

---

### Phase 3: Bug Fixes & Feature Completion
**Status**: 🔵 In Progress
**Objective**: Fix known bugs, wire up disconnected features, ensure build passes
**Key Tasks**:
- Fix dummy EMI calculation in analyze/page.tsx (use finance.ts)
- Wire "Ask AI About This" button to AiAssistant component
- Fix `NEXTAUTH_URL` for local development
- Fix package.json `name` field ("temp" → "clearconsent")
- Add error boundaries to client components
- Verify full Vercel build passes

---

### Phase 4: History, Profile & Polish
**Status**: ⬜ Not Started
**Objective**: Complete history page, profile stats, document comparison, simulate page
**Key Tasks**:
- History page: fetch from Convex, display with risk scores
- Profile page: stats from /api/profile/stats, settings
- Simulate page: full EMI what-if simulator
- Compare feature: side-by-side document analysis
- Translation: Hindi/Marathi output working end-to-end

---

### Phase 5: Production Hardening
**Status**: ⬜ Not Started
**Objective**: Rate limiting, input validation, error monitoring, tests
**Key Tasks**:
- API rate limiting (protect Groq and Vision API costs)
- Input validation on all API routes
- Add error boundary components
- Smoke tests for critical paths (analyze flow, auth flow)
- Performance audit (Core Web Vitals)
