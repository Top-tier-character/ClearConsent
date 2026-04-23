import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { convex } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existing = await convex.query(api.queries.getUserByEmail, { email });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 },
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Save user to Convex
    await convex.mutation(api.mutations.createUser, { email, name, password_hash });

    // Generate session ID
    const session_id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return NextResponse.json({
      session_id,
      name,
      email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
