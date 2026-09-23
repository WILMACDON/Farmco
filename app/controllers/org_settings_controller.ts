import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace'
import FarmCacheService from '#services/farm_cache_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { canEditOrgSettings } from '#utils/farm_permissions'
import { orgSettingsValidator } from '#validators/farm'

export default class OrgSettingsController {
  async show(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canEditOrgSettings(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'Only the owner can view organization settings.' })
    }

    const workspace = await Workspace.findOrFail(farm.workspaceId)

    const settings = await FarmCacheService.getOrSet(
      FarmCacheService.keys.settings(farm.workspaceId),
      async () => ({
        eggsPerCrate: workspace.eggsPerCrate,
        lowFeedThreshold: Number(workspace.lowFeedThreshold),
      }),
      FarmCacheService.ttl.settings,
    )

    return ctx.response.ok({ data: { settings } })
  }

  async update(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    if (!canEditOrgSettings(farm.membershipRole)) {
      return ctx.response.forbidden({ error: 'Only the owner can update organization settings.' })
    }

    const payload = await ctx.request.validateUsing(orgSettingsValidator)
    const workspace = await Workspace.findOrFail(farm.workspaceId)

    await workspace
      .merge({
        eggsPerCrate: payload.eggsPerCrate,
        lowFeedThreshold: payload.lowFeedThreshold,
      })
      .save()

    await FarmCacheService.invalidateSettings(farm.workspaceId)

    return ctx.response.ok({
      message: 'Organization settings updated.',
      data: {
        settings: {
          eggsPerCrate: workspace.eggsPerCrate,
          lowFeedThreshold: Number(workspace.lowFeedThreshold),
        },
      },
    })
  }
}
