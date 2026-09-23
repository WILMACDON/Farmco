import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Workspace from '#models/workspace'
import stripeService from '#services/stripe_service'
import env from '#start/env'

export default class StripeWebhooksController {
  async handle({ request, response }: HttpContext) {
    const signature = request.header('Stripe-Signature')
    const endpointSecret = env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !endpointSecret) {
      return response.badRequest('Missing signature or secret')
    }

    let event: any

    try {
      const payload = request.raw()
      if (!payload) {
        return response.badRequest('Missing payload')
      }

      event = stripeService.getClient().webhooks.constructEvent(payload, signature, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message)
      return response.badRequest(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await this.handleCheckoutSessionCompleted(session)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        await this.handleInvoicePaymentSucceeded(invoice)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await this.handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await this.handleSubscriptionDeleted(subscription)
        break
      }
      default:
      // console.log(`Unhandled event type ${event.type}`)
    }

    return response.ok({ received: true })
  }

  private async handleCheckoutSessionCompleted(session: any) {
    // Retrieve workspace from client_reference_id or metadata
    const workspaceId = session.client_reference_id || session.metadata?.workspaceId
    if (!workspaceId) return

    const workspace = await Workspace.find(workspaceId)
    if (!workspace) return

    // Update workspace with subscription details
    if (session.subscription) {
      workspace.stripeSubscriptionId = session.subscription as string
      workspace.subscriptionStatus = 'active' // Initial assumption, will be updated by subscription.updated

      // If planId is in metadata, we can set it, but best to rely on fetching subscription
      // to get the correct price/product linkage if complex.
      // For now, use metadata
      if (session.metadata?.planId) {
        workspace.currentPlanId = session.metadata.planId
      }

      if (session.metadata?.interval) {
        workspace.billingInterval = session.metadata.interval as 'monthly' | 'yearly'
      }

      await workspace.save()
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any) {
    if (!invoice.subscription) return

    const workspace = await Workspace.findBy('stripeSubscriptionId', invoice.subscription)
    if (!workspace) return

    // Update expiration date based on period_end
    // invoice.lines.data[0].period_end (timestamp)
    if (invoice.lines?.data?.length > 0) {
      const periodEnd = invoice.lines.data[0].period_end
      workspace.subscriptionEndsAt = DateTime.fromSeconds(periodEnd)
      workspace.subscriptionStatus = 'active'
      await workspace.save()
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const workspace = await Workspace.findBy('stripeSubscriptionId', subscription.id)
    if (!workspace) return

    workspace.subscriptionStatus = subscription.status
    workspace.subscriptionEndsAt = DateTime.fromSeconds(subscription.current_period_end)

    // Check if plan changed (price)
    // const priceId = subscription.items.data[0].price.id
    // logic to map priceId back to planId if needed, but we store planId on checkout

    await workspace.save()
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const workspace = await Workspace.findBy('stripeSubscriptionId', subscription.id)
    if (!workspace) return

    workspace.subscriptionStatus = 'canceled'
    workspace.subscriptionEndsAt = null // or keep it until period ends? usually canceled means done.
    await workspace.save()
  }
}
