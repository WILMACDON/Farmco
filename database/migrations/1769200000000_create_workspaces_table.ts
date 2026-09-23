import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workspaces'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').defaultTo(this.raw('nanoid()')).primary().unique().notNullable()

      table.string('name').notNullable()
      table.string('created_by_user_id').references('id').inTable('users').onDelete('CASCADE')
      
      // Billing fields
      table.string('stripe_customer_id').nullable().index()
      table.string('current_plan_id').references('id').inTable('plans').onDelete('SET NULL')
      table.enum('subscription_status', ['active', 'past_due', 'canceled', 'incomplete', 'trialing']).nullable()
      table.enum('billing_interval', ['monthly', 'yearly']).nullable()
      table.timestamp('subscription_ends_at').nullable()
      table.string('stripe_subscription_id').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
