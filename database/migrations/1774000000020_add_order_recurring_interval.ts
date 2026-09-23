import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('recurring_interval', ['weekly', 'biweekly', 'monthly'])
        .nullable()
        .after('delivery_date')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('recurring_interval')
    })
  }
}
