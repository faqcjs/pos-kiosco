import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-bold text-balance">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {action}
    </div>
  )
}
