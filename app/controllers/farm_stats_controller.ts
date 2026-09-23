import type { HttpContext } from '@adonisjs/core/http'
import type { DateTime } from 'luxon'
import farmStatsService from '#services/farm_stats_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import { canViewFullStats } from '#utils/farm_permissions'
import { parseOptionalDateTime, statsFilterValidator } from '#validators/farm'

export default class FarmStatsController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const filters = await ctx.request.validateUsing(statsFilterValidator, {
      data: ctx.request.qs(),
    })

    const rangePreset = filters.range ?? '7d'
    let range: '7d' | '30d' | { from: DateTime; to: DateTime }

    if (rangePreset === 'custom') {
      const from = parseOptionalDateTime(filters.from)
      const to = parseOptionalDateTime(filters.to)
      if (!from || !to) {
        return ctx.response.badRequest({
          error: 'Custom range requires from and to dates.',
        })
      }
      range = { from, to }
    } else {
      range = rangePreset
    }

    const stats = await farmStatsService.getMetrics({
      workspaceId: farm.workspaceId,
      role: farm.membershipRole,
      userId: farm.user.id,
      range,
    })

    return ctx.inertia.render('stats/index', {
      stats,
      filters: { ...filters, range: rangePreset },
      farmRole: farm.farmRole,
      limited: !canViewFullStats(farm.membershipRole),
    })
  }
}
