'use client'

import { X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-xl border border-input bg-background px-3.5 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-20 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
          className,
        )}
        {...props}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-11 w-full appearance-none rounded-xl border border-input bg-background px-3.5 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'accent'

const badgeTones: Record<BadgeTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-warning-foreground dark:text-warning',
  danger: 'bg-destructive/12 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  accent: 'bg-accent/20 text-accent-foreground dark:text-accent',
}

export function Badge({
  tone = 'default',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  variant = 'sheet',
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  variant?: 'sheet' | 'center'
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // iOS Safari fix: use class instead of overflow:hidden
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px] animate-in fade-in"
      />
      <div
        className={cn(
          'relative z-10 flex w-full flex-col bg-card text-card-foreground shadow-2xl',
          variant === 'sheet'
            ? 'mt-auto max-h-[92vh] rounded-t-3xl sm:mx-auto sm:my-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl'
            : 'm-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg rounded-3xl',
        )}
      >
        {/* Drag handle for sheet variant on mobile */}
        {variant === 'sheet' && (
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-bold text-balance">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className={cn(
            'shrink-0 border-t border-border px-5 py-4',
            variant === 'sheet' && 'pb-[max(1rem,env(safe-area-inset-bottom))]',
          )}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="text-3xl">{icon}</div>}
      <p className="font-heading text-base font-semibold">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground text-pretty">{description}</p>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon,
  className,
}: {
  label: string
  value: string
  sub?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent'
  icon?: ReactNode
  className?: string
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    accent: 'text-accent',
  }
  return (
    <Card className={cn('p-3 sm:p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={cn('mt-1.5 font-heading text-xl sm:text-2xl font-bold tabular-nums truncate', tones[tone])}>{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  )
}
