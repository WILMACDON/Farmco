import type { HttpContext } from '@adonisjs/core/http'
import activityLogService from '#services/activity_log_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { canViewAllActivity } from '#utils/farm_permissions'
import { activityFilterValidator } from '#validators/farm'

export default class FarmActivityController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const filters = await ctx.request.validateUsing(activityFilterValidator, {
      data: ctx.request.qs(),
    })

    const ownOnly = !canViewAllActivity(farm.membershipRole)

    const { entries, meta } = await activityLogService.list(farm.workspaceId, filters, {
      ownOnly,
      userId: farm.user.id,
      farmRole: farm.farmRole,
    })

    return ctx.inertia.render('activity/index', {
      entries,
      meta,
      filters,
      farmRole: farm.farmRole,
      ownOnly,
    })
  }
}
