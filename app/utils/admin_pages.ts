export const ADMIN_PAGE_KEYS = [
  'admin_dashboard',
  'admin_users',
  'admin_blog',
  'admin_plans',
] as const

export type AdminPageKey = (typeof ADMIN_PAGE_KEYS)[number]

export const ADMIN_PAGE_KEY_TO_PATH: Record<AdminPageKey, string> = {
  admin_dashboard: '/admin',
  admin_users: '/admin/users',
  admin_blog: '/blog/admin',
  admin_plans: '/admin/plans',
}

export function requiredAdminPageKeyForPath(pathname: string): AdminPageKey {
  const path = `/${String(pathname || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')}`

  if (path === '/admin') return 'admin_dashboard'
  if (path.startsWith('/admin/users')) return 'admin_users'
  if (path.startsWith('/blog/admin')) return 'admin_blog'
  if (path.startsWith('/admin/plans')) return 'admin_plans'

  // Default any other /admin route to the dashboard permission.
  return 'admin_dashboard'
}
