import type { HttpContext } from '@adonisjs/core/http'
import { healthChecks } from '#start/health'

export default class StatusController {
  async index({ inertia }: HttpContext) {
    const report = await healthChecks.run()
    return inertia.render('status', { status: report })
  }
}
