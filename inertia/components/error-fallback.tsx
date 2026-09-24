import { AlertCircle, Bug, Home, RefreshCw } from 'lucide-react'
import { useState, type ErrorInfo } from 'react'
import {
  ErrorDetailsDialog,
  type ErrorDetails,
} from '@/components/error-details-dialog'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error: Error | null
  errorInfo?: ErrorInfo | null
  onReset?: () => void
  title?: string
  description?: string
}

export function ErrorFallback({
  error,
  errorInfo = null,
  onReset,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again or go back home. You can view technical details below if you need them.',
}: ErrorFallbackProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const details: ErrorDetails | null = error
    ? {
        message: error.message || String(error),
        stack: error.stack ?? null,
        componentStack: errorInfo?.componentStack ?? null,
      }
    : null

  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-6'>
      <div className='w-full max-w-md text-center'>
        <div className='relative mb-8'>
          <div className='select-none text-[8rem] font-bold leading-none text-muted/20'>!</div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='rounded-full bg-destructive/10 p-6'>
              <AlertCircle className='h-16 w-16 text-destructive' />
            </div>
          </div>
        </div>

        <h1 className='mb-3 text-3xl font-bold tracking-tight'>{title}</h1>
        <p className='mb-8 text-muted-foreground'>{description}</p>

        <div className='flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap'>
          {onReset && (
            <Button
              variant='outline'
              onClick={onReset}
              className='w-full sm:w-auto'
              leftIcon={<RefreshCw className='h-4 w-4' />}>
              Try again
            </Button>
          )}
          <a href='/' className='w-full sm:w-auto'>
            <Button className='w-full' leftIcon={<Home className='h-4 w-4' />}>
              Back to home
            </Button>
          </a>
          {details && (
            <Button
              variant='ghost'
              onClick={() => setIsDetailsOpen(true)}
              className='w-full sm:w-auto'
              leftIcon={<Bug className='h-4 w-4' />}>
              View details
            </Button>
          )}
        </div>
      </div>

      <ErrorDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        details={details}
      />
    </div>
  )
}
