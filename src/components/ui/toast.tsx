'use client'

import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2800)
  }, [])

  const icons = {
    success: <CheckCircle2 className="size-5 text-success" />,
    error: <XCircle className="size-5 text-destructive" />,
    info: <Info className="size-5 text-primary" />,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-lg animate-in fade-in slide-in-from-top-2',
            )}
          >
            {icons[t.tone]}
            <span className="text-pretty">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
