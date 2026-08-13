'use client'

import { AlertTriangle, Camera, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Minus, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input, Label, Modal, Select, Skeleton } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/pos/page-header'
import { ScannerModal } from '@/components/pos/venta/scanner-modal'
import { CargaRapida } from '@/components/pos/stock/carga-rapida'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CATEGORIES, CATEGORY_ICON } from '@/lib/types'
import { cn, matchProduct } from '@/lib/utils'
import { fetchOpenFoodFacts } from '@/lib/open-food-facts'

const EMPTY = {
  barcode: '',
  name: '',
  category: 'Varios',
  cost: 0,
  price: 0,
  stock: 1,
  minStock: 0,
  unidad: 1,
  controlLotes: false,
}

const LOCAL_CATEGORIES = ['Todos', ...CATEGORIES]

function StockSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-1.5 lg:p-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      {/* Search */}
      <Skeleton className="h-11 w-full rounded-xl" />
      {/* Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/50 px-4 py-2.5">
          <Skeleton className="h-3 w-48 rounded" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/5 rounded" />
                <Skeleton className="h-3 w-1/4 rounded" />
              </div>
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PriceEditRow({ product, onSave }) {
  const [cost, setCost] = useState(product.cost === 0 ? '0' : (product.cost || ''))
  const [price, setPrice] = useState(product.price === 0 ? '0' : (product.price || ''))

  useEffect(() => {
    setCost(product.cost === 0 ? '0' : (product.cost || ''))
    setPrice(product.price === 0 ? '0' : (product.price || ''))
  }, [product.cost, product.price])

  const c = Number(cost) || 0
  const p = Number(price) || 0
  const margin = p - c
  const marginPct = c > 0 ? Math.round((margin / c) * 100) : 0

  function handleBlur() {
    const updatedCost = Number(cost) || 0
    const updatedPrice = Number(price) || 0
    if (updatedCost !== product.cost || updatedPrice !== product.price) {
      onSave({
        ...product,
        cost: updatedCost,
        price: updatedPrice,
      })
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 sm:grid sm:grid-cols-[1fr_110px_110px_130px] sm:gap-2 sm:items-center sm:px-4 sm:py-2.5">
      {/* Product Name & Margin (on mobile) or just Product (on desktop) */}
      <div className="flex items-start justify-between gap-2 sm:contents">
        <div className="min-w-0 flex items-center gap-2.5">
          <span className="text-xl shrink-0">{CATEGORY_ICON[product.category]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate sm:whitespace-normal">{product.name}</p>
            <p className="text-xs text-muted-foreground truncate">{product.barcode || 'sin código'}</p>
          </div>
        </div>

        {/* Margin display for mobile - aligned to the right of name */}
        <div className={cn(
          "text-right text-xs font-bold tabular-nums sm:hidden py-1",
          margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
        )}>
          {margin >= 0 ? `+$${margin.toFixed(0)} (${marginPct}%)` : `-$${Math.abs(margin).toFixed(0)}`}
        </div>
      </div>

      {/* Inputs (grouped horizontally on mobile, separate grid cells on desktop) */}
      <div className="grid grid-cols-2 gap-2 sm:contents">
        <div className="flex items-center gap-1.5 sm:block">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden">Costo</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground sm:hidden">$</span>
            <Input
              type="number"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              onFocus={(e) => e.target.select()}
              className="h-8 font-mono text-sm text-right px-2 pl-6 sm:pl-2 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:block">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden">Venta</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground sm:hidden">$</span>
            <Input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              onFocus={(e) => e.target.select()}
              className="h-8 font-mono text-sm text-right px-2 pl-6 sm:pl-2 w-full font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Margin display for desktop only */}
      <div className={cn(
        "hidden sm:block text-right text-xs font-semibold tabular-nums",
        margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
      )}>
        {margin >= 0 ? `+$${margin.toFixed(0)} (${marginPct}%)` : `-$${Math.abs(margin).toFixed(0)}`}
      </div>
    </div>
  )
}

