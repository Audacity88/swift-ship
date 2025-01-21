import { createClient } from '@supabase/supabase-js';
import { type AuthOptions, type DefaultSession } from 'next-auth';
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
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (session?.user) {
        session.user.id = token.id as string;
        
        // Check if user is an agent
        const { data: agentData } = await supabase
          .from('agents')
          .select('role')
          .eq('id', token.sub)
          .single();

        if (agentData) {
          session.user.role = agentData.role as UserRole;
          session.user.type = 'agent';
          return session;
        }

        // If not an agent, check if user is a customer
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('id', token.sub)
          .single();

        if (customerData) {
          session.user.role = RoleType.CUSTOMER;
          session.user.type = 'customer';
          return session;
        }

        // If neither agent nor customer, set null values
        session.user.role = null;
        session.user.type = null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
}; 