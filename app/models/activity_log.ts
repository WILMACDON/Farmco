import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import Workspace from './workspace.js'

export default class ActivityLog extends SuperBaseModel {
  static table = 'activity_logs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare workspaceId: string

  @column()
  declare userId: string

  @column()
  declare action: string

  @column()
  declare entity: string

  @column()
  declare entityId: string | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value == null) return null
      if (typeof value === 'object') return value as Record<string, unknown>
      try {
        return JSON.parse(value) as Record<string, unknown>
      } catch {
        return null
      }
    },
  })
  declare before: Record<string, unknown> | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value == null) return null
      if (typeof value === 'object') return value as Record<string, unknown>
      try {
        return JSON.parse(value) as Record<string, unknown>
      } catch {
        return null
      }
    },
  })
  declare after: Record<string, unknown> | null

  @column()
  declare quantity: number | null

  @column()
  declare note: string | null

  @column.dateTime()
  declare recordedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
