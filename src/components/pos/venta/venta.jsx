'use client'

import { Camera, Minus, Plus, Search, ShoppingCart, Trash2, X, AlertTriangle, PanelRightClose, PanelRightOpen, Flame } from 'lucide-react'
import { useMemo, useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CATEGORIES, CATEGORY_ICON } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PaymentModal } from './payment-modal'
import { ScannerModal } from './scanner-modal'

const LOCAL_CATEGORIES = ['Todos', 'Más Vendidos', ...CATEGORIES]
const LOCAL_CATEGORY_ICON = {
  ...CATEGORY_ICON,
  'Más Vendidos': '🔥'
}

export function Venta() {
  const { state, completeSale, toggleMostSold, setCart } = useStore()
  const cart = state.cart
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [quickAmount, setQuickAmount] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [showQuickAmount, setShowQuickAmount] = useState(false)
  const [cartCollapsed, setCartCollapsed] = useState(() => {
    return localStorage.getItem('pos-cart-collapsed') === 'true'
  })
  const [floatingEffects, setFloatingEffects] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const toggleCartCollapsed = () => {
    setCartCollapsed((c) => {
      const next = !c
      localStorage.setItem('pos-cart-collapsed', String(next))
      return next
    })
  }

  const categoryContainerRef = useRef(null)

  useEffect(() => {
    const container = categoryContainerRef.current
    if (!container) return

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        container.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const salesCount = useMemo(() => {
    const counts = {}
    for (const sale of state.sales || []) {
      for (const item of sale.items || []) {
        if (item.productId) {
          counts[item.productId] = (counts[item.productId] || 0) + item.qty
        }
      }
    }
    return counts
  }, [state.sales])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = state.products.filter((p) => {
      const matchesCat =
        category === 'Todos' ||
        (category === 'Más Vendidos' && p.isMostSold) ||
        p.category === category
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q)
      return matchesCat && matchesQ
    })

    if (category === 'Más Vendidos') {
      return [...matches].sort((a, b) => {
        const countA = salesCount[a.id] || 0
        const countB = salesCount[b.id] || 0
        if (countB !== countA) {
          return countB - countA
        }
        return a.name.localeCompare(b.name)
      })
    }

    if (!q && category === 'Todos') {
      return [...matches]
        .sort((a, b) => (salesCount[b.id] || 0) - (salesCount[a.id] || 0))
        .slice(0, 12)
    }

    return matches
  }, [state.products, salesCount, query, category])

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])

  const isShiftOpen = state.currentShift?.status === 'open'

  if (!isShiftOpen) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center space-y-5">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-warning/10 text-warning mx-auto text-3xl">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-lg font-bold">Caja cerrada</h2>
            <p className="text-sm text-muted-foreground">
              Para realizar una venta, primero debes registrar la apertura de caja en la sección de <b>Caja</b>.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  function addProductToCart(p) {
    if (p.stock <= 0) {
      toast(`Sin stock: ${p.name}`, 'error')
      return
    }

    const effectId = `${Date.now()}-${Math.random()}`
    setFloatingEffects((prev) => [...prev, { id: effectId, productId: p.id }])
    setTimeout(() => {
      setFloatingEffects((prev) => prev.filter((eff) => eff.id !== effectId))
    }, 850)

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

  function changeQty(id, delta) {
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

  function removeItem(id) {
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

  function handleScan(code) {
    const prod = state.products.find((p) => p.barcode === code)
    if (prod) {
      addProductToCart(prod)
      toast(`Agregado: ${prod.name}`)
      setScannerOpen(false)
    } else {
      toast(`Código no encontrado: ${code}`, 'error')
    }
  }

  async function handleConfirmSale(args) {
    setIsSaving(true)
    try {
      await completeSale({ items: cart, ...args })
      const label =
        args.method === 'efectivo' ? 'Efectivo' : args.method === 'qr' ? 'QR/Transferencia' : 'Fiado'
      const isOnline = typeof navigator !== 'undefined' && navigator.onLine
      if (!isOnline) {
        toast(`Venta registrada localmente (Modo Offline) (${label}): ${money(total)}`, 'warning')
      } else {
        toast(`Venta registrada (${label}): ${money(total)}`)
      }
      setCart([])
      setPayOpen(false)
      setMobileCartOpen(false)
    } catch (error) {
      console.error(error)
      toast(error.message || 'Error al registrar la venta', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
    <style>{`
      .venta-root { height: calc(100svh - 9.5rem); }
      @media (min-width: 1024px) { .venta-root { height: calc(100svh - 4rem); } }
    `}</style>
    <div className="venta-root flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
      {/* Left: products */}
      <div className="flex min-w-0 flex-1 flex-col p-1.5 lg:p-6 min-h-0 overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 flex-1 min-h-0">
          
          {/* Header section (Fixed at top) */}
          <div className="flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-10 placeholder:text-muted-foreground sm:placeholder:content-[''] [&::placeholder]:sm:hidden"
                  aria-label="Buscar producto o código"
                />
                <span className="pointer-events-none absolute inset-y-0 left-10 hidden items-center text-muted-foreground sm:flex">
                  <span className="sr-only">Buscar producto o código...</span>
                </span>
              </div>
              <Button
                variant="outline"
                className="h-11 w-11 shrink-0 p-0"
                onClick={() => setScannerOpen(true)}
                aria-label="Escanear código"
              >
                <Camera className="size-5" />
              </Button>
              {/* Mobile: toggle quick amount */}
              <Button
                variant="outline"
                className="h-11 shrink-0 px-3 lg:hidden"
                onClick={() => setShowQuickAmount((v) => !v)}
                aria-label="Monto rápido"
              >
                <Plus className="size-4" />
                <span className="ml-1 text-xs font-medium">Monto</span>
              </Button>
            </div>

            {/* category filters */}
            <div ref={categoryContainerRef} className="no-scrollbar -mx-1.5 lg:-mx-6 flex flex-row flex-nowrap gap-2 overflow-x-auto px-1.5 lg:px-6 pb-1 touch-pan-x select-none">
              {LOCAL_CATEGORIES.map((c) => (
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
                  {c !== 'Todos' && <span>{LOCAL_CATEGORY_ICON[c]}</span>}
                  {c}
                </button>
              ))}
            </div>

            {/* quick amount — always visible on desktop, collapsible on mobile */}
            <div className={cn('flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2', 'hidden lg:flex', showQuickAmount && '!flex')}>
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
          </div>

          {/* Scrollable grid area */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
            <div className="grid auto-rows-min grid-cols-2 gap-3 pb-2 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const low = p.stock <= p.minStock
                const out = p.stock <= 0
                const cardEffects = floatingEffects.filter((eff) => eff.productId === p.id)
                return (
                  <div
                    key={p.id}
                    onClick={() => !out && addProductToCart(p)}
                    className={cn(
                      'relative flex flex-col rounded-2xl border border-border bg-card p-3 text-left transition-all select-none',
                      out ? 'grayscale opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.97]'
                    )}
                  >
                    {/* Floating "+1" notifications */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20 overflow-hidden rounded-2xl">
                      {cardEffects.map((eff) => (
                        <span
                          key={eff.id}
                          className="pointer-events-none flex size-8 items-center justify-center rounded-full bg-success text-xs font-bold text-success-foreground shadow-md animate-float-up-fade"
                        >
                          +1
                        </span>
                      ))}
                    </div>
                    <div className="flex items-start justify-between w-full">
                      <span className="text-2xl">{LOCAL_CATEGORY_ICON[p.category] || CATEGORY_ICON[p.category]}</span>
                      <div className="flex items-center gap-1.5">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMostSold(p.id, !p.isMostSold)
                          }}
                          className={cn(
                            "rounded-full p-1 transition-colors hover:bg-muted active:scale-95",
                            p.isMostSold ? "text-orange-500 hover:text-orange-600" : "text-muted-foreground/30 hover:text-muted-foreground/60"
                          )}
                          title={p.isMostSold ? "Quitar de más vendidos" : "Marcar como más vendido"}
                        >
                          <Flame className="size-4.5 fill-current" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-tight">{p.name}</p>
                    <p className="mt-1 font-heading text-lg font-bold text-primary">{money(p.price)}</p>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No se encontraron productos.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: cart (desktop) — single aside with smooth width transition */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-l border-border bg-card lg:flex',
          'transition-[width] duration-300 ease-in-out overflow-hidden',
          cartCollapsed ? 'w-[72px]' : 'w-80 xl:w-96',
        )}
      >
        {cartCollapsed ? (
          /* Compact state: icon + badge + total */
          <div className="flex h-full flex-col items-center py-5 gap-4">
            <button
              onClick={toggleCartCollapsed}
              aria-label="Expandir carrito"
              className="group relative flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out"
            >
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground animate-pulse-subtle">
                  {cartCount}
                </span>
              )}
              {/* Tooltip */}
              <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100 z-50">
                Ver carrito ({cartCount} prod.)
              </span>
            </button>
            {cartCount > 0 && (
              <div className="group relative">
                <div
                  onClick={toggleCartCollapsed}
                  className="flex items-center justify-center [writing-mode:vertical-lr] rotate-180 px-2.5 py-4 rounded-full bg-success/15 border border-success/35 text-success hover:bg-success/25 hover:shadow-md cursor-pointer transition-all duration-300"
                >
                  <p className="text-xs font-bold tabular-nums select-none tracking-wide">
                    {money(total)}
                  </p>
                </div>
                {/* Tooltip */}
                <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100 z-50">
                  Total: {money(total)}
                </span>
              </div>
            )}
            <div className="flex-1" />
            <button
              onClick={toggleCartCollapsed}
              aria-label="Expandir carrito"
              className="group relative flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out"
            >
              <PanelRightOpen className="size-4" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100 z-50">
                Expandir panel
              </span>
            </button>
          </div>
        ) : (
          <CartPanel
            cart={cart}
            total={total}
            onChangeQty={changeQty}
            onRemove={removeItem}
            onPay={() => setPayOpen(true)}
            onCollapse={toggleCartCollapsed}
          />
        )}
      </aside>

      {/* Mobile FAB */}
      {cartCount > 0 && !mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg lg:hidden"
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
        onClose={() => !isSaving && setPayOpen(false)}
        total={total}
        onConfirm={handleConfirmSale}
        isSaving={isSaving}
      />
    </div>
    </>
  )
}

function CartPanel({
  cart,
  total,
  onChangeQty,
  onRemove,
  onPay,
  onCollapse,
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-bold">Carrito</h2>
          <Badge tone="muted">{cart.length}</Badge>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Colapsar carrito"
            title="Colapsar carrito"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <PanelRightClose className="size-4" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <ShoppingCart className="size-10 opacity-30" />
            <p className="text-sm">El carrito está vacío</p>
          </div>
        ) : (
          cart.map((item) => (
            <Card key={item.id} className="flex items-center gap-2 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{money(item.price)} c/u</p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => onChangeQty(item.id, -1)}
                  className="flex size-6 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
                  aria-label="Restar"
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                <button
                  onClick={() => onChangeQty(item.id, 1)}
                  className="flex size-6 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
                  aria-label="Sumar"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="w-14 text-right text-xs font-bold tabular-nums">
                {money(item.price * item.qty)}
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
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
