import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('settings/index')
  }
}
