import { Head, Link } from '@inertiajs/react'
import type { LucideIcon } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ComingSoonPageProps {
  title: string
  description: string
  icon: LucideIcon
}

export function ComingSoonPage({ title, description, icon: Icon }: ComingSoonPageProps) {
  return (
    <DashboardLayout>
      <Head title={title} />
      <div className='space-y-6 pb-20 md:pb-0'>
        <PageHeader title={title} description={description} />
        <div className='flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-border bg-card px-6 py-16 text-center'>
          <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary'>
            <Icon className='h-7 w-7' aria-hidden />
          </div>
          <h2 className='font-display text-xl font-semibold'>Coming in the next build</h2>
          <p className='mt-2 max-w-md text-sm text-muted-foreground'>
            This screen is wired into navigation so the Farmco shell is ready. Inventory and
            recording flows land in the following phases.
          </p>
          <Link
            href='/dashboard'
            className={cn(buttonVariants({ variant: 'default' }), 'mt-6 min-h-11')}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
