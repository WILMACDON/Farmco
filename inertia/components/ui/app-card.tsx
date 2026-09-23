import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

export interface AppCardProps {
  title: React.ReactNode
  description?: string
  children: React.ReactNode
  className?: string
}

export function AppCard({ title, description, children, className }: AppCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description != null && description !== '' && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
