import type { SharedProps } from '@adonisjs/inertia/types'
import { Link, router, usePage } from '@inertiajs/react'
import { ArrowRight, Menu } from 'lucide-react'
import { AppLogo } from '@/components/app_logo'
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
  /** Transparent sticky header for full-bleed heroes (light text when over dark media). */
  headerOverlay?: boolean
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/contact', label: 'Contact' },
] as const

function PublicNavbarActions({
  extraActions,
  hideThemeToggle,
  headerOverlay,
}: {
  extraActions?: React.ReactNode
  hideThemeToggle?: boolean
  headerOverlay?: boolean
}) {
  const page = usePage<SharedProps>()
  const isLoggedIn = Boolean(page.props.isLoggedIn)
  const user = page.props.user as { role?: string } | null
  const isAdmin = user?.role === 'admin'
  const dashboardHref = isAdmin ? '/admin' : '/dashboard'

  const ghostClass = headerOverlay
    ? 'text-primary-foreground/90 hover:bg-primary-foreground/15 hover:!text-primary-foreground'
    : undefined

  return (
    <div className='flex items-center gap-2'>
      <nav className='hidden items-center gap-1 md:flex' aria-label='Primary'>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(buttonVariants({ variant: 'ghost' }), ghostClass)}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className='hidden items-center gap-2 md:flex'>
        {isLoggedIn ? (
          <Link
            href={dashboardHref}
            className={cn(
              buttonVariants({ variant: headerOverlay ? 'secondary' : 'outline' }),
              'inline-flex gap-2',
              headerOverlay &&
                'border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 hover:!text-primary-foreground',
            )}>
            Dashboard
            <ArrowRight className='h-4 w-4' />
          </Link>
        ) : (
          <>
            <Link
              href='/login'
              className={cn(buttonVariants({ variant: 'ghost' }), ghostClass)}>
              Sign In
            </Link>
            <Link
              href='/signup'
              className={cn(
                buttonVariants(),
                'inline-flex gap-2',
                headerOverlay &&
                  'bg-accent text-accent-foreground hover:bg-accent/90 hover:!text-accent-foreground',
              )}>
              Sign Up
              <ArrowRight className='h-4 w-4' />
            </Link>
          </>
        )}
        {extraActions}
      </div>

      {!hideThemeToggle && (
        <ThemeToggle className={headerOverlay ? ghostClass : undefined} />
      )}

      <div className='md:hidden'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              aria-label='Open menu'
              className={ghostClass}>
              <Menu className='h-5 w-5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {navLinks.map((link) => (
              <DropdownMenuItem key={link.href} onClick={() => router.visit(link.href)}>
                {link.label}
              </DropdownMenuItem>
            ))}
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
  headerOverlay = false,
}: PublicLayoutProps & { className?: string }) {
  return (
    <div className={cn('flex min-h-screen flex-col dark:bg-background', className)}>
      {showHeader && (
        <header
          className={cn(
            'z-50',
            headerOverlay
              ? 'absolute inset-x-0 top-0 border-transparent bg-gradient-to-b from-foreground/55 to-transparent'
              : cn(
                  'border-b border-border/80 bg-background/70 supports-[backdrop-filter]:backdrop-blur-md',
                  headerSticky && 'sticky top-0',
                ),
          )}>
          <div className='mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4'>
            <Link
              href='/'
              className={cn(
                'flex w-fit items-center gap-2',
                headerOverlay && '[&_span]:text-primary-foreground',
              )}>
              <AppLogo />
            </Link>
            <PublicNavbarActions
              extraActions={actions}
              hideThemeToggle={hideThemeToggle}
              headerOverlay={headerOverlay}
            />
          </div>
        </header>
      )}
      <main className='flex-1'>{children}</main>

      {showFooter &&
        (footer ?? (
          <footer className='border-t border-border bg-card/40 px-6 py-12'>
            <div className='mx-auto grid max-w-screen-xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]'>
              <div className='space-y-3'>
                <AppLogo />
                <p className='max-w-xs text-sm text-muted-foreground'>
                  Poultry farm inventory — birds, eggs, feed, and orders, recorded plainly.
                </p>
              </div>
              <div>
                <p className='font-display text-sm font-semibold text-foreground'>Product</p>
                <ul className='mt-3 space-y-2 text-sm text-muted-foreground'>
                  <li>
                    <Link href='/contact' className='hover:text-foreground'>
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className='font-display text-sm font-semibold text-foreground'>Legal</p>
                <ul className='mt-3 space-y-2 text-sm text-muted-foreground'>
                  <li>
                    <Link href='/terms' className='hover:text-foreground'>
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='mx-auto mt-10 flex max-w-screen-xl flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
              <span>© {new Date().getFullYear()} Farmco</span>
              <span>Built for coops, not conference rooms.</span>
            </div>
          </footer>
        ))}
    </div>
  )
}
