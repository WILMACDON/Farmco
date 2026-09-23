import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, Link } from '@inertiajs/react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Mail,
  Newspaper,
  Server,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useEffect } from 'react'
import { PublicLayout } from '@/components/layouts/public'
import { Button } from '@/components/ui/button'
import { HStack } from '@/components/ui/hstack'

export default function Home(props: SharedProps) {
  useEffect(() => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
    return () => {
      // Revert to user preference on unmount
      const stored = localStorage.getItem('theme')
      const root = document.documentElement
      root.classList.remove('light', 'dark')

      if (stored === 'light') {
        root.classList.add('light')
      } else if (stored === 'dark') {
        root.classList.add('dark')
      } else {
        // System
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
      }
    }
  }, [])

  const isLoggedIn = Boolean(props.isLoggedIn)
  const user = props.user as { role?: string } | null
  const isAdmin = user?.role === 'admin'

  return (
    <PublicLayout
      className='dark bg-background text-foreground selection:bg-purple-500/30'
      hideThemeToggle={true}>
      <Head title='Home' />

      {/* Landing page content */}
      <div className='min-h-screen font-sans'>
        {/* Hero Section */}
        <section className='relative overflow-hidden pt-10 sm:pt-20 pb-20 sm:pb-32'>
          <div className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]'></div>
          <div className='absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/80 to-background' />

          <div className='absolute top-0 left-1/2 -z-10 -translate-x-1/2'>
            <div className='h-[400px] w-[800px] bg-purple-500/20 blur-[120px] rounded-full mix-blend-screen opacity-50' />
          </div>

          <div className='max-w-screen-xl mx-auto px-6'>
            <div className='flex flex-col items-center text-center max-w-4xl mx-auto'>
              <div className='animate-fade-in flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-8 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default'>
                <Sparkles className='h-3.5 w-3.5 text-purple-400' />
                <span className='bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-medium'>
                  New Release
                </span>
                <span className='w-px h-3 bg-white/10 mx-1' />
                <span>AdonisJS + Inertia Starter v2.0</span>
              </div>

              <h1 className='text-5xl sm:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/70 mb-8'>
                Ship faster with a <br className='hidden sm:block' />
                <span className='bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient'>
                  production-ready
                </span>{' '}
                foundation
              </h1>

              <p className='text-lg sm:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed'>
                Auth, teams, notifications, auditing, 2FA, and a blog — wired up with clean UI
                components and sensible defaults so you can focus on your product.
              </p>

              <HStack spacing={4} className='flex-col sm:flex-row w-full sm:w-auto'>
                {isLoggedIn ? (
                  <>
                    <Button
                      size='lg'
                      className='h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                      asChild>
                      <Link href={isAdmin ? '/admin' : '/dashboard'}>
                        Open {isAdmin ? 'admin' : 'dashboard'}{' '}
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </Link>
                    </Button>
                    <Button
                      size='lg'
                      variant='outline'
                      className='h-12 px-8 text-base border-white/10 bg-white/5 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all duration-300'
                      asChild>
                      <Link href='/blog'>Read the blog</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size='lg'
                      className='h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                      asChild>
                      <Link href='/signup'>
                        Create an account <ArrowRight className='ml-2 h-4 w-4' />
                      </Link>
                    </Button>
                    <Button
                      size='lg'
                      variant='outline'
                      className='h-12 px-8 text-base border-white/10 bg-white/5 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all duration-300'
                      asChild>
                      <Link href='/login'>Sign in</Link>
                    </Button>
                  </>
                )}
              </HStack>

              <div className='mt-20 w-full relative group'>
                <div className='absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200'></div>
                <div className='relative rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden shadow-2xl'>
                  <div className='absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent'></div>
                  <div className='grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10'>
                    <Stat
                      label='Security-first'
                      value='2FA + sessions'
                      icon={<ShieldCheck className='w-5 h-5 text-purple-400' />}
                    />
                    <Stat
                      label='Team-ready'
                      value='Invites + roles'
                      icon={<UsersRound className='w-5 h-5 text-pink-400' />}
                    />
                    <Stat
                      label='Admin tools'
                      value='Blog + users'
                      icon={<LayoutDashboard className='w-5 h-5 text-blue-400' />}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='max-w-screen-xl mx-auto px-6 py-24'>
          <div className='mb-16'>
            <h2 className='text-3xl font-bold tracking-tight mb-4'>Everything you need</h2>
            <p className='text-zinc-400 max-w-xl text-lg'>
              A complete starter kit designed to let you hit the ground running. Don't waste time on
              boilerplate.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <FeatureCard
              icon={<ShieldCheck className='h-5 w-5 text-purple-400' />}
              title='Security by default'
              description='Email verification, sessions, and 2FA built-in.'
              bullets={['Password reset', 'Session revoke', 'Two-factor auth']}
            />
            <FeatureCard
              icon={<UsersRound className='h-5 w-5 text-pink-400' />}
              title='Teams that ship'
              description='Create teams, invite members, accept via join page.'
              bullets={['Invites by email', 'Owner/member roles', 'Member directory']}
            />
            <FeatureCard
              icon={<Newspaper className='h-5 w-5 text-blue-400' />}
              title='Blog system'
              description='Posts with cover, tags, category, and dedicated authors.'
              bullets={['Admin CRUD', 'Slugify', 'Public blog pages']}
            />
            <FeatureCard
              icon={<Activity className='h-5 w-5 text-emerald-400' />}
              title='Auditing & activity'
              description='Track important actions for security and compliance.'
              bullets={['Audits table', 'Admin user activity', 'IP/user-agent capture']}
            />
            <FeatureCard
              icon={<Sparkles className='h-5 w-5 text-amber-400' />}
              title='Clean UI primitives'
              description='shadcn/ui components for fast, consistent UI.'
              bullets={['Reusable Button', 'Dialogs & popovers', 'Data tables']}
            />
            <FeatureCard
              icon={<Mail className='h-5 w-5 text-cyan-400' />}
              title='Contact'
              description='A contact form that posts to the API and sends email.'
              bullets={['Contact page', 'Validation', 'Email notification']}
            />
            <FeatureCard
              icon={<CreditCard className='h-5 w-5 text-emerald-500' />}
              title='Billing & Invoices'
              description='Integrated Stripe billing with recurring plans.'
              bullets={['Subscription tiers', 'PDF Invoices', 'Plan management']}
            />
            <FeatureCard
              icon={<Server className='h-5 w-5 text-indigo-400' />}
              title='System Status'
              description='Public health check dashboard to monitor uptime.'
              bullets={['System metrics', 'Database status', 'Service health']}
            />
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className='p-6 flex flex-col items-center text-center hover:bg-white/5 transition-colors'>
      <div className='mb-3 p-2 rounded-lg bg-white/5 ring-1 ring-white/10'>{icon}</div>
      <div className='text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1'>{label}</div>
      <div className='text-lg font-semibold text-white'>{value}</div>
    </div>
  )
}

function ChecklistItem({ children }: { children: string }) {
  return (
    <HStack spacing={3} align='start'>
      <div className='mt-1 p-0.5 rounded-full bg-emerald-500/20'>
        <CheckCircle2 className='h-3 w-3 text-emerald-400 shrink-0' />
      </div>
      <span>{children}</span>
    </HStack>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  bullets,
}: {
  icon: React.ReactNode
  title: string
  description: string
  bullets: string[]
}) {
  return (
    <div className='group relative h-full rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 transition-colors overflow-hidden'>
      <div className='absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
      <div className='relative'>
        <div className='mb-4 inline-flex p-3 rounded-xl bg-white/5 ring-1 ring-white/10 shadow-lg'>
          {icon}
        </div>
        <h3 className='text-lg font-bold mb-2 text-white'>{title}</h3>
        <p className='text-zinc-400 text-sm mb-6 leading-relaxed min-h-[40px]'>{description}</p>

        <div className='space-y-3'>
          {bullets.map((b) => (
            <div key={b} className='flex items-center gap-3 text-sm text-zinc-500'>
              <div className='w-1.5 h-1.5 rounded-full bg-white/20' />
              {b}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
