import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: {
    session_id: v.string(),
    language_preference: v.string(),
    device_info: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("sessions", {
      session_id: args.session_id,
      created_at: Date.now(),
      language_preference: args.language_preference,
      device_info: args.device_info,
    });
  },
});

export const saveQuizResult = mutation({
  args: {
    session_id: v.string(),
    consent_id: v.string(),
    timestamp: v.number(),
    questions: v.array(v.string()),
    user_answers: v.array(v.string()),
    correct_answers: v.array(v.string()),
    score: v.number(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quiz_results", args);
  },
});

export const saveConsentRecord = mutation({
  args: {
    consent_id: v.string(),
    session_id: v.string(),
    timestamp: v.number(),
    consent_type: v.string(),
    document_name: v.optional(v.string()),
    consent_summary: v.string(),
    risk_score: v.number(),
    risk_level: v.string(),
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
    status: v.string(),

    // Extra fields to trigger saveQuizResult inline
    quiz_answers: v.optional(
      v.array(
        v.object({
          question: v.string(),
          user_answer: v.string(),
          correct_answer: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { quiz_answers, ...consentArgs } = args;
    
    await ctx.db.insert("consent_records", consentArgs);

    if (quiz_answers && quiz_answers.length > 0) {
      await ctx.db.insert("quiz_results", {
        session_id: consentArgs.session_id,
        consent_id: consentArgs.consent_id,
        timestamp: consentArgs.timestamp,
        questions: quiz_answers.map((a) => a.question),
        user_answers: quiz_answers.map((a) => a.user_answer),
        correct_answers: quiz_answers.map((a) => a.correct_answer),
        score: consentArgs.quiz_score,
        attempts: 1,
      });
    }

    return consentArgs.consent_id;
  },
});

export const saveRiskLog = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("risk_logs", args);
  },
});

export const updateRiskLogConsent = mutation({
  args: {
    session_id: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("risk_logs")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
      .order("desc")
      .take(1);
    
    if (logs.length > 0) {
      await ctx.db.patch(logs[0]._id, { resulted_in_consent: true });
    }
  },
});

export const updateConsentStatus = mutation({
  args: {
    consent_id: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("consent_records")
      .withIndex("by_consent_id", (q) => q.eq("consent_id", args.consent_id))
      .first();

    if (record) {
      await ctx.db.patch(record._id, { status: args.status });
    }
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password_hash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password_hash: args.password_hash,
      created_at: Date.now(),
    });
  },
});

/** Update user name and/or email */
export const updateUser = mutation({
  args: {
    email: v.string(),           // lookup key (current email)
    new_name: v.optional(v.string()),
    new_email: v.optional(v.string()),
    new_password_hash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("User not found.");

    const patch: Record<string, string> = {};
    if (args.new_name) patch.name = args.new_name;
    if (args.new_email) patch.email = args.new_email;
    if (args.new_password_hash) patch.password_hash = args.new_password_hash;

    await ctx.db.patch(user._id, patch);
    return true;
  },
});

/** Persist a single chat turn (user or assistant) */
export const saveChatMessage = mutation({
  args: {
    session_id: v.string(),
    timestamp: v.number(),
    role: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chat_messages", args);
  },
});
