import { useState } from 'react'
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

function AdminGate() {
  const { state, loginAdmin } = useStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  if (state.isAdminAuthenticated) {
    return <Admin />
  }

  const handleLogin = (e) => {
    e.preventDefault()
    const success = loginAdmin(password)
    if (success) {
      setError(false)
      setPassword('')
    } else {
      setError(true)
    }
  }

  return (
    <div className="mx-auto max-w-md mt-10">
      <Card className="p-8 space-y-5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto text-3xl">
          ⚙️
        </div>
        <div className="text-center">
          <h2 className="font-heading text-lg font-bold">Acceso de Administrador</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá la contraseña para acceder al panel de administración.
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="admin-pass">Contraseña</Label>
            <Input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="Contraseña"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-destructive font-semibold">Contraseña incorrecta</p>}
          </div>
          <Button type="submit" className="h-11 w-full bg-primary text-base font-bold">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  )
}

function Screen({ active }) {
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
      return <AdminGate />
    default:
      return <Venta />
  }
}

function Shell() {
  const [active, setActive] = useState('venta')
  const { hydrated } = useStore()

  return (
    <AppShell active={active} onChange={setActive}>
      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {hydrated ? (
          <Screen active={active} />
        ) : (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}
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
