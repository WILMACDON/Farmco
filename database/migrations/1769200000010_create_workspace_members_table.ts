import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workspace_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()

      table.string('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE').index()
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE').index()
      table.string('role').notNullable().defaultTo('member') // owner, admin, member
      
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['workspace_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
