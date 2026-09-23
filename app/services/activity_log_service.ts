import { DateTime } from 'luxon'
import ActivityLog from '#models/activity_log'
import type { Transaction } from '#types/extra'
import type { FarmRole } from '#utils/farm_permissions'

export interface LogActivityOptions {
  workspaceId: string
  userId: string
  action: string
  entity: string
  entityId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  quantity?: number | null
  note?: string | null
  recordedAt: DateTime
  trx?: Transaction
}

export interface ActivityListFilters {
  userId?: string
  entity?: string
  action?: string
  from?: string
  to?: string
  page?: number
  perPage?: number
}

export class ActivityLogService {
  async log(options: LogActivityOptions): Promise<ActivityLog> {
    const {
      workspaceId,
      userId,
      action,
      entity,
      entityId = null,
      before = null,
      after = null,
      quantity = null,
      note = null,
      recordedAt,
      trx,
    } = options

    const createOptions = trx ? { client: trx } : undefined

    return ActivityLog.create(
      {
        workspaceId,
        userId,
        action,
        entity,
        entityId,
        before,
        after,
        quantity,
        note,
        recordedAt,
      },
      createOptions,
    )
  }

  async list(
    workspaceId: string,
    filters: ActivityListFilters = {},
    options: { ownOnly?: boolean; userId?: string; farmRole?: FarmRole } = {},
  ) {
    const query = ActivityLog.query()
      .where('workspace_id', workspaceId)
      .preload('user')
      .orderBy('recorded_at', 'desc')

    if (options.ownOnly && options.userId) {
      query.where('user_id', options.userId)
    } else if (filters.userId) {
      query.where('user_id', filters.userId)
    }

    if (filters.entity) query.where('entity', filters.entity)
    if (filters.action) query.where('action', filters.action)

    if (filters.from) {
      const from = DateTime.fromISO(filters.from)
      if (from.isValid) query.where('recorded_at', '>=', from.toSQL()!)
    }
    if (filters.to) {
      const to = DateTime.fromISO(filters.to)
      if (to.isValid) query.where('recorded_at', '<=', to.toSQL()!)
    }

    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 50)
    const json = page.toJSON()
    return { entries: json.data, meta: json.meta }
  }
}

const activityLogService = new ActivityLogService()
export default activityLogService
