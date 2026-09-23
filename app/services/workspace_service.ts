import Workspace from '#models/workspace'
import type { WorkspaceRole } from '#models/workspace_member'
import WorkspaceMember from '#models/workspace_member'

export interface CreateWorkspaceOptions {
  name: string
  userId: string
}

export class WorkspaceService {
  /**
   * Create a workspace and add the creator as the owner.
   */
  async createWorkspace({ name, userId }: CreateWorkspaceOptions): Promise<Workspace> {
    const workspace = await Workspace.create({
      name,
      createdByUserId: userId,
    })

    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    })

    return workspace
  }

  /**
   * Check if a user belongs to at least one workspace.
   */
  async userHasWorkspace(userId: string): Promise<boolean> {
    const membership = await WorkspaceMember.query().where('user_id', userId).first()
    return Boolean(membership)
  }

  /**
   * Get all workspaces a user belongs to.
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    return Workspace.query()
      .whereIn('id', WorkspaceMember.query().select('workspace_id').where('user_id', userId))
      .orderBy('created_at', 'desc')
  }

  /**
   * Get workspace members with pagination.
   */
  async getMembers(
    workspaceId: string,
    options: { page: number; perPage: number; search?: string },
  ) {
    const query = WorkspaceMember.query()
      .where('workspace_id', workspaceId)
      .preload('user')
      .orderBy('created_at', 'asc')

    if (options.search) {
      query.whereHas('user', (uq) => {
        uq.whereILike('email', `%${options.search}%`).orWhereILike(
          'full_name',
          `%${options.search}%`,
        )
      })
    }

    return query.paginate(options.page, options.perPage)
  }

  /**
   * Check membership and return the role if found.
   */
  async getMembership(
    workspaceId: string,
    userId: string,
  ): Promise<{ role: WorkspaceRole } | null> {
    const member = await WorkspaceMember.query()
      .where('workspace_id', workspaceId)
      .where('user_id', userId)
      .first()

    if (!member) return null
    return { role: member.role }
  }

  /**
   * Check if a user is owner or admin of a workspace.
   */
  async isOwnerOrAdmin(workspaceId: string, userId: string): Promise<boolean> {
    const membership = await this.getMembership(workspaceId, userId)
    if (!membership) return false
    return ['owner', 'admin'].includes(membership.role)
  }
}

const workspaceService = new WorkspaceService()
export default workspaceService
