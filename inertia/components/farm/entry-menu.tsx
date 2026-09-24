import { ChevronDown, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface EntryMenuItem {
  id: string
  label: string
  description?: string
  icon: LucideIcon
}

interface EntryMenuProps {
  label?: string
  items: EntryMenuItem[]
  onSelect: (id: string) => void
  className?: string
}

export function EntryMenu({
  label = 'New entry',
  items,
  onSelect,
  className,
}: EntryMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='default' className={cn('min-h-10 gap-1.5', className)}>
          {label}
          <ChevronDown className='size-4 opacity-80' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Choose an action</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.id}
                className='cursor-pointer gap-2 py-2'
                onClick={() => onSelect(item.id)}>
                <Icon className='size-4 shrink-0 text-muted-foreground' />
                <span className='flex min-w-0 flex-col gap-0.5'>
                  <span className='font-medium leading-none'>{item.label}</span>
                  {item.description ? (
                    <span className='text-xs text-muted-foreground'>{item.description}</span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
