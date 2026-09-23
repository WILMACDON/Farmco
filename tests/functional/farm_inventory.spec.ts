import { test } from '@japa/runner'

import ActivityLog from '#models/activity_log'
import birdInventoryService from '#services/bird_inventory_service'
import eggInventoryService from '#services/egg_inventory_service'
import feedInventoryService from '#services/feed_inventory_service'
import { asFarmUser, createOwnerWithWorkspace, resetDatabase } from '#tests/helpers/farm'

test.group('Farm inventory', (group) => {
  group.each.setup(async () => {
    await resetDatabase()
  })

  test('add birds, remove with reason, reject remove without reason or negative stock', async ({
    client,
    assert,
  }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'birds-owner@example.com',
      password: 'password123',
    })

    const addResponse = await asFarmUser(client.post('/api/v1/farm/birds'), user, workspace.id)
      .json({
        direction: 'add',
        health: 'well',
        production: 'laying',
        quantity: 10,
      })
      .withCsrfToken()

    addResponse.assertStatus(201)

    let stock = await birdInventoryService.getStock(workspace.id)
    assert.equal(stock.total, 10)

    const removeNoReason = await asFarmUser(client.post('/api/v1/farm/birds'), user, workspace.id)
      .json({
        direction: 'remove',
        health: 'well',
        production: 'laying',
        quantity: 2,
      })
      .withCsrfToken()

    removeNoReason.assertStatus(400)

    const removeOk = await asFarmUser(client.post('/api/v1/farm/birds'), user, workspace.id)
      .json({
        direction: 'remove',
        health: 'well',
        production: 'laying',
        quantity: 3,
        reason: 'mortality',
      })
      .withCsrfToken()

    removeOk.assertStatus(201)

    stock = await birdInventoryService.getStock(workspace.id)
    assert.equal(stock.total, 7)

    const removeNegative = await asFarmUser(client.post('/api/v1/farm/birds'), user, workspace.id)
      .json({
        direction: 'remove',
        health: 'well',
        production: 'laying',
        quantity: 100,
        reason: 'too many',
      })
      .withCsrfToken()

    removeNegative.assertStatus(400)

    stock = await birdInventoryService.getStock(workspace.id)
    assert.equal(stock.total, 7)
  })

  test('eggs add and remove with crates', async ({ client, assert }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'eggs-owner@example.com',
      password: 'password123',
      eggsPerCrate: 30,
    })

    const addResponse = await asFarmUser(client.post('/api/v1/farm/eggs'), user, workspace.id)
      .json({
        size: 'large',
        direction: 'add',
        crates: 2,
        loose: 5,
      })
      .withCsrfToken()

    addResponse.assertStatus(201)

    let stock = await eggInventoryService.getStock(workspace.id, 30)
    const large = stock.sizes.find((s) => s.size === 'large')
    assert.equal(large?.quantityEggs, 65)

    const removeResponse = await asFarmUser(client.post('/api/v1/farm/eggs'), user, workspace.id)
      .json({
        size: 'large',
        direction: 'remove',
        crates: 1,
        reason: 'breakage',
      })
      .withCsrfToken()

    removeResponse.assertStatus(201)

    stock = await eggInventoryService.getStock(workspace.id, 30)
    assert.equal(stock.sizes.find((s) => s.size === 'large')?.quantityEggs, 35)
  })

  test('feed add and remove fractional bags', async ({ client, assert }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'feed-owner@example.com',
      password: 'password123',
    })

    const addResponse = await asFarmUser(client.post('/api/v1/farm/feed'), user, workspace.id)
      .json({
        direction: 'add',
        bags: 2.5,
      })
      .withCsrfToken()

    addResponse.assertStatus(201)

    let stock = await feedInventoryService.getStock(workspace.id)
    assert.equal(stock.bags, 2.5)

    const removeResponse = await asFarmUser(client.post('/api/v1/farm/feed'), user, workspace.id)
      .json({
        direction: 'remove',
        bags: 0.75,
        note: 'morning feed',
      })
      .withCsrfToken()

    removeResponse.assertStatus(201)

    stock = await feedInventoryService.getStock(workspace.id)
    assert.equal(stock.bags, 1.75)
  })

  test('activity log is created for inventory movements', async ({ client, assert }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'activity-owner@example.com',
      password: 'password123',
    })

    await asFarmUser(client.post('/api/v1/farm/birds'), user, workspace.id)
      .json({
        direction: 'add',
        health: 'well',
        production: 'laying',
        quantity: 4,
      })
      .withCsrfToken()

    const log = await ActivityLog.query()
      .where('workspace_id', workspace.id)
      .where('action', 'bird.add')
      .first()

    assert.isNotNull(log)
    assert.equal(log!.userId, user.id)
    assert.equal(log!.entity, 'bird')
    assert.equal(log!.quantity, 4)
  })
})
