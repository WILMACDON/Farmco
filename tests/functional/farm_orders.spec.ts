import { test } from '@japa/runner'

import FarmOrder from '#models/farm_order'
import eggInventoryService from '#services/egg_inventory_service'
import {
  asFarmUser,
  createMember,
  createOwnerWithWorkspace,
  resetDatabase,
} from '#tests/helpers/farm'

test.group('Farm orders', (group) => {
  group.each.setup(async () => {
    await resetDatabase()
  })

  test('worker creates pending order', async ({ client, assert }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'orders-owner@example.com',
      password: 'password123',
    })
    const { user: worker } = await createMember({
      workspaceId: workspace.id,
      role: 'member',
      email: 'orders-worker@example.com',
      password: 'password123',
      createdByUserId: owner.id,
    })

    const response = await asFarmUser(client.post('/api/v1/farm/orders'), worker, workspace.id)
      .json({
        customerName: 'Market Buyer',
        contact: '0800',
        items: [{ size: 'large', crates: 2 }],
      })
      .withCsrfToken()

    response.assertStatus(201)

    const order = await FarmOrder.query().where('workspace_id', workspace.id).firstOrFail()
    assert.equal(order.status, 'pending')
    assert.equal(order.createdBy, worker.id)
    assert.equal(order.customerName, 'Market Buyer')
  })

  test('worker cannot mark order sold', async ({ client }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'orders-owner2@example.com',
      password: 'password123',
    })
    const { user: worker } = await createMember({
      workspaceId: workspace.id,
      role: 'member',
      email: 'orders-worker2@example.com',
      password: 'password123',
      createdByUserId: owner.id,
    })

    const createResponse = await asFarmUser(
      client.post('/api/v1/farm/orders'),
      worker,
      workspace.id,
    )
      .json({
        customerName: 'Cafe',
        items: [{ size: 'medium', crates: 1 }],
      })
      .withCsrfToken()

    createResponse.assertStatus(201)
    const orderId = createResponse.body().data.order.id

    const soldResponse = await asFarmUser(
      client.post(`/api/v1/farm/orders/${orderId}/sold`),
      worker,
      workspace.id,
    ).withCsrfToken()

    soldResponse.assertStatus(403)
  })

  test('manager approve then sold deducts eggs', async ({ client, assert }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'orders-owner3@example.com',
      password: 'password123',
      eggsPerCrate: 30,
    })
    const { user: manager } = await createMember({
      workspaceId: workspace.id,
      role: 'admin',
      email: 'orders-manager@example.com',
      password: 'password123',
      createdByUserId: owner.id,
    })

    await eggInventoryService.add({
      workspaceId: workspace.id,
      userId: owner.id,
      size: 'large',
      quantityEggs: 90,
    })

    const createResponse = await asFarmUser(
      client.post('/api/v1/farm/orders'),
      manager,
      workspace.id,
    )
      .json({
        customerName: 'Hotel',
        items: [{ size: 'large', crates: 2 }],
      })
      .withCsrfToken()

    createResponse.assertStatus(201)
    const orderId = createResponse.body().data.order.id

    const approveResponse = await asFarmUser(
      client.post(`/api/v1/farm/orders/${orderId}/approve`),
      manager,
      workspace.id,
    ).withCsrfToken()
    approveResponse.assertStatus(200)

    const soldResponse = await asFarmUser(
      client.post(`/api/v1/farm/orders/${orderId}/sold`),
      manager,
      workspace.id,
    ).withCsrfToken()
    soldResponse.assertStatus(200)

    const order = await FarmOrder.findOrFail(orderId)
    assert.equal(order.status, 'sold')

    const stock = await eggInventoryService.getStock(workspace.id, 30)
    assert.equal(stock.sizes.find((s) => s.size === 'large')?.quantityEggs, 30)
  })

  test('sold with insufficient stock fails', async ({ client, assert }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'orders-owner4@example.com',
      password: 'password123',
      eggsPerCrate: 30,
    })
    const { user: manager } = await createMember({
      workspaceId: workspace.id,
      role: 'admin',
      email: 'orders-manager2@example.com',
      password: 'password123',
      createdByUserId: owner.id,
    })

    await eggInventoryService.add({
      workspaceId: workspace.id,
      userId: owner.id,
      size: 'small',
      quantityEggs: 10,
    })

    const createResponse = await asFarmUser(
      client.post('/api/v1/farm/orders'),
      manager,
      workspace.id,
    )
      .json({
        customerName: 'Big Order',
        items: [{ size: 'small', crates: 5 }],
      })
      .withCsrfToken()

    const orderId = createResponse.body().data.order.id

    await asFarmUser(
      client.post(`/api/v1/farm/orders/${orderId}/approve`),
      manager,
      workspace.id,
    ).withCsrfToken()

    const soldResponse = await asFarmUser(
      client.post(`/api/v1/farm/orders/${orderId}/sold`),
      manager,
      workspace.id,
    ).withCsrfToken()

    soldResponse.assertStatus(422)

    const order = await FarmOrder.findOrFail(orderId)
    assert.equal(order.status, 'approved')

    const stock = await eggInventoryService.getStock(workspace.id, 30)
    assert.equal(stock.sizes.find((s) => s.size === 'small')?.quantityEggs, 10)
  })
})
