import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import db, { initializeDatabase } from '@/lib/db';

await initializeDatabase();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [credentials.email]
          });

          if (userResult.rows.length === 0) {
            return null;
          }

          const user = userResult.rows[0] as unknown as { id: number; email: string; username: string; password_hash: string; role: string };
          
          // Check if user has a password (some might be Google-only)
          if (!user.password_hash) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!isValidPassword) {
            console.log('Invalid password for user:', credentials.email);
            return null;
          }

          console.log('Successful login for user:', credentials.email);
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Allow credentials provider sign in
      if (account?.provider === 'credentials') {
        return true;
      }
      
      if (account?.provider === 'google') {
        const email = user.email;
        
        // Only allow @netnode.ag and @netnode.ch emails for Google OAuth
        if (!email?.endsWith('@netnode.ag') && !email?.endsWith('@netnode.ch')) {
          return false;
        }

        try {
          // Check if user exists
          const existingUser = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email]
          });

          if (existingUser.rows.length === 0) {
            // Create new user
            await db.execute({
              sql: 'INSERT INTO users (username, email, google_id, avatar_url, role) VALUES (?, ?, ?, ?, ?)',
              args: [
                user.name || email.split('@')[0],
                email,
                user.id,
                user.image || '',
                'user'
              ]
            });
          } else {
            // Update existing user
            await db.execute({
              sql: 'UPDATE users SET google_id = ?, avatar_url = ?, username = ? WHERE email = ?',
              args: [user.id, user.image || '', user.name || email.split('@')[0], email]
            });
          }

          return true;
        } catch (error) {
          console.error('Database error during sign in:', error);
          return false;
        }
      }
      return false;
    },
    async jwt({ token, user }) {
      // If this is a new sign in, add user info to token
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.email = user.email;
      }
      
      // Always refresh role from database to ensure it's current
      if (token.email) {
        try {
          const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [token.email]
          });

          if (userResult.rows.length > 0) {
            const dbUser = userResult.rows[0] as unknown as { id: number; role: string };
            token.role = dbUser.role;
            token.id = dbUser.id;
          }
        } catch (error) {
          console.error('Database error during JWT:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Get role from JWT token
      if (token && session.user) {
        (session.user as { id?: string | number; role?: string }).id = token.id as string | number;
        (session.user as { id?: string | number; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};