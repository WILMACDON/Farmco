import { cn } from '@/lib/utils'

export type StatusTone = 'good' | 'attention' | 'danger' | 'info' | 'neutral'

const toneClasses: Record<StatusTone, string> = {
  good: 'bg-secondary text-primary',
  attention:
    'bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-[color-mix(in_oklab,var(--accent-foreground)_85%,var(--foreground))]',
  danger: 'bg-[color-mix(in_oklab,var(--destructive)_16%,transparent)] text-destructive',
  info: 'bg-[color-mix(in_oklab,var(--info)_18%,transparent)] text-[var(--info)]',
  neutral: 'bg-muted text-muted-foreground',
}

const statusToneMap: Record<string, StatusTone> = {
  pending: 'attention',
  approved: 'info',
  sold: 'good',
  cancelled: 'danger',
  well: 'good',
  sick: 'danger',
  active: 'good',
  inactive: 'neutral',
  disabled: 'neutral',
  needs_review: 'attention',
  'needs review': 'attention',
  add: 'good',
  remove: 'danger',
  move: 'info',
  manager: 'info',
  worker: 'neutral',
  owner: 'good',
}

interface StatusBadgeProps {
  status: string
  label?: string
  tone?: StatusTone
  className?: string
}

function formatLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? statusToneMap[status.toLowerCase()] ?? 'neutral'
  const text = label ?? formatLabel(status)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        toneClasses[resolvedTone],
        className,
      )}>
      <span className='size-2 shrink-0 rounded-full bg-current' aria-hidden />
      {text}
    </span>
  )
}
