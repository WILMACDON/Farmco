import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, Link } from '@inertiajs/react'
import { ArrowRight, Bird, ClipboardList, Egg, Wheat } from 'lucide-react'
import { PublicLayout } from '@/components/layouts/public'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const recordItems = [
  {
    title: 'Birds',
    copy: 'Flock counts, health notes, and moves between coops.',
    icon: Bird,
    image: '/images/landing/birds.webp',
  },
  {
    title: 'Eggs',
    copy: 'Daily crates by size — large numbers you can trust.',
    icon: Egg,
    image: '/images/landing/eggs.webp',
  },
  {
    title: 'Feed',
    copy: 'Bags left, burn rate, and when to reorder.',
    icon: Wheat,
    image: '/images/landing/coop.webp',
  },
  {
    title: 'Orders',
    copy: 'Who bought what, and what still needs packing.',
    icon: ClipboardList,
    image: '/images/landing/hero.webp',
  },
] as const

export default function Home(props: SharedProps) {
  const isLoggedIn = Boolean(props.isLoggedIn)
  const user = props.user as { role?: string } | null
  const isAdmin = user?.role === 'admin'
  const dashboardHref = isAdmin ? '/admin' : '/dashboard'

  return (
    <PublicLayout headerOverlay>
      <Head title='Farmco — Poultry farm inventory' />

      {/* Hero: brand + one line + CTAs on full-bleed photo */}
      <section className='relative min-h-[100svh] overflow-hidden'>
        <img
          src='/images/landing/hero.webp'
          alt='Hens in a farm coop'
          width={2400}
          height={1600}
          className='absolute inset-0 h-full w-full object-cover'
          fetchPriority='high'
        />
        <div
          className='absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/55 to-foreground/25'
          aria-hidden
        />
        <div className='relative mx-auto flex min-h-[100svh] max-w-screen-xl flex-col justify-end px-6 pb-16 pt-28 md:justify-center md:pb-24 md:pt-24'>
          <div className='max-w-xl'>
            <h1 className='animate-fade-in-up font-display text-5xl font-bold tracking-tight text-primary-foreground sm:text-6xl md:text-7xl'>
              Farmco
            </h1>
            <p className='animate-fade-in-up-delay-1 mt-4 max-w-md text-lg text-primary-foreground/90 md:text-xl'>
              Record birds, eggs, and feed. Track orders. Know who changed what — even when the
              signal drops.
            </p>
            <div className='animate-fade-in-up-delay-2 mt-8 flex flex-wrap gap-3'>
              {isLoggedIn ? (
                <Link
                  href={dashboardHref}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'min-h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90',
                  )}>
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
                    className={cn(
                      buttonVariants({ size: 'lg', variant: 'ghost' }),
                      'min-h-11 border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/15 hover:!text-primary-foreground',
                    )}>
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What you record */}
      <section className='border-b border-border px-6 py-20 md:py-28'>
        <div className='mx-auto max-w-screen-xl'>
          <h2 className='font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl'>
            What you record
          </h2>
          <p className='mt-3 max-w-xl text-muted-foreground'>
            The daily work of a coop — written down once, readable by everyone on the farm.
          </p>
          <ul className='mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4'>
            {recordItems.map((item, index) => (
              <li
                key={item.title}
                className={cn(
                  'space-y-4',
                  index === 0 && 'animate-fade-in-up',
                  index === 1 && 'animate-fade-in-up-delay-1',
                  index === 2 && 'animate-fade-in-up-delay-2',
                  index === 3 && 'animate-fade-in-up-delay-3',
                )}>
                <div className='aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]'>
                  <img
                    src={item.image}
                    alt=''
                    width={1200}
                    height={800}
                    loading='lazy'
                    className='h-full w-full object-cover'
                  />
                </div>
                <div className='flex items-center gap-2 text-primary'>
                  <item.icon className='h-5 w-5' aria-hidden />
                  <h3 className='font-display text-xl font-semibold text-foreground'>{item.title}</h3>
                </div>
                <p className='text-sm text-muted-foreground'>{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Works offline */}
      <section className='border-b border-border px-6 py-20 md:py-28'>
        <div className='mx-auto grid max-w-screen-xl items-center gap-12 lg:grid-cols-2 lg:gap-16'>
          <div>
            <h2 className='font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl'>
              Works when the signal drops
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              Record in the coop anyway. Changes sync when you are back online — and every edit
              keeps who changed what and when.
            </p>
          </div>
          <div className='relative aspect-[5/4] overflow-hidden rounded-[var(--radius-card)]'>
            <img
              src='/images/landing/coop.webp'
              alt='Poultry farm setting'
              width={1200}
              height={800}
              loading='lazy'
              className='h-full w-full object-cover'
            />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className='border-b border-border px-6 py-20 md:py-28'>
        <div className='mx-auto max-w-screen-xl'>
          <h2 className='font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl'>
            Built for real coops
          </h2>
          <p className='mt-4 max-w-2xl text-lg text-muted-foreground'>
            From a backyard flock to a busy laying house — Farmco stays plain-spoken: big numbers,
            clear status, and no jargon when something goes wrong.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className='px-6 py-20 md:py-28'>
        <div className='mx-auto flex max-w-screen-xl flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl'>
              Start your farm ledger
            </h2>
            <p className='mt-3 max-w-md text-muted-foreground'>
              Set up in minutes. Invite the crew when you are ready.
            </p>
          </div>
          {isLoggedIn ? (
            <Link
              href={dashboardHref}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'min-h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90',
              )}>
              Open dashboard
              <ArrowRight className='h-4 w-4' />
            </Link>
          ) : (
            <Link
              href='/signup'
              className={cn(
                buttonVariants({ size: 'lg' }),
                'min-h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90',
              )}>
              Get started
              <ArrowRight className='h-4 w-4' />
            </Link>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
