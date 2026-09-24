import { Link, useForm } from '@inertiajs/react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { AuthShell } from '@/components/auth/auth_shell'
import { Alert, AlertDescription } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password_input'

interface LoginProps {
  errors: { message?: string }
}

function getRedirectFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return null
  return redirect
}

export default function Login({ errors }: LoginProps) {
  const intendedRedirect = useMemo(() => getRedirectFromUrl(), [])

  const {
    data,
    setData,
    post,
    processing,
    errors: formErrors,
  } = useForm({
    email: 'test@gmail.com',
    password: 'test123',
    remember: false,
    referrer: intendedRedirect ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/login', {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Welcome back!', { description: 'You have been logged in successfully.' })
      },
      onError: () => {
        toast.error('Invalid email or password')
      },
    })
  }

  const errorMessage = errors?.message || (formErrors as { message?: string })?.message

  return (
    <AuthShell
      title='Login'
      heading='Sign in to your account'
      description={
        <>
          Don't have an account?{' '}
          <Link
            href='/signup'
            className='text-primary underline underline-offset-4 hover:text-primary/90'>
            Sign up
          </Link>
        </>
      }
      footer={
        <p className='text-center text-sm text-muted-foreground'>
          Forgot your password?{' '}
          <Link
            href='/forgot-password'
            className='text-primary underline underline-offset-4 hover:text-primary/90'>
            Reset password
          </Link>
        </p>
      }>
      {errorMessage ? (
        <Alert variant='destructive'>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            value={data.email}
            onChange={(e) => setData('email', e.target.value)}
            required
            placeholder='you@example.com'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>Password</Label>
          <PasswordInput
            id='password'
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
            required
            placeholder='••••••••'
          />
        </div>

        <div className='flex items-center space-x-2'>
          <Checkbox
            id='remember'
            checked={data.remember}
            onCheckedChange={(checked) => setData('remember', Boolean(checked))}
          />
          <Label htmlFor='remember' className='text-sm font-normal'>
            Remember me
          </Label>
        </div>

        <Button
          type='submit'
          className='w-full'
          disabled={processing}
          isLoading={processing}
          loadingText='Signing in…'>
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
