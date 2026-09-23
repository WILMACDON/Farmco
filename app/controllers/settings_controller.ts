import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class SettingsController {
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()

    // Fetch API tokens
    const userTokens = await User.accessTokens.all(user)
    const tokens = userTokens.map((t) => ({
      id: t.identifier,
      name: t.name,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
    }))

    return inertia.render('settings/index', {
      tokens,
    })
  }
}
