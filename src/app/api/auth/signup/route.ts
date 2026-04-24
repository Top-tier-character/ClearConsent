import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body ?? {};

    // ── Validate ────────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required: name, email, password.' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // ── Check duplicate email ────────────────────────────────────────────────
    const existing = await convexClient.query(api.queries.getUserByEmail, { email });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // ── Hash password & create user ──────────────────────────────────────────
    const password_hash = await bcrypt.hash(password, 12);
    await convexClient.mutation(api.mutations.createUser as any, {
      email,
      name,
      password_hash,
    });

    return NextResponse.json(
      { success: true, message: 'Account created successfully. You can now log in.' },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Signup failed.' },
      { status: 500 }
    );
  }
}
