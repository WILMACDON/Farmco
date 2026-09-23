import Workspace from '#models/workspace'
import { DateTime } from 'luxon'

export type BillingAlertType = 'expired' | 'expiring_soon' | 'past_due' | 'no_subscription'

export interface BillingAlert {
  type: BillingAlertType
  message: string
  cta: string
  endsAt?: string
}

const EXPIRING_SOON_DAYS = 7

/**
 * Get a billing alert for a workspace based on subscription status and end date.
 * Returns null if no alert is needed (active and not expiring soon, or no subscription).
 */
export async function getBillingAlertForWorkspace(workspaceId: string): Promise<BillingAlert | null> {
  const workspace = await Workspace.find(workspaceId)
  if (!workspace) return null

  const now = DateTime.now()
  const endsAt = workspace.subscriptionEndsAt
  const status = workspace.subscriptionStatus

  if (status === 'past_due' || status === 'incomplete') {
    return {
      type: 'past_due',
      message:
        'Your payment is past due. Please update your payment method to avoid service interruption.',
      cta: '/billing',
    }
  }

  if (status === null || status === undefined) {
    return {
      type: 'no_subscription',
      message: "You don't have an active subscription. Choose a plan to get started.",
      cta: '/billing',
    }
  }

  const ended = endsAt && endsAt.toMillis() < now.toMillis()
  if (status === 'canceled' || ended) {
    return {
      type: 'expired',
      message: 'Your subscription has expired. Renew to continue using your plan.',
      cta: '/billing',
    }
  }

  const daysUntilEnd = endsAt
    ? Math.ceil((endsAt.toMillis() - now.toMillis()) / (24 * 60 * 60 * 1000))
    : 0
  if (status === 'active' && endsAt && daysUntilEnd <= EXPIRING_SOON_DAYS && daysUntilEnd > 0) {
    return {
      type: 'expiring_soon',
      message: `Your subscription renews in ${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'}.`,
      endsAt: endsAt.toISO(),
      cta: '/billing',
    }
  }

  return null
}
