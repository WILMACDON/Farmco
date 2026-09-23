import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import workspaceService from '#services/workspace_service'

/**
 * Redirects authenticated users who have no workspace to the onboarding page.
 * Skips if the request is already for the onboarding route or an API route.
 */
export default class WorkspaceOnboardingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) return next()

    // Admin users don't need workspaces — skip onboarding entirely
    if (user.role === 'admin') {
      return next()
    }

    const url = ctx.request.url()
    const isFarmApi = url.startsWith('/api/v1/farm')

    // Don't intercept non-farm API calls, the onboarding page itself, or logout
    if (
      (url.startsWith('/api/') && !isFarmApi) ||
      url.startsWith('/onboarding') ||
      url.startsWith('/logout') ||
      url.startsWith('/join')
    ) {
      return next()
    }

    const hasWorkspace = await workspaceService.userHasWorkspace(user.id)
    if (!hasWorkspace) {
      if (isFarmApi) {
        return ctx.response.forbidden({
          error: 'Create or join a workspace before using farm features.',
        })
      }
      return ctx.response.redirect('/onboarding')
    }

    // Auto-set the current workspace if none is selected
    const currentWorkspaceId = ctx.session?.get('currentWorkspaceId')
    if (!currentWorkspaceId) {
      const workspaces = await workspaceService.getUserWorkspaces(user.id)
      if (workspaces.length > 0) {
        ctx.session?.put('currentWorkspaceId', workspaces[0].id)
      }
    }

    return next()
  }
}
