import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { convexClient } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    // Look up user in Convex
    const user = await convexClient().query(api.queries.getUserByEmail, { email });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email.' },
        { status: 401 },
      );
    }

    // Compare password against stored hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json(
        { error: 'Incorrect password.' },
        { status: 401 },
      );
    }

    // Generate a session ID for this login
    const session_id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Bug fix: persist session to Convex so chat/simulate rows can be linked back.
    try {
      await convexClient().mutation(api.mutations.createSession as any, {
        session_id,
        language_preference: 'en',
        device_info: req.headers.get('user-agent') ?? undefined,
      });
    } catch (sessionErr) {
      // Non-fatal — log but don't block login
      console.error('[login] createSession failed:', sessionErr);
    }

    return NextResponse.json({
      session_id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
