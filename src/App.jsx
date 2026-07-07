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
            Kiosko POS
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

function Screen({ active, setActive }) {
  const { state } = useStore()
  const isAdmin = state.currentUser?.role === 'administrador'

  useEffect(() => {
    if (active === 'admin' && !isAdmin) {
      setActive('venta')
    }
  }, [active, isAdmin, setActive])

  switch (active) {
    case 'venta':
      return <Venta />
    case 'caja':
      return <Caja />
    case 'stock':
      return <Stock />
    case 'fiar':
      return <Clientes />
    case 'proveedores':
      return <Proveedores />
    case 'admin':
      return isAdmin ? <Admin /> : <Venta />
    default:
      return <Venta />
  }
}

function Shell() {
  const [active, setActive] = useState('venta')
  const { state, hydrated } = useStore()

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (!state.currentUser) {
    return <LoginScreen />
  }

  return (
    <AppShell active={active} onChange={setActive}>
      <div className="px-1.5 py-2.5 sm:px-6 lg:px-8 lg:py-8">
        <Screen active={active} setActive={setActive} />
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
