import { getServerSupabase } from '@/lib/supabase-client'
import { type AuthOptions, type DefaultSession, type User as NextAuthUser } from 'next-auth';
import { type JWT } from 'next-auth/jwt';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { UserRole, RoleType } from '@/types/role';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole | null;
      type: 'agent' | 'customer' | null;
    } & DefaultSession['user'];
  }
}

interface ExtendedSession extends DefaultSession {
  user: {
    id: string;
    role: UserRole | null;
    type: 'agent' | 'customer' | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const supabase = getServerSupabase();

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      try {
        const { data: agent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error checking agent:', error)
          return false
        }

        return !!agent
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return false
      }
    },
    async session({ session, user }) {
      try {
        const { data: agent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching agent:', error)
          return session
        }

        return {
          ...session,
          user: {
            ...session.user,
            role: agent?.role || 'user',
            permissions: agent?.permissions || []
          }
        }
      } catch (error) {
        console.error('Error in session callback:', error)
        return session
      }
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
}; 