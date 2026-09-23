import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class ApiTokensController {
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const tokens = await User.accessTokens.all(user)

    return inertia.render('settings/developer', {
      tokens: tokens.map((t) => ({
        id: t.identifier,
        name: t.name,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      })),
    })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name, expiration } = request.only(['name', 'expiration'])

    if (!name) {
      session.flash('error', { message: 'Token name is required' })
      return response.redirect().back()
    }

    let expiresIn: string | undefined
    switch (expiration) {
      case '30days':
        expiresIn = '30d'
        break
      case '60days':
        expiresIn = '60d'
        break
      case '90days':
        expiresIn = '90d'
        break
      case '1year':
        expiresIn = '1y'
        break
      case 'never':
        expiresIn = undefined
        break
      default:
        expiresIn = '90d'
    }

    const token = await User.accessTokens.create(user, ['*'], {
      name: name,
      expiresIn: expiresIn,
    })

    session.flash('success', {
      message: 'Token created successfully',
      token: token.value!.release(),
    })

    return response.redirect().withQs({ tab: 'developer' }).back()
  }

  async destroy({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const tokenId = params.id

    // There isn't a direct "delete by id" on the static provider that ensures ownership easily without loading
    // But we can delete using the provider
    await User.accessTokens.delete(user, tokenId)

    session.flash('success', { message: 'Token revoked successfully' })
    return response.redirect().back()
  }
}
