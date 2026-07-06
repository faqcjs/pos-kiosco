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
      return <Admin />
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
