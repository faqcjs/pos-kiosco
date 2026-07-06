'use client'

import { Camera, Minus, Plus, Search, ShoppingCart, Trash2, X, AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CATEGORIES, CATEGORY_ICON, type CartItem, type Category, type PaymentMethod, type Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PaymentModal } from './payment-modal'
import { ScannerModal } from './scanner-modal'

export function Venta() {
  const { state, completeSale } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'Todos'>('Todos')
  const [quickAmount, setQuickAmount] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = state.products.filter((p) => {
      const matchesCat = category === 'Todos' || p.category === category
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q)
      return matchesCat && matchesQ
    })

    if (!q && category === 'Todos') {
      const salesCount: Record<string, number> = {}
      for (const sale of state.sales) {
        for (const item of sale.items) {
          if (item.productId) {
            salesCount[item.productId] = (salesCount[item.productId] || 0) + item.qty
          }
        }
      }
      return [...matches]
        .sort((a, b) => (salesCount[b.id] || 0) - (salesCount[a.id] || 0))
        .slice(0, 12)
    }

    return matches
  }, [state.products, state.sales, query, category])

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])

  function addProductToCart(p: Product) {
    if (p.stock <= 0) {
      toast(`Sin stock: ${p.name}`, 'error')
      return
    }
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id)
      if (existing) {
        if (existing.qty >= p.stock) {
          toast(`Stock máximo de ${p.name}`, 'error')
          return c
        }
        return c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...c, { id: p.id, productId: p.id, name: p.name, price: p.price, qty: 1 }]
    })
  }

  function changeQty(id: string, delta: number) {
    setCart((c) =>
      c
        .map((i) => {
          if (i.id !== id) return i
          const prod = i.productId ? state.products.find((p) => p.id === i.productId) : null
          let next = i.qty + delta
          if (prod && next > prod.stock) {
            toast(`Stock máximo de ${prod.name}`, 'error')
            next = prod.stock
          }
          return { ...i, qty: next }
        })
        .filter((i) => i.qty > 0),
    )
  }

  function removeItem(id: string) {
    setCart((c) => c.filter((i) => i.id !== id))
  }

  function addQuickAmount() {
    const amount = Number(quickAmount)
    if (!amount || amount <= 0) return
    setCart((c) => [
      ...c,
      { id: `q-${Date.now()}`, name: 'Monto rápido', price: amount, qty: 1 },
    ])
    setQuickAmount('')
  }

  function handleScan(code: string) {
    const prod = state.products.find((p) => p.barcode === code)
    if (prod) {
      addProductToCart(prod)
      toast(`Agregado: ${prod.name}`)
      setScannerOpen(false)
    } else {
      toast(`Código no encontrado: ${code}`, 'error')
    }
  }

  function handleConfirmSale(args: {
    method: PaymentMethod
    customerId?: string
    cashReceived?: number
    change?: number
  }) {
    completeSale({ items: cart, ...args })
    const label =
      args.method === 'efectivo' ? 'Efectivo' : args.method === 'qr' ? 'QR/Transferencia' : 'Fiado'
    toast(`Venta registrada (${label}): ${money(total)}`)
    setCart([])
    setPayOpen(false)
    setMobileCartOpen(false)
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: products */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto o código..."
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            className="h-11 w-11 shrink-0 p-0"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear código"
          >
            <Camera className="size-5" />
          </Button>
        </div>

        {/* category filters */}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(['Todos', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                category === c
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {c !== 'Todos' && <span>{CATEGORY_ICON[c]}</span>}
              {c}
            </button>
          ))}
        </div>

        {/* quick amount */}
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2">
          <span className="text-sm font-medium text-muted-foreground">Monto rápido</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) addQuickAmount()
              }}
              type="number"
              inputMode="numeric"
              placeholder="500"
              className="h-9 pl-7"
            />
          </div>
          <Button className="h-9" onClick={addQuickAmount}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </div>

        {/* product grid */}
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const low = p.stock <= p.minStock
            const out = p.stock <= 0
            return (
              <button
                key={p.id}
                onClick={() => addProductToCart(p)}
                disabled={out}
                className={cn(
                  'flex flex-col rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm disabled:opacity-50',
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{CATEGORY_ICON[p.category]}</span>
                  {out ? (
                    <Badge tone="danger">Sin stock</Badge>
                  ) : low ? (
                    <Badge tone="warning">
                      <AlertTriangle className="size-3" />
                      {p.stock}
                    </Badge>
                  ) : (
                    <Badge tone="muted">{p.stock} u.</Badge>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm font-medium leading-tight">{p.name}</p>
                <p className="mt-1 font-heading text-lg font-bold text-primary">{money(p.price)}</p>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No se encontraron productos.
            </div>
          )}
        </div>
      </div>

      {/* Right: cart (desktop) */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card lg:flex xl:w-96">
        <CartPanel
          cart={cart}
          total={total}
          onChangeQty={changeQty}
          onRemove={removeItem}
          onPay={() => setPayOpen(true)}
        />
      </aside>

      {/* Mobile FAB */}
      {cartCount > 0 && !mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg lg:hidden"
        >
          <ShoppingCart className="size-5" />
          <span>{cartCount}</span>
          <span className="tabular-nums">{money(total)}</span>
        </button>
      )}

      {/* Mobile cart drawer */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 flex flex-col lg:hidden">
          <button
            aria-label="Cerrar carrito"
            className="flex-1 bg-foreground/40 backdrop-blur-[2px]"
            onClick={() => setMobileCartOpen(false)}
          />
          <div className="flex max-h-[85vh] flex-col rounded-t-3xl bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-heading text-lg font-bold">Carrito</h2>
              <button
                onClick={() => setMobileCartOpen(false)}
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <CartPanel
              cart={cart}
              total={total}
              onChangeQty={changeQty}
              onRemove={removeItem}
              onPay={() => setPayOpen(true)}
            />
          </div>
        </div>
      )}

      <ScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetect={handleScan} />
      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        total={total}
        onConfirm={handleConfirmSale}
      />
    </div>
  )
}

function CartPanel({
  cart,
  total,
  onChangeQty,
  onRemove,
  onPay,
}: {
  cart: CartItem[]
  total: number
  onChangeQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onPay: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="font-heading text-lg font-bold">Carrito</h2>
        <Badge tone="muted">{cart.length} items</Badge>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <ShoppingCart className="size-10 opacity-40" />
            <p className="text-sm">El carrito está vacío</p>
          </div>
        ) : (
          cart.map((item) => (
            <Card key={item.id} className="flex items-center gap-3 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{money(item.price)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onChangeQty(item.id, -1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
                  aria-label="Restar"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                <button
                  onClick={() => onChangeQty(item.id, 1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
                  aria-label="Sumar"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="w-16 text-right text-sm font-bold tabular-nums">
                {money(item.price * item.qty)}
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Eliminar"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))
        )}
      </div>
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-heading text-2xl font-bold tabular-nums">{money(total)}</span>
        </div>
        <Button
          onClick={onPay}
          disabled={cart.length === 0}
          className="h-14 w-full bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
        >
          Cobrar {money(total)}
        </Button>
      </div>
    </>
  )
}
