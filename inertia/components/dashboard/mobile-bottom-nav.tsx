import { Link, usePage } from '@inertiajs/react'
import { Bird, Egg, LayoutDashboard, Package, Wheat } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Birds', href: '/birds', icon: Bird },
  { title: 'Eggs', href: '/eggs', icon: Egg },
  { title: 'Feed', href: '/feed', icon: Wheat },
  { title: 'Orders', href: '/orders', icon: Package },
]

export function MobileBottomNav() {
  const page = usePage()
  const currentPath = page.url.split('?')[0]?.split('#')[0] || '/'

  return (
    <nav
      aria-label='Primary'
      className='fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden'>
      <ul className='grid grid-cols-5'>
        {items.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? currentPath === item.href
              : currentPath === item.href || currentPath.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}>
                <Icon className='h-5 w-5' strokeWidth={2} aria-hidden />
                <span>{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
