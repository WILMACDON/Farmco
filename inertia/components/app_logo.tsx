import { cn } from '@/lib/utils'

interface AppLogoProps {
  showLabel?: boolean
  className?: string
}

/** Egg with green leaf — Farmco mark from the brand guide */
function FarmcoMark({ className }: { className?: string }) {
  return (
    <svg width='28' height='32' viewBox='0 0 44 52' aria-hidden='true' className={className}>
      <path d='M22 2C11 2 3 20 3 32c0 11 8 18 19 18s19-7 19-18C41 20 33 2 22 2z' fill='#F2B632' />
      <path d='M11 34c4 5 9 7 14 6 5-1 8-4 9-8-5 3-10 3-14 0-3-2-6-2-9 2z' fill='#2F6B3F' />
    </svg>
  )
}

export function AppLogo({ showLabel = true, className }: AppLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <FarmcoMark className='shrink-0' />
      {showLabel && (
        <span className='font-display text-lg font-bold tracking-tight text-foreground'>
          Farmco
        </span>
      )}
    </div>
  )
}
