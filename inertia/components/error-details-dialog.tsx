import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ErrorDetails {
  message: string
  stack?: string | null
  componentStack?: string | null
  status?: number | null
  code?: string | null
}

interface ErrorDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: ErrorDetails | null
}

function buildDetailsText(details: ErrorDetails): string {
  const parts = [
    details.status ? `Status: ${details.status}` : null,
    details.code ? `Code: ${details.code}` : null,
    `Message: ${details.message}`,
    details.stack ? `\nStack:\n${details.stack}` : null,
    details.componentStack ? `\nComponent stack:\n${details.componentStack}` : null,
  ]
  return parts.filter(Boolean).join('\n')
}

export function ErrorDetailsDialog({ open, onOpenChange, details }: ErrorDetailsDialogProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!details) return
    try {
      await navigator.clipboard.writeText(buildDetailsText(details))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl gap-0 p-0 overflow-hidden'>
        <DialogHeader className='border-b border-border px-6 py-4'>
          <DialogTitle>Error details</DialogTitle>
          <DialogDescription>
            Technical information about what went wrong. Share this with support if you need help.
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className='max-h-[min(60vh,28rem)] overflow-y-auto'>
            <div className='space-y-4 px-6 py-4 text-left'>
              {(details.status || details.code) && (
                <div className='flex flex-wrap gap-2 text-xs'>
                  {details.status != null && (
                    <span className='rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground'>
                      HTTP {details.status}
                    </span>
                  )}
                  {details.code && (
                    <span className='rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground'>
                      {details.code}
                    </span>
                  )}
                </div>
              )}

              <section className='space-y-1.5'>
                <h3 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  Message
                </h3>
                <pre className='whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground'>
                  {details.message}
                </pre>
              </section>

              {details.stack && (
                <section className='space-y-1.5'>
                  <h3 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    Stack trace
                  </h3>
                  <pre className='whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground'>
                    {details.stack}
                  </pre>
                </section>
              )}

              {details.componentStack && (
                <section className='space-y-1.5'>
                  <h3 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    Component stack
                  </h3>
                  <pre className='whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground'>
                    {details.componentStack}
                  </pre>
                </section>
              )}
            </div>
          </div>
        )}

        <DialogFooter className='border-t border-border px-6 py-4'>
          <Button
            type='button'
            variant='outline'
            onClick={handleCopy}
            leftIcon={
              copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />
            }>
            {copied ? 'Copied' : 'Copy details'}
          </Button>
          <Button type='button' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
