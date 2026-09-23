import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import { AppLogo } from '@/components/app_logo'
import { PublicLayout } from '@/components/layouts/public'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Home(props: SharedProps) {
  const isLoggedIn = Boolean(props.isLoggedIn)
  const user = props.user as { role?: string } | null
  const isAdmin = user?.role === 'admin'
  const dashboardHref = isAdmin ? '/admin' : '/dashboard'

  return (
    <PublicLayout>
      <Head title='Farmco' />
      <section className='relative overflow-hidden'>
        <div className='mx-auto flex min-h-[70vh] max-w-screen-xl flex-col justify-center px-6 py-16 md:py-24'>
          <div className='mb-8 md:hidden'>
            <AppLogo />
          </div>
          <p className='mb-4 text-sm font-semibold tracking-wide text-primary uppercase'>
            Poultry farm inventory
          </p>
          <h1 className='font-display max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl'>
            Farmco
          </h1>
          <p className='mt-4 max-w-xl text-lg text-muted-foreground'>
            Record birds, eggs, and feed. Track orders. Know who changed what — even when the signal
            drops.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 gap-2')}>
                Open dashboard
                <ArrowRight className='h-4 w-4' />
              </Link>
            ) : (
              <>
                <Link
                  href='/signup'
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'min-h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90',
                  )}>
                  Get started
                  <ArrowRight className='h-4 w-4' />
                </Link>
                <Link
                  href='/login'
                  className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'min-h-11')}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
