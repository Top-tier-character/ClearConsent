import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    session_id: v.string(),
    created_at: v.number(),
    language_preference: v.string(), // "en", "hi", "mr"
    device_info: v.optional(v.string()),
  }).index("by_session_id", ["session_id"]),

  consent_records: defineTable({
    consent_id: v.string(),
    session_id: v.string(),
    timestamp: v.number(),
    consent_type: v.string(), // "loan", "mandate", "insurance", "account_opening"
    document_name: v.optional(v.string()),
    consent_summary: v.string(),
    risk_score: v.number(),
    risk_level: v.string(), // "safe", "caution", "danger"
    emi_amount: v.optional(v.number()),
    total_repayment: v.optional(v.number()),
    loan_amount: v.optional(v.number()),
    interest_rate: v.optional(v.number()),
    tenure_months: v.optional(v.number()),
    monthly_income: v.optional(v.number()),
    language_used: v.string(),
    quiz_score: v.number(),
    quiz_passed: v.boolean(),
    all_boxes_confirmed: v.boolean(),
    callout_text: v.optional(v.string()),
    status: v.string(), // "approved", "pending", "flagged"
  }).index("by_session_id", ["session_id"]).index("by_consent_id", ["consent_id"]),

  quiz_results: defineTable({
    session_id: v.string(),
    consent_id: v.string(),
    timestamp: v.number(),
    questions: v.array(v.string()),
    user_answers: v.array(v.string()),
    correct_answers: v.array(v.string()),
    score: v.number(),
    attempts: v.number(),
  }).index("by_consent_id", ["consent_id"]),

  risk_logs: defineTable({
    session_id: v.string(),
    timestamp: v.number(),
    loan_amount: v.number(),
    interest_rate: v.number(),
    tenure_months: v.number(),
    monthly_income: v.number(),
    emi: v.number(),
    total_repayment: v.number(),
    total_interest: v.number(),
    ratio: v.number(),
    risk_score: v.number(),
    risk_level: v.string(),
    projection_data: v.any(),
    whatif_scenarios: v.any(),
    resulted_in_consent: v.boolean(),
  }).index("by_session_id", ["session_id"]),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    password_hash: v.string(),           // empty string for Google OAuth users
    google_id: v.optional(v.string()),
    auth_provider: v.optional(v.string()),  // "credentials" | "google"
    language_preference: v.optional(v.string()), // default "en"
    simplified_mode: v.optional(v.boolean()),    // default false
    dark_mode: v.optional(v.boolean()),          // default false
    created_at: v.number(),
    last_login: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_google_id", ["google_id"]),

  // Chat message history for AI assistant
  chat_messages: defineTable({
    session_id: v.string(),
    user_id: v.optional(v.string()),
    role: v.string(),               // "user" | "assistant"
    content: v.string(),
    timestamp: v.number(),
    page_context: v.optional(v.string()),
    has_prefill: v.optional(v.boolean()),
    prefill_data: v.optional(v.any()),
  }).index("by_session_id", ["session_id"]),
});
