/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import { OauthService } from '#services/oauth_service'
import { middleware } from './kernel.js'
import { throttle } from './limiter.js'

const AuthController = () => import('#controllers/auth_controller')
const HealthChecksController = () => import('#controllers/health_checks_controller')
const UsersController = () => import('#controllers/users_controller')
const TwoFactorController = () => import('#controllers/two_factor_controller')
const SessionsController = () => import('#controllers/sessions_controller')
const ContactController = () => import('#controllers/contact_controller')
const NotificationsController = () => import('#controllers/notifications_controller')
const AuditsController = () => import('#controllers/audits_controller')
const WorkspacesController = () => import('#controllers/workspaces_controller')
const WorkspaceInvitationsController = () => import('#controllers/workspace_invitations_controller')
const BlogPostsController = () => import('#controllers/blog_posts_controller')
const BlogCategoriesController = () => import('#controllers/blog_categories_controller')
const BlogTagsController = () => import('#controllers/blog_tags_controller')
const BlogAuthorsController = () => import('#controllers/blog_authors_controller')
const AdminController = () => import('#controllers/admin_controller')
const AdminUsersController = () => import('#controllers/admin_users_controller')
const AdminPlansController = () => import('#controllers/admin_plans_controller')
const StatusController = () => import('#controllers/status_controller')
// const PricingController = () => import('#controllers/pricings_controller')
const BillingController = () => import('#controllers/billings_controller')
const StripeWebhooksController = () => import('#controllers/stripe_webhooks_controller')
const SettingsController = () => import('#controllers/settings_controller')
const DashboardController = () => import('#controllers/dashboard_controller')
const BirdsController = () => import('#controllers/birds_controller')
const EggsController = () => import('#controllers/eggs_controller')
const FeedController = () => import('#controllers/feed_controller')
const FarmOrdersController = () => import('#controllers/farm_orders_controller')
const FarmStatsController = () => import('#controllers/farm_stats_controller')
const FarmActivityController = () => import('#controllers/farm_activity_controller')
const FarmUsersController = () => import('#controllers/farm_users_controller')
const OrgSettingsController = () => import('#controllers/org_settings_controller')
const FarmSyncController = () => import('#controllers/farm_sync_controller')

router.on('/').renderInertia('home')
router.on('/home').renderInertia('home')
router.get('/status', [StatusController, 'index'])

/**
 * Admin-only pages.
 * NOTE: Must be registered before `/blog/:slug` to avoid the param route capturing `/blog/admin`.
 */
router
  .group(() => {
    // Admin portal
    router.get('/admin', [AdminController, 'index'])
    router.get('/admin/users', [AdminUsersController, 'index'])
    router.get('/admin/users/:id/edit', [AdminUsersController, 'edit'])
    router.get('/admin/users/:id', [AdminUsersController, 'show'])
    router.put('/admin/users/:id', [AdminUsersController, 'update'])
    router.post('/admin/users/:id/impersonate', [AdminUsersController, 'impersonate'])

    // Plans admin
    router.get('/admin/plans', [AdminPlansController, 'index'])
    router.get('/admin/plans/create', [AdminPlansController, 'create'])
    router.post('/admin/plans', [AdminPlansController, 'store'])
    router.get('/admin/plans/:id/edit', [AdminPlansController, 'edit'])
    router.put('/admin/plans/:id', [AdminPlansController, 'update'])
    router.delete('/admin/plans/:id', [AdminPlansController, 'destroy'])

    // Blog admin (admins only)
    router
      .group(() => {
        router.get('/', [BlogPostsController, 'adminIndex'])
        router.get('/create', [BlogPostsController, 'create'])
        router.post('/', [BlogPostsController, 'store'])
        router.get('/:id/edit', [BlogPostsController, 'edit'])
        router.put('/:id', [BlogPostsController, 'update'])
        router.delete('/:id', [BlogPostsController, 'destroy'])

        router.get('/categories', [BlogCategoriesController, 'index'])
        router.post('/categories', [BlogCategoriesController, 'store'])
        router.delete('/categories/:id', [BlogCategoriesController, 'destroy'])

        router.get('/tags', [BlogTagsController, 'index'])
        router.post('/tags', [BlogTagsController, 'store'])
        router.delete('/tags/:id', [BlogTagsController, 'destroy'])

        router.get('/authors', [BlogAuthorsController, 'index'])
        router.post('/authors', [BlogAuthorsController, 'store'])
        router.delete('/authors/:id', [BlogAuthorsController, 'destroy'])
      })
      .prefix('admin/blog')
  })
  .use([middleware.auth(), middleware.admin(), middleware.adminAccess()])

