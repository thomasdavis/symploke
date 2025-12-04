import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@symploke/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
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
    async jwt({ token, account }) {
      // Store the GitHub access token in the JWT when user signs in
      if (account?.provider === 'github') {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Add the GitHub access token to the session
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string
      }
      return session
    },
  },
})
