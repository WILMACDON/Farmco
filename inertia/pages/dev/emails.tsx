import { Head, Link } from '@inertiajs/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'
import { cn } from '@/lib/utils'

interface DevEmailSummary {
  id: string
  type: string
  subject?: string
  to?: string
  timestamp: string
  failed: boolean
}

interface DevEmailDetail {
  id: string
  type: string
  data: {
    subject?: string
    email?: string
    body?: string
  }
  logInfo: {
    from?: string
    replyTo?: string
    to?: string
    subject?: string
  }
  timestamp: string
  createdAt: string
  failed?: boolean
  error?: string
}

export default function DevEmailsPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['dev-emails'],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; emails: DevEmailSummary[] }>('/dev/emails')
      return data
    },
  })

  const detailQuery = useQuery({
    queryKey: ['dev-emails', selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await api.get<DevEmailDetail>(`/dev/emails/${selectedId}`)
      return data
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/dev/emails'),
    onSuccess: () => {
      setSelectedId(null)
      void queryClient.invalidateQueries({ queryKey: ['dev-emails'] })
      toast.success('Cleared cached emails')
    },
    onError: (err: ServerErrorResponse) => {
      toast.error(serverErrorResponder(err) || 'Failed to clear emails')
    },
  })

  const emails = listQuery.data?.emails ?? []
  const selected = detailQuery.data
  const htmlBody = selected?.data?.body

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <Head title='Dev emails' />
      <div className='mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='sm' asChild>
              <Link href='/dashboard'>
                <ArrowLeft className='mr-1 h-4 w-4' />
                Back
              </Link>
            </Button>
            <div>
              <h1 className='font-display text-xl font-semibold tracking-tight'>Dev emails</h1>
              <p className='text-sm text-muted-foreground'>
                Development inbox ({listQuery.data?.total ?? 0} captured)
              </p>
            </div>
          </div>
          <Button
            variant='outline'
            size='sm'
            disabled={clearMutation.isPending || emails.length === 0}
            onClick={() => clearMutation.mutate()}>
            <Trash2 className='mr-1 h-4 w-4' />
            Clear all
          </Button>
        </div>

        <div className='grid gap-4 md:grid-cols-[320px_1fr]'>
          <div className='overflow-hidden rounded-lg border border-border bg-card'>
            {listQuery.isLoading ? (
              <p className='p-4 text-sm text-muted-foreground'>Loading…</p>
            ) : emails.length === 0 ? (
              <div className='flex flex-col items-center gap-2 p-8 text-center text-muted-foreground'>
                <Mail className='h-8 w-8 opacity-40' />
                <p className='text-sm'>No emails captured yet. Trigger a mail flow to see them here.</p>
              </div>
            ) : (
              <ul className='divide-y divide-border'>
                {emails.map((email) => (
                  <li key={email.id}>
                    <button
                      type='button'
                      onClick={() => setSelectedId(email.id)}
                      className={cn(
                        'w-full px-3 py-3 text-left transition-colors hover:bg-muted/60',
                        selectedId === email.id && 'bg-muted',
                      )}>
                      <div className='flex items-start justify-between gap-2'>
                        <p className='truncate text-sm font-medium'>
                          {email.subject || '(no subject)'}
                        </p>
                        {email.failed && (
                          <span className='shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive'>
                            failed
                          </span>
                        )}
                      </div>
                      <p className='mt-0.5 truncate text-xs text-muted-foreground'>{email.to}</p>
                      <p className='mt-1 text-[11px] text-muted-foreground'>
                        {email.type} · {new Date(email.timestamp).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className='min-h-[480px] overflow-hidden rounded-lg border border-border bg-card'>
            {!selectedId ? (
              <div className='flex h-full min-h-[480px] items-center justify-center p-8 text-sm text-muted-foreground'>
                Select an email to preview
              </div>
            ) : detailQuery.isLoading ? (
              <p className='p-4 text-sm text-muted-foreground'>Loading preview…</p>
            ) : selected ? (
              <div className='flex h-full min-h-[480px] flex-col'>
                <div className='space-y-1 border-b border-border p-4'>
                  <p className='text-sm font-medium'>
                    {selected.data.subject || selected.logInfo.subject || '(no subject)'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    To: {selected.data.email || selected.logInfo.to || '—'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    From: {selected.logInfo.from || '—'} · Reply-To:{' '}
                    {selected.logInfo.replyTo || '—'}
                  </p>
                  {selected.failed && selected.error && (
                    <p className='text-xs text-destructive'>Error: {selected.error}</p>
                  )}
                </div>
                {htmlBody ? (
                  <iframe
                    title='Email preview'
                    sandbox=''
                    srcDoc={htmlBody}
                    className='h-[min(70vh,720px)] w-full flex-1 bg-white'
                  />
                ) : (
                  <p className='p-4 text-sm text-muted-foreground'>No HTML body available.</p>
                )}
              </div>
            ) : (
              <p className='p-4 text-sm text-muted-foreground'>Email not found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
