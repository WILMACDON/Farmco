import { Head, router } from '@inertiajs/react'
import { format } from 'date-fns'
import { ArrowRight, Check, CheckCircle2, Download, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  features: string[]
  isRecommended: boolean
}

interface Invoice {
  id: string
  created: number
  amount_paid: number
  currency: string
  status: string
  invoice_pdf: string
  number: string
}

interface BillingProps {
  plans: Plan[]
  currentPlan: Plan | null
  subscriptionStatus: string | null
  billingInterval: 'monthly' | 'yearly' | null
  subscriptionEndsAt: string | null
  workspaceId: string
  isOwner: boolean
  invoices?: Invoice[]
  checkoutState?: string | null
}

export default function Billing({
  plans,
  currentPlan,
  subscriptionStatus,
  billingInterval,
  subscriptionEndsAt,
  workspaceId,
  isOwner,
  invoices = [],
  checkoutState,
}: BillingProps) {

  const [isYearly, setIsYearly] = useState(billingInterval === 'yearly')
  const [loading, setLoading] = useState(false)
  const defaultPlanId =
    currentPlan?.id || plans.find((p) => p.isRecommended)?.id || plans[0]?.id || null
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(defaultPlanId)

  const handleSubscribe = () => {
    if (!isOwner || !selectedPlanId) return

    setLoading(true)
    router.post(
      '/billing/subscribe',
      {
        planId: selectedPlanId,
        interval: isYearly ? 'yearly' : 'monthly',
        workspaceId,
      },
      {
        onFinish: () => setLoading(false),
        onError: () => toast.error('Something went wrong'),
      },
    )
  }

  return (
    <DashboardLayout>
      <Head title='Billing' />
      <PageHeader
        title='Billing & Invoices'
        description='Manage your subscription plan and view payment history.'
      />

      <Tabs defaultValue='billing' className='space-y-6 mt-6'>
        <TabsList>
          <TabsTrigger value='billing'>Plan & Subscription</TabsTrigger>
          <TabsTrigger value='invoices'>Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value='billing'>
          <Card className='flex flex-col'>
            <CardHeader>
              <CardTitle className='text-xl'>Manage your Team Plan</CardTitle>
              <CardDescription>
                Choose a plan that fits your team's needs. You can upgrade or downgrade your plan at
                any time.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-8'>
              {/* Status Messages */}
              {checkoutState === 'success' && (
                <div className='bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-center gap-3 text-green-800 dark:text-green-200'>
                  <CheckCircle2 className='h-5 w-5' />
                  <div>
                    <p className='font-semibold'>Subscription Activated!</p>
                    <p className='text-sm'>
                      Your workspace has been successfully upgraded. Thank you for subscribing!
                    </p>
                  </div>
                </div>
              )}

              {/* Billing Cycle Toggle */}
              <div className='flex items-center gap-4'>
                <div className='p-1 bg-muted rounded-lg inline-flex'>
                  <button
                    type='button'
                    onClick={() => setIsYearly(false)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                      !isYearly
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50',
                    )}>
                    Billed monthly
                  </button>
                  <button
                    type='button'
                    onClick={() => setIsYearly(true)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                      isYearly
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50',
                    )}>
                    Billed yearly
                    <span className='ml-1 text-xs text-primary font-normal bg-primary/10 px-1.5 py-0.5 rounded-full'>
                      -20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans */}
              <div className='space-y-4'>
                {plans.map((plan) => {
                  const priceMonthly = Number(plan.priceMonthly)
                  const priceYearly = Number(plan.priceYearly)
                  const price = isYearly ? priceYearly / 12 : priceMonthly
                  const isSelected = selectedPlanId === plan.id
                  const isCurrentPlan = currentPlan?.id === plan.id

                  const description =
                    plan.description ||
                    (plan.name.toLowerCase().includes('pro')
                      ? 'For growing teams'
                      : 'For small teams just getting started')

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        'relative flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card',
                        plan.isRecommended && !isSelected ? 'border-muted-foreground/30' : '',
                      )}>
                      {isCurrentPlan && (
                        <div className='absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full'>
                          Current Plan
                        </div>
                      )}
                      {plan.isRecommended && !isCurrentPlan && (
                        <div className='absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full'>
                          Recommended
                        </div>
                      )}

                      <div className='flex items-start gap-3'>
                        <div
                          className={cn(
                            'h-5 w-5 rounded-full border border-primary flex items-center justify-center mt-1 shrink-0 transition-colors',
                            isSelected ? 'bg-primary border-primary' : 'bg-transparent',
                          )}>
                          {isSelected && <Check className='h-3 w-3 text-primary-foreground' />}
                        </div>
                        <div>
                          <div className='font-semibold text-base'>{plan.name}</div>
                          <div className='text-muted-foreground text-sm mt-0.5'>{description}</div>
                          <div className='flex gap-2 mt-3 text-sm flex-wrap'>
                            {plan.features?.slice(0, 3).map((feature) => (
                              <span
                                key={feature}
                                className='inline-flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs'>
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-xl'>${price.toFixed(2)}</div>
                        <div className='text-muted-foreground text-sm'>per month</div>
                        {isYearly && (
                          <div className='text-xs text-muted-foreground mt-1'>
                            Billed ${priceYearly} yearly
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Button */}
              <div className='flex items-center justify-between pt-4'>
                <div className='text-sm text-muted-foreground'>
                  {subscriptionStatus === 'active' && subscriptionEndsAt && (
                    <p>Your plan renews on {new Date(subscriptionEndsAt).toLocaleDateString()}</p>
                  )}
                </div>
                <Button
                  onClick={handleSubscribe}
                  disabled={
                    loading ||
                    !isOwner ||
                    !selectedPlanId ||
                    (currentPlan?.id === selectedPlanId &&
                      (billingInterval === 'yearly') === isYearly)
                  }
                  className='bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-md px-8 h-12 text-base font-medium'>
                  {loading ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : null}
                  {currentPlan?.id === selectedPlanId && (billingInterval === 'yearly') === isYearly
                    ? 'Current Plan'
                    : 'Proceed to Payment'}
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </div>

              {/* Footer Notes */}
              <div className='space-y-2 pt-6 text-xs text-muted-foreground border-t'>
                <p>
                  For testing purposes only. Please use the Card `4242 4242 4242 4242` with any CVC
                  and valid expiration date.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='invoices'>
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>View and download your past invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <div className='bg-muted p-4 rounded-full mb-4'>
                    <FileText className='h-8 w-8 text-muted-foreground' />
                  </div>
                  <h3 className='text-lg font-medium'>No invoices yet</h3>
                  <p className='text-muted-foreground max-w-sm mt-1'>
                    Start a subscription to receive your first invoice. It will appear here
                    automatically.
                  </p>
                </div>
              ) : (
                <div className='rounded-md border'>
                  <div className='grid grid-cols-5 gap-4 p-4 border-b bg-muted/50 font-medium text-sm'>
                    <div className='col-span-2'>Invoice Number</div>
                    <div>Date</div>
                    <div>Amount</div>
                    <div className='text-right'>Action</div>
                  </div>
                  <div className='divide-y'>
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className='grid grid-cols-5 gap-4 p-4 items-center text-sm hover:bg-muted/5 transition-colors'>
                        <div className='col-span-2 font-medium flex items-center gap-2'>
                          <FileText className='h-4 w-4 text-muted-foreground' />
                          {invoice.number || 'Draft'}
                          <Badge
                            variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                            className='text-xs ml-2 h-5 px-1.5 capitalize'>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className='text-muted-foreground'>
                          {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
                        </div>
                        <div className='font-medium'>
                          {(invoice.amount_paid / 100).toLocaleString('en-US', {
                            style: 'currency',
                            currency: invoice.currency.toUpperCase(),
                          })}
                        </div>
                        <div className='text-right'>
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target='_blank'
                              rel='noreferrer'
                              className='inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                              title='Download PDF'>
                              <Download className='h-4 w-4' />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
