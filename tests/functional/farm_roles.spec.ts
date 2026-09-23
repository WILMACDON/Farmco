import { test } from '@japa/runner'

import User from '#models/user'
import WorkspaceMember from '#models/workspace_member'
import {
  asFarmUser,
  createMember,
  createOwnerWithWorkspace,
  resetDatabase,
} from '#tests/helpers/farm'

test.group('Farm roles', (group) => {
  group.each.setup(async () => {
    await resetDatabase()
  })

  test('owner can invite manager and worker', async ({ client, assert }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'owner-invite@example.com',
      password: 'password123',
    })

    const managerResponse = await asFarmUser(
      client.post('/api/v1/farm/users/invite'),
      owner,
      workspace.id,
    )
      .json({
        email: 'manager-invite@example.com',
        fullName: 'Farm Manager',
        role: 'manager',
      })
      .withCsrfToken()

    managerResponse.assertStatus(201)
    managerResponse.assertBodyContains({
      message: 'User created. Share the temporary password so they can sign in.',
    })

    const workerResponse = await asFarmUser(
      client.post('/api/v1/farm/users/invite'),
      owner,
      workspace.id,
    )
      .json({
        email: 'worker-invite@example.com',
        fullName: 'Farm Worker',
        role: 'worker',
      })
      .withCsrfToken()

    workerResponse.assertStatus(201)

    const manager = await User.findByOrFail('email', 'manager-invite@example.com')
    const worker = await User.findByOrFail('email', 'worker-invite@example.com')
    const managerMembership = await WorkspaceMember.query()
      .where('workspace_id', workspace.id)
      .where('user_id', manager.id)
      .firstOrFail()
    const workerMembership = await WorkspaceMember.query()
      .where('workspace_id', workspace.id)
      .where('user_id', worker.id)
      .firstOrFail()

    assert.equal(managerMembership.role, 'admin')
    assert.equal(workerMembership.role, 'member')
    assert.isTrue(manager.mustChangePassword)
    assert.isTrue(worker.mustChangePassword)
  })

  test('manager inviting manager is rejected', async ({ client }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'owner-mgr@example.com',
      password: 'password123',
    })
    const { user: manager } = await createMember({
      workspaceId: workspace.id,
      role: 'admin',
      email: 'manager-actor@example.com',
      password: 'password123',
      createdByUserId: owner.id,
      fullName: 'Manager Actor',
    })

    const response = await asFarmUser(
      client.post('/api/v1/farm/users/invite'),
      manager,
      workspace.id,
    )
      .json({
        email: 'another-manager@example.com',
        fullName: 'Another Manager',
        role: 'manager',
      })
      .withCsrfToken()

    const status = response.status()
    if (status !== 400 && status !== 403) {
      response.assertStatus(403)
    }
  })

  test('manager can invite worker', async ({ client, assert }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'owner-mgr-worker@example.com',
      password: 'password123',
    })
    const { user: manager } = await createMember({
      workspaceId: workspace.id,
      role: 'admin',
      email: 'manager-invites@example.com',
      password: 'password123',
      createdByUserId: owner.id,
    })

    const response = await asFarmUser(
      client.post('/api/v1/farm/users/invite'),
      manager,
      workspace.id,
    )
      .json({
        email: 'new-worker@example.com',
        fullName: 'New Worker',
        role: 'worker',
      })
      .withCsrfToken()

    response.assertStatus(201)

    const worker = await User.findByOrFail('email', 'new-worker@example.com')
    const membership = await WorkspaceMember.query()
      .where('workspace_id', workspace.id)
      .where('user_id', worker.id)
      .firstOrFail()
    assert.equal(membership.role, 'member')
  })

  test('inactive user cannot login', async ({ client }) => {
    const { user } = await createOwnerWithWorkspace({
      email: 'inactive-owner@example.com',
      password: 'password123',
    })
    user.status = 'inactive'
    await user.save()

    const response = await client
      .post('/api/v1/auth/login')
      .json({
        email: 'inactive-owner@example.com',
        password: 'password123',
      })
      .withCsrfToken()

    response.assertStatus(403)
    response.assertBodyContains({ error: 'This account is inactive.' })
  })

  test('worker GET /users redirects away from users page', async ({ client }) => {
    const { user: owner, workspace } = await createOwnerWithWorkspace({
      email: 'owner-users-page@example.com',
      password: 'password123',
    })
    const { user: worker } = await createMember({
      workspaceId: workspace.id,
      role: 'member',
      email: 'worker-users-page@example.com',
      password: 'password123',
      createdByUserId: owner.id,
    })

    const response = await client
      .get('/users')
      .header('X-Inertia', 'true')
      .header('X-Requested-With', 'XMLHttpRequest')
      .loginAs(worker)
      .withSession({ currentWorkspaceId: workspace.id })

    response.assertRedirectsTo('/dashboard')
  })
})
