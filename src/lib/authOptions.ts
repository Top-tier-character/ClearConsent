/**
 * authOptions.ts — Centralized NextAuth configuration.
 *
 * Imported by:
 *  - src/app/api/auth/[...nextauth]/route.ts  (the handler)
 *  - Any server component using getServerSession(authOptions)
 */
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getConvexClient } from '@/lib/convex';
import { api } from '../../convex/_generated/api';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.');
        }

        const client = getConvexClient();

        const user = await client.query(api.queries.getUserByEmail, {
          email: credentials.email,
        });

        if (!user) {
          throw new Error('No account found with this email.');
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!passwordMatch) {
          throw new Error('Incorrect password.');
        }

        return {
          id: user._id as string,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Sync Google OAuth users into Convex on first sign-in.
     * Without this, Google-authed users have no Convex record,
     * causing downstream failures in history/profile queries.
     */
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const client = getConvexClient();
          const existing = await client.query(api.queries.getUserByEmail, {
            email: user.email!,
          });
          if (!existing) {
            await client.mutation(api.mutations.createUser as any, {
              email: user.email!,
              name: user.name ?? 'Google User',
              password_hash: '',
              google_id: user.id,
              auth_provider: 'google',
              language_preference: 'en',
            });
          } else if (!existing.google_id) {
            await client.mutation(api.mutations.updateUser as any, {
              email: user.email!,
              google_id: user.id,
            });
          }
        } catch (err) {
          console.error('[authOptions] Failed to sync Google user to Convex:', err);
          // Do not block login — Convex sync failure is non-fatal
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
};
