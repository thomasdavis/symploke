import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@symploke/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email read:org',
        },
      },
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    authorized: async ({ auth: session }) => {
      // Allow access if user is authenticated
      return !!session
    },
    async jwt({ token, account, user }) {
      // Store the GitHub access token and user ID in the JWT when user signs in
      if (account?.provider === 'github') {
        token.accessToken = account.access_token
      }
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Add the GitHub access token and user ID to the session
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string
      }
      if (token?.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