// Guest routes
router
  .group(() => {
    router.on('/login').renderInertia('login')
    router.post('/login', [AuthController, 'loginWeb'])
    router.on('/signup').renderInertia('signup')
    router.on('/forgot-password').renderInertia('forgot-password')
    router.on('/reset-password').renderInertia('reset-password')
  })
  .use(middleware.guest())

// Public routes
router.on('/contact').renderInertia('contact')
router.on('/terms').renderInertia('terms')
router.on('/verify-email').renderInertia('verify-email')
router.on('/verify-email-change').renderInertia('verify-email-change')
// Public pricing + blog temporarily hidden
// router.get('/pricing', [PricingController, 'index'])
// router.get('/blog', [BlogPostsController, 'index'])
// router.get('/blog/:slug', [BlogPostsController, 'show'])
router.get('/join', [WorkspaceInvitationsController, 'joinPage'])

// Authenticated routes
router
  .group(() => {
    router.get('/logout', [AuthController, 'logout'])
    router.post('/logout/impersonation', [AuthController, 'stopImpersonating'])
  })
  .use([middleware.auth()])

// Onboarding
router
  .group(() => {
    router.on('/onboarding').renderInertia('workspaces/onboarding')
  })
  .use([middleware.auth()])

const farmPageMiddleware = [
  middleware.auth(),
  middleware.workspaceOnboarding(),
  middleware.forcePasswordChange(),
]

// Normal-user pages (require workspace)
router
  .group(() => {
    router.get('/dashboard', [DashboardController, 'index'])
    router.get('/birds', [BirdsController, 'index'])
    router.get('/eggs', [EggsController, 'index'])
    router.get('/feed', [FeedController, 'index'])
    router.get('/orders', [FarmOrdersController, 'index'])
    router.get('/stats', [FarmStatsController, 'index'])
    router.get('/activity', [FarmActivityController, 'index'])
    router.get('/users', [FarmUsersController, 'index'])
    router.get('/settings', [SettingsController, 'index'])
    router.on('/workspaces').renderInertia('workspaces/index')
    router.get('/billing', [BillingController, 'index'])
    router.post('/billing/subscribe', [BillingController, 'subscribe'])
  })
  .use(farmPageMiddleware)

router
  .group(() => {
    router.post('/signup', [AuthController, 'signUp'])
    router.post('/login', [AuthController, 'login'])
    router.post('/forgot-password', [AuthController, 'forgotPassword'])
    router.post('/reset-password', [AuthController, 'resetPassword'])
    router.get('/verify-email', [AuthController, 'verifyEmail'])
    router.get('/verify-email-change', [AuthController, 'verifyEmailChange'])
    router
      .post('/verify-email/resend', [AuthController, 'resendVerificationEmail'])
      .use(middleware.auth())
  })
  .prefix('api/v1/auth')
  .use(throttle)

// Public API routes
router
  .group(() => {
    router.post('/contact', [ContactController, 'send'])
    router.post('/webhooks/stripe', [StripeWebhooksController, 'handle'])
  })
  .prefix('api/v1')
  .use(throttle)

router
  .group(() => {
    router.put('/profile', [UsersController, 'updateProfile'])
    router.put('/password', [UsersController, 'updatePassword'])
    router.post('/avatar', [UsersController, 'uploadAvatar'])
    router.delete('/avatar', [UsersController, 'deleteAvatar'])
    router.get('/sessions', [SessionsController, 'index'])
    router.post('/sessions/revoke', [SessionsController, 'revoke'])
    router.post('/sessions/revoke-all', [SessionsController, 'revokeAll'])
    router.delete('/account', [UsersController, 'deleteAccount'])
    router.put('/settings', [UsersController, 'updateSettings'])
    router.get('/settings', [UsersController, 'getSettings'])
    router.post('/2fa/setup', [TwoFactorController, 'setup'])
    router.post('/2fa/enable', [TwoFactorController, 'enable'])
    router.post('/2fa/disable', [TwoFactorController, 'disable'])
    router.post('/2fa/verify', [TwoFactorController, 'verify'])
    router.post('/2fa/recovery-codes', [TwoFactorController, 'regenerateRecoveryCodes'])
    router.get('/export', [UsersController, 'exportData'])
  })
  .prefix('api/v1/user')
  .use([middleware.auth(), middleware.forcePasswordChange()])

