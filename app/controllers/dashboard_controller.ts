import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace'
import birdInventoryService from '#services/bird_inventory_service'
import eggInventoryService from '#services/egg_inventory_service'
import FarmCacheService from '#services/farm_cache_service'
import farmOrderService from '#services/farm_order_service'
import feedInventoryService from '#services/feed_inventory_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'

async function buildSnapshot(workspaceId: string) {
  const workspace = await Workspace.findOrFail(workspaceId)
  const lowFeedThreshold = Number(workspace.lowFeedThreshold)

  return FarmCacheService.getOrSet(
    FarmCacheService.keys.dashboard(workspaceId),
    async () => {
      const [birds, eggs, feed, pendingOrders, openOrders, needsReviewCount] = await Promise.all([
        birdInventoryService.getStock(workspaceId),
        eggInventoryService.getStock(workspaceId, workspace.eggsPerCrate),
        feedInventoryService.getStock(workspaceId, lowFeedThreshold),
        farmOrderService.pendingCount(workspaceId),
        farmOrderService.openCount(workspaceId),
        farmOrderService.countNeedsReview(workspaceId),
      ])

      return {
        birdsTotal: birds.total,
        birdsByBucket: birds.buckets,
        eggsTotal: eggs.totalEggs,
        eggsBySize: eggs.sizes,
        feedBags: feed.bags,
        feedEstimatedDaysLeft: feed.daysLeft ?? feed.estimatedDaysLeft ?? null,
        pendingOrders,
        openOrders,
        needsReviewCount,
        alerts: {
          lowFeed: Boolean(feed.isLow),
          needsReview: needsReviewCount > 0,
        },
        lowFeedThreshold,
        workspaceName: workspace.name,
      }
    },
    FarmCacheService.ttl.dashboard,
  )
}

export default class DashboardController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const snapshot = await buildSnapshot(farm.workspaceId)

    return ctx.inertia.render('dashboard', {
      snapshot,
      farmRole: farm.farmRole,
      workspaceName: snapshot.workspaceName,
    })
  }

  async data(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const snapshot = await buildSnapshot(farm.workspaceId)
    return ctx.response.ok({ data: { snapshot } })
  }
}
