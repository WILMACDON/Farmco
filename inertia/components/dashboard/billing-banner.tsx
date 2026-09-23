import { Link } from '@inertiajs/react'
import { AlertCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type BillingAlertType = 'expired' | 'expiring_soon' | 'past_due' | 'no_subscription'

export interface BillingAlert {
  type: BillingAlertType
  message: string
  cta: string
  endsAt?: string
}

interface BillingBannerProps {
  alert: BillingAlert
  className?: string
}

const styles: Record<BillingAlertType, string> = {
  expired:
    'border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20 [&_a]:text-destructive [&_a]:underline',
  expiring_soon:
    'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 [&_a]:text-amber-800 dark:[&_a]:text-amber-200 [&_a]:underline',
  past_due:
    'border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20 [&_a]:text-destructive [&_a]:underline',
  no_subscription:
    'border-primary/50 bg-primary/10 text-foreground dark:bg-primary/20 [&_a]:text-primary [&_a]:underline',
}

export function BillingBanner({ alert, className }: BillingBannerProps) {
  if (!alert) return null

  const isExpiring = alert.type === 'expiring_soon'
  const isNoSubscription = alert.type === 'no_subscription'
  const Icon = isNoSubscription ? CreditCard : isExpiring ? CreditCard : AlertCircle

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm',
        styles[alert.type],
        className,
      )}>
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{alert.message}</span>
      </div>
      <Button
        variant={
          alert.type === 'expiring_soon' || alert.type === 'no_subscription' ? 'outline' : 'destructive'
        }
        size="sm"
        asChild>
        <Link href={alert.cta}>
          {alert.type === 'expired'
            ? 'Renew'
            : alert.type === 'past_due'
              ? 'Update payment'
              : alert.type === 'no_subscription'
                ? 'Choose a plan'
                : 'View billing'}
        </Link>
      </Button>
    </div>
  )
}
