import { test } from '@japa/runner'

import BirdRecord from '#models/bird_record'
import birdInventoryService from '#services/bird_inventory_service'
import { asFarmUser, createOwnerWithWorkspace, resetDatabase } from '#tests/helpers/farm'

test.group('Farm sync', (group) => {
  group.each.setup(async () => {
    await resetDatabase()
  })

  test('sync with clientEntryId is idempotent', async ({ client, assert }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'sync-owner@example.com',
      password: 'password123',
    })

    const entry = {
      type: 'birds' as const,
      clientEntryId: 'offline-bird-001',
      payload: {
        direction: 'add',
        health: 'well',
        production: 'laying',
        quantity: 5,
      },
    }

    const first = await asFarmUser(client.post('/api/v1/farm/sync'), user, workspace.id)
      .json({ entries: [entry] })
      .withCsrfToken()
    first.assertStatus(200)

    const second = await asFarmUser(client.post('/api/v1/farm/sync'), user, workspace.id)
      .json({ entries: [entry] })
      .withCsrfToken()
    second.assertStatus(200)

    const firstId = first.body().data.results[0].id
    const secondId = second.body().data.results[0].id
    assert.equal(firstId, secondId)

    const records = await BirdRecord.query()
      .where('workspace_id', workspace.id)
      .where('client_entry_id', 'offline-bird-001')
    assert.lengthOf(records, 1)

    const stock = await birdInventoryService.getStock(workspace.id)
    assert.equal(stock.total, 5)
  })

  test('removal that would go negative with allowNeedsReview creates needs_review', async ({
    client,
    assert,
  }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'sync-review@example.com',
      password: 'password123',
    })

    await birdInventoryService.add({
      workspaceId: workspace.id,
      userId: user.id,
      health: 'well',
      production: 'laying',
      quantity: 2,
    })

    const response = await asFarmUser(client.post('/api/v1/farm/sync'), user, workspace.id)
      .json({
        entries: [
          {
            type: 'birds',
            clientEntryId: 'offline-remove-over',
            payload: {
              direction: 'remove',
              health: 'well',
              production: 'laying',
              quantity: 10,
              reason: 'offline count mismatch',
            },
          },
        ],
      })
      .withCsrfToken()

    response.assertStatus(200)
    const result = response.body().data.results[0]
    assert.isTrue(result.ok)
    assert.isTrue(result.needsReview)

    const record = await BirdRecord.findOrFail(result.id)
    assert.isTrue(record.needsReview)

    const stock = await birdInventoryService.getStock(workspace.id)
    assert.equal(stock.total, 0)
  })

  test('FarmCacheService invalidates after bird add so stock reflects', async ({
    client,
    assert,
  }) => {
    const { user, workspace } = await createOwnerWithWorkspace({
      email: 'sync-cache@example.com',
      password: 'password123',
    })

    const before = await birdInventoryService.getStock(workspace.id)
    assert.equal(before.total, 0)

    const addResponse = await asFarmUser(client.post('/api/v1/farm/birds'), user, workspace.id)
      .json({
        direction: 'add',
        health: 'well',
        production: 'laying',
        quantity: 8,
      })
      .withCsrfToken()

    addResponse.assertStatus(201)

    const after = await birdInventoryService.getStock(workspace.id)
    assert.equal(after.total, 8)
  })
})
