import type { WorkspaceRole } from '#models/workspace_member'

/** PRD roles mapped from workspace_members.role */
export type FarmRole = 'owner' | 'manager' | 'worker'

export function toFarmRole(role: WorkspaceRole): FarmRole {
  if (role === 'owner') return 'owner'
  if (role === 'admin') return 'manager'
  return 'worker'
}

export function fromFarmRole(role: FarmRole): WorkspaceRole {
  if (role === 'owner') return 'owner'
  if (role === 'manager') return 'admin'
  return 'member'
}

export function canManageManagers(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner'
}

export function canManageWorkers(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

export function canInviteRole(
  actorRole: WorkspaceRole,
  inviteeFarmRole: 'manager' | 'worker',
): boolean {
  if (inviteeFarmRole === 'manager') return actorRole === 'owner'
  return actorRole === 'owner' || actorRole === 'admin'
}

export function canApproveOrders(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

export function canCorrectEntries(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

export function canEditOrgSettings(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner'
}

export function canViewFullStats(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

export function canViewAllActivity(role: WorkspaceRole | FarmRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

export function farmRoleLabel(role: WorkspaceRole): string {
  return toFarmRole(role)
}
