import { Webhooks } from '@polar-sh/nextjs'
import { db } from '@symploke/db'

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    console.log('Polar webhook received:', payload.type)

    switch (payload.type) {
      case 'subscription.created':
      case 'subscription.active': {
        const subscription = payload.data
        const customerEmail = subscription.customer?.email

        if (!customerEmail) {
          console.error('No customer email in subscription webhook')
          return
        }

        await db.user.update({
          where: { email: customerEmail },
          data: {
            polarCustomerId: subscription.customer?.id,
            polarSubscriptionId: subscription.id,
            subscriptionStatus: 'active',
            subscribedAt: new Date(),
          },
        })

        console.log(`Subscription activated for ${customerEmail}`)
        break
      }

      case 'subscription.canceled':
      case 'subscription.revoked': {
        const subscription = payload.data
        const customerEmail = subscription.customer?.email

        if (!customerEmail) {
          console.error('No customer email in subscription webhook')
          return
        }

        await db.user.update({
          where: { email: customerEmail },
          data: {
            subscriptionStatus: 'canceled',
          },
        })

        console.log(`Subscription canceled for ${customerEmail}`)
        break
      }

      case 'checkout.created': {
        console.log('Checkout created:', payload.data.id)
        break
      }

      default:
        console.log('Unhandled webhook type:', payload.type)
    }
  },
})
