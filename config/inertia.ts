import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import { getAdminPageAccessForUser } from '#services/admin_access_service'
import { getBillingAlertForWorkspace } from '#services/billing_alert_service'
import workspaceService from '#services/workspace_service'
import { toFarmRole } from '#utils/farm_permissions'
import env from '#start/env'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    user: (ctx) => ctx.inertia.always(() => ctx.auth?.user),
    adminPageAccess: (ctx) =>
      ctx.inertia.always(async () => {
        const user = ctx.auth?.user as { id?: string; role?: string } | undefined
        if (!user?.id) return null
        if (user.role !== 'admin') return null
        return await getAdminPageAccessForUser(user.id)
      }),
    workspaces: (ctx) =>
      ctx.inertia.always(async () => {
        const user = ctx.auth?.user as { id?: string; role?: string } | undefined
        if (!user?.id || user.role === 'admin') return []
        const workspaces = await workspaceService.getUserWorkspaces(user.id)
        return workspaces.map((w) => w.serialize())
      }),
    currentWorkspaceId: (ctx) =>
      ctx.inertia.always(() => {
        const user = ctx.auth?.user as { id?: string; role?: string } | undefined
        if (!user?.id || user.role === 'admin') return null
        return ctx.session?.get('currentWorkspaceId') ?? null
      }),
    farmRole: (ctx) =>
      ctx.inertia.always(async () => {
        const user = ctx.auth?.user as { id?: string; role?: string } | undefined
        if (!user?.id || user.role === 'admin') return null
        const workspaceId = ctx.session?.get('currentWorkspaceId') as string | undefined
        if (!workspaceId) return null
        const membership = await workspaceService.getMembership(workspaceId, user.id)
        if (!membership) return null
        return toFarmRole(membership.role)
      }),
    nodeEnv: () => env.get('NODE_ENV'),
    params: (ctx) => ctx.request.params(),
    errors: (ctx) => ctx.session?.flashMessages.get('errors'),
    flash: (ctx) => ctx.session?.flashMessages.all(),
    qs: async (ctx) => ({
      ...ctx.request.qs(),
      ...(app.inTest ? {} : await ctx.request?.paginationQs()),
    }),
    isLoggedIn: (ctx) => ctx.inertia.always(() => ctx.auth?.isAuthenticated ?? false),
    impersonating: (ctx) => (ctx.session?.get('impersonatingFromUserId') ? true : false),
    billingAlert: (ctx) =>
      ctx.inertia.always(async () => {
        const user = ctx.auth?.user as { id?: string; role?: string } | undefined
        if (!user?.id || user.role === 'admin') return null
        const workspaceId = ctx.session?.get('currentWorkspaceId') as string | undefined
        if (!workspaceId) return null
        return await getBillingAlertForWorkspace(workspaceId)
      }),
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
