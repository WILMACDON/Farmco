import type { HttpContext } from '@adonisjs/core/http'

/**
 * True when the client is making an Inertia visit (useForm / router.*).
 * Prefer this over checking `ctx.inertia` — that object exists on every
 * request because the Inertia middleware is global.
 */
export function isInertiaRequest(ctx: HttpContext): boolean {
  return Boolean(ctx.request.header('x-inertia'))
}

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500

/**
 * Inertia visits get flash + redirect (toast / form errors).
 * Everything else gets a JSON body.
 */
export function inertiaAwareError(
  ctx: HttpContext,
  options: {
    status?: ErrorStatus
    message: string
    /** Field errors for Inertia useForm `onError` (shared as `errors`). */
    errors?: Record<string, string>
    redirectTo?: string
  },
) {
  const { status = 400, message, errors, redirectTo } = options

  if (isInertiaRequest(ctx)) {
    // `errors` bag → Inertia calls onError (not onSuccess). Also flash `error`
    // so FlashToasts covers visits without an onError handler.
    ctx.session.flashErrors(errors ?? { message })
    ctx.session.flash('error', { message })

    if (redirectTo) return ctx.response.redirect().status(303).toPath(redirectTo)
    return ctx.response.redirect().status(303).back()
  }

  const body = { error: message }
  if (status === 401) return ctx.response.unauthorized(body)
  if (status === 403) return ctx.response.forbidden(body)
  if (status === 404) return ctx.response.notFound(body)
  if (status === 409) return ctx.response.conflict(body)
  if (status === 500) return ctx.response.internalServerError(body)
  return ctx.response.status(status).send(body)
}

/**
 * Inertia visits need a redirect (optionally with flash); API clients get JSON.
 */
export function inertiaAwareSuccess(
  ctx: HttpContext,
  options: {
    message?: string
    redirectTo?: string
    json?: Record<string, unknown>
  },
) {
  const { message, redirectTo, json } = options

  if (isInertiaRequest(ctx)) {
    if (message) ctx.session.flash('success', { message })
    if (redirectTo) return ctx.response.redirect().status(303).toPath(redirectTo)
    return ctx.response.redirect().status(303).back()
  }

  return ctx.response.ok({
    message: message ?? 'OK',
    ...(json ?? {}),
  })
}
