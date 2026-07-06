'use client'

import {
  BarChart3,
  Moon,
  NotebookPen,
  Package,
  ShoppingCart,
  Store,
  Sun,
  Truck,
  Wallet,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

export type TabId = 'venta' | 'caja' | 'stock' | 'fiar' | 'proveedores' | 'admin'

interface NavItem {
  id: TabId
  label: string
  short: string
  icon: ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { id: 'venta', label: 'Venta', short: 'Venta', icon: ShoppingCart },
  { id: 'caja', label: 'Caja', short: 'Caja', icon: Wallet },
  { id: 'stock', label: 'Stock', short: 'Stock', icon: Package },
  { id: 'fiar', label: 'Fiar', short: 'Fiar', icon: NotebookPen },
  { id: 'proveedores', label: 'Proveedores', short: 'Prov.', icon: Truck },
  { id: 'admin', label: 'Admin', short: 'Admin', icon: BarChart3 },
]

function CajaStatus({ compact = false }: { compact?: boolean }) {
  const { state } = useStore()
  const open = state.currentShift?.status === 'open'
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border font-semibold',
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        open
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <span className="relative flex size-2">
        {open && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            open ? 'bg-success' : 'bg-destructive',
          )}
        />
      </span>
      {open ? (compact ? 'ABIERTA' : 'CAJA ABIERTA') : compact ? 'CERRADA' : 'CAJA CERRADA'}
    </div>
  )
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { state, toggleTheme } = useStore()
  const dark = state.theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className={cn(
        'flex items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted',
        compact ? 'size-10' : 'size-10',
      )}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}

export function AppShell({
  active,
  onChange,
  children,
}: {
  active: TabId
  onChange: (t: TabId) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-5" />
          </div>
          <div>
            <p className="font-heading text-base font-bold leading-tight">Kiosko POS</p>
            <p className="text-xs text-muted-foreground">Sistema v1.2</p>
          </div>
        </div>

        <div className="mt-4 px-1">
          <CajaStatus />
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-sidebar-border pt-3">
          <span className="px-1 text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4.5" />
            </div>
            <span className="font-heading text-base font-bold">Kiosko POS</span>
          </div>
          <div className="flex items-center gap-2">
            <CajaStatus compact />
            <ThemeToggle compact />
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 backdrop-blur lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
                {item.short}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
