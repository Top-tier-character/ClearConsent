# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision

ClearConsent is an anti-predatory lending tool that empowers everyday consumers — especially those with low financial literacy — to understand, evaluate, and push back against complex financial agreements. Users upload any financial document (loan contracts, insurance policies, auto-pay mandates, account-opening forms) and receive instant AI-powered analysis: a risk score, plain-language explanations of every clause, a list of red flags with severity ratings, a true cost breakdown, and ready-to-send negotiation email templates. The goal is to level the playing field between consumers and financial institutions.

## Goals

1. **Analyze financial documents** — Extract text from PDF/image/paste, run Groq LLM analysis, return risk score + structured flags in <10 seconds
2. **Educate users** — Plain-language summaries, paragraph-level explanations, AI chat assistant for follow-up questions
3. **Empower action** — Generate negotiation email templates, quiz-based comprehension checks, EMI affordability calculator
4. **Persist history** — Save all analyses to Convex for authenticated users; show history, stats, and comparison across documents
5. **Support multiple languages** — English, Hindi (हिन्दी), Marathi (मराठी) for analysis output

## Non-Goals (Out of Scope)

- Legal advice or document signing workflows
- Payment processing or financial transactions
- Real-time lender data / rate comparison marketplace
- Mobile native app (web-only, responsive design)
- Enterprise / multi-tenant features

## Users

**Primary:** Individual consumers in India (English, Hindi, Marathi speakers) who have received a loan agreement, insurance policy, or mandate from a bank/NBFC and want to understand what they're signing before committing.

**Secondary:** Financial counselors and consumer advocates helping clients evaluate documents.

## Constraints

- **Runtime:** Next.js 14 App Router on Vercel (serverless functions, 10s timeout)
- **Database:** Convex BaaS (EU West 1 region); no raw SQL
- **Auth:** NextAuth v4 with JWT strategy; Google OAuth + email/password credentials
- **LLM:** Groq API (llama-3.3-70b or mixtral-8x7b); must stay within rate limits
- **OCR:** Google Cloud Vision API (1000 free calls/month)
- **Package manager:** pnpm
- **Styling:** Tailwind CSS v3 + shadcn/ui; brand color `#1B2A4A` (navy)

## Success Criteria

- [ ] Document analysis returns valid JSON with risk_score, risk_flags, action_plan, extracted_figures in <10s
- [ ] PDF upload, image OCR, and paste-text all produce analyzable text
- [ ] Authenticated users see full history of analyzed documents
- [ ] Google OAuth and email/password login both work end-to-end
- [ ] App builds and deploys to Vercel without errors
- [ ] Risk score calculation uses the proper EMI formula from `finance.ts` (not the dummy calculation)
- [ ] AI assistant chat is wired up to the Action Plan "Ask AI About This" button
