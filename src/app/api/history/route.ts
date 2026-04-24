import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

/**
 * GET /api/history
 *
 * Powers the /history page sidebar and card list.
 * Accepts: ?session_id=string
 *
 * Returns a list of past consent records for this session.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session_id = req.nextUrl.searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing required parameter', details: 'Query parameter session_id is required.' },
        { status: 400, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
      );
    }

    const records = await convexClient().query(api.queries.getSessionHistory, { session_id });

    return NextResponse.json(
      { session_id, records },

      { status: 200, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  }
}
