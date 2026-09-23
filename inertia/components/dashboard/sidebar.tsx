import { Link, router, usePage } from '@inertiajs/react'
import {
  BarChart3,
  Bird,
  ChevronsUpDown,
  Egg,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  PanelRight,
  ScrollText,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wheat,
} from 'lucide-react'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { RawUser } from '#types/model-types'
import { AppLogo } from '@/components/app_logo'
import { CommandPalette } from '@/components/command-palette'
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav'
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher'
import { SyncIndicator } from '@/components/farm/sync-indicator'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

// Types
interface NavItem {
  title: string
  href: string
  icon: ReactNode
}

interface NavSection {
  label: string
  items: NavItem[]
}

// Configuration
const SIDEBAR_STORAGE_KEY = 'dashboard-sidebar-open'

const userNavSections: NavSection[] = [
  {
    label: 'Farm',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className='h-4 w-4' /> },
      { title: 'Birds', href: '/birds', icon: <Bird className='h-4 w-4' /> },
      { title: 'Eggs', href: '/eggs', icon: <Egg className='h-4 w-4' /> },
      { title: 'Feed', href: '/feed', icon: <Wheat className='h-4 w-4' /> },
      { title: 'Orders', href: '/orders', icon: <Package className='h-4 w-4' /> },
    ],
  },
  {
    label: 'Manage',
    items: [
      { title: 'Statistics', href: '/stats', icon: <BarChart3 className='h-4 w-4' /> },
      { title: 'Activity', href: '/activity', icon: <ScrollText className='h-4 w-4' /> },
      { title: 'Users', href: '/users', icon: <Users className='h-4 w-4' /> },
      { title: 'Settings', href: '/settings', icon: <Settings className='h-4 w-4' /> },
    ],
  },
]

const adminNavSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: <ShieldCheck className='h-4 w-4' /> },
      { title: 'Users', href: '/admin/users', icon: <Users className='h-4 w-4' /> },
    ],
  },
]

// State Management
const SidebarContext = createContext<{
  isOpen: boolean
  isMobile: boolean
  toggle: () => void
  closeMobile: () => void
}>({ isOpen: true, isMobile: false, toggle: () => {}, closeMobile: () => {} })

const useSidebar = () => useContext(SidebarContext)

// Helper Components
function SidebarItem({ item }: { item: NavItem }) {
  const { isOpen, isMobile, closeMobile } = useSidebar()
  const page = usePage()

  const currentPath = page.url.split('?')[0]?.split('#')[0] || '/'
  const isActive =
    item.href === '/admin' || item.href === '/dashboard'
      ? currentPath === item.href
      : currentPath === item.href || currentPath.startsWith(`${item.href}/`)

  const linkClassName = cn(
    'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-normal transition-colors',
    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    !isOpen && !isMobile && 'justify-center px-2',
    isActive && 'bg-primary text-primary-foreground',
  )

  const content = (
    <Link
      href={item.href}
      onClick={() => isMobile && closeMobile()}
      className={linkClassName}
      title={!isOpen && !isMobile ? item.title : undefined}>
      <span className={cn('transition-transform', isActive && 'scale-110')}>{item.icon}</span>
      {(isOpen || isMobile) && <span>{item.title}</span>}
    </Link>
  )

  if (!isOpen && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side='right'>{item.title}</TooltipContent>
      </Tooltip>
    )
  }

  return content
}

