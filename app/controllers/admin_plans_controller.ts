import string from '@adonisjs/core/helpers/string'
import type { HttpContext } from '@adonisjs/core/http'
import Plan from '#models/plan'
import stripeService from '#services/stripe_service'
import { createPlanValidator, updatePlanValidator } from '#validators/admin_plan'

export default class AdminPlansController {
  async index({ request, inertia }: HttpContext) {
    const queryParams = await request.paginationQs()

    const plans = await Plan.query()
      .orderBy(queryParams.sortBy || 'created_at', queryParams.sortOrder || 'desc')
      .if(queryParams.search, (q) => {
        q.where('name', 'like', `%${queryParams.search}%`)
      })
      .paginate(queryParams.page || 1, queryParams.perPage || 20)

    return inertia.render('admin/plans/index', { plans })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('admin/plans/create')
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(createPlanValidator)

    try {
      // 1. Create Product in Stripe
      const product = await stripeService.createProduct(
        payload.name,
        payload.description || undefined,
      )

      const currency = payload.currency || 'usd'
      const planNameSlug = string.slug(payload.name, { lower: true, replacement: '_' })

      // 2. Create Monthly Price
      const priceMonthly = await stripeService.createRecurringPrice({
        productId: product.id,
        unitAmount: Math.round(payload.priceMonthly * 100), // Stripe expects cents
        currency: currency,
        interval: 'month',
        lookupKey: `${planNameSlug}_monthly`,
      })

      // 3. Create Yearly Price
      const priceYearly = await stripeService.createRecurringPrice({
        productId: product.id,
        unitAmount: Math.round(payload.priceYearly * 100), // Stripe expects cents
        currency: currency,
        interval: 'year',
        lookupKey: `${planNameSlug}_yearly`,
      })

      // 4. Save to Database
      await Plan.create({
        ...payload,
        currency: currency as 'usd' | 'gbp' | 'eur',
        stripeProductId: product.id,
        stripePriceIdMonthly: priceMonthly.id,
        stripePriceIdYearly: priceYearly.id,
      })

      session.flash('success', { message: 'Plan created successfully in DB and Stripe' })
    } catch (error) {
      console.error('Stripe Error:', error)
      session.flash('error', {
        message: `Failed to create plan in Stripe: ${error.message || 'Unknown error'}`,
      })
      // Should we return inputs?
      return response.redirect().back()
    }

    return response.redirect('/admin/plans')
  }

  async edit({ params, inertia, response }: HttpContext) {
    const plan = await Plan.find(params.id)
    if (!plan) return response.notFound({ error: 'Plan not found' })

    return inertia.render('admin/plans/edit', { plan })
  }

  async update({ params, request, response, session }: HttpContext) {
    const plan = await Plan.find(params.id)
    if (!plan) return response.notFound({ error: 'Plan not found' })

    const payload = await request.validateUsing(updatePlanValidator)

    // Note: Updating prices in Stripe is complex (requires archiving old price, creating new one).
    // For now, we only update the local DB.

    await plan.merge(payload).save()

    session.flash('success', { message: 'Plan updated successfully' })
    return response.redirect('/admin/plans')
  }

  async destroy({ params, response, session }: HttpContext) {
    const plan = await Plan.find(params.id)
    if (!plan) return response.notFound({ error: 'Plan not found' })

    // Optional: Archive in Stripe if needed, but for now just delete locally.
    // If plans have active subscriptions, deleting them locally might break relationships
    // unless cascading deletes are set up, or we use soft deletes.
    // Assuming simple deletion for now as requested.

    // Check for active subscriptions?
    // const hasSubscriptions = await plan.related('workspaces').query().where('subscriptionStatus', 'active').first()
    // if (hasSubscriptions) {
    //   session.flash('error', { message: 'Cannot delete plan with active subscriptions. Archive it instead.' })
    //   return response.redirect().back()
    // }

    await plan.delete()

    session.flash('success', { message: 'Plan deleted successfully' })
    return response.redirect('/admin/plans')
  }
}
