import { Head } from '@inertiajs/react'
import { AppLogo } from '@/components/app_logo'
import { PublicLayout } from '@/components/layouts/public'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  title: string
  heading: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** Side panel tagline under the photo */
  panelLine?: string
}

export function AuthShell({
  title,
  heading,
  description,
  children,
  footer,
  panelLine = 'A plain ledger for birds, eggs, and feed.',
}: AuthShellProps) {
  return (
    <PublicLayout showFooter={false} showHeader={false}>
      <Head title={title} />
      <div className='grid min-h-svh lg:grid-cols-2'>
        <aside className='relative hidden overflow-hidden lg:block'>
          <img
            src='/images/landing/auth-side.webp'
            alt=''
            width={900}
            height={1200}
            className='absolute inset-0 h-full w-full object-cover'
          />
          <div
            className='absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/35 to-foreground/20'
            aria-hidden
          />
          <div className='relative flex h-full flex-col justify-between p-10'>
            <AppLogo className='[&_span]:text-primary-foreground' />
            <p className='font-display max-w-sm text-2xl font-semibold leading-snug text-primary-foreground'>
              {panelLine}
            </p>
          </div>
        </aside>

        <div className='flex flex-col justify-center bg-background px-4 py-10 sm:px-8'>
          <div
            className={cn(
              'animate-fade-in-up mx-auto w-full max-w-sm space-y-6',
              'rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5',
            )}>
            <div className='flex justify-center lg:hidden'>
              <AppLogo />
            </div>

            <div className='space-y-1 text-center'>
              <h1 className='font-display text-xl font-semibold tracking-tight'>{heading}</h1>
              {description ? (
                <div className='text-sm text-muted-foreground'>{description}</div>
              ) : null}
            </div>

            {children}

            {footer}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
