import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { type Attachment, attachment } from '@jrmc/adonis-attachment'
import type { DateTime } from 'luxon'
import SessionDevice from './session_device.js'
import SuperBaseModel from './super_base.js'
import Workspace from './workspace.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(SuperBaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)
  static accessTokens = DbAccessTokensProvider.forModel(User)
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column()
  declare role: 'admin' | 'normal_user'

  @column()
  declare status: 'active' | 'inactive'

  @column()
  declare mustChangePassword: boolean

  @column()
  declare createdByUserId: string | null

  @column()
  declare pendingEmail: string | null

  @column({ serializeAs: null })
  declare emailChangeToken: string | null

  @attachment({ preComputeUrl: true })
  declare avatar: Attachment | null

  @column({ serializeAs: null })
  declare password: string

  @column({})
  declare provider: 'local' | 'google' | 'github'

  @column()
  declare emailVerified: boolean

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column({ serializeAs: null })
  declare token: string | null

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
  declare settings: Record<string, unknown> | null

  @column()
  declare twoFactorEnabled: boolean

  @column({ serializeAs: null })
  declare twoFactorSecret: string | null

  @column({ serializeAs: null })
  declare twoFactorRecoveryCodes: string | null

  @column.dateTime()
  declare lastLoginAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => SessionDevice)
  declare sessions: HasMany<typeof SessionDevice>

  @manyToMany(() => Workspace, {
    pivotTable: 'workspace_members',
    pivotTimestamps: true,
    pivotColumns: ['role'],
  })
  declare workspaces: ManyToMany<typeof Workspace>
}
