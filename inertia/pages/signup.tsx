import { AppLogo } from '@/components/app_logo'
import { PublicLayout } from '@/components/layouts/public'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Head, Link, router } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/ui'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

interface SignupValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export default function SignUp() {
  const { mutate: signup, isPending } = useMutation({
    mutationFn: (values: SignupValues) => api.post('/auth/signup', values),
    onSuccess: () => {
      toast.success('Account created successfully!', {
        description: 'Redirecting to login...',
      })
      setTimeout(() => {
        router.visit('/login')
      }, 1000)
    },
    onError: (err: ServerErrorResponse) => {
      const error = serverErrorResponder(err)
      toast.error(error || 'Failed to create account. Please try again.')
    },
  })

  const formik = useFormik<SignupValues>({
    initialValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: (values) => {
      signup(values)
    },
  })

  return (
    <PublicLayout showFooter={false}>
      <Head title='Sign Up' />
      <div className='flex min-h-svh items-center justify-center px-4 py-2'>
        <div className='animate-fade-in-up w-full max-w-sm space-y-2 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5'>
          <div className='flex justify-center'>
            <AppLogo />
          </div>

          {/* Heading */}
          <div className='text-center space-y-1'>
            <h1 className='font-display text-xl font-semibold tracking-tight'>Create your account</h1>
            <p className='text-sm text-muted-foreground'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-primary underline underline-offset-4 hover:text-primary/90'>
                Sign in
              </Link>
            </p>
          </div>

          {/* OAuth buttons */}
          <div className='grid grid-cols-2 gap-3'>
            <a href='/github/redirect'>
              <Button type='button' variant='outline' disabled={isPending} className='w-full'>
                <img src='/icons/github.svg' alt='GitHub' className='h-4 w-4' />
                GitHub
              </Button>
            </a>
            <a href='/google/redirect'>
              <Button type='button' variant='outline' disabled={isPending} className='w-full'>
                <img src='/icons/google.svg' alt='Google' className='h-4 w-4' />
                Google
              </Button>
            </a>
          </div>

          {/* Divider */}
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>Or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={formik.handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='fullName'>Full Name</Label>
              <Input
                id='fullName'
                type='text'
                {...formik.getFieldProps('fullName')}
                required
                placeholder='John Doe'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                {...formik.getFieldProps('email')}
                required
                placeholder='you@example.com'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <PasswordInput
                id='password'
                {...formik.getFieldProps('password')}
                required
                placeholder='••••••••'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <PasswordInput
                id='confirmPassword'
                required
                placeholder='••••••••'
                {...formik.getFieldProps('confirmPassword')}
              />
            </div>

            <Button
              type='submit'
              className='w-full'
              isLoading={isPending}
              loadingText='Creating account…'>
              Sign up
            </Button>
          </form>

          {/* Footer */}
          <p className='text-center text-sm text-muted-foreground'>
            By signing up, you agree to our{' '}
            <Link
              href='/terms'
              className='text-primary underline underline-offset-4 hover:text-primary/90'>
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
