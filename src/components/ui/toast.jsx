'use client'

import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // toast(message, tone?, action?)
  // action = { label: string, onClick: () => void }
  const toast = useCallback((message, tone = 'success', action = null) => {
    const id = Date.now() + Math.random()
    const duration = action ? 4500 : 2800
    setToasts((t) => [...t, { id, message, tone, action }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
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
            <span className="flex-1 text-pretty">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action.onClick(); dismiss(t.id) }}
                className="ml-1 shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors"
              >
                {t.action.label}
              </button>
            )}
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
