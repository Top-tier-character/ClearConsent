import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

        const user = await convexClient.query(api.queries.getUserByEmail, {
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

        // Update last_login on successful credential sign-in
        await convexClient.mutation(api.mutations.updateUser, {
          email: user.email,
        });

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
     * Google OAuth: create or link user in Convex on every sign-in.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.sub) {
        const googleId = profile.sub;
        const email = user.email!;
        const name = user.name ?? email;

        // 1. Check if a user with this Google ID already exists
        let existing = await convexClient.query(api.queries.getUserByGoogleId, {
          google_id: googleId,
        });

        if (!existing) {
          // 2. No Google-linked account — check by email
          const byEmail = await convexClient.query(api.queries.getUserByEmail, {
            email,
          });

          if (byEmail) {
            // 3. Existing credentials user — link the Google ID
            await convexClient.mutation(api.mutations.updateUser, {
              email,
              google_id: googleId,
            });
            existing = byEmail;
          } else {
            // 4. Brand-new user — create from scratch
            await convexClient.mutation(api.mutations.createUser, {
              email,
              name,
              password_hash: '',
              google_id: googleId,
              auth_provider: 'google',
            });
          }
        } else {
          // Already exists with Google ID — just update last_login
          await convexClient.mutation(api.mutations.updateUser, { email });
        }
      }

      return true; // allow sign-in
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

        // Attach language_preference from Convex so the UI can read it
        if (token.email) {
          const convexUser = await convexClient.query(api.queries.getUserByEmail, {
            email: token.email as string,
          });
          if (convexUser) {
            (session.user as any).language_preference = convexUser.language_preference;
          }
        }
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

