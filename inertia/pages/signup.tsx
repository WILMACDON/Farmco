import { Link, router } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { toast } from 'sonner'
import { AuthShell } from '@/components/auth/auth_shell'
import { PasswordInput } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

interface SignupValues {
  fullName: string
  organizationName: string
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
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: (values) => {
      signup(values)
    },
  })

  return (
    <AuthShell
      title='Sign Up'
      heading='Create your farm account'
      panelLine='Set up once. Record every day.'
      description={
        <>
          Already have an account?{' '}
          <Link
            href='/login'
            className='text-primary underline underline-offset-4 hover:text-primary/90'>
            Sign in
          </Link>
        </>
      }
      footer={
        <p className='text-center text-sm text-muted-foreground'>
          By signing up, you agree to our{' '}
          <Link
            href='/terms'
            className='text-primary underline underline-offset-4 hover:text-primary/90'>
            Terms of Service
          </Link>
        </p>
      }>
      <div className='grid grid-cols-1 gap-3'>
        <a href='/google/redirect'>
          <Button type='button' variant='outline' disabled={isPending} className='w-full'>
            <img src='/icons/google.svg' alt='Google' className='h-4 w-4' />
            Continue with Google
          </Button>
        </a>
      </div>

      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-card px-2 text-muted-foreground'>Or</span>
        </div>
      </div>

      <form onSubmit={formik.handleSubmit} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='fullName'>Full name</Label>
          <Input
            id='fullName'
            type='text'
            {...formik.getFieldProps('fullName')}
            required
            placeholder='Ada Okonkwo'
            className='min-h-12'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='organizationName'>Farm / organization name</Label>
          <Input
            id='organizationName'
            type='text'
            {...formik.getFieldProps('organizationName')}
            required
            minLength={2}
            placeholder='Greenfield Poultry'
            className='min-h-12'
          />
          <p className='text-xs text-muted-foreground'>
            This becomes your farm account name. You can change it later in settings.
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            {...formik.getFieldProps('email')}
            required
            placeholder='you@example.com'
            className='min-h-12'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>Password</Label>
          <PasswordInput
            id='password'
            {...formik.getFieldProps('password')}
            required
            placeholder='••••••••'
            className='min-h-12'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='confirmPassword'>Confirm password</Label>
          <PasswordInput
            id='confirmPassword'
            required
            placeholder='••••••••'
            {...formik.getFieldProps('confirmPassword')}
            className='min-h-12'
          />
        </div>

        <Button
          type='submit'
          className='w-full min-h-11'
          isLoading={isPending}
          loadingText='Creating account…'>
          Sign up
        </Button>
      </form>
    </AuthShell>
  )
}
