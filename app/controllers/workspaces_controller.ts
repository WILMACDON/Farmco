import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace'
import WorkspaceInvitation from '#models/workspace_invitation'
import workspaceService from '#services/workspace_service'
import { createWorkspaceValidator, updateWorkspaceValidator } from '#validators/workspace'

export default class WorkspacesController {
  /**
   * List workspaces the authenticated user belongs to.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const workspaces = await workspaceService.getUserWorkspaces(user.id)

    return response.ok({ data: { workspaces } })
  }

  /**
   * Create a new workspace.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name } = await request.validateUsing(createWorkspaceValidator)

    if (!user.emailVerified) {
      return response.forbidden({
        error: 'Please verify your email address before creating a workspace.',
      })
    }

    await workspaceService.createWorkspace({
      name,
      userId: user.id,
    })

    return response.created()
  }

  /**
   * Onboarding endpoint — create the user's first workspace.
   */
  async onboard({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name } = await request.validateUsing(createWorkspaceValidator)

    const hasWorkspace = await workspaceService.userHasWorkspace(user.id)
    if (hasWorkspace) {
      return response.redirect('/dashboard')
    }

    const workspace = await workspaceService.createWorkspace({
      name,
      userId: user.id,
    })

    return response.created({
      message: 'Workspace created. Welcome!',
      data: { workspace: workspace.serialize(), redirectTo: '/dashboard' },
    })
  }

  /**
   * Get members + pending invitations for a workspace.
   */
  async members({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const workspaceId = request.param('workspaceId')

    const membership = await workspaceService.getMembership(workspaceId, user.id)
    if (!membership) {
      return response.forbidden({ error: 'You do not have access to this workspace.' })
    }

    const qs = request.qs()
    const page = Math.max(Number(qs.page ?? 1) || 1, 1)
    const perPage = Math.min(Math.max(Number(qs.perPage ?? 10) || 10, 1), 100)
    const search = typeof qs.search === 'string' ? qs.search.trim() : ''

    const paginator = await workspaceService.getMembers(workspaceId, {
      page,
      perPage,
      search: search || undefined,
    })

    const members = paginator.all()
    const meta = paginator.getMeta()

    const pendingInvitations = await WorkspaceInvitation.query()
      .where('workspace_id', workspaceId)
      .whereNull('accepted_at')
      .if(search.length > 0, (q) => {
        q.whereILike('email', `%${search}%`)
      })
      .preload('invitedBy')
      .orderBy('created_at', 'desc')

    return response.ok({
      data: {
        meta: {
          currentPage: meta.currentPage,
          perPage: meta.perPage,
          total: meta.total,
          lastPage: meta.lastPage,
        },
        members: members.map((m) => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt.toISO() || '',
          fullName: m.user?.fullName || null,
          email: m.user?.email || null,
        })),
        invitations: pendingInvitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          createdAt: inv.createdAt.toISO() || '',
          invitedBy: inv.invitedBy?.fullName || inv.invitedBy?.email || null,
        })),
      },
    })
  }

  /**
   * Check if the current user needs onboarding (has no workspace).
   */
  async checkOnboarding({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const hasWorkspace = await workspaceService.userHasWorkspace(user.id)

    return response.ok({ needsOnboarding: !hasWorkspace })
  }

  /**
   * Switch the current workspace (stores in session).
   */
  async switchWorkspace({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const workspaceId = request.input('workspaceId')

    if (!workspaceId) {
      return response.badRequest({ error: 'workspaceId is required' })
    }

    const membership = await workspaceService.getMembership(workspaceId, user.id)
    if (!membership) {
      return response.forbidden({ error: 'You do not have access to this workspace.' })
    }

    session.put('currentWorkspaceId', workspaceId)

    return response.ok({ message: 'Workspace switched', data: { workspaceId } })
  }

  /**
   * Update a workspace.
   */
  async update({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const workspaceId = request.param('id')
    const { name } = await request.validateUsing(updateWorkspaceValidator)

    const workspace = await Workspace.findOrFail(workspaceId)

    // Check if user is owner or admin
    const isAuthorized = await workspaceService.isOwnerOrAdmin(workspace.id, user.id)
    if (!isAuthorized) {
      return response.forbidden({ error: 'You do not have permission to update this workspace.' })
    }

    await workspace.merge({ name }).save()

    const isInertia = request.header('X-Inertia')
    if (isInertia) {
      return response.redirect().status(303).withQs({ tab: 'sessions' }).back()
    }
    return response.ok({ message: 'Workspace updated', data: { workspace } })
  }

  /**
   * Delete a workspace.
   */
  async destroy({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const workspaceId = request.param('id')

    const workspace = await Workspace.findOrFail(workspaceId)

    // Only owner can delete
    if (workspace.createdByUserId !== user.id) {
      return response.forbidden({ error: 'Only the workspace owner can delete this workspace.' })
    }

    await workspace.delete()

    // If current session is this workspace, handle switching
    if (session.get('currentWorkspaceId') === workspaceId) {
      session.forget('currentWorkspaceId')
      const otherWorkspaces = await workspaceService.getUserWorkspaces(user.id)
      if (otherWorkspaces.length > 0) {
        session.put('currentWorkspaceId', otherWorkspaces[0].id)
      }
    }

    return response.ok({ message: 'Workspace deleted successfully' })
  }
}
