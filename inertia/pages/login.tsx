import { AppLogo } from '@/components/app_logo'
import { PublicLayout } from '@/components/layouts/public'
import { Alert, AlertDescription } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password_input'
import { Head, Link, useForm } from '@inertiajs/react'
import { useMemo } from 'react'
import { toast } from 'sonner'

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

  const { data, setData, post, processing, errors: formErrors } = useForm({
    email: 'admin@test.com',
    password: 'password',
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
    <PublicLayout showFooter={false}>
      <Head title='Login' />
      <div className='flex min-h-svh items-center justify-center px-4 py-2'>
        <div className='animate-fade-in-up w-full max-w-sm space-y-2 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5'>
          <div className='flex justify-center'>
            <AppLogo />
          </div>

          <div className='text-center space-y-1'>
            <h1 className='font-display text-xl font-semibold tracking-tight'>Sign in to your account</h1>
            <p className='text-sm text-muted-foreground'>
              Don't have an account?{' '}
              <Link
                href='/signup'
                className='text-primary underline underline-offset-4 hover:text-primary/90'>
                Sign up
              </Link>
            </p>
          </div>

          {errorMessage ? (
            <Alert variant='destructive'>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className='grid grid-cols-2 gap-3'>
            <a href='/github/redirect'>
              <Button type='button' variant='outline' disabled={processing} className='w-full'>
                <img src='/icons/github.svg' alt='GitHub' className='h-4 w-4 text-black' />
                GitHub
              </Button>
            </a>
            <a href='/google/redirect'>
              <Button type='button' variant='outline' disabled={processing} className='w-full'>
                <img src='/icons/google.svg' alt='Google' className='h-4 w-4' />
                Google
              </Button>
            </a>
          </div>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>Or</span>
            </div>
          </div>

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

          <p className='text-center text-sm text-muted-foreground'>
            Forgot your password?{' '}
            <Link
              href='/forgot-password'
              className='text-primary underline underline-offset-4 hover:text-primary/90'>
              Reset password
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
