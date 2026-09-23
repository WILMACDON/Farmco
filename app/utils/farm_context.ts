import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import type { WorkspaceRole } from '#models/workspace_member'
import workspaceService from '#services/workspace_service'
import { type FarmRole, toFarmRole } from '#utils/farm_permissions'

export interface FarmContext {
  user: User
  workspaceId: string
  membershipRole: WorkspaceRole
  farmRole: FarmRole
}

/**
 * Prefer an Inertia/HTML redirect over a bare JSON body for page visits.
 * API routes under /api/ keep JSON errors.
 */
export function farmHttpError(
  ctx: HttpContext,
  status: 400 | 403,
  message: string,
  redirectTo = '/dashboard',
) {
  const path = ctx.request.url()
  const isApi = path.startsWith('/api/')
  const isInertia = Boolean(ctx.request.header('x-inertia'))
  const prefersHtml = ctx.request.accepts(['html', 'json']) === 'html'

  if (!isApi && (isInertia || prefersHtml)) {
    ctx.session.flash('error', { message })
    return ctx.response.redirect(redirectTo)
  }

  if (status === 403) return ctx.response.forbidden({ error: message })
  return ctx.response.badRequest({ error: message })
}

/**
 * Resolve the current farm workspace from session and verify membership.
 * Returns an HTTP error response when the workspace cannot be used.
 */
export async function requireFarmContext(
  ctx: HttpContext,
): Promise<FarmContext | { errorResponse: unknown }> {
  const user = ctx.auth.getUserOrFail()
  const workspaceId = ctx.session.get('currentWorkspaceId') as string | undefined

  if (!workspaceId) {
    return {
      errorResponse: farmHttpError(
        ctx,
        400,
        'No workspace selected. Switch to a workspace and try again.',
      ),
    }
  }

  const membership = await workspaceService.getMembership(workspaceId, user.id)
  if (!membership) {
    return {
      errorResponse: farmHttpError(ctx, 403, 'You do not have access to this workspace.'),
    }
  }

  return {
    user,
    workspaceId,
    membershipRole: membership.role,
    farmRole: toFarmRole(membership.role),
  }
}

export function isFarmContext(
  value: FarmContext | { errorResponse: unknown },
): value is FarmContext {
  return 'workspaceId' in value
}
