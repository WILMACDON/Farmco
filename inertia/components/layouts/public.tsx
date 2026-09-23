import type { SharedProps } from '@adonisjs/inertia/types'
import { Link, router, usePage } from '@inertiajs/react'
import { ArrowRight, Menu } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

interface PublicLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  actions?: React.ReactNode
  headerSticky?: boolean
  headerBorder?: boolean
  showFooter?: boolean
  footer?: React.ReactNode
  hideThemeToggle?: boolean
}

function PublicNavbarActions({
  extraActions,
  hideThemeToggle,
}: {
  extraActions?: React.ReactNode
  hideThemeToggle?: boolean
}) {
  const page = usePage<SharedProps>()
  const isLoggedIn = Boolean(page.props.isLoggedIn)
  const user = page.props.user as { role?: string } | null
  const isAdmin = user?.role === 'admin'

  const dashboardHref = isAdmin ? '/admin' : '/dashboard'

  return (
    <div className='flex items-center gap-2'>
      {/* Desktop links - use Link with button styles so Inertia navigation works on first click */}
      <div className='hidden md:flex items-center gap-2'>
        <Link href='/' className={cn(buttonVariants({ variant: 'ghost' }))}>
          Home
        </Link>
        <Link href='/pricing' className={cn(buttonVariants({ variant: 'ghost' }))}>
          Pricing
        </Link>
        <Link href='/blog' className={cn(buttonVariants({ variant: 'ghost' }))}>
          Blog
        </Link>
        <Link href='/contact' className={cn(buttonVariants({ variant: 'ghost' }))}>
          Contact
        </Link>
      </div>

      {/* Desktop auth CTAs + optional extra actions */}
      <div className='hidden md:flex items-center gap-2'>
        {isLoggedIn ? (
          <Link
            href={dashboardHref}
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex gap-2')}>
            Dashboard
            <ArrowRight className='h-4 w-4' />
          </Link>
        ) : (
          <>
            <Link href='/login' className={cn(buttonVariants({ variant: 'ghost' }))}>
              Sign In
            </Link>
            <Link
              href='/signup'
              className={cn(buttonVariants(), 'inline-flex gap-2')}>
              Sign Up
              <ArrowRight className='h-4 w-4' />
            </Link>
          </>
        )}
        {extraActions}
      </div>

      {!hideThemeToggle && <ThemeToggle />}

      {/* Mobile menu (prevents header overflow) */}
      <div className='md:hidden'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' aria-label='Open menu'>
              <Menu className='h-5 w-5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => router.visit('/')}>Home</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit('/pricing')}>Pricing</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit('/blog')}>Blog</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit('/contact')}>Contact</DropdownMenuItem>
            <DropdownMenuSeparator />
            {isLoggedIn ? (
              <DropdownMenuItem onClick={() => router.visit(dashboardHref)}>
                Dashboard
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => router.visit('/login')}>Sign In</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.visit('/signup')}>Sign Up</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function PublicLayout({
  children,
  showHeader = true,
  actions,
  headerSticky = true,
  showFooter = true,
  footer,
  className,
  hideThemeToggle,
}: PublicLayoutProps & { className?: string }) {
  return (
    <div className={cn('min-h-screen dark:bg-background flex flex-col', className)}>
      {showHeader && (
        <header
          className={cn(
            'z-50 border-b border-border/80',
            headerSticky
              ? 'sticky top-0 bg-background/70 supports-[backdrop-filter]:backdrop-blur-md'
              : 'bg-transparent',
          )}>
          <div className='max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between'>
            <Link href='/' className='flex items-center gap-2 w-fit'>
              <span className='font-display font-bold text-lg text-foreground'>
                {import.meta.env.VITE_APP_NAME}
              </span>
            </Link>
            <PublicNavbarActions extraActions={actions} hideThemeToggle={hideThemeToggle} />
          </div>
        </header>
      )}
      <main className='flex-1'>{children}</main>

      {showFooter && (
        <>
          {footer ?? (
            <footer className='border-t border-border py-8 px-6'>
              <div className='max-w-screen-xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='leading-tight'>
                    <div className='font-display font-semibold'>{import.meta.env.VITE_APP_NAME}</div>
                    <div className='text-sm text-muted-foreground'>
                      {import.meta.env.VITE_APP_DESCRIPTION}
                    </div>
                  </div>
                </div>
                <div className='text-sm text-muted-foreground flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
                  <a href='mailto:support@ekoatlantic.com' className='hover:text-foreground'>
                    {import.meta.env.VITE_SUPPORT_EMAIL}
                  </a>
                  <span className='hidden sm:inline'>•</span>
                  <span>
                    © {new Date().getFullYear()} {import.meta.env.VITE_APP_NAME}
                  </span>
                </div>
              </div>
            </footer>
          )}
        </>
      )}
    </div>
  )
}