function UserMenu({ user }: { user: RawUser }) {
  const { isOpen, isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { confirmLogout } = useOfflineQueue()

  async function handleSignOut() {
    const ok = await confirmLogout()
    if (ok) router.visit('/logout')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className={cn(
            'w-full justify-start gap-3 px-2',
            !isOpen && !isMobile && 'justify-center px-0',
          )}>
          <Avatar className='h-6 w-6'>
            <AvatarFallback>
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {(isOpen || isMobile) && (
            <div className='flex flex-col items-start overflow-hidden text-left'>
              <span className='truncate text-xs font-medium'>{user?.fullName || 'User'}</span>
              <span className='truncate text-[10px] text-muted-foreground'>{user?.email}</span>
            </div>
          )}
          {(isOpen || isMobile) && (
            <ChevronsUpDown className='ml-auto h-3 w-3 text-muted-foreground' />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='start' side='right' sideOffset={10} className='w-56'>
        <div className='px-2 py-1.5 text-xs text-muted-foreground'>
          Signed in as <span className='font-medium text-foreground'>{user?.email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun className='mr-2 h-4 w-4' />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
              <DropdownMenuRadioItem value='light'>Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='dark'>Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='system'>System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleSignOut()}>
          <LogOut className='mr-2 h-4 w-4' />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarContent({ sections, isAdmin }: { sections: NavSection[]; isAdmin: boolean }) {
  const { isOpen, isMobile } = useSidebar()
  const page = usePage()
  const user = page.props.user as RawUser

  return (
    <div className='flex h-full flex-col bg-sidebar text-sidebar-foreground'>
      {/* Header */}
      <div className={cn('flex h-14 items-center px-4', !isOpen && !isMobile && 'justify-center')}>
        {(isOpen || isMobile) && (
          <Link href='/' className='flex items-center gap-2 font-semibold'>
            <AppLogo />
          </Link>
        )}
      </div>

      {/* Workspace Switcher */}
      {!isAdmin && (
        <div className={cn('px-2 py-2', !isOpen && !isMobile && 'flex justify-center')}>
          <WorkspaceSwitcher collapsed={!isOpen && !isMobile} />
        </div>
      )}

      {/* Nav */}
      <ScrollArea className='flex-1 px-2'>
        <div className='space-y-4 py-2'>
          {sections.map((section) => (
            <div key={section.label} className='px-1'>
              {(isOpen || isMobile) && (
                <h4 className='mb-2 px-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase'>
                  {section.label}
                </h4>
              )}
              <div className='space-y-1'>
                {section.items.map((item) => (
                  <SidebarItem key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className='space-y-2 border-t border-sidebar-border p-2'>
        {(isOpen || isMobile) && <SyncIndicator className='w-full justify-start' />}
        <UserMenu user={user} />
      </div>
    </div>
  )
}

export function Sidebar({ children }: { children: ReactNode }) {
  const page = usePage()
  const user = page.props.user as RawUser
  const isAdmin = user?.role === 'admin'
  const adminPageAccess = (page.props as { adminPageAccess?: string[] }).adminPageAccess
  const impersonating = (page.props as { impersonating?: boolean }).impersonating

  // Sidebar State
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return stored !== null ? JSON.parse(stored) : true
  })
  const [isMobile, setIsMobile] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Persist State
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isOpen))
  }, [isOpen])

  // Responsive Check
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setIsSheetOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile sheet (and any leftover portal overlays) on Inertia navigation
  useEffect(() => {
    return router.on('before', () => {
      setIsSheetOpen(false)
    })
  }, [])

  const farmRole = (page.props as { farmRole?: 'owner' | 'manager' | 'worker' | null }).farmRole
  const canManageUsers = farmRole === 'owner' || farmRole === 'manager'

  // Filter Nav Items
  const sections = isAdmin
    ? adminNavSections.map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          if (!adminPageAccess) return true
          const key = item.href.includes('users') ? 'admin_users' : 'admin_dashboard'
          return adminPageAccess.includes(key)
        }),
      }))
    : userNavSections
        .map((s) => ({
          ...s,
          items: s.items.filter((item) => {
            if (item.href === '/users') return canManageUsers
            return true
          }),
        }))
        .filter((s) => s.items.length > 0)

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isMobile,
        toggle: () => setIsOpen((prev: boolean) => !prev),
        closeMobile: () => setIsSheetOpen(false),
      }}>
      <div className='flex h-screen overflow-hidden bg-background'>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside
            className={cn(
              'hidden border-r border-sidebar-border transition-all duration-300 ease-in-out md:block',
              isOpen ? 'w-64' : 'w-[70px]',
            )}>
            <SidebarContent sections={sections} isAdmin={isAdmin} />
          </aside>
        )}

        {/* Mobile Sidebar sheet for Stats / Users / Activity */}
        {isMobile && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent side='left' className='w-64 p-0 border-r-0'>
              <SidebarContent sections={sections} isAdmin={isAdmin} />
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <main className='flex flex-1 flex-col overflow-hidden'>
          {impersonating && (
            <div className='bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground'>
              You are impersonating {user.fullName}.{' '}
              <Link href='/logout/impersonation' method='post' as='button' className='underline'>
                Stop
              </Link>
            </div>
          )}

          <header className='flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:px-6'>
            <Button
              variant='ghost'
              size='icon'
              className='-ml-2 h-11 w-11'
              aria-label={isMobile ? 'Open menu' : 'Toggle sidebar'}
              onClick={() => (isMobile ? setIsSheetOpen(true) : setIsOpen((p: boolean) => !p))}>
              {isOpen || isMobile ? (
                <PanelLeft className='h-4 w-4' />
              ) : (
                <PanelRight className='h-4 w-4' />
              )}
            </Button>
            <div className='ml-auto flex items-center gap-2'>
              <NotificationCenter userId={user?.id} />
            </div>
          </header>

          <CommandPalette />

          <ScrollArea className='flex-1'>
            <div className='container mx-auto max-w-7xl p-4 pb-24 md:p-6 md:pb-6'>{children}</div>
          </ScrollArea>

          {!isAdmin && <MobileBottomNav />}
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
