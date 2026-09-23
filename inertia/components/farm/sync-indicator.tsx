import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  className?: string
  showSyncButton?: boolean
}

export function SyncIndicator({ className, showSyncButton = true }: SyncIndicatorProps) {
  const { waitingCount, isOnline, isSyncing, syncNow } = useOfflineQueue()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const label = !isOnline
    ? 'Offline'
    : waitingCount > 0
      ? `${waitingCount} waiting to sync`
      : 'Online'

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground',
          !isOnline && 'border-destructive/40 text-destructive',
          waitingCount > 0 && isOnline && 'border-accent/50 text-accent-foreground',
        )}
        title={label}
        role='status'>
        <span
          className={cn(
            'size-2 rounded-full',
            !isOnline ? 'bg-muted-foreground' : waitingCount > 0 ? 'bg-accent' : 'bg-primary',
          )}
          aria-hidden
        />
        {isOnline ? (
          <Wifi className='size-3.5' aria-hidden />
        ) : (
          <WifiOff className='size-3.5' aria-hidden />
        )}
        {label}
      </span>
      {showSyncButton && waitingCount > 0 && isOnline && (
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='min-h-9 gap-1.5'
          disabled={isSyncing}
          onClick={() => void syncNow()}>
          <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} />
          Sync now
        </Button>
      )}
    </div>
  )
}
