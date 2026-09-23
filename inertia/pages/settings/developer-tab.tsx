import { router, usePage } from '@inertiajs/react'
import { Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AppCard } from '@/components/ui/app-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { timeAgo } from '@/lib/date'

export function DeveloperTab({ tokens }: { tokens: any[] }) {
  const { flash } = usePage().props as any
  const [newTokenName, setNewTokenName] = useState('')
  const [expiration, setExpiration] = useState('90days')
  const [isCreating, setIsCreating] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [userClearedToken, setUserClearedToken] = useState(false)

  // Sync token from flash only when we haven't explicitly cleared it (e.g. "Generate Another")
  if (flash?.success?.token && !userClearedToken && createdToken !== flash.success.token) {
    setCreatedToken(flash.success.token)
  }

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTokenName.trim()) return

    setUserClearedToken(false) // Allow next flash token to show
    setIsCreating(true)
    setCreatedToken(null)

    router.post(
      '/settings/api-tokens',
      {
        name: newTokenName,
        expiration,
      },
      {
        onSuccess: () => {
          setNewTokenName('')
          setIsCreating(false)
          toast.success('Token created')
        },
        onError: () => {
          setIsCreating(false)
          toast.error('Failed to create token')
        },
      },
    )
  }

  const handleRevoke = (id: string) => {
    if (confirm('Are you sure you want to revoke this token?')) {
      router.delete(`/settings/api-tokens/${id}`, {
        onSuccess: () => toast.success('Token revoked'),
      })
    }
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast.success('Copied to clipboard')
  }

  return (
    <div className='space-y-6'>
      <AppCard title='Create API Token' description='Generate a new personal access token.'>
        {createdToken ? (
          <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-4'>
            <div className='flex items-center justify-between mb-2'>
              <h4 className='font-medium text-green-800 dark:text-green-300'>
                Token Created Successfully
              </h4>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0'
                onClick={() => copyToken(createdToken)}>
                <Copy className='h-4 w-4' />
              </Button>
            </div>
            <p className='text-sm text-green-700 dark:text-green-400 mb-2'>
              Please copy your new personal access token. You won't be able to see it again!
            </p>
            <div className='bg-white dark:bg-black border p-2 rounded font-mono text-sm break-all'>
              {createdToken}
            </div>
            <div className='mt-4'>
              <Button
                size='sm'
                onClick={() => {
                  setUserClearedToken(true)
                  setCreatedToken(null)
                }}>
                Generate Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateToken} className='flex items-end gap-4'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='token-name'>Token Name</Label>
              <Input
                id='token-name'
                placeholder='My API Token'
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
              />
            </div>
            <div className='w-48 space-y-2'>
              <Label htmlFor='expiration'>Expiration</Label>
              <Select value={expiration} onValueChange={(val) => setExpiration(val || '90days')}>
                <SelectTrigger id='expiration'>
                  <SelectValue placeholder='Select expiration' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='30days'>30 Days</SelectItem>
                  <SelectItem value='60days'>60 Days</SelectItem>
                  <SelectItem value='90days'>90 Days</SelectItem>
                  <SelectItem value='1year'>1 Year</SelectItem>
                  <SelectItem value='never'>Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type='submit' disabled={!newTokenName.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Token'}
            </Button>
          </form>
        )}
      </AppCard>

      <AppCard title='Active Tokens' description='Manage your existing tokens.'>
        {tokens.length === 0 ? (
          <div className='text-center py-6 text-muted-foreground'>
            No active tokens found. Create one above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className='font-medium'>{token.name}</TableCell>
                  <TableCell>
                    {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>{new Date(token.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{token.expiresAt ? timeAgo(token.expiresAt) : 'Never'}</TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive hover:text-destructive'
                      onClick={() => handleRevoke(token.id)}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AppCard>
    </div>
  )
}
