import type { HttpContext } from '@adonisjs/core/http'
import Plan from '#models/plan'

export default class PricingController {
  async index({ inertia }: HttpContext) {
    const plans = await Plan.query().where('isActive', true).orderBy('priceMonthly', 'asc')

    return inertia.render('pricing', { plans })
  }
}