// Workspace routes
router
  .group(() => {
    router.get('/', [WorkspacesController, 'index'])
    router.post('/', [WorkspacesController, 'store'])
    router.put('/:id', [WorkspacesController, 'update'])
    router.delete('/:id', [WorkspacesController, 'destroy'])
    router.post('/onboard', [WorkspacesController, 'onboard'])
    router.post('/switch', [WorkspacesController, 'switchWorkspace'])
    router.get('/check-onboarding', [WorkspacesController, 'checkOnboarding'])
    router.get('/:workspaceId/members', [WorkspacesController, 'members'])
    router.post('/:workspaceId/invitations', [WorkspaceInvitationsController, 'invite'])
  })
  .prefix('api/v1/workspaces')
  .use(middleware.auth())

// Farm API
router
  .group(() => {
    router.get('/dashboard', [DashboardController, 'data'])

    router.post('/birds', [BirdsController, 'store'])
    router.post('/eggs', [EggsController, 'store'])
    router.post('/feed', [FeedController, 'store'])

    router.post('/orders', [FarmOrdersController, 'store'])
    router.put('/orders/:id', [FarmOrdersController, 'update'])
    router.post('/orders/:id/approve', [FarmOrdersController, 'approve'])
    router.post('/orders/:id/cancel', [FarmOrdersController, 'cancel'])
    router.post('/orders/:id/sold', [FarmOrdersController, 'markSold'])

    router.post('/users/invite', [FarmUsersController, 'store'])
    router.post('/users/deactivate', [FarmUsersController, 'deactivate'])
    router.post('/users/reactivate', [FarmUsersController, 'reactivate'])

    router.get('/settings', [OrgSettingsController, 'show'])
    router.put('/settings', [OrgSettingsController, 'update'])

    router.post('/sync', [FarmSyncController, 'sync'])
    router.post('/sync/resolve-review', [FarmSyncController, 'resolveNeedsReview'])
  })
  .prefix('api/v1/farm')
  .use([middleware.auth(), middleware.workspaceOnboarding(), middleware.forcePasswordChange()])

// Public workspace invitation routes
router
  .group(() => {
    router.post('/accept', [WorkspaceInvitationsController, 'accept'])
  })
  .prefix('api/v1/workspace-invitations')

// Notification routes
router
  .group(() => {
    router.get('/', [NotificationsController, 'index'])
    router.post('/mark-as-read', [NotificationsController, 'markAsRead'])
    router.post('/mark-all-as-read', [NotificationsController, 'markAllAsRead'])
    router.get('/unread-count', [NotificationsController, 'unreadCount'])
    router.delete('/:id', [NotificationsController, 'delete'])
  })
  .prefix('api/v1/notifications')
  .use(middleware.auth())

// Web route (kept for compatibility with non-AJAX form posts)
router.post('/contact', [ContactController, 'send']).use(throttle)

router
  .group(() => {
    router.get('/', [AuditsController, 'index'])
    router.get('/recent', [AuditsController, 'recent'])
  })
  .prefix('api/v1/audits')
  .use(middleware.auth())

router.get('/health', [HealthChecksController])

router
  .get('/:provider/redirect', ({ ally, params }) => {
    return ally.use(params.provider).redirect()
  })
  .where('provider', /google/)

async function finishOAuthLogin(
  user: Awaited<ReturnType<OauthService['createOrLoginWithGoogle']>>,
  ctx: {
    auth: import('@adonisjs/core/http').HttpContext['auth']
    response: import('@adonisjs/core/http').HttpContext['response']
    session: import('@adonisjs/core/http').HttpContext['session']
  },
) {
  if (user.status === 'inactive') {
    ctx.session.flash('error', { message: 'This account is inactive.' })
    return ctx.response.redirect('/login')
  }

  await ctx.auth.use('web').login(user)

  if (user.mustChangePassword) {
    ctx.session.flash('mustChangePassword', true)
    return ctx.response.redirect('/settings?tab=password')
  }

  return ctx.response.redirect(user.role === 'admin' ? '/admin' : '/dashboard')
}

router.get('/google/callback', async ({ ally, auth, response, session }) => {
  const google = ally.use('google')

  if (google.accessDenied()) {
    session.flash('error', { message: 'You have cancelled the login process' })
    return response.redirect('/login')
  }

  if (google.stateMisMatch()) {
    session.flash('error', { message: 'We are unable to verify the request. Please try again' })
    return response.redirect('/login')
  }

  if (google.hasError()) {
    session.flash('error', { message: google.getError() })
    return response.redirect('/login')
  }

  const googleUser = await google.user()
  // @ts-expect-error - GoogleUser is the same as the type in the GoogleService
  const user = await new OauthService().createOrLoginWithGoogle(googleUser)
  return finishOAuthLogin(user, { auth, response, session })
})
transmit.registerRoutes()

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

// Renders Swagger-UI and passes YAML-output of /swagger
router.get('/docs', async () => {
  return AutoSwagger.default.rapidoc('/swagger')
})
