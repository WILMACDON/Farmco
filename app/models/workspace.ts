import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { Auditable } from '@stouder-io/adonis-auditing'
import type { DateTime } from 'luxon'
import Plan from './plan.js'
import SuperBaseModel from './super_base.js'
import User from './user.js'
import WorkspaceInvitation from './workspace_invitation.js'
import WorkspaceMember from './workspace_member.js'

export default class Workspace extends compose(SuperBaseModel, Auditable) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare createdByUserId: string

  // Billing Fields
  @column()
  declare stripeCustomerId: string | null

  @column()
  declare currentPlanId: string | null

  @column()
  declare subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | null

  @column()
  declare billingInterval: 'monthly' | 'yearly' | null

  @column.dateTime()
  declare subscriptionEndsAt: DateTime | null

  @column()
  declare stripeSubscriptionId: string

  @belongsTo(() => Plan, { foreignKey: 'currentPlanId' })
  declare plan: BelongsTo<typeof Plan>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => WorkspaceMember)
  declare members: HasMany<typeof WorkspaceMember>

  @hasMany(() => WorkspaceInvitation)
  declare invitations: HasMany<typeof WorkspaceInvitation>
}
