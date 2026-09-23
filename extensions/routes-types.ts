
export const API_ROUTES = {
  GET: ['/auth/verify-email',
    '/auth/verify-email-change',
    '/user/sessions',
    '/user/settings',
    '/workspaces',
    '/workspaces/check-onboarding',
    '/workspaces/:workspaceId/members',
    '/notifications',
    '/notifications/unread-count',
    '/audits',
    '/audits/recent'] as const,
  POST: ['/auth/signup',
    '/auth/login',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email/resend',
    '/contact',
    '/user/avatar',
    '/user/sessions/revoke',
    '/user/sessions/revoke-all',
    '/user/2fa/setup',
    '/user/2fa/enable',
    '/user/2fa/disable',
    '/user/2fa/verify',
    '/user/2fa/recovery-codes',
    '/workspaces',
    '/workspaces/onboard',
    '/workspaces/switch',
    '/workspaces/:workspaceId/invitations',
    '/workspace-invitations/accept',
    '/notifications/mark-as-read',
    '/notifications/mark-all-as-read'] as const,
  PUT: ['/user/profile',
    '/user/password',
    '/user/settings'] as const,
  DELETE: ['/user/avatar',
    '/user/account',
    '/notifications/:id'] as const,
};

type ReplaceParam<T extends string> =
  T extends `${infer Start}:${infer Param}/${infer Rest}`
    ? `${Start}${string}/${ReplaceParam<Rest>}`
    : T extends `${infer Start}:${infer Param}`
      ? `${Start}${string}`
      : T;

type TransformRoutes<T extends readonly string[]> = {
  [K in keyof T]: T[K] | ReplaceParam<T[K]>;
}[number];

export type APIRoutes = {
  [K in keyof typeof API_ROUTES]: TransformRoutes<typeof API_ROUTES[K]>;
};

export type APIRouteStatic = {
  [K in keyof typeof API_ROUTES]: typeof API_ROUTES[K][number];
};

// Usage example:
// const apiRoutes: APIRoutes = API_ROUTES as any;
