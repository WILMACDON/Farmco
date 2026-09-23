import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

import User from '#models/user'
import Workspace from '#models/workspace'
import WorkspaceMember from '#models/workspace_member'
import birdInventoryService from '#services/bird_inventory_service'
import eggInventoryService from '#services/egg_inventory_service'
import feedInventoryService from '#services/feed_inventory_service'

/**
 * Demo farm data for local development.
 *
 * Run specifically with:
 *   node ace db:seed --files=database/seeders/farm_seeder.ts
 *
 * Or run all seeders:
 *   node ace db:seed
 */
export default class FarmSeeder extends BaseSeeder {
  static environment = ['development', 'testing', 'test']

  async run() {
    const password = 'password'

    const owner = await User.updateOrCreate(
      { email: 'owner@farmco.test' },
      {
        fullName: 'Farm Owner',
        email: 'owner@farmco.test',
        password,
        role: 'normal_user',
        status: 'active',
        mustChangePassword: false,
        provider: 'local',
        emailVerified: true,
        emailVerifiedAt: DateTime.now(),
        lastLoginAt: DateTime.now(),
      },
    )

    const workspace = await Workspace.updateOrCreate(
      { name: 'Farmco Demo', createdByUserId: owner.id },
      {
        name: 'Farmco Demo',
        createdByUserId: owner.id,
        eggsPerCrate: 30,
        lowFeedThreshold: 5,
      },
    )

    await WorkspaceMember.updateOrCreate(
      { workspaceId: workspace.id, userId: owner.id },
      { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
    )

    const manager = await User.updateOrCreate(
      { email: 'manager@farmco.test' },
      {
        fullName: 'Farm Manager',
        email: 'manager@farmco.test',
        password,
        role: 'normal_user',
        status: 'active',
        mustChangePassword: false,
        createdByUserId: owner.id,
        provider: 'local',
        emailVerified: true,
        emailVerifiedAt: DateTime.now(),
        lastLoginAt: DateTime.now(),
      },
    )

    await WorkspaceMember.updateOrCreate(
      { workspaceId: workspace.id, userId: manager.id },
      { workspaceId: workspace.id, userId: manager.id, role: 'admin' },
    )

    const worker = await User.updateOrCreate(
      { email: 'worker@farmco.test' },
      {
        fullName: 'Farm Worker',
        email: 'worker@farmco.test',
        password,
        role: 'normal_user',
        status: 'active',
        mustChangePassword: false,
        createdByUserId: owner.id,
        provider: 'local',
        emailVerified: true,
        emailVerifiedAt: DateTime.now(),
        lastLoginAt: DateTime.now(),
      },
    )

    await WorkspaceMember.updateOrCreate(
      { workspaceId: workspace.id, userId: worker.id },
      { workspaceId: workspace.id, userId: worker.id, role: 'member' },
    )

    const existingBirds = await birdInventoryService.loadStock(workspace.id)
    if (existingBirds.total === 0) {
      await birdInventoryService.add({
        workspaceId: workspace.id,
        userId: owner.id,
        health: 'well',
        production: 'laying',
        quantity: 120,
        note: 'Demo flock — layers',
      })
      await birdInventoryService.add({
        workspaceId: workspace.id,
        userId: owner.id,
        health: 'well',
        production: 'non_laying',
        quantity: 40,
        note: 'Demo flock — growers',
      })
      await birdInventoryService.add({
        workspaceId: workspace.id,
        userId: owner.id,
        production: 'chick',
        quantity: 50,
        note: 'Demo chicks',
      })
    }

    const existingEggs = await eggInventoryService.loadStock(workspace.id, workspace.eggsPerCrate)
    if (existingEggs.totalEggs === 0) {
      await eggInventoryService.add({
        workspaceId: workspace.id,
        userId: worker.id,
        size: 'large',
        quantityEggs: 150,
        note: 'Demo collection',
      })
      await eggInventoryService.add({
        workspaceId: workspace.id,
        userId: worker.id,
        size: 'medium',
        quantityEggs: 90,
        note: 'Demo collection',
      })
      await eggInventoryService.add({
        workspaceId: workspace.id,
        userId: worker.id,
        size: 'small',
        quantityEggs: 30,
        note: 'Demo collection',
      })
    }

    const existingFeed = await feedInventoryService.loadStock(workspace.id)
    if (existingFeed.bags === 0) {
      await feedInventoryService.add({
        workspaceId: workspace.id,
        userId: manager.id,
        bags: 25,
        note: 'Demo feed delivery',
      })
      await feedInventoryService.remove({
        workspaceId: workspace.id,
        userId: worker.id,
        bags: 2.5,
        note: 'Morning feeding',
      })
    }
  }
}
