import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export default class WorkspaceMember extends SuperBaseModel {
  static table = 'workspace_members'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare userId: string

  @column()
  declare role: WorkspaceRole

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
