'use client'

import type { SharedProps } from '@adonisjs/inertia/types'
import { router, usePage } from '@inertiajs/react'
import {
  Check,
  LogOut,
  Moon,
  Newspaper,
  PlusSquare,
  Settings,
  Shield,
  Sun,
  Users,
  UsersRound,
} from 'lucide-react'
import * as React from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useTheme } from '@/hooks/use-theme'

type AdminPageKey = 'admin_dashboard' | 'admin_users' | 'admin_blog'

type CommandEntry = {
  label: string
  href: string
  icon?: React.ReactNode
  keywords?: string
  requires?: AdminPageKey
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return target.isContentEditable
}

export function CommandPalette() {
  const page = usePage<SharedProps>()
  const isLoggedIn = Boolean(page.props.isLoggedIn)
  const user = page.props.user as { role?: string } | null
  const isAdmin = user?.role === 'admin'
  const { theme, setTheme } = useTheme()
  const adminPageAccess = (page.props as SharedProps & { adminPageAccess?: AdminPageKey[] | null })
    .adminPageAccess

  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isCmdK = (e.metaKey || e.ctrlKey) && key === 'k'
      if (!isCmdK) return

      // Avoid stealing focus while the user is typing into form fields
      if (isEditableTarget(e.target)) return

      e.preventDefault()
      setOpen((v) => !v)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = React.useCallback((href: string) => {
    setOpen(false)
    router.visit(href)
  }, [])

  const selectTheme = React.useCallback(
    (next: 'light' | 'dark' | 'system') => {
      setOpen(false)
      setTheme(next)
    },
    [setTheme],
  )

  // CmdK is only mounted in dashboard layouts, but keep a guard anyway.
  if (!isLoggedIn) return null

  const userNav: CommandEntry[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <UsersRound className='mr-2 h-4 w-4' /> },
    { label: 'Workspaces', href: '/workspaces', icon: <UsersRound className='mr-2 h-4 w-4' /> },
    { label: 'Settings', href: '/settings', icon: <Settings className='mr-2 h-4 w-4' /> },
  ]

  const adminNav: CommandEntry[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <Shield className='mr-2 h-4 w-4' />,
      requires: 'admin_dashboard',
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: <Users className='mr-2 h-4 w-4' />,
      requires: 'admin_users',
    },
    {
      label: 'Blog',
      href: '/admin/blog',
      icon: <Newspaper className='mr-2 h-4 w-4' />,
      requires: 'admin_blog',
    },
    {
      label: 'Plans',
      href: '/admin/plans',
      icon: <Newspaper className='mr-2 h-4 w-4' />,
      requires: 'admin_blog',
    },
    {
      label: 'New blog post',
      href: '/admin/blog/create',
      icon: <PlusSquare className='mr-2 h-4 w-4' />,
      requires: 'admin_blog',
    },
    {
      label: 'Blog categories',
      href: '/admin/blog/categories',
      icon: <Newspaper className='mr-2 h-4 w-4' />,
      requires: 'admin_blog',
    },
    {
      label: 'Blog tags',
      href: '/admin/blog/tags',
      icon: <Newspaper className='mr-2 h-4 w-4' />,
      requires: 'admin_blog',
    },
    {
      label: 'Blog authors',
      href: '/admin/blog/authors',
      icon: <Newspaper className='mr-2 h-4 w-4' />,
      requires: 'admin_blog',
    },
  ]

  const accountActions: CommandEntry[] = [
    {
      label: 'Log out',
      href: '/logout',
      icon: <LogOut className='mr-2 h-4 w-4' />,
      keywords: 'sign out',
    },
  ]

  const visibleAdminNav = (() => {
    if (!isAdmin) return []
    // Null/undefined means unrestricted admin
    if (!adminPageAccess) return adminNav
    return adminNav.filter((i) => !i.requires || adminPageAccess.includes(i.requires))
  })()

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search…' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading={isAdmin ? 'Admin' : 'App'}>
          {(isAdmin ? visibleAdminNav : userNav).map((item) => (
            <CommandItem
              key={item.href}
              className='cursor-pointer py-2'
              value={`${item.label} ${item.keywords || ''}`}
              onSelect={() => go(item.href)}>
              {item.icon}
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading='Theme'>
          <CommandItem value='Theme: Light' onSelect={() => selectTheme('light')}>
            <Sun className='mr-2 h-4 w-4' />
            Light
            {theme === 'light' ? <Check className='ml-auto h-4 w-4' /> : null}
          </CommandItem>
          <CommandItem value='Theme: Dark' onSelect={() => selectTheme('dark')}>
            <Moon className='mr-2 h-4 w-4' />
            Dark
            {theme === 'dark' ? <Check className='ml-auto h-4 w-4' /> : null}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading='Account'>
          {accountActions.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.keywords || ''}`}
              onSelect={() => go(item.href)}>
              {item.icon}
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
