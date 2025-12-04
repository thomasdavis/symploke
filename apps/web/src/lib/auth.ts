import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@symploke/db'

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [GitHub],
})
