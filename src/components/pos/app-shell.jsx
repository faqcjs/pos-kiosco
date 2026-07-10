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
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { isMockMode } from '@/lib/supabase'
import { Badge, Modal } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'

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
  const toast = useToast()
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast('¡Conexión restablecida! Tenés datos locales listos para sincronizar.', 'info')
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast('Sin conexión a internet. Operando en Modo Offline.', 'warning')
    }
    const handleSyncCompleted = () => {
      toast('¡Sincronización completa! Todos los datos offline fueron guardados.', 'success')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-sync-completed', handleSyncCompleted)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-sync-completed', handleSyncCompleted)
    }
  }, [toast])

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('pos-sidebar-collapsed') === 'true'
  })

  const {
    state,
    logout,
    retryFailedSale,
    discardFailedSale,
    retryFailedAction,
    discardFailedAction,
    clearFailedSalesQueue,
    clearFailedActionsQueue,
    syncOfflineData,
  } = useStore()

  const [failedModalOpen, setFailedModalOpen] = useState(false)

  const pendingSalesCount = state.offlineSalesQueue?.length || 0
  const pendingActionsCount = state.offlineActionsQueue?.length || 0
  const pendingSyncCount = pendingSalesCount + pendingActionsCount
  const hasPendingSync = pendingSyncCount > 0
  const isSyncing = state.isSyncing

  // Warn user before closing window with unsynced local data
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const pendingCount = (state?.offlineSalesQueue?.length || 0) + (state?.offlineActionsQueue?.length || 0)
      if (pendingCount > 0) {
        e.preventDefault()
        e.returnValue = 'Tenés transacciones sin guardar en la nube. Si salís ahora se podrían perder los datos locales.'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state?.offlineSalesQueue, state?.offlineActionsQueue])

  const failedSales = state.failedSalesQueue || []
  const failedActions = state.failedActionsQueue || []
  const failedCount = failedSales.length + failedActions.length
  const hasFailedTransactions = failedCount > 0

  const getCustomerName = (id) => {
    return state.customers?.find(c => c.id === id)?.name || id
  }
  const getSupplierName = (id) => {
    return state.suppliers?.find(s => s.id === id)?.name || id
  }

  const handleDiscard = (item) => {
    if (item.type) {
      discardFailedAction(item.id)
    } else {
      discardFailedSale(item.id)
    }
  }

  const handleRetry = (item) => {
    if (item.type) {
      retryFailedAction(item)
    } else {
      retryFailedSale(item)
    }
  }

  const handleClearAll = () => {
    clearFailedSalesQueue()
    clearFailedActionsQueue()
    setFailedModalOpen(false)
    toast('Todos los errores han sido descartados.')
  }

  const combinedFailed = [
    ...failedSales.map(s => ({ ...s, isSale: true })),
    ...failedActions.map(a => ({ ...a, isAction: true }))
  ].sort((a, b) => {
    const dateA = new Date(a.failedAt || a.date || (a.payload && a.payload.date)).getTime()
    const dateB = new Date(b.failedAt || b.date || (b.payload && b.payload.date)).getTime()
    return dateB - dateA
  })

  function formatActionType(type) {
    switch (type) {
      case 'ADD_CUSTOMER': return 'Agregar Cliente'
      case 'REGISTER_CUSTOMER_PAYMENT': return 'Pago de Cuenta (Cliente)'
      case 'ADD_SUPPLIER': return 'Agregar Proveedor'
      case 'RECEIVE_GOODS': return 'Ingreso de Mercadería'
      case 'REGISTER_SUPPLIER_PAYMENT': return 'Pago a Proveedor'
      default: return type
    }
  }

  const filteredNav = NAV.filter((item) => {
    const role = state.currentUser?.role
    if (role === 'repositor') {
      return item.id === 'stock' || item.id === 'proveedores'
    }
    if (item.id === 'admin') {
      return role !== 'cajero'
    }
    return true
  })

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('pos-sidebar-collapsed', String(next))
      return next
    })
  }

  const activeLabel = filteredNav.find((n) => n.id === active)?.label ?? 'eKiosco'

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
              'transition-all duration-300 ease-in-out',
              collapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-[180px] opacity-100',
            )}
          >
            <p className="whitespace-nowrap font-heading text-sm font-bold leading-tight flex items-center gap-1.5">
              eKiosco
              <span
                className={cn(
                  "size-2 rounded-full",
                  !isOnline ? "bg-destructive animate-pulse" : (isMockMode ? "bg-amber-500" : "bg-green-500")
                )}
                title={!isOnline ? "Sin conexión (Modo Offline)" : (isMockMode ? "Modo Local (Mock)" : "Conectado a Supabase")}
              />
            </p>
            <p className="whitespace-nowrap text-xs text-muted-foreground">Sistema v1.2</p>
          </div>
        </div>

        {!isOnline && !collapsed && (
          <div className="mx-4 mt-3 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-center text-xs font-bold text-destructive animate-pulse">
            Modo Offline
          </div>
        )}

        {hasFailedTransactions && (
          collapsed ? (
            <button
              onClick={() => setFailedModalOpen(true)}
              title="Errores de sincronización"
              className="mx-auto mt-3 flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive bg-destructive/15 text-destructive hover:bg-destructive hover:text-white transition-colors cursor-pointer"
            >
              ⚠️
            </button>
          ) : (
            <button
              onClick={() => setFailedModalOpen(true)}
              className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive border-dashed hover:bg-destructive hover:text-white px-3 py-2 text-xs font-bold text-destructive cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚠️</span>
                <span>Errores de sync</span>
              </div>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {failedCount}
              </span>
            </button>
          )
        )}

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
          {filteredNav.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center rounded-xl transition-all duration-300 ease-in-out',
                  collapsed ? 'h-10 w-10 mx-auto justify-center px-0' : 'h-10 w-full justify-start px-3 gap-3 hover:translate-x-1',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
              >
                <Icon className={cn('shrink-0', collapsed ? 'size-[18px]' : 'size-5')} />
                <span
                  className={cn(
                    'whitespace-nowrap text-sm font-medium transition-all duration-300 ease-in-out',
                    collapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-[180px] opacity-100',
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

        <div className={cn('flex flex-col gap-3 border-t border-sidebar-border px-3 pt-3 pb-2 transition-all duration-300 ease-in-out', collapsed && 'items-center px-2')}>
          {hasPendingSync && (
            <button
              disabled={!isOnline || isSyncing}
              onClick={syncOfflineData}
              className={cn(
                "flex items-center rounded-xl border transition-all duration-300 active:scale-[0.98]",
                collapsed 
                  ? "size-10 justify-center px-0 relative border-amber-200 dark:border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "h-10 px-3 py-2.5 text-xs font-bold gap-2 w-full border-amber-200 dark:border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
                !isOnline && "border-muted bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
              )}
              title={!isOnline ? "Conectate a internet para sincronizar" : "Sincronizar datos locales ahora"}
            >
              <RefreshCw className={cn("size-4 shrink-0", isSyncing && "animate-spin")} />
              {!collapsed && (
                <span className="truncate flex-1 text-left">
                  {isSyncing ? "Sincronizando..." : `Subir datos (${pendingSyncCount})`}
                </span>
              )}
              {collapsed && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                  {pendingSyncCount}
                </span>
              )}
            </button>
          )}
          <div
            className={cn(
              "flex flex-col gap-1 text-xs transition-all duration-300 ease-in-out origin-top",
              collapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-16 opacity-100"
            )}
          >
            <span className="font-semibold text-foreground truncate">{state.currentUser?.name}</span>
            <div className="flex items-center gap-1">
              <Badge tone={state.currentUser?.role === 'administrador' ? 'default' : (state.currentUser?.role === 'repositor' ? 'accent' : 'muted')} className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                {state.currentUser?.role === 'administrador' ? 'Administrador' : (state.currentUser?.role === 'repositor' ? 'Repositor' : 'Cajero')}
              </Badge>
            </div>
          </div>
          <div className={cn("flex items-center justify-between gap-2 transition-all duration-300 ease-in-out", collapsed && "flex-col w-full")}>
            <ThemeToggle compact={collapsed} />
            <button
              onClick={logout}
              title="Cerrar sesión"
              className={cn(
                "flex items-center justify-center rounded-xl border border-border bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 ease-in-out",
                collapsed ? "size-10 px-0" : "h-10 px-3 py-2.5 text-xs font-semibold gap-1.5 flex-1"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span
                className={cn(
                  "truncate transition-all duration-300 ease-in-out",
                  collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[100px] opacity-100"
                )}
              >
                Cerrar sesión
              </span>
            </button>
          </div>
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="size-4.5" />
              </div>
              <span className="font-heading text-base font-bold">{activeLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {hasFailedTransactions && (
                <button
                  onClick={() => setFailedModalOpen(true)}
                  className="flex size-9 items-center justify-center rounded-xl border border-destructive bg-destructive/10 text-destructive relative mr-1"
                  aria-label="Ver errores de sincronización"
                >
                  <span className="text-base">⚠️</span>
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-white animate-pulse">
                    {failedCount}
                  </span>
                </button>
              )}
              {!isOnline ? (
                <Badge tone="danger" className="text-[10px] px-1.5 py-0.5 animate-pulse">
                  Offline
                </Badge>
              ) : (
                <Badge tone={isMockMode ? "warning" : "success"} className="text-[10px] px-1.5 py-0.5">
                  {isMockMode ? "Mock" : "Supabase"}
                </Badge>
              )}
              {hasPendingSync && (
                <button
                  disabled={!isOnline || isSyncing}
                  onClick={syncOfflineData}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95",
                    !isOnline
                      ? "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                      : "border-amber-200 dark:border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                  )}
                  title={!isOnline ? "Conectate a internet para sincronizar" : "Sincronizar datos locales ahora"}
                >
                  <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
                  <span>{pendingSyncCount}</span>
                </button>
              )}
              <CajaStatus compact />
              <ThemeToggle compact />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{state.currentUser?.name}</span>
              <Badge tone={state.currentUser?.role === 'administrador' ? 'default' : (state.currentUser?.role === 'repositor' ? 'accent' : 'muted')} className="text-[9px] px-1.5 py-0.5">
                {state.currentUser?.role === 'administrador' ? 'Administrador' : (state.currentUser?.role === 'repositor' ? 'Repositor' : 'Cajero')}
              </Badge>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 font-bold text-destructive hover:text-destructive/80 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden",
          filteredNav.length === 2 ? "grid-cols-2" : (filteredNav.length === 5 ? "grid-cols-5" : "grid-cols-6")
        )}>
          {filteredNav.map((item) => {
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
      {/* Modal de Transacciones Fallidas */}
      <Modal
        open={failedModalOpen}
        onClose={() => setFailedModalOpen(false)}
        title="Errores de Sincronización Offline"
        footer={
          <div className="flex justify-between w-full">
            {failedCount > 0 && (
              <button
                onClick={handleClearAll}
                className="rounded-lg border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
              >
                Descartar todos
              </button>
            )}
            <button
              onClick={() => setFailedModalOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors cursor-pointer ml-auto"
            >
              Cerrar
            </button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {combinedFailed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <span className="text-3xl mb-2">🎉</span>
              <p className="text-sm font-semibold">No hay transacciones fallidas</p>
              <p className="text-xs">Todas tus operaciones offline se sincronizaron con éxito.</p>
            </div>
          ) : (
            combinedFailed.map((item) => {
              const isSale = item.isSale
              const dateVal = item.failedAt || item.date || item.payload?.date
              const displayDate = dateVal ? new Date(dateVal).toLocaleString() : 'Fecha desconocida'
              
              return (
                <div key={item.id} className="rounded-xl border border-border p-4 bg-card text-foreground space-y-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {isSale ? 'Venta Offline' : formatActionType(item.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">{displayDate}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-destructive/10 text-destructive rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                      Error de Sync
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {isSale ? (
                      <>
                        <div>
                          <span className="font-semibold text-foreground">Productos:</span>{' '}
                          {item.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Total:</span> {money(item.total)} ({item.method === 'efectivo' ? 'Efectivo' : item.method === 'qr' ? 'QR' : 'Fiado'})
                        </div>
                      </>
                    ) : (
                      <>
                        {item.type === 'REGISTER_CUSTOMER_PAYMENT' && (
                          <>
                            <div>
                              <span className="font-semibold text-foreground">Cliente:</span> {getCustomerName(item.payload?.customerId)}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">Monto:</span> {money(item.payload?.amount)}
                            </div>
                          </>
                        )}
                        {item.type === 'RECEIVE_GOODS' && (
                          <>
                            <div>
                              <span className="font-semibold text-foreground">Proveedor:</span> {getSupplierName(item.payload?.supplierId)}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">Monto:</span> {money(item.payload?.amount)} ({item.payload?.paidCash ? 'Pago Contado' : 'A Cuenta'})
                            </div>
                            {item.payload?.detail && (
                              <div>
                                <span className="font-semibold text-foreground">Detalle:</span> {item.payload?.detail}
                              </div>
                            )}
                          </>
                        )}
                        {item.type === 'REGISTER_SUPPLIER_PAYMENT' && (
                          <>
                            <div>
                              <span className="font-semibold text-foreground">Proveedor:</span> {getSupplierName(item.payload?.supplierId)}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">Monto:</span> {money(item.payload?.amount)} ({item.payload?.fromCash ? 'Caja' : 'A Cuenta'})
                            </div>
                          </>
                        )}
                        {item.type === 'ADD_CUSTOMER' && (
                          <>
                            <div>
                              <span className="font-semibold text-foreground">Nombre:</span> {item.payload?.name}
                            </div>
                            {item.payload?.phone && (
                              <div>
                                <span className="font-semibold text-foreground">Teléfono:</span> {item.payload?.phone}
                              </div>
                            )}
                          </>
                        )}
                        {item.type === 'ADD_SUPPLIER' && (
                          <>
                            <div>
                              <span className="font-semibold text-foreground">Nombre:</span> {item.payload?.name}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="bg-destructive/5 text-destructive border border-destructive/10 rounded-lg p-2.5 text-xs font-sans break-words">
                    <span className="font-bold">Motivo:</span> {item.error || 'Error desconocido'}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleDiscard(item)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={() => handleRetry(item)}
                      className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Modal>
    </div>
  )
}
