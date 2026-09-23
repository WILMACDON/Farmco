import { test } from '@japa/runner'

import { canApproveOrders, canInviteRole } from '#utils/farm_permissions'

test.group('Farm permissions', () => {
  test('canInviteRole matrix', ({ assert }) => {
    assert.isTrue(canInviteRole('owner', 'manager'))
    assert.isTrue(canInviteRole('owner', 'worker'))

    assert.isFalse(canInviteRole('admin', 'manager'))
    assert.isTrue(canInviteRole('admin', 'worker'))

    assert.isFalse(canInviteRole('member', 'manager'))
    assert.isFalse(canInviteRole('member', 'worker'))
  })

  test('canApproveOrders matrix', ({ assert }) => {
    assert.isTrue(canApproveOrders('owner'))
    assert.isTrue(canApproveOrders('admin'))
    assert.isTrue(canApproveOrders('manager'))

    assert.isFalse(canApproveOrders('member'))
    assert.isFalse(canApproveOrders('worker'))
  })
})
