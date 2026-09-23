import type { HttpContext } from '@adonisjs/core/http'
import Plan from '#models/plan'
import Workspace from '#models/workspace'
import stripeService from '#services/stripe_service'
import env from '#start/env'

export default class BillingsController {
  async index({ auth, inertia, session, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const workspaceId = session.get('currentWorkspaceId')

    const qs = request.qs()
    console.log('🚀 ~ BillingsController ~ index ~ qs:', qs)

    if (qs.success === 'true' && qs.session_id) {
      const session = await stripeService.retrieveCheckoutSession(qs.session_id)
      if (session.status === 'complete') {
        const workspace = await Workspace.findOrFail(workspaceId)

        await workspace
          .merge({
            stripeSubscriptionId: session.subscription as string,
            currentPlanId: session.metadata?.planId,
            billingInterval: session.metadata?.interval as 'monthly' | 'yearly',
            subscriptionStatus: 'active',
          })
          .save()
        response.redirect('/billing')
      }
    }

    let checkoutState = null
    if (qs.success) checkoutState = 'success'
    if (qs.canceled) checkoutState = 'canceled'

    const workspace = await Workspace.findOrFail(workspaceId)

    // Verify user is a member of this workspace
    const isMember = await workspace.related('members').query().where('userId', user.id).first()
    if (!isMember) {
      // Should handle this better, maybe redirect
      return inertia.render('errors/not_found')
    }

    await workspace.load('plan')

    const plans = await Plan.query().where('isActive', true).orderBy('priceMonthly', 'asc')

    let invoices: any[] = []
    if (workspace.stripeCustomerId) {
      try {
        const invoicesList = await stripeService.getInvoices(workspace.stripeCustomerId)
        invoices = invoicesList.data
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
      }
    }

    return inertia.render('settings/billing', {
      plans,
      currentPlan: workspace.plan,
      subscriptionStatus: workspace.subscriptionStatus,
      billingInterval: workspace.billingInterval,
      subscriptionEndsAt: workspace.subscriptionEndsAt,
      workspaceId: workspace.id,
      isOwner: workspace.createdByUserId === user.id,
      checkoutState,
      invoices,
    })
  }

  async subscribe({ request, auth, response, session, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const { planId, interval, workspaceId } = request.all()

    const workspace = await Workspace.findOrFail(workspaceId)

    // Security check: only owner can subscribe
    if (workspace.createdByUserId !== user.id) {
      session.flash('error', { message: 'Only the workspace owner can manage billing.' })
      return response.redirect().back()
    }

    const plan = await Plan.findOrFail(planId)

    // Ensure Stripe Customer exists
    if (!workspace.stripeCustomerId) {
      const customer = await stripeService.createCustomer({
        email: user.email,
        name: user.fullName || workspace.name,
        metadata: {
          workspaceId: workspace.id,
        },
      })

      workspace.stripeCustomerId = customer.id
      await workspace.save()
    }

    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly

    if (!priceId) {
      session.flash('error', { message: 'Price not configured for this plan.' })
      return response.redirect().back()
    }

    const appUrl = env.get('APP_URL')
    const successUrl = `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appUrl}/billing?canceled=true`

    try {
      const checkoutSession = await stripeService.createCheckoutSession({
        customerId: workspace.stripeCustomerId,
        priceId: priceId,
        successUrl,
        cancelUrl,
        clientReferenceId: workspace.id,
        metadata: {
          workspaceId: workspace.id,
          planId: plan.id,
          interval,
        },
      })

      if (checkoutSession.url) {
        return inertia.location(checkoutSession.url)
      } else {
        session.flash('error', { message: 'Failed to create checkout session.' })
        return response.redirect().back()
      }
    } catch (error) {
      console.error('Stripe Checkout Error:', error)
      session.flash('error', { message: 'An error occurred while initializing checkout.' })
      return response.redirect().back()
    }
  }
}
