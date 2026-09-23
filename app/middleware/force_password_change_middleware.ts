import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * When mustChangePassword is set, block everything except password update and logout
 * until the user sets a new password.
 */
export default class ForcePasswordChangeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user?.mustChangePassword) return next()

    const url = ctx.request.url()
    const method = ctx.request.method().toUpperCase()

    const isAllowed =
      url.startsWith('/logout') ||
      url.startsWith('/settings') ||
      (method === 'PUT' && url.startsWith('/api/v1/user/password')) ||
      (method === 'POST' && url.startsWith('/api/v1/user/password'))

    if (isAllowed) return next()

    if (url.startsWith('/api/')) {
      return ctx.response.forbidden({
        error: 'You must change your password before continuing.',
        mustChangePassword: true,
        redirectTo: '/settings?tab=password',
      })
    }

    return ctx.response.redirect('/settings?tab=password')
  }
}
