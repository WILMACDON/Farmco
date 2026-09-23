import type { AdminPageKey } from '#utils/admin_pages'

/**
 * Returns the allowed admin page keys for an admin user.
 *
 * - `null` means "unrestricted" (full admin access)
 * - `AdminPageKey[]` means "restricted to these pages"
 *
 * Currently all admins have unrestricted access.
 * Extend this to implement per-admin page restrictions if needed.
 */
export async function getAdminPageAccessForUser(_userId: string): Promise<AdminPageKey[] | null> {
  return null
}
