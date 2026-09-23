/**
 * Resolve the active farm workspace from the session.
 */
export function getCurrentWorkspaceId(session: { get(key: string): unknown }): string {
  const workspaceId = session.get('currentWorkspaceId')
  if (!workspaceId || typeof workspaceId !== 'string') {
    throw new Error('No workspace selected')
  }
  return workspaceId
}
