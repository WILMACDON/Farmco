import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workspace_invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()

      table.string('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE').index()
      table.string('email').notNullable().index()
      table.string('role').notNullable().defaultTo('member') // owner, admin, member

      // Store a hash of the invite token (never store the raw token)
      table.string('token_hash').notNullable().unique()

      table
        .string('invited_by_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .index()

      table
        .string('accepted_by_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      
      table.timestamp('expires_at').notNullable()
      table.timestamp('accepted_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
