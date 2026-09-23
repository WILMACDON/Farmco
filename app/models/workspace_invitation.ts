import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'
import type { WorkspaceRole } from './workspace_member.js'

export default class WorkspaceInvitation extends SuperBaseModel {
  static table = 'workspace_invitations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare email: string

  @column()
  declare role: WorkspaceRole

  @column({ serializeAs: null })
  declare tokenHash: string

  @column()
  declare invitedByUserId: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare acceptedAt: DateTime | null

  @column()
  declare acceptedByUserId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  @belongsTo(() => User, { foreignKey: 'invitedByUserId' })
  declare invitedBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'acceptedByUserId' })
  declare acceptedBy: BelongsTo<typeof User>
}
