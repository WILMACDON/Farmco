import { Head, Link } from '@inertiajs/react'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import type { RawPlan } from '#types/model-types'
import { PublicLayout } from '@/components/layouts/public'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function Pricing({ plans }: { plans: RawPlan[] }) {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <PublicLayout>
      <Head title='Pricing' />

      <div className='px-6 py-16 md:py-24'>
        <div className='mx-auto max-w-screen-xl'>
          <div className='mx-auto max-w-2xl text-center'>
            <h1 className='font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl'>
              Simple, transparent pricing
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              Choose the plan that fits your flock. No hidden fees — cancel anytime.
            </p>

            <div
              className='mt-10 inline-flex items-center gap-1 rounded-[var(--radius-field)] border border-border bg-muted/60 p-1'
              role='group'
              aria-label='Billing period'>
              <button
                type='button'
                onClick={() => setIsYearly(false)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  !isYearly
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                Monthly
              </button>
              <button
                type='button'
                onClick={() => setIsYearly(true)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  isYearly
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                Yearly
                <span className='rounded-full bg-accent/25 px-2 py-0.5 text-xs font-semibold text-accent-foreground'>
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className='mt-14 grid grid-cols-1 gap-6 md:grid-cols-3'>
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col border-border bg-card',
                  plan.isRecommended && 'ring-2 ring-primary shadow-md shadow-primary/10',
                )}>
                {plan.isRecommended && (
                  <span className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground'>
                    Recommended
                  </span>
                )}

                <CardHeader>
                  <CardTitle className='font-display text-xl'>{plan.name}</CardTitle>
                  <div className='mt-4 flex items-baseline gap-1 text-muted-foreground'>
                    <span className='font-display text-4xl font-bold tracking-tight text-foreground'>
                      ${isYearly ? (plan.priceYearly / 12).toFixed(0) : plan.priceMonthly}
                    </span>
                    <span className='text-base'>/month</span>
                  </div>
                  <CardDescription className='min-h-6'>
                    {isYearly ? (
                      <span className='text-sm text-primary'>Billed ${plan.priceYearly} yearly</span>
                    ) : null}
                  </CardDescription>
                </CardHeader>

                <CardContent className='flex flex-1 flex-col'>
                  <ul className='mb-8 flex-1 space-y-3'>
                    {plan.features?.map((feature, i) => (
                      <li
                        key={i.toString()}
                        className='flex items-start gap-3 text-sm text-foreground'>
                        <CheckCircle2
                          className='mt-0.5 h-4 w-4 shrink-0 text-primary'
                          aria-hidden
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href='/signup'
                    data={{
                      plan: plan.id,
                      name: plan.name,
                      frequency: isYearly ? 'yearly' : 'monthly',
                    }}
                    className={cn(
                      buttonVariants({
                        variant: plan.isRecommended ? 'default' : 'outline',
                        size: 'lg',
                      }),
                      'w-full',
                      plan.isRecommended &&
                        'bg-accent text-accent-foreground hover:bg-accent/90',
                    )}>
                    Get started
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
