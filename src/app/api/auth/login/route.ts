import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { convex } from '@/lib/convex';
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
    const user = await convex.query(api.queries.getUserByEmail, { email });

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
