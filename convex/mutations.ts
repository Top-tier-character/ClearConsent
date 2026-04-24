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
    google_id: v.optional(v.string()),
    auth_provider: v.string(),
    language_preference: v.optional(v.string()),
    simplified_mode: v.optional(v.boolean()),
    dark_mode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    const now = Date.now();
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password_hash: args.password_hash,
      google_id: args.google_id,
      auth_provider: args.auth_provider,
      language_preference: args.language_preference ?? "en",
      simplified_mode: args.simplified_mode ?? false,
      dark_mode: args.dark_mode ?? false,
      created_at: now,
      last_login: now,
    });
  },
});

/** Update user profile fields */
export const updateUser = mutation({
  args: {
    email: v.string(),                          // lookup key
    name: v.optional(v.string()),
    language_preference: v.optional(v.string()),
    simplified_mode: v.optional(v.boolean()),
    dark_mode: v.optional(v.boolean()),
    google_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("User not found.");

    const patch: Record<string, unknown> = { last_login: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.language_preference !== undefined) patch.language_preference = args.language_preference;
    if (args.simplified_mode !== undefined) patch.simplified_mode = args.simplified_mode;
    if (args.dark_mode !== undefined) patch.dark_mode = args.dark_mode;
    if (args.google_id !== undefined) patch.google_id = args.google_id;

    await ctx.db.patch(user._id, patch);
    return await ctx.db.get(user._id);
  },
});

/** Update a user's password hash */
export const updatePassword = mutation({
  args: {
    email: v.string(),
    new_password_hash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("User not found.");

    await ctx.db.patch(user._id, { password_hash: args.new_password_hash });
    return { success: true };
  },
});

/**
 * Delete a user and all their associated data.
 * Pass session_id to also remove consent_records, quiz_results,
 * risk_logs, and chat_messages linked to that session.
 */
export const deleteUser = mutation({
  args: {
    email: v.string(),
    session_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("User not found.");

    // Delete the user record
    await ctx.db.delete(user._id);

    // If a session_id is provided, cascade-delete associated records
    if (args.session_id) {
      const sid = args.session_id;

      const consents = await ctx.db
        .query("consent_records")
        .withIndex("by_session_id", (q) => q.eq("session_id", sid))
        .collect();
      await Promise.all(consents.map((r) => ctx.db.delete(r._id)));

      const riskLogs = await ctx.db
        .query("risk_logs")
        .withIndex("by_session_id", (q) => q.eq("session_id", sid))
        .collect();
      await Promise.all(riskLogs.map((r) => ctx.db.delete(r._id)));

      const chats = await ctx.db
        .query("chat_messages")
        .withIndex("by_session_id", (q) => q.eq("session_id", sid))
        .collect();
      await Promise.all(chats.map((r) => ctx.db.delete(r._id)));

      // quiz_results don't have a session index, delete via consent_ids
      const consentIds = consents.map((c) => c.consent_id);
      await Promise.all(
        consentIds.map(async (cid) => {
          const quizzes = await ctx.db
            .query("quiz_results")
            .withIndex("by_consent_id", (q) => q.eq("consent_id", cid))
            .collect();
          return Promise.all(quizzes.map((q) => ctx.db.delete(q._id)));
        })
      );
    }

    return { success: true };
  },
});

/** Persist a single chat turn (user or assistant) */
export const saveChatMessage = mutation({
  args: {
    session_id: v.string(),
    user_id: v.optional(v.string()),
    role: v.string(),
    content: v.string(),
    timestamp: v.number(),
    page_context: v.optional(v.string()),
    has_prefill: v.optional(v.boolean()),
    prefill_data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chat_messages", args);
  },
});

/** Save a document analysis result for history and comparison */
export const saveDocumentAnalysis = mutation({
  args: {
    session_id: v.string(),
    user_id: v.optional(v.string()),
    timestamp: v.number(),
    document_type: v.string(),
    clearconsent_score: v.number(),
    risk_flags: v.any(),
    extracted_figures: v.any(),
    summary: v.string(),
    language: v.string(),
    document_hash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("document_analyses", args);
  },
});

/**
 * Increment per-user aggregate stats after a document is analyzed.
 * total_documents_analyzed += 1
 * total_red_flags_found += red_flags_count
 */
export const incrementUserStats = mutation({
  args: {
    email: v.string(),
    red_flags_count: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return; // guest user — silently skip

    await ctx.db.patch(user._id, {
      total_documents_analyzed: (user.total_documents_analyzed ?? 0) + 1,
      total_red_flags_found: (user.total_red_flags_found ?? 0) + args.red_flags_count,
    });
  },
});
