import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PATCH /api/auth/profile
 * Update user name and/or email.
 * Body: { current_email: string; name?: string; email?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { current_email, name, email } = body ?? {};

    if (!current_email) {
      return NextResponse.json(
        { error: 'current_email is required to identify the user.' },
        { status: 400 }
      );
    }

    if (!name && !email) {
      return NextResponse.json(
        { error: 'Provide at least one field to update: name or email.' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await convexClient.query(api.queries.getUserByEmail, {
      email: current_email,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Update in Convex
    await convexClient.mutation(api.mutations.updateUser as any, {
      email: current_email,
      new_name: name ?? undefined,
      new_email: email ?? undefined,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          name: name ?? user.name,
          email: email ?? user.email,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Profile update failed.' },
      { status: 500 }
    );
  }
}
