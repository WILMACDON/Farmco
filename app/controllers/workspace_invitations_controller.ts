import { createHash } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { appUrl } from '#emails/global'
import User from '#models/user'
import Workspace from '#models/workspace'
import WorkspaceInvitation from '#models/workspace_invitation'
import WorkspaceMember from '#models/workspace_member'
import { generateShortId } from '#services/app.functions'
import mailer from '#services/email_service'
import notificationService from '#services/notification_service'
import workspaceService from '#services/workspace_service'
import {
  acceptWorkspaceInviteAuthedValidator,
  acceptWorkspaceInviteGuestValidator,
  inviteToWorkspaceValidator,
} from '#validators/workspace'

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export default class WorkspaceInvitationsController {
  /**
   * Render the join page for an invitation link.
   */
  async joinPage({ auth, inertia, request }: HttpContext) {
    const token = request.qs().token

    if (!token || typeof token !== 'string') {
      return inertia.render('workspaces/join', {
        invitation: null,
        error: 'Invite token is required.',
      })
    }

    const tokenHash = hashInviteToken(token)
    const now = DateTime.now()

    const invitation = await WorkspaceInvitation.query()
      .where('token_hash', tokenHash)
      .preload('workspace')
      .preload('invitedBy')
      .first()

    if (!invitation) {
      return inertia.render('workspaces/join', {
        invitation: null,
        error: 'This invite link is invalid.',
      })
    }

    if (invitation.acceptedAt) {
      return inertia.render('workspaces/join', {
        invitation: null,
        error: 'This invite has already been accepted.',
      })
    }

    if (invitation.expiresAt.toMillis() < now.toMillis()) {
      return inertia.render('workspaces/join', {
        invitation: null,
        error: 'This invite link has expired.',
      })
    }

    const existingUser = await User.findBy('email', invitation.email)
    const authedUser = auth.user
    const isAuthedAsInvitee = Boolean(authedUser && authedUser.email === invitation.email)

    return inertia.render('workspaces/join', {
      invitation: {
        email: invitation.email,
        workspaceName: invitation.workspace.name,
        inviterName: invitation.invitedBy?.fullName || invitation.invitedBy?.email || 'Someone',
        role: invitation.role,
      },
      token,
      hasAccount: Boolean(existingUser),
      isAuthed: auth.isAuthenticated,
      isAuthedAsInvitee,
    })
  }

  /**
   * Send an invitation to join a workspace.
   */
  async invite({ auth, request, response, now, logger }: HttpContext) {
    const user = auth.getUserOrFail()
    const { email, role } = await request.validateUsing(inviteToWorkspaceValidator)

    if (!user.emailVerified) {
      return response.forbidden({
        error: 'Please verify your email address before inviting others.',
      })
    }

    const workspaceId = request.param('workspaceId')
    const isOwnerOrAdmin = await workspaceService.isOwnerOrAdmin(workspaceId, user.id)

    if (!isOwnerOrAdmin) {
      return response.forbidden({
        error: 'You do not have permission to invite members to this workspace.',
      })
    }

    const workspace = await Workspace.findOrFail(workspaceId)
    const normalizedEmail = email.toLowerCase().trim()

    // Check if already a member
    const existingUser = await User.findBy('email', normalizedEmail)
    if (existingUser) {
      const existingMember = await WorkspaceMember.query()
        .where('workspace_id', workspaceId)
        .where('user_id', existingUser.id)
        .first()

      if (existingMember) {
        return response.conflict({
          error: 'That user is already a member of this workspace.',
        })
      }
    }

    // Check for existing active invite
    const nowSql = now.toSQL()
    if (!nowSql) {
      return response.internalServerError({
        error: 'Unable to process invite right now. Please try again.',
      })
    }

    const existingInvite = await WorkspaceInvitation.query()
      .where('workspace_id', workspaceId)
      .where('email', normalizedEmail)
      .whereNull('accepted_at')
      .where('expires_at', '>', nowSql)
      .first()

    if (existingInvite) {
      return response.ok({
        message: 'An active invite has already been sent to this email.',
      })
    }

    const token = generateShortId(48)
    const tokenHash = hashInviteToken(token)
    const expiresAt = DateTime.now().plus({ days: 7 })
    const trx = await db.transaction()

    try {
      await WorkspaceInvitation.create(
        {
          workspaceId: workspace.id,
          email: normalizedEmail,
          role: role ?? 'member',
          tokenHash,
          invitedByUserId: user.id,
          expiresAt,
          acceptedAt: null,
          acceptedByUserId: null,
        },
        { client: trx },
      )

      await trx.commit()

      const joinUrl = `${appUrl}/join?token=${token}`
      await mailer.send({
        type: 'workspace-invite',
        data: {
          email: normalizedEmail,
          inviterName: user.fullName || user.email,
          workspaceName: workspace.name,
          url: joinUrl,
        },
      })

      logger.info('Workspace invite sent', {
        workspaceId: workspace.id,
        email: normalizedEmail,
      })

      return response.created({ message: 'Invite sent successfully.' })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Accept a workspace invitation.
   */
  async accept({ auth, request, response, now }: HttpContext) {
    const isAuthed = auth.isAuthenticated
    const trx = await db.transaction()

    try {
      if (isAuthed) {
        const user = auth.getUserOrFail()
        const freshUser = await User.query({ client: trx }).where('email', user.email).firstOrFail()
        const { token } = await request.validateUsing(acceptWorkspaceInviteAuthedValidator)

        const invitation = await WorkspaceInvitation.query({ client: trx })
          .where('token_hash', hashInviteToken(token))
          .whereNull('accepted_at')
          .preload('workspace')
          .preload('invitedBy')
          .first()

        if (!invitation) {
          await trx.rollback()
          return response.badRequest({
            error: 'Invite is invalid or has already been used.',
          })
        }

        if (invitation.expiresAt.toMillis() < DateTime.now().toMillis()) {
          await trx.rollback()
          return response.badRequest({ error: 'Invite has expired.' })
        }

        if (freshUser.email !== invitation.email) {
          await trx.rollback()
          return response.forbidden({
            error: 'You must be logged in with the invited email address.',
          })
        }

        const existingMember = await WorkspaceMember.query({ client: trx })
          .where('workspace_id', invitation.workspaceId)
          .where('user_id', freshUser.id)
          .first()

        if (!existingMember) {
          await WorkspaceMember.create(
            {
              workspaceId: invitation.workspaceId,
              userId: freshUser.id,
              role: invitation.role,
            },
            { client: trx },
          )
        }

        await invitation.merge({ acceptedAt: now, acceptedByUserId: freshUser.id }).save()
        await trx.commit()

        if (invitation.invitedByUserId) {
          await notificationService.push({
            userId: invitation.invitedByUserId,
            title: 'Workspace invite accepted',
            message: `${freshUser.fullName || freshUser.email} joined ${invitation.workspace.name}`,
            type: 'success',
          })
        }

        if (invitation.invitedBy?.email) {
          await mailer.send({
            type: 'workspace-joined',
            data: {
              email: invitation.invitedBy.email,
              inviterName: invitation.invitedBy.fullName || invitation.invitedBy.email,
              workspaceName: invitation.workspace.name,
              joinedUserEmail: freshUser.email,
              joinedUserName: freshUser.fullName || freshUser.email,
            },
          })
        }

        return response.ok({
          message: 'You have joined the workspace.',
          redirectTo: '/dashboard',
        })
      }

      // Guest flow: create account + accept invite
      const { token, fullName, password } = await request.validateUsing(
        acceptWorkspaceInviteGuestValidator,
      )

      const invitation = await WorkspaceInvitation.query({ client: trx })
        .where('token_hash', hashInviteToken(token))
        .whereNull('accepted_at')
        .preload('workspace')
        .preload('invitedBy')
        .first()

      if (!invitation) {
        await trx.rollback()
        return response.badRequest({
          error: 'Invite is invalid or has already been used.',
        })
      }

      if (invitation.expiresAt.toMillis() < DateTime.now().toMillis()) {
        await trx.rollback()
        return response.badRequest({ error: 'Invite has expired.' })
      }

      const existingUser = await User.query({ client: trx })
        .where('email', invitation.email)
        .first()
      if (existingUser) {
        await trx.rollback()
        return response.conflict({
          error: 'An account with this email already exists. Please log in to accept the invite.',
        })
      }

      const newUser = await User.create(
        {
          fullName,
          email: invitation.email,
          password,
          emailVerified: true,
          emailVerifiedAt: now,
          token: null,
          role: 'normal_user',
        },
        { client: trx },
      )

      await WorkspaceMember.create(
        {
          workspaceId: invitation.workspaceId,
          userId: newUser.id,
          role: invitation.role,
        },
        { client: trx },
      )

      await invitation.merge({ acceptedAt: now, acceptedByUserId: newUser.id }).save()
      await trx.commit()

      await auth.use('web').login(newUser)

      if (invitation.invitedByUserId) {
        await notificationService.push({
          userId: invitation.invitedByUserId,
          title: 'Workspace invite accepted',
          message: `${newUser.fullName || newUser.email} joined ${invitation.workspace.name}`,
          type: 'success',
        })
      }

      if (invitation.invitedBy?.email) {
        await mailer.send({
          type: 'workspace-joined',
          data: {
            email: invitation.invitedBy.email,
            inviterName: invitation.invitedBy.fullName || invitation.invitedBy.email,
            workspaceName: invitation.workspace.name,
            joinedUserEmail: newUser.email,
            joinedUserName: newUser.fullName || newUser.email,
          },
        })
      }

      return response.ok({
        message: 'Account created and workspace joined successfully.',
        redirectTo: '/dashboard',
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
