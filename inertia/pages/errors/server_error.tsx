import { Head, Link, router } from '@inertiajs/react'
import { AlertCircle, ArrowLeft, Bug, Home, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  ErrorDetailsDialog,
  type ErrorDetails,
} from '@/components/error-details-dialog'
import { PublicLayout } from '@/components/layouts/public'
import { Button } from '@/components/ui/button'

interface ServerErrorProps {
  error: {
    message?: string
    code?: string
    status?: number
    stack?: string
  }
}

export default function ServerError({ error }: ServerErrorProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const details: ErrorDetails | null = error?.message
    ? {
        message: error.message,
        code: error.code ?? null,
        status: error.status ?? 500,
        stack: error.stack ?? null,
      }
    : null

  return (
    <PublicLayout>
      <Head title='Server Error' />
      <div className='flex flex-1 items-center justify-center p-6'>
        <div className='w-full max-w-md text-center'>
          <div className='relative mb-8'>
            <div className='select-none text-[12rem] font-bold leading-none text-muted/20'>500</div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='rounded-full bg-destructive/10 p-6'>
                <AlertCircle className='h-16 w-16 text-destructive' />
              </div>
            </div>
          </div>

          <h1 className='mb-3 text-3xl font-bold tracking-tight'>Server error</h1>
          <p className='mb-8 text-muted-foreground'>
            Something went wrong on our end. Try again in a moment, or view details if you need to
            report the issue.
          </p>

          <div className='flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap'>
            <Button
              variant='outline'
              onClick={() => router.reload()}
              className='w-full sm:w-auto'
              leftIcon={<RefreshCw className='h-4 w-4' />}>
              Try again
            </Button>
            <Button
              variant='outline'
              onClick={() => router.visit(-1 as unknown as string)}
              className='w-full sm:w-auto'
              leftIcon={<ArrowLeft className='h-4 w-4' />}>
              Go back
            </Button>
            <Link href='/' className='w-full sm:w-auto'>
              <Button className='w-full' leftIcon={<Home className='h-4 w-4' />}>
                Back to home
              </Button>
            </Link>
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
      </div>

      <ErrorDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        details={details}
      />
    </PublicLayout>
  )
}
