import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import workspaceService from '#services/workspace_service'
import { updateAdminUserValidator } from '#validators/admin_user'

export default class AdminUsersController {
  async index({ request, inertia }: HttpContext) {
    const queryParams = await request.paginationQs()

    let query = User.query().select([
      'id',
      'full_name',
      'email',
      'role',
      'created_at',
      'last_login_at',
    ])

    if (queryParams.search) {
      const searchTerm = `%${queryParams.search}%`
      query = query.where((q) => {
        q.where('email', 'like', searchTerm).orWhere('full_name', 'like', searchTerm)
      })
    }

    query = query.orderBy(queryParams.sortBy || 'created_at', queryParams.sortOrder || 'desc')

    const users = await query.paginate(queryParams.page || 1, queryParams.perPage || 20)

    return inertia.render('admin/users', { users })
  }

  async show({ params, request, inertia, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) return response.notFound({ error: 'User not found' })

    const queryParams = await request.paginationQs()

    let auditsQuery = db.from('audits').where('user_id', user.id)

    if (queryParams.search) {
      const like = `%${queryParams.search}%`
      auditsQuery = auditsQuery.where((q) => {
        q.where('event', 'like', like).orWhere('auditable_type', 'like', like)
      })
    }

    const audits = await auditsQuery
      .clone()
      .orderBy('created_at', 'desc')
      .select(['id', 'event', 'auditable_type', 'auditable_id', 'metadata', 'created_at'])
      .paginate(queryParams.page || 1, queryParams.perPage || 10)

    return inertia.render('admin/user', {
      targetUser: user,
      activity: audits,
    })
  }

  async edit({ params, inertia, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) return response.notFound({ error: 'User not found' })

    return inertia.render('admin/user-edit', {
      targetUser: user,
    })
  }

  async update({ params, request, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) return response.notFound({ error: 'User not found' })

    const body = await request.validateUsing(updateAdminUserValidator)

    user.fullName = body.fullName?.trim() ? body.fullName.trim() : null
    user.role = body.role
    await user.save()

    return response.redirect(`/admin/users/${user.id}`)
  }

  async impersonate({ params, session, auth, response }: HttpContext) {
    const targetUser = await User.findOrFail(params.id)

    // Don't allow impersonating yourself
    if (auth.user?.id === targetUser.id) {
      session.flash('error', { message: 'You cannot impersonate yourself' })
      return response.redirect().back()
    }

    // Store original user ID
    const originalUserId = auth.user!.id

    // Login as target user
    await auth.use('web').login(targetUser)

    // Clear old device session ID so new user gets a new one
    session.forget('deviceSessionId')

    const workspaces = await workspaceService.getUserWorkspaces(targetUser.id)
    if (workspaces.length > 0) {
      session.put('currentWorkspaceId', workspaces[0].id)
    }

    // Set the impersonating flag
    session.put('impersonatingFromUserId', originalUserId)

    return response.redirect('/dashboard')
  }
}
