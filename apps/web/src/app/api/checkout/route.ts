import { Checkout } from '@polar-sh/nextjs'

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: `${process.env.NEXTAUTH_URL}/settings?checkout=success&checkout_id={CHECKOUT_ID}`,
})
