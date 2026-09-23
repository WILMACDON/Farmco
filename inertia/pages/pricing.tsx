import { Head, Link } from '@inertiajs/react'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RawPlan } from '#types/model-types'
import { PublicLayout } from '@/components/layouts/public'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Pricing({ plans }: { plans: RawPlan[] }) {
  const [isYearly, setIsYearly] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
    return () => {
      // Revert to user preference on unmount
      const stored = localStorage.getItem('theme')
      const root = document.documentElement
      root.classList.remove('light', 'dark')

      if (stored === 'light') {
        root.classList.add('light')
      } else if (stored === 'dark') {
        root.classList.add('dark')
      } else {
        // System
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
      }
    }
  }, [])

  return (
    <PublicLayout
      className='dark bg-background text-foreground selection:bg-purple-500/30'
      hideThemeToggle={true}>
      <Head title='Pricing' />

      <div className='min-h-screen font-sans'>
        {/* Background elements */}
        <div className='fixed inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]'></div>
        <div className='fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-background/80 to-background' />
        <div className='fixed top-0 left-1/2 -z-10 -translate-x-1/2'>
          <div className='h-[400px] w-[800px] bg-purple-500/20 blur-[120px] rounded-full mix-blend-screen opacity-50' />
        </div>

        <div className='py-20 px-6'>
          <div className='max-w-7xl mx-auto'>
            <div className='text-center mb-16'>
              <h1 className='text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/70 mb-6'>
                Simple, transparent pricing
              </h1>
              <p className='text-xl text-zinc-400 max-w-2xl mx-auto mb-10'>
                Choose the plan that's right for you. No hidden fees, cancel anytime.
              </p>

              <div className='flex items-center justify-center gap-4 p-1.5 bg-white/5 border border-white/10 rounded-full w-fit mx-auto backdrop-blur-sm'>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${!isYearly ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => setIsYearly(false)}>
                  Monthly
                </span>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${isYearly ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => setIsYearly(true)}>
                  Yearly{' '}
                  <span className='text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full'>
                    Save 20%
                  </span>
                </span>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col border-white/10 bg-black/40 backdrop-blur-xl hover:border-white/20 transition-colors ${plan.isRecommended ? 'ring-2 ring-purple-500/50 shadow-2xl shadow-purple-500/10' : ''}`}>
                  {plan.isRecommended && (
                    <div className='absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent' />
                  )}
                  {plan.isRecommended && (
                    <div className='absolute top-0 right-0 p-32 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none' />
                  )}

                  <CardHeader>
                    <CardTitle className='text-xl'>{plan.name}</CardTitle>
                    <div className='mt-4 flex items-baseline text-zinc-400'>
                      <span className='text-4xl font-bold tracking-tight text-white'>
                        ${isYearly ? (plan.priceYearly / 12).toFixed(0) : plan.priceMonthly}
                      </span>
                      <span className='ml-1 text-base'>/month</span>
                    </div>
                    <CardDescription className='h-6'>
                      {isYearly && (
                        <span className='text-sm text-emerald-400'>
                          Billed ${plan.priceYearly} yearly
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className='flex-1 flex flex-col'>
                    <ul className='space-y-4 mb-8 flex-1'>
                      {plan.features?.map((feature, i) => (
                        <li
                          key={i.toString()}
                          className='flex items-start gap-3 text-sm text-zinc-300'>
                          <div className='mt-0.5 p-0.5 rounded-full bg-emerald-500/10'>
                            <CheckCircle2 className='h-3.5 w-3.5 text-emerald-400 shrink-0' />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${plan.isRecommended ? 'bg-white text-black hover:bg-zinc-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      asChild>
                      <Link
                        href='/signup'
                        data={{
                          plan: plan.id,
                          name: plan.name,
                          frequency: isYearly ? 'yearly' : 'monthly',
                        }}>
                        Get Started
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
