import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';

/**
 * GET /api/profile/stats
 * Accepts: ?session_id=string
 * Returns aggregate stats from Convex for the session.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session_id = req.nextUrl.searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: session_id' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    // ── Query Convex for consent records and risk logs ─────────────────────
    const [consentRecords, riskLogs] = await Promise.all([
      convexClient().query(api.queries.getSessionHistory, { session_id }),
      convexClient().query(api.queries.getRiskLogsForSession, { session_id }),
    ]);

    // ── Compute stats ──────────────────────────────────────────────────────
    const documents_analyzed = riskLogs.length;
    const simulations_run = riskLogs.length;
    const consents_confirmed = consentRecords.length;

    const risk_scores = riskLogs.map((l: any) => l.risk_score).filter((s: any) => typeof s === 'number');
    const average_risk_score =
      risk_scores.length > 0
        ? Math.round(risk_scores.reduce((a: number, b: number) => a + b, 0) / risk_scores.length)
        : 0;

    // member_since: earliest session record timestamp
    const allTimestamps = [
      ...consentRecords.map((r: any) => r.timestamp),
      ...riskLogs.map((l: any) => l.timestamp),
    ].filter(Boolean);

    const member_since =
      allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();

    return NextResponse.json(
      {
        session_id,
        documents_analyzed,
        simulations_run,
        consents_confirmed,
        average_risk_score,
        red_flags_found: 0, // Stored in analysis payload, not separately in DB
        member_since,
      },
      {
        status: 200,
        headers: { 'X-Response-Time': `${Date.now() - startTime}ms` },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  }
}
