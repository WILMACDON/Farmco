import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace'
import feedInventoryService from '#services/feed_inventory_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { feedMovementValidator } from '#validators/farm'

export default class FeedController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const workspace = await Workspace.findOrFail(farm.workspaceId)
    const threshold = Number(workspace.lowFeedThreshold)

    const [stock, recentRecords] = await Promise.all([
      feedInventoryService.getStock(farm.workspaceId, threshold),
      feedInventoryService.getRecentRecords(farm.workspaceId),
    ])

    return ctx.inertia.render('feed/index', {
      stock,
      recentRecords,
      farmRole: farm.farmRole,
    })
  }

  async store(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const payload = await ctx.request.validateUsing(feedMovementValidator)

    try {
      const result = await feedInventoryService.recordMovement(farm.workspaceId, farm.user.id, {
        direction: payload.direction,
        bags: payload.bags,
        note: payload.note ?? undefined,
        clientEntryId: payload.clientEntryId,
        recordedAt: payload.recordedAt,
      })

      return ctx.response.created({
        message: 'Feed movement recorded.',
        data: result,
      })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to record feed movement.',
      })
    }
  }
}
