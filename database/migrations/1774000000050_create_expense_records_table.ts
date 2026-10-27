import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('expense_records', (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary()
      table
        .string('workspace_id')
        .notNullable()
        .references('id')
        .inTable('workspaces')
        .onDelete('CASCADE')
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table
        .enum('category', [
          'feed',
          'medication',
          'labour',
          'transport',
          'utilities',
          'equipment',
          'housing',
          'packaging',
          'marketing',
          'other',
        ])
        .notNullable()
      table.string('custom_type').nullable()
      table.decimal('amount', 14, 2).notNullable()
      table.text('note').nullable()
      table.string('client_entry_id').nullable()
      table.timestamp('recorded_at').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.unique(['workspace_id', 'client_entry_id'])
      table.index(['workspace_id', 'recorded_at'])
    })
  }

  async down() {
    this.schema.dropTable('expense_records')
  }
}
