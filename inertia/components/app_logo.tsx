import { Command } from 'lucide-react'

interface AppLogoProps {
  showLabel?: boolean
}

export function AppLogo({ showLabel = true }: AppLogoProps) {
  return (
    <div className='flex items-center gap-2'>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground'>
        <Command className='h-4 w-4' />
      </div>
      {showLabel && <span className='text-lg font-semibold'>Acme</span>}
    </div>
  )
}
