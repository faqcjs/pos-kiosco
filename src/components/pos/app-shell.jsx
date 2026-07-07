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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { isMockMode } from '@/lib/supabase'
import { Badge } from '@/components/ui/kit'

const NAV = [
  { id: 'venta', label: 'Venta', short: 'Venta', icon: ShoppingCart },
  { id: 'caja', label: 'Caja', short: 'Caja', icon: Wallet },
  { id: 'stock', label: 'Stock', short: 'Stock', icon: Package },
  { id: 'fiar', label: 'Fiar', short: 'Fiar', icon: NotebookPen },
  { id: 'proveedores', label: 'Proveedores', short: 'Prov.', icon: Truck },
  { id: 'admin', label: 'Admin', short: 'Admin', icon: BarChart3 },
]

function CajaStatus({ compact = false }) {
  const { state } = useStore()
  const open = state.currentShift?.status === 'open'

  if (compact) {
    return (
      <div
        title={open ? 'Caja abierta' : 'Caja cerrada'}
        className={cn(
          'mx-auto flex size-9 shrink-0 items-center justify-center rounded-lg border',
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
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border font-semibold px-3 py-1.5 text-sm',
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
      {open ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
    </div>
  )
}

function ThemeToggle({ compact = false }) {
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
}) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('pos-sidebar-collapsed') === 'true'
  })

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('pos-sidebar-collapsed', String(next))
      return next
    })
  }

  const activeLabel = NAV.find((n) => n.id === active)?.label ?? 'Kiosko POS'

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 lg:flex',
          'transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center px-3', collapsed ? 'justify-center' : 'gap-2.5 px-4')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Store className="size-[18px]" />
          </div>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
            )}
          >
            <p className="whitespace-nowrap font-heading text-sm font-bold leading-tight flex items-center gap-1.5">
              Kiosko POS
              <span
                className={cn("size-2 rounded-full", isMockMode ? "bg-amber-500" : "bg-green-500")}
                title={isMockMode ? "Modo Local (Mock)" : "Conectado a Supabase"}
              />
            </p>
            <p className="whitespace-nowrap text-xs text-muted-foreground">Sistema v1.2</p>
          </div>
        </div>

        {/* Caja status */}
        <div className={cn('mt-4 px-3', collapsed ? 'flex justify-center' : '')}>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              collapsed ? 'w-8' : 'w-full',
            )}
          >
            <CajaStatus compact={collapsed} />
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center rounded-xl transition-all duration-150',
                  collapsed ? 'h-10 w-10 mx-auto justify-center' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
              >
                <Icon className={cn('shrink-0', collapsed ? 'size-[18px]' : 'size-5')} />
                <span
                  className={cn(
                    'whitespace-nowrap text-sm font-medium overflow-hidden transition-all duration-300 ease-in-out',
                    collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                  )}
                >
                  {item.label}
                </span>
                {/* Tooltip on collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100 z-50">
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn('flex flex-col gap-2 border-t border-sidebar-border px-2 pt-3', collapsed && 'items-center')}>
          <ThemeToggle />
        </div>

        {/* Collapse toggle — floats on the right edge */}
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className={cn(
            'absolute -right-3 top-8 z-10 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-sm transition-all hover:bg-sidebar-accent hover:text-foreground',
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="size-3.5" />
            : <PanelLeftClose className="size-3.5" />
          }
        </button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4.5" />
            </div>
            <span className="font-heading text-base font-bold">{activeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={isMockMode ? "warning" : "success"} className="text-[10px] px-1.5 py-0.5">
              {isMockMode ? "Mock" : "Supabase"}
            </Badge>
            <CajaStatus compact />
            <ThemeToggle compact />
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
                {item.short}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-4 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
