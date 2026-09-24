import type { HttpContext } from '@adonisjs/core/http'
import WorkspaceInvitation from '#models/workspace_invitation'
import farmUsersService from '#services/farm_users_service'
import { farmHttpError, isFarmContext, requireFarmContext } from '#utils/farm_context'
import { canManageWorkers, toFarmRole } from '#utils/farm_permissions'
import {
  deactivateFarmUserValidator,
  inviteFarmUserValidator,
  reactivateFarmUserValidator,
} from '#validators/farm'

export default class FarmUsersController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canManageWorkers(farm.membershipRole)) {
      return farmHttpError(ctx, 403, 'You do not have permission to manage users.')
    }

    const search =
      typeof ctx.request.qs().search === 'string' ? ctx.request.qs().search.trim() : undefined

    const membersPage = await farmUsersService.listMembers(farm.workspaceId, {
      search,
      includeInactive: true,
      page: 1,
      perPage: 100,
    })

    const invitations = await WorkspaceInvitation.query()
      .where('workspace_id', farm.workspaceId)
      .whereNull('accepted_at')
      .preload('invitedBy')
      .orderBy('created_at', 'desc')

    return ctx.inertia.render('users/index', {
      members: membersPage.data,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: toFarmRole(inv.role),
        createdAt: inv.createdAt.toISO(),
        invitedBy: inv.invitedBy?.fullName || inv.invitedBy?.email || null,
      })),
      farmRole: farm.farmRole,
      canInviteManager: farm.farmRole === 'owner',
    })
  }

  async store(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canManageWorkers(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'You do not have permission to invite users.' })
    }

    const payload = await ctx.request.validateUsing(inviteFarmUserValidator)

    try {
      const result = await farmUsersService.createUser({
        workspaceId: farm.workspaceId,
        actorUserId: farm.user.id,
        actorRole: farm.membershipRole,
        email: payload.email,
        fullName: payload.fullName,
        farmRole: payload.role,
      })

      return ctx.response.created({
        message: 'User created. Share the temporary password so they can sign in.',
        data: {
          userId: result.user.id,
          temporaryPassword: result.temporaryPassword,
          mustChangePassword: true,
        },
      })
    } catch (error: unknown) {
      const err = error as { message?: string }
      return ctx.response.badRequest({
        error: err.message || 'Unable to create user.',
      })
    }
  }

  async deactivate(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canManageWorkers(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'You do not have permission to deactivate users.' })
    }

    const { userId } = await ctx.request.validateUsing(deactivateFarmUserValidator)

    try {
      await farmUsersService.deactivateUser({
        workspaceId: farm.workspaceId,
        actorUserId: farm.user.id,
        actorRole: farm.membershipRole,
        targetUserId: userId,
      })
      return ctx.response.ok({ message: 'User deactivated.' })
    } catch (error: unknown) {
      const err = error as { message?: string }
      return ctx.response.badRequest({
        error: err.message || 'Unable to deactivate user.',
      })
    }
  }

  async reactivate(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canManageWorkers(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'You do not have permission to reactivate users.' })
    }

    const { userId } = await ctx.request.validateUsing(reactivateFarmUserValidator)

    try {
      await farmUsersService.reactivateUser({
        workspaceId: farm.workspaceId,
        actorUserId: farm.user.id,
        actorRole: farm.membershipRole,
        targetUserId: userId,
      })
      return ctx.response.ok({ message: 'User reactivated.' })
    } catch (error: unknown) {
      const err = error as { message?: string }
      return ctx.response.badRequest({
        error: err.message || 'Unable to reactivate user.',
      })
    }
  }
}
