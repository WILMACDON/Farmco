import { BaseSchema } from '@adonisjs/lucid/schema'

const SIZE_VALUES = `('small', 'medium', 'large', 'mixed')`
const TABLES = ['egg_stocks', 'egg_records', 'order_items'] as const

export default class extends BaseSchema {
  async up() {
    for (const table of TABLES) {
      this.schema.raw(`
        ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_size_check;
        ALTER TABLE ${table} ADD CONSTRAINT ${table}_size_check CHECK (size IN ${SIZE_VALUES});
      `)
    }
  }

  async down() {
    const previousValues = `('small', 'medium', 'large')`
    for (const table of TABLES) {
      this.schema.raw(`
        ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_size_check;
        ALTER TABLE ${table} ADD CONSTRAINT ${table}_size_check CHECK (size IN ${previousValues});
      `)
    }
  }
}
