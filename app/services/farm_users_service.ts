import { createHash } from 'node:crypto'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { appUrl } from '#emails/global'
import User from '#models/user'
import Workspace from '#models/workspace'
import WorkspaceInvitation from '#models/workspace_invitation'
import type { WorkspaceRole } from '#models/workspace_member'
import WorkspaceMember from '#models/workspace_member'
import activityLogService from '#services/activity_log_service'
import { generateShortId } from '#services/app.functions'
import mailer from '#services/email_service'
import workspaceService from '#services/workspace_service'
import {
  canInviteRole,
  canManageManagers,
  canManageWorkers,
  type FarmRole,
  fromFarmRole,
  toFarmRole,
} from '#utils/farm_permissions'

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export interface CreateFarmUserOptions {
  workspaceId: string
  actorUserId: string
  actorRole: WorkspaceRole
  email: string
  fullName: string
  farmRole: 'manager' | 'worker'
  temporaryPassword?: string
}

export class FarmUsersService {
  async listMembersAndInvites(workspaceId: string, options: { search?: string } = {}) {
    const memberQuery = WorkspaceMember.query()
      .where('workspace_id', workspaceId)
      .preload('user')
      .orderBy('created_at', 'asc')

    if (options.search) {
      memberQuery.whereHas('user', (uq) => {
        uq.whereILike('email', `%${options.search}%`).orWhereILike(
          'full_name',
          `%${options.search}%`,
        )
      })
    }

    const members = await memberQuery
    const invitationsQuery = WorkspaceInvitation.query()
      .where('workspace_id', workspaceId)
      .whereNull('accepted_at')
      .orderBy('created_at', 'desc')

    if (options.search) {
      invitationsQuery.whereILike('email', `%${options.search}%`)
    }

    const invitations = await invitationsQuery

    return {
      members: members.map((member) => ({
        id: member.id,
        workspaceId: member.workspaceId,
        userId: member.userId,
        role: member.role,
        farmRole: toFarmRole(member.role),
        createdAt: member.createdAt.toISO(),
        user: member.user
          ? {
              id: member.user.id,
              fullName: member.user.fullName,
              email: member.user.email,
              status: member.user.status,
              mustChangePassword: member.user.mustChangePassword,
              createdByUserId: member.user.createdByUserId,
            }
          : null,
      })),
      invitations: invitations.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        farmRole: toFarmRole(invite.role),
        expiresAt: invite.expiresAt.toISO(),
        createdAt: invite.createdAt.toISO(),
      })),
    }
  }

  async listMembers(
    workspaceId: string,
    options: { page?: number; perPage?: number; search?: string; includeInactive?: boolean } = {},
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

    if (!options.includeInactive) {
      query.whereHas('user', (uq) => {
        uq.where('status', 'active')
      })
    }

    const page = await query.paginate(options.page ?? 1, options.perPage ?? 25)
    const serialized = page.toJSON()

    return {
      ...serialized,
      data: serialized.data.map((member) => ({
        id: member.id,
        workspaceId: member.workspaceId,
        userId: member.userId,
        role: member.role,
        farmRole: toFarmRole(member.role),
        createdAt: member.createdAt,
        user: member.user
          ? {
              id: member.user.id,
              fullName: member.user.fullName,
              email: member.user.email,
              status: member.user.status,
              mustChangePassword: member.user.mustChangePassword,
              createdByUserId: member.user.createdByUserId,
            }
          : null,
      })),
    }
  }

  async invite(
    workspaceId: string,
    actorUserId: string,
    payload: { email: string; role: 'manager' | 'worker' },
  ) {
    const membership = await workspaceService.getMembership(workspaceId, actorUserId)
    if (!membership) {
      throw new Exception('You are not a member of this workspace', { status: 403 })
    }
    if (!canInviteRole(membership.role, payload.role)) {
      throw new Exception(`You are not allowed to invite a ${payload.role}`, { status: 403 })
    }

    const workspace = await Workspace.findOrFail(workspaceId)
    const actor = await User.findOrFail(actorUserId)
    const normalizedEmail = payload.email.toLowerCase().trim()
    const workspaceRole = fromFarmRole(payload.role)

    const existingUser = await User.findBy('email', normalizedEmail)
    if (existingUser) {
      const existingMember = await WorkspaceMember.query()
        .where('workspace_id', workspaceId)
        .where('user_id', existingUser.id)
        .first()
      if (existingMember) {
        throw new Exception('That user is already a member of this workspace.', { status: 409 })
      }
    }

    const nowSql = DateTime.now().toSQL()
    const existingInvite = await WorkspaceInvitation.query()
      .where('workspace_id', workspaceId)
      .where('email', normalizedEmail)
      .whereNull('accepted_at')
      .where('expires_at', '>', nowSql!)
      .first()

    if (existingInvite) {
      return { alreadySent: true as const, invitationId: existingInvite.id }
    }

    const token = generateShortId(48)
    const tokenHash = hashInviteToken(token)
    const expiresAt = DateTime.now().plus({ days: 7 })
    const trx = await db.transaction()

    try {
      const invitation = await WorkspaceInvitation.create(
        {
          workspaceId: workspace.id,
          email: normalizedEmail,
          role: workspaceRole,
          tokenHash,
          invitedByUserId: actorUserId,
          expiresAt,
          acceptedAt: null,
          acceptedByUserId: null,
        },
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId: actorUserId,
        action: 'user.invite',
        entity: 'user',
        entityId: invitation.id,
        before: null,
        after: { email: normalizedEmail, farmRole: payload.role, role: workspaceRole },
        recordedAt: DateTime.now(),
        trx,
      })

      await trx.commit()

      const joinUrl = `${appUrl}/join?token=${token}`
      await mailer.send({
        type: 'workspace-invite',
        data: {
          email: normalizedEmail,
          inviterName: actor.fullName || actor.email,
          workspaceName: workspace.name,
          url: joinUrl,
        },
      })

      return { alreadySent: false as const, invitationId: invitation.id }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Create a user with a temporary password and add them to the workspace.
   */
  async createUser(options: CreateFarmUserOptions): Promise<{
    user: User
    member: WorkspaceMember
    temporaryPassword: string
  }> {
    const { workspaceId, actorUserId, actorRole, email, fullName, farmRole } = options

    if (!canInviteRole(actorRole, farmRole)) {
      throw new Exception(`You are not allowed to create a ${farmRole}`, { status: 403 })
    }

    const existing = await User.findBy('email', email.toLowerCase().trim())
    if (existing) {
      const alreadyMember = await WorkspaceMember.query()
        .where('workspace_id', workspaceId)
        .where('user_id', existing.id)
        .first()
      if (alreadyMember) {
        throw new Exception('User is already a member of this workspace', { status: 409 })
      }
      throw new Exception('A user with this email already exists', { status: 409 })
    }

    const temporaryPassword = options.temporaryPassword ?? generateShortId(12)
    const workspaceRole = fromFarmRole(farmRole)
    const trx = await db.transaction()

    try {
      const user = await User.create(
        {
          email: email.toLowerCase().trim(),
          fullName,
          password: temporaryPassword,
          role: 'normal_user',
          status: 'active',
          mustChangePassword: true,
          createdByUserId: actorUserId,
          provider: 'local',
          emailVerified: true,
          emailVerifiedAt: DateTime.now(),
          lastLoginAt: DateTime.now(),
        },
        { client: trx },
      )

      const member = await WorkspaceMember.create(
        {
          workspaceId,
          userId: user.id,
          role: workspaceRole,
        },
        { client: trx },
      )

      await activityLogService.log({
        workspaceId,
        userId: actorUserId,
        action: 'user.create',
        entity: 'user',
        entityId: user.id,
        before: null,
        after: { email: user.email, farmRole, role: workspaceRole },
        recordedAt: DateTime.now(),
        trx,
      })

      await trx.commit()
      return { user, member, temporaryPassword }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async deactivate(workspaceId: string, actorUserId: string, targetUserId: string): Promise<User> {
    const membership = await workspaceService.getMembership(workspaceId, actorUserId)
    if (!membership) {
      throw new Exception('You are not a member of this workspace', { status: 403 })
    }
    return this.deactivateUser({
      workspaceId,
      actorUserId,
      actorRole: membership.role,
      targetUserId,
    })
  }

  async deactivateUser(options: {
    workspaceId: string
    actorUserId: string
    actorRole: WorkspaceRole
    targetUserId: string
  }): Promise<User> {
    const { workspaceId, actorUserId, actorRole, targetUserId } = options

    if (actorUserId === targetUserId) {
      throw new Exception('You cannot deactivate yourself', { status: 422 })
    }

    const member = await WorkspaceMember.query()
      .where('workspace_id', workspaceId)
      .where('user_id', targetUserId)
      .preload('user')
      .firstOrFail()

    const targetFarmRole = toFarmRole(member.role)
    this.assertCanManageTarget(actorRole, targetFarmRole)

    if (member.role === 'owner') {
      throw new Exception('Cannot deactivate the workspace owner', { status: 422 })
    }

    const user = member.user
    if (user.status === 'inactive') return user

    const trx = await db.transaction()
    try {
      user.useTransaction(trx)
      user.status = 'inactive'
      await user.save()

      await activityLogService.log({
        workspaceId,
        userId: actorUserId,
        action: 'user.deactivate',
        entity: 'user',
        entityId: user.id,
        before: { status: 'active' },
        after: { status: 'inactive' },
        recordedAt: DateTime.now(),
        trx,
      })

      await trx.commit()
      return user
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private assertCanManageTarget(actorRole: WorkspaceRole, targetFarmRole: FarmRole) {
    if (targetFarmRole === 'owner') {
      throw new Exception('Cannot manage the workspace owner', { status: 403 })
    }
    if (targetFarmRole === 'manager' && !canManageManagers(actorRole)) {
      throw new Exception('Only the owner can manage managers', { status: 403 })
    }
    if (targetFarmRole === 'worker' && !canManageWorkers(actorRole)) {
      throw new Exception('You are not allowed to manage workers', { status: 403 })
    }
  }
}

const farmUsersService = new FarmUsersService()
export default farmUsersService
