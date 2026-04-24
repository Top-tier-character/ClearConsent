import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSessionHistory = query({
  args: { session_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consent_records")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
      .order("desc")
      .collect();
  },
});

export const getConsentDetail = query({
  args: { consent_id: v.string() },
  handler: async (ctx, args) => {
    const consent = await ctx.db
      .query("consent_records")
      .withIndex("by_consent_id", (q) => q.eq("consent_id", args.consent_id))
      .first();

    if (!consent) {
      return null;
    }

    const quiz = await ctx.db
      .query("quiz_results")
      .withIndex("by_consent_id", (q) => q.eq("consent_id", args.consent_id))
      .first();

    return { consent, quiz };
  },
});

export const getRiskLogsForSession = query({
  args: { session_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("risk_logs")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
      .order("desc")
      .collect();
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/** Return full user record by Google OAuth subject ID */
export const getUserByGoogleId = query({
  args: { google_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_google_id", (q) => q.eq("google_id", args.google_id))
      .first();
  },
});

/** Return chat messages for a session in ascending order (oldest first) */
export const getChatHistory = query({
  args: { session_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chat_messages")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
      .order("asc")
      .collect();
  },
});

/**
 * Return aggregate profile stats for a session:
 *   - documents_analyzed: total risk log entries (each simulate call)
 *   - consents_confirmed: total confirmed consent records
 *   - average_risk_score: mean risk_score across all consent records
 *   - member_since: earliest consent_record timestamp for this session
 */
export const getProfileStats = query({
  args: { session_id: v.string() },
  handler: async (ctx, args) => {
    const [riskLogs, consents] = await Promise.all([
      ctx.db
        .query("risk_logs")
        .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
        .collect(),
      ctx.db
        .query("consent_records")
        .withIndex("by_session_id", (q) => q.eq("session_id", args.session_id))
        .collect(),
    ]);

    const documents_analyzed = riskLogs.length;
    const consents_confirmed = consents.length;

    const average_risk_score =
      consents.length > 0
        ? Math.round(
            consents.reduce((sum, r) => sum + r.risk_score, 0) / consents.length
          )
        : 0;

    const member_since =
      consents.length > 0
        ? Math.min(...consents.map((r) => r.timestamp))
        : null;

    return { documents_analyzed, consents_confirmed, average_risk_score, member_since };
  },
});
