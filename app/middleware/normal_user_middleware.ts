import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Blocks admin users from accessing normal-user pages.
 */
export default class NormalUserMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    const isAdmin = user?.role === 'admin'

    if (isAdmin) {
      // For API requests, return a 403; for pages, redirect to admin portal.
      if (ctx.request.url().startsWith('/api/')) {
        return ctx.response.forbidden({ error: 'Normal user access required' })
      }
      return ctx.response.redirect('/admin')
    }

    return next()
  }
}
