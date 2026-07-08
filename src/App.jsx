import { useState, useEffect } from 'react'
import { StoreProvider, useStore } from '@/lib/store'
import { ToastProvider } from '@/components/ui/toast'
import { AppShell } from '@/components/pos/app-shell'
import { Venta } from '@/components/pos/venta/venta'
import { Caja } from '@/components/pos/caja/caja'
import { Stock } from '@/components/pos/stock/stock'
import { Clientes } from '@/components/pos/clientes/clientes'
import { Proveedores } from '@/components/pos/proveedores/proveedores'
import { Admin } from '@/components/pos/admin/admin'
import { Card, Input, Label } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

function LoginScreen() {
  const { login } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const success = await login(username, password)
    setLoading(false)
    if (!success) {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-4xl shadow-sm">
            🛒
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight font-heading text-foreground">
            eKiosco
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Iniciá sesión para acceder al sistema
          </p>
        </div>

        <Card className="p-8 shadow-xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(false)
                }}
                placeholder="Nombre de usuario"
                className="h-11 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                placeholder="Contraseña"
                className="h-11 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                Usuario o contraseña incorrectos
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-primary text-base font-bold transition-all hover:bg-primary/95 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function BlockScreen({ currentShift, logout }) {
  const openedBy = currentShift?.openedBy || 'Otro cajero'
  const openedAt = currentShift ? formatDateTime(currentShift.openedAt) : ''

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 text-4xl shadow-sm">
            🔒
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight font-heading text-foreground">
            Caja Bloqueada
          </h2>
        </div>

        <Card className="p-8 shadow-xl border border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Caja en uso por otro cajero. El turno actual fue abierto por <strong className="text-foreground">{openedBy}</strong> el <strong className="text-foreground">{openedAt}</strong>.
          </p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Cerrá el turno desde la cuenta correspondiente antes de poder operar.
          </p>

          <Button
            onClick={logout}
            className="h-11 w-full bg-destructive text-base font-bold transition-all hover:bg-destructive/95 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Cerrar sesión
          </Button>
        </Card>
      </div>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Skeleton (desktop) */}
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-card p-4 space-y-6 lg:flex animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-muted" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
        <div className="h-9 w-full rounded-full bg-muted" />
        <nav className="space-y-3 flex-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded-xl bg-muted" />
          ))}
        </nav>
        <div className="h-12 w-full rounded-xl bg-muted" />
      </aside>

      {/* Main Area Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden animate-pulse">
        {/* Header Skeleton */}
        <header className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-muted lg:hidden" />
            <div className="h-5 w-32 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-16 rounded-full bg-muted" />
            <div className="h-8 w-8 rounded-xl bg-muted" />
          </div>
        </header>

        {/* Content Area Skeleton */}
        <main className="flex-1 overflow-y-auto p-4 space-y-6 lg:p-8">
          <div className="flex justify-between items-center pb-2">
            <div className="space-y-2">
              <div className="h-7 w-48 rounded bg-muted" />
              <div className="h-4 w-72 rounded bg-muted" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-muted" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-border bg-card/40 p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-7 w-7 rounded bg-muted" />
                </div>
                <div className="h-7 w-28 rounded bg-muted" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card/30 p-6 space-y-4">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full rounded-xl bg-muted/65" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

const getHashRoute = () => {
  const hash = window.location.hash.replace('#/', '')
  const valid = ['venta', 'caja', 'stock', 'fiar', 'proveedores', 'admin']
  return valid.includes(hash) ? hash : 'venta'
}

function Screen({ active }) {
  const { state } = useStore()
  const isAdmin = state.currentUser?.role === 'administrador'
  const isRepositor = state.currentUser?.role === 'repositor'

  useEffect(() => {
    if (isRepositor && active !== 'stock' && active !== 'proveedores') {
      window.location.hash = '#/stock'
    } else if (active === 'admin' && !isAdmin) {
      window.location.hash = '#/venta'
    }
  }, [active, isAdmin, isRepositor])

  switch (active) {
    case 'venta':
      return isRepositor ? <Stock /> : <Venta />
    case 'caja':
      return isRepositor ? <Stock /> : <Caja />
    case 'stock':
      return <Stock />
    case 'fiar':
      return isRepositor ? <Stock /> : <Clientes />
    case 'proveedores':
      return <Proveedores />
    case 'admin':
      return isAdmin ? <Admin /> : (isRepositor ? <Stock /> : <Venta />)
    default:
      return isRepositor ? <Stock /> : <Venta />
  }
}

function Shell() {
  const [active, setActive] = useState(getHashRoute)
  const { state, hydrated, logout } = useStore()
  const userRole = state.currentUser?.role

  useEffect(() => {
    const handleHashChange = () => {
      setActive(getHashRoute())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (state.currentUser) {
      if (userRole === 'repositor') {
        const route = getHashRoute()
        if (route !== 'stock' && route !== 'proveedores') {
          window.location.hash = '#/stock'
        }
      } else if (!window.location.hash) {
        window.location.hash = '#/venta'
      }
    }
  }, [userRole, state.currentUser])

  if (!hydrated) {
    return <SkeletonLoader />
  }

  if (!state.currentUser) {
    return <LoginScreen />
  }

  // Shift block checking
  const isShiftActive = !!state.currentShift
  const isShiftOwner = state.currentUser?.name === state.currentShift?.openedBy
  const isBlocked = state.currentUser?.role === 'cajero' && isShiftActive && !isShiftOwner

  if (isBlocked) {
    return <BlockScreen currentShift={state.currentShift} logout={logout} />
  }

  const handleRouteChange = (route) => {
    window.location.hash = `#/${route}`
    setActive(route)
  }

  return (
    <AppShell active={active} onChange={handleRouteChange}>
      <div className="px-1.5 py-2.5 sm:px-6 lg:px-8 lg:py-8">
        <Screen active={active} />
      </div>
    </AppShell>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  )
}
