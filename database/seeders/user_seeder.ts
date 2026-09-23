import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        fullName: 'Admin User',
        email: 'admin@test.com',
        password: 'password',
        role: 'admin',
      },
      {
        fullName: 'Regular User',
        email: 'regular@test.com',
        password: 'password',
        role: 'normal_user',
      },
      {
        fullName: 'Guest User',
        password: 'password',
        email: 'guest@test.com',
        role: 'normal_user',
      },
    ])
  }
}
