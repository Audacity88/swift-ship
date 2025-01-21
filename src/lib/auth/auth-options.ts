import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    async session({ session, token }: { session: DefaultSession; token: JWT }): Promise<ExtendedSession> {
      const extendedSession = session as ExtendedSession;
      
      if (extendedSession.user) {
        extendedSession.user.id = token.id as string;
        
        // Check if user is an agent
        const { data: agentData } = await supabase
          .from('agents')
          .select('role')
          .eq('id', token.sub)
          .single();

        if (agentData) {
          extendedSession.user.role = agentData.role as UserRole;
          extendedSession.user.type = 'agent';
        } else {
          // Check if user is a customer
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('id', token.sub)
            .single();

          if (customerData) {
            extendedSession.user.role = RoleType.CUSTOMER;
            extendedSession.user.type = 'customer';
          }
        }
      }
      return extendedSession;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
}; 