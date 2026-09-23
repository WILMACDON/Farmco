import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class AdminController {
  async index({ request, inertia }: HttpContext) {
    const queryParams = await request.paginationQs()
    const page = queryParams.page || 1
    const perPage = queryParams.perPage || 20

    const totalUsersRow = await db.from('users').count('* as total').first()

    const totalUsers = Number(totalUsersRow?.total || 0)

    const auditsBaseQuery = db.from('audits').leftJoin('users', 'audits.user_id', 'users.id')

    // Count must run without ORDER BY (Postgres requires non-aggregated columns
    // in ORDER BY to appear in GROUP BY). Use a base query for counts and apply
    // ordering only when selecting rows.

    const audits = await auditsBaseQuery

      .select(
        'audits.id',
        'audits.event',
        'audits.auditable_type',
        'audits.auditable_id',
        'audits.user_id',
        'audits.created_at',
        'users.email as user_email',
        'users.full_name as user_full_name',
      )
      .orderBy('audits.created_at', 'desc')
      .paginate(page, perPage)

    return inertia.render('admin/index', {
      stats: { totalUsers, totalActivity: audits.total },
      activities: audits,
    })
  }
}