export function Stock() {
  const { state, addProduct, updateProduct, deleteProduct, adjustStock, updateProductBatch, loadingProducts } = useStore()
  const role = state.currentUser?.role
  const isAdmin = role === 'administrador'
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState('inventory')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY)
  const [barcodeSearchOpen, setBarcodeSearchOpen] = useState(false)
  const [stockScannerOpen, setStockScannerOpen] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState(null)

  function handleStockScan(code) {
    setStockScannerOpen(false)
    if (code) {
      setQuery(code)
      toast(`Buscando código: ${code}`, 'success')
    }
  }
  const [offLookupLoading, setOffLookupLoading] = useState(false)
  const [cargaRapidaOpen, setCargaRapidaOpen] = useState(false)
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false)

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

  useEffect(() => {
    setPage(1)
  }, [query, category, filterAlertsOnly, viewMode])

  const stockAlerts = useMemo(
    () => state.products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock),
    [state.products],
  )

  const priceAlerts = useMemo(
    () =>
      state.products
        .filter((p) => !p.price || p.price === 0 || !p.cost || p.cost === 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.products],
  )

  const alerts = useMemo(
    () => (viewMode === 'inventory' ? stockAlerts : priceAlerts),
    [viewMode, stockAlerts, priceAlerts],
  )

  const alertStats = useMemo(() => {
    if (viewMode === 'inventory') {
      const outOfStock = stockAlerts.filter((p) => p.stock === 0).length
      const lowStock = stockAlerts.filter((p) => p.stock > 0).length
      return { outOfStock, lowStock }
    } else {
      const noPrice = priceAlerts.filter((p) => !p.price || p.price === 0).length
      const noCost = priceAlerts.filter((p) => !p.cost || p.cost === 0).length
      return { noPrice, noCost }
    }
  }, [viewMode, stockAlerts, priceAlerts])

  const filtered = useMemo(() => {
    return [...state.products]
      .filter((p) => {
        const matchesCat = category === 'Todos' || p.category === category
        const matchesQ = matchProduct(p, query)
        const matchesAlert =
          !filterAlertsOnly ||
          (viewMode === 'inventory'
            ? p.stock <= p.minStock
            : !p.price || p.price === 0 || !p.cost || p.cost === 0)
        return matchesCat && matchesQ && matchesAlert
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [state.products, query, category, filterAlertsOnly, viewMode])

  const ITEMS_PER_PAGE = 15
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)

  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  function openNew() {
    setBarcodeSearchOpen(true)
  }

  function handleSelectBarcode(code) {
    setBarcodeSearchOpen(false)
    if (!code) {
      setDraft({ ...EMPTY, stock: 1, unidad: 1 })
      setFormOpen(true)
      return
    }

    const existing = state.products.find((p) => p.barcode === code)
    if (existing) {
      if (existing.controlLotes) {
        // Batch-controlled products must have stock added via a batch entry, not directly
        openEdit(existing)
        toast(`${existing.name} usa control de lotes. Agregá el stock desde el panel de lotes.`, 'info')
      } else {
        const inc = existing.unidad || 1
        adjustStock(existing.id, inc)
        toast(
          `+${inc} a ${existing.name} (stock: ${existing.stock + inc})`,
          'success',
          {
            label: 'Deshacer',
            onClick: () => adjustStock(existing.id, -inc),
          },
        )
      }
    } else {
      // New product — try to pre-fill from OpenFoodFacts
      setOffLookupLoading(true)
      setBarcodeSearchOpen(false)
      fetchOpenFoodFacts(code).then((offData) => {
        setOffLookupLoading(false)
        setDraft({
          ...EMPTY,
          barcode: code,
          stock: 1,
          unidad: 1,
          ...(offData ?? {}),
          offFound: Boolean(offData),
        })
        setFormOpen(true)
      })
    }
  }

  function openEdit(p) {
    setDraft(p)
    setFormOpen(true)
  }

  function save() {
    if (!draft.name.trim()) {
      toast('Ingresá el nombre del producto', 'error')
      return
    }
    const u = draft.unidad === '' ? 1 : (Number(draft.unidad) || 1)
    const finalProduct = {
      ...draft,
      cost: draft.cost === '' ? 0 : Number(draft.cost),
      price: draft.price === '' ? 0 : Number(draft.price),
      stock: draft.stock === '' ? 0 : Number(draft.stock),
      minStock: draft.minStock === '' ? 0 : Number(draft.minStock),
      unidad: u,
    }
    if (draft.id) {
      updateProduct(finalProduct)
      toast('Producto actualizado')
    } else {
      addProduct(finalProduct)
      toast('Producto agregado')
    }
    setFormOpen(false)
  }

  if (loadingProducts) return <StockSkeleton />

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-1.5 lg:p-6">
      {offLookupLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 shadow-xl">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Buscando en OpenFoodFacts…</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Stock"
        description="Catálogo e inventario de productos."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCargaRapidaOpen(true)}>
              <Zap className="size-4" />
              Carga rápida
            </Button>
            <Button onClick={openNew}>
              <Plus className="size-4" />
              Nuevo
            </Button>
          </div>
        }
      />

      {cargaRapidaOpen && (
        <CargaRapida onClose={() => setCargaRapidaOpen(false)} />
      )}

      <div className="flex border-b border-border">
        <button
          onClick={() => setViewMode('inventory')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
            viewMode === 'inventory'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Inventario
        </button>
        <button
          onClick={() => setViewMode('prices')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
            viewMode === 'prices'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Lista de Precios
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setStockScannerOpen(true)}
          className="h-11 px-3 border-border hover:bg-muted active:scale-[0.98]"
          title="Escanear código de barras"
        >
          <Camera className="size-5 text-muted-foreground" />
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
            {c !== 'Todos' && <span>{CATEGORY_ICON[c]}</span>}
            {c}
          </button>
        ))}
      </div>

      {alerts.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-warning">
              <AlertTriangle className="size-5 shrink-0" />
              {viewMode === 'inventory'
                ? `Alertas de Stock (${alerts.length} en total)`
                : `Productos con datos pendientes (${alerts.length} en total)`}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
              {viewMode === 'inventory' ? (
                <>
                  <span>• <strong className="text-foreground">{alertStats.outOfStock}</strong> sin stock</span>
                  <span>• <strong className="text-foreground">{alertStats.lowStock}</strong> con stock bajo</span>
                </>
              ) : (
                <>
                  <span>• <strong className="text-foreground">{alertStats.noPrice}</strong> sin precio de venta</span>
                  <span>• <strong className="text-foreground">{alertStats.noCost}</strong> sin precio de costo</span>
                </>
              )}
            </div>
          </div>

          <Button
            variant={filterAlertsOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilterAlertsOnly((v) => !v)}
            className={cn(
              'h-9 px-3.5 text-xs font-semibold shrink-0 transition-all',
              filterAlertsOnly
                ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                : 'border-warning/40 text-warning hover:bg-warning/10'
            )}
          >
            {filterAlertsOnly ? 'Viendo solo alertas ✓' : `Filtrar en tabla (${alerts.length}) →`}
          </Button>
        </Card>
      )}

      {filterAlertsOnly && (
        <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs font-medium text-warning shadow-sm">
          <span>
            Filtrando tabla por productos con <strong>{viewMode === 'inventory' ? 'alertas de stock' : 'precios o costos pendientes'}</strong> ({filtered.length} encontrados)
          </span>
          <button
            onClick={() => setFilterAlertsOnly(false)}
            className="font-bold underline hover:opacity-80 transition-opacity ml-2"
          >
            Ver catálogo completo ✕
          </button>
        </div>
      )}

      {/* Inventory table */}
      <Card className="overflow-hidden">
        {viewMode === 'inventory' ? (
          <>
            <div className="hidden grid-cols-[1fr_110px_110px_140px_80px] gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Producto</span>
              <span className="text-right">Costo</span>
              <span className="text-right">Venta</span>
              <span className="text-center">Stock</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-border">
              {paginated.map((p) => {
                const low = p.stock <= p.minStock
                const isExpanded = expandedProductId === p.id
                return (
                  <div key={p.id} className="flex flex-col">
                    <div
                      className="grid grid-cols-2 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_110px_110px_140px_80px]"
                    >
                      <div className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
                        <span className="text-xl">{CATEGORY_ICON[p.category]}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.category} · {p.barcode || 'sin código'}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
                        <span className="sm:hidden">Costo: </span>
                        {money(p.cost)}
                      </span>
                      <span className="text-sm font-semibold tabular-nums sm:text-right">
                        <span className="font-normal text-muted-foreground sm:hidden">Venta: </span>
                        {money(p.price)}
                      </span>
                      <div className="flex items-center justify-start gap-1.5 sm:justify-center">
                        <button
                          disabled={!isAdmin || p.controlLotes}
                          onClick={() => adjustStock(p.id, -1)}
                          className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed sm:size-7"
                          aria-label="Restar stock"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <StockInput
                          product={p}
                          isAdmin={isAdmin}
                          adjustStock={adjustStock}
                          toast={toast}
                        />
                        <button
                          disabled={p.controlLotes}
                          onClick={() => adjustStock(p.id, 1)}
                          className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed sm:size-7"
                          aria-label="Sumar stock"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que querés eliminar el producto "${p.name}"?`)) {
                              deleteProduct(p.id)
                              toast('Producto eliminado', 'info')
                            }
                          }}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Sin productos.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="hidden sm:grid sm:grid-cols-[1fr_110px_110px_130px] gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Producto</span>
              <span className="text-right">Costo</span>
              <span className="text-right">Venta</span>
              <span className="text-right">Margen</span>
            </div>
            <div className="divide-y divide-border">
              {paginated.map((p) => (
                <PriceEditRow
                  key={p.id}
                  product={p}
                  onSave={(updated) => {
                    updateProduct(updated)
                    toast(`${updated.name} actualizado`, 'success')
                  }}
                />
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Sin productos.</p>
              )}
            </div>
          </>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
            {/* Left side info (desktop only) */}
            <div className="hidden sm:block">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(page * ITEMS_PER_PAGE, filtered.length)}
                </span>{' '}
                de <span className="font-medium">{filtered.length}</span> productos
              </p>
            </div>

            {/* Pagination Controls (centered on mobile, right-aligned on desktop) */}
            <div className="flex flex-1 justify-center sm:justify-end sm:flex-initial">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                  title="Volver al inicio (Primera página)"
                >
                  <span className="sr-only">Primera página</span>
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                  title="Página anterior"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold px-2 tabular-nums">
                  {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0"
                  title="Página siguiente"
                >
                  <span className="sr-only">Siguiente</span>
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0"
                  title="Última página"
                >
                  <span className="sr-only">Última página</span>
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onSave={save}
      />

      <BarcodeSearchModal
        open={barcodeSearchOpen}
        onClose={() => setBarcodeSearchOpen(false)}
        onSelectBarcode={handleSelectBarcode}
      />

      <ScannerModal
        open={stockScannerOpen}
        onClose={() => setStockScannerOpen(false)}
        onDetect={handleStockScan}
      />
    </div>
  )
}

function ProductFormModal({
  open,
  onClose,
  draft,
  setDraft,
  onSave,
}) {
  const { state } = useStore()
  const isAdmin = state.currentUser?.role === 'administrador'
  const [scannerOpen, setScannerOpen] = useState(false)
  const [offLoading, setOffLoading] = useState(false)
  const lastFetchedBarcode = useRef('')
  const margin = draft.price - draft.cost
  const marginPct = draft.cost > 0 ? Math.round((margin / draft.cost) * 100) : 0

  function lookupBarcode(code) {
    if (!code || code === lastFetchedBarcode.current) return
    lastFetchedBarcode.current = code
    setOffLoading(true)
    fetchOpenFoodFacts(code).then((offData) => {
      setOffLoading(false)
      if (offData) {
        setDraft((prev) => ({
          ...prev,
          barcode: code,
          name: prev.name || offData.name,
          category: offData.category,
          brand: offData.brand || prev.brand || '',
          quantity: offData.quantity || prev.quantity || '',
          image: offData.image || prev.image || '',
          offFound: true,
        }))
      } else {
        setDraft((prev) => ({ ...prev, offFound: false }))
      }
    })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={draft.id ? 'Editar producto' : 'Nuevo producto'}
        footer={
          <Button className="h-11 w-full" onClick={onSave}>
            {draft.id ? 'Guardar cambios' : 'Agregar producto'}
          </Button>
        }
      >
        <div className="space-y-4">
          {draft.offFound && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <div className="flex items-start gap-3">
                {draft.image && (
                  <img
                    src={draft.image}
                    alt="Producto"
                    className="h-14 w-14 shrink-0 rounded-lg border border-emerald-500/20 object-contain bg-white"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle className="size-3.5 shrink-0" />
                    Datos desde <strong>OpenFoodFacts</strong>
                  </div>
                  {(draft.brand || draft.quantity) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {draft.brand && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium">
                          🏭 {draft.brand}
                        </span>
                      )}
                      {draft.quantity && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium">
                          📦 {draft.quantity}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs opacity-75">Revisá y ajustá si es necesario.</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="barcode">Código de barras</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={draft.barcode}
                onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
                onBlur={(e) => lookupBarcode(e.target.value.trim())}
                placeholder="Escaneá o escribí el código"
                inputMode="numeric"
              />
              <Button
                variant="outline"
                className="h-11 w-11 shrink-0 p-0"
                onClick={() => setScannerOpen(true)}
                aria-label="Escanear"
                disabled={offLoading}
              >
                {offLoading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-5" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nombre del producto"
            />
          </div>

          <div>
            <Label htmlFor="cat">Categoría</Label>
            <Select
              id="cat"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_ICON[c]} {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cost">Precio de compra</Label>
              <Input
                id="cost"
                type="number"
                inputMode="numeric"
                value={draft.cost ?? ''}
                onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="price">Precio de venta</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                value={draft.price ?? ''}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {draft.cost > 0 && draft.price > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Ganancia por unidad</span>
              <span className={cn('font-semibold tabular-nums', margin >= 0 ? 'text-success' : 'text-destructive')}>
                {money(margin)} ({marginPct}%)
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {(!draft.controlLotes || draft.id) && (
            <div>
              <Label htmlFor="stock">{draft.id ? 'Stock' : 'Stock inicial'}</Label>
              <Input
                id="stock"
                type="number"
                inputMode="numeric"
                value={draft.stock ?? ''}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                placeholder="0"
                disabled={Boolean(draft.id && !isAdmin)}
              />
            </div>
            )}
            <div>
              <Label htmlFor="minStock">Stock mínimo</Label>
              <Input
                id="minStock"
                type="number"
                inputMode="numeric"
                value={draft.minStock ?? ''}
                onChange={(e) => setDraft({ ...draft, minStock: e.target.value })}
                placeholder="0"
                disabled={Boolean(draft.id && !isAdmin)}
              />
            </div>
            <div>
              <Label htmlFor="unidad">U. por bulto</Label>
              <Input
                id="unidad"
                type="number"
                inputMode="numeric"
                value={draft.unidad ?? ''}
                onChange={(e) => setDraft({ ...draft, unidad: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>

          {/* Batch control checkbox — disabled while in development
          <div className="flex items-center space-x-2 pt-2 border-t border-border">
            <input
              type="checkbox"
              id="controlLotes"
              checked={Boolean(draft.controlLotes)}
              onChange={(e) => setDraft({ ...draft, controlLotes: e.target.checked })}
              className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="controlLotes" className="cursor-pointer font-medium select-none text-sm">
              Control de Lotes y Vencimiento
            </Label>
          </div>
          {draft.controlLotes && !draft.id && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              ⚠️ Al guardar el producto, agregá el stock inicial desde el panel <strong>Ver lotes</strong> en el catálogo.
            </p>
          )}
          */}

        </div>
      </Modal>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetect={(code) => {
          setDraft((prev) => ({ ...prev, barcode: code }))
          setScannerOpen(false)
          lookupBarcode(code)
        }}
      />
    </>
  )
}

function BarcodeSearchModal({
  open,
  onClose,
  onSelectBarcode,
}) {
  const [barcode, setBarcode] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleContinue = (e) => {
    e?.preventDefault()
    onSelectBarcode(barcode.trim())
    setBarcode('')
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Código de barras"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => { onSelectBarcode(''); setBarcode('') }}>
              Sin código / Omitir
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground font-bold" onClick={handleContinue}>
              Continuar
            </Button>
          </div>
        }
      >
        <form onSubmit={handleContinue} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ingresá o escaneá el código de barras para verificar si el producto ya existe en el stock.
          </p>
          <div>
            <Label htmlFor="search-barcode">Código de barras</Label>
            <div className="flex gap-2">
              <Input
                id="search-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Escaneá o escribí el código"
                inputMode="numeric"
                autoFocus
              />
              <Button
                variant="outline"
                type="button"
                className="h-11 w-11 shrink-0 p-0"
                onClick={() => setScannerOpen(true)}
                aria-label="Escanear"
              >
                <Camera className="size-5" />
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetect={(code) => {
          onSelectBarcode(code)
          setBarcode('')
          setScannerOpen(false)
        }}
      />
    </>
  )
}



function StockInput({ product, isAdmin, adjustStock, toast }) {
  const [val, setVal] = useState(product.stock)

  useEffect(() => {
    setVal(product.stock)
  }, [product.stock])

  const handleBlurOrSubmit = () => {
    const numVal = parseInt(val, 10)
    if (isNaN(numVal) || numVal < 0) {
      setVal(product.stock)
      return
    }

    const delta = numVal - product.stock
    if (delta === 0) return

    if (delta < 0 && !isAdmin) {
      toast('No tenés permisos para disminuir el stock', 'error')
      setVal(product.stock)
      return
    }

    adjustStock(product.id, delta)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      setVal(product.stock)
      e.target.blur()
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={product.controlLotes}
      value={val}
      onChange={(e) => {
        const v = e.target.value
        if (v === '' || /^[0-9]+$/.test(v)) {
          setVal(v)
        }
      }}
      onBlur={handleBlurOrSubmit}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-12 h-8 text-center text-sm font-bold bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:bg-card transition-all disabled:opacity-40 disabled:cursor-not-allowed tabular-nums",
        product.stock <= product.minStock && "text-warning"
      )}
    />
  )
}
