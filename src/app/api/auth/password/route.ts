import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * PATCH /api/auth/password
 * Change the user's password after verifying the current one.
 * Body: { email: string; current_password: string; new_password: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, current_password, new_password } = body ?? {};

    if (!email || !current_password || !new_password) {
      return NextResponse.json(
        { error: 'email, current_password, and new_password are all required.' },
        { status: 400 }
      );
    }

    if (typeof new_password !== 'string' || new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Fetch user
    const user = await convexClient.query(api.queries.getUserByEmail, { email });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Verify current password
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    // Hash and save new password
    const new_password_hash = await bcrypt.hash(new_password, 12);
    await convexClient.mutation(api.mutations.updateUser, {
      email,
      new_password_hash,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Password change failed.' },
      { status: 500 }
    );
  }
}
