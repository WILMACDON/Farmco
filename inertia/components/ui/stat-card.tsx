import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HStack } from '@/components/ui/hstack'
import { Stack } from '@/components/ui/stack'

interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export function StatCard({ title, value, description, icon: Icon, children }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <Stack spacing={1}>
          <HStack spacing={2} align='center'>
            {Icon && <Icon className='h-4 w-4 text-muted-foreground' />}
            <CardTitle className='text-sm font-medium'>{title}</CardTitle>
          </HStack>
          {description && <CardDescription>{description}</CardDescription>}
        </Stack>
      </CardHeader>
      <CardContent>
        <div className='font-display text-[34px] font-bold leading-none tracking-tight'>
          {value}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
