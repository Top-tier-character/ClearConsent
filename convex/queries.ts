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
