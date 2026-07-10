'use client'

import { AlertTriangle, Camera, Minus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input, Label, Modal, Select } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/pos/page-header'
import { ScannerModal } from '@/components/pos/venta/scanner-modal'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CATEGORIES, CATEGORY_ICON } from '@/lib/types'
import { cn } from '@/lib/utils'

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

export function Stock() {
  const { state, addProduct, updateProduct, deleteProduct, adjustStock, updateProductBatch } = useStore()
  const role = state.currentUser?.role
  const isAdmin = role === 'administrador'
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY)
  const [barcodeSearchOpen, setBarcodeSearchOpen] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState(null)

  const alerts = useMemo(
    () => state.products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock),
    [state.products],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.products]
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [state.products, query])

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
      const inc = existing.unidad || 1
      adjustStock(existing.id, inc)
      toast(`Se sumó ${inc} unidad${inc === 1 ? '' : 'es'} a ${existing.name} (Stock actual: ${existing.stock + inc})`, 'success')
    } else {
      setDraft({ ...EMPTY, barcode: code, stock: 1, unidad: 1 })
      setFormOpen(true)
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
    const u = draft.unidad || 1
    const finalProduct = { ...draft, stock: Number(draft.stock) || 0, unidad: u }
    if (draft.id) {
      updateProduct(finalProduct)
      toast('Producto actualizado')
    } else {
      addProduct(finalProduct)
      toast('Producto agregado')
    }
    setFormOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-1.5 lg:p-6">
      <PageHeader
        title="Stock"
        description="Catálogo e inventario de productos."
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="pl-10"
        />
      </div>

      {alerts.length > 0 && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <h3 className="flex items-center gap-2 font-heading text-base font-bold text-warning">
            <AlertTriangle className="size-5" />
            Alertas de stock ({alerts.length})
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {alerts.map((p) => (
              <button
                key={p.id}
                onClick={() => openEdit(p)}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span>{CATEGORY_ICON[p.category]}</span>
                <span className="font-medium">{p.name}</span>
                <Badge tone={p.stock === 0 ? 'danger' : 'warning'}>
                  {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Inventory table */}
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1fr_110px_110px_140px_80px] gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Producto</span>
          <span className="text-right">Costo</span>
          <span className="text-right">Venta</span>
          <span className="text-center">Stock</span>
          <span className="text-right">Acciones</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((p) => {
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
                        {p.controlLotes && (
                          <button
                            onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                            className={cn(
                              "ml-2 rounded px-2 py-0.5 text-[10px] font-semibold border transition-colors",
                              isExpanded 
                                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" 
                                : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {isExpanded ? 'Cerrar lotes' : 'Ver lotes'}
                          </button>
                        )}
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
                    <span
                      className={cn(
                        'w-10 text-center text-sm font-bold tabular-nums',
                        low && 'text-warning',
                      )}
                    >
                      {p.stock}
                    </span>
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
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4 text-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
                      <h4 className="font-heading font-bold text-foreground">Control de Lotes - {p.name}</h4>
                      <div className="text-xs text-muted-foreground">
                        Total Stock en Lotes: <span className="font-bold">{p.stock} u.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Active Batches */}
                      <div className="space-y-2">
                        <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Lotes Activos</h5>
                        {(() => {
                          const active = (state.productBatches || [])
                            .filter((b) => b.productId === p.id && b.stock > 0)
                          if (active.length === 0) return <p className="text-xs text-muted-foreground italic">No hay lotes activos con stock.</p>
                          return (
                            <div className="space-y-1.5">
                              {active.map((b) => {
                                const isExpired = new Date(b.expirationDate) < new Date()
                                return (
                                  <div key={b.id} className="flex items-center justify-between bg-card border border-border p-2 rounded-lg">
                                    <div>
                                      <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded text-foreground mr-2">{b.batchCode}</span>
                                      <span className={cn("text-xs font-medium", isExpired ? "text-destructive font-bold" : "text-muted-foreground")}>
                                        Vence: {new Date(b.expirationDate).toLocaleDateString()}
                                        {isExpired && " (VENCIDO)"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        disabled={!isAdmin}
                                        onClick={() => updateProductBatch({ ...b, stock: Math.max(0, b.stock - 1) })}
                                        className="size-6 flex items-center justify-center rounded border border-border bg-card hover:bg-muted disabled:opacity-40"
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center font-bold font-mono text-xs">{b.stock}</span>
                                      <button
                                        disabled={!isAdmin}
                                        onClick={() => updateProductBatch({ ...b, stock: b.stock + 1 })}
                                        className="size-6 flex items-center justify-center rounded border border-border bg-card hover:bg-muted disabled:opacity-40"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Empty/Expired Batches */}
                      <div className="space-y-2">
                        <h5 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Historial de Lotes / Vacíos</h5>
                        {(() => {
                          const historical = (state.productBatches || [])
                            .filter((b) => b.productId === p.id && b.stock <= 0)
                          if (historical.length === 0) return <p className="text-xs text-muted-foreground italic">No hay historial de lotes vacíos.</p>
                          return (
                            <div className="space-y-1.5">
                              {historical.map((b) => (
                                <div key={b.id} className="flex items-center justify-between bg-card/60 border border-border/60 p-2 rounded-lg opacity-70">
                                  <div>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground mr-2">{b.batchCode}</span>
                                    <span className="text-xs text-muted-foreground">Vence: {new Date(b.expirationDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">Vacío</span>
                                    <button
                                      disabled={!isAdmin}
                                      onClick={() => updateProductBatch({ ...b, stock: 1 })}
                                      className="size-6 flex items-center justify-center rounded border border-border bg-card hover:bg-muted ml-2 text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="border-t border-border pt-3 mt-2">
                        <h5 className="font-semibold text-xs text-muted-foreground mb-2">Agregar Lote Manualmente</h5>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            const form = e.target
                            const code = form.batchCode.value.trim()
                            const dateStr = form.expirationDate.value
                            const qty = Number(form.stock.value)
                            if (!code || !dateStr || isNaN(qty) || qty < 0) {
                              toast('Completar todos los campos del lote correctamente', 'error')
                              return
                            }
                            updateProductBatch({
                              id: `b-${Date.now()}`,
                              productId: p.id,
                              batchCode: code,
                              expirationDate: new Date(dateStr).toISOString(),
                              stock: qty
                            }).then(() => {
                              toast('Lote agregado con éxito', 'success')
                              form.reset()
                            }).catch((err) => {
                              toast(err.message || 'Error al agregar lote', 'error')
                            })
                          }}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div className="flex-1 min-w-[120px]">
                            <Label htmlFor={`code-${p.id}`} className="text-[10px] uppercase text-muted-foreground">Código Lote</Label>
                            <Input id={`code-${p.id}`} name="batchCode" placeholder="B123" className="h-8 text-xs mt-0.5" required />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <Label htmlFor={`exp-${p.id}`} className="text-[10px] uppercase text-muted-foreground">Fecha Venc.</Label>
                            <Input id={`exp-${p.id}`} name="expirationDate" type="date" className="h-8 text-xs mt-0.5" required />
                          </div>
                          <div className="w-20">
                            <Label htmlFor={`qty-${p.id}`} className="text-[10px] uppercase text-muted-foreground">Stock</Label>
                            <Input id={`qty-${p.id}`} name="stock" type="number" defaultValue="1" className="h-8 text-xs mt-0.5" required />
                          </div>
                          <Button type="submit" className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                            Agregar
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Sin productos.</p>
          )}
        </div>
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
  const margin = draft.price - draft.cost
  const marginPct = draft.cost > 0 ? Math.round((margin / draft.cost) * 100) : 0

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
          <div>
            <Label htmlFor="barcode">Código de barras</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={draft.barcode}
                onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
                placeholder="Escaneá o escribí el código"
                inputMode="numeric"
              />
              <Button
                variant="outline"
                className="h-11 w-11 shrink-0 p-0"
                onClick={() => setScannerOpen(true)}
                aria-label="Escanear"
              >
                <Camera className="size-5" />
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
                value={draft.cost || ''}
                onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="price">Precio de venta</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                value={draft.price || ''}
                onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
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
            <div>
              <Label htmlFor="stock">{draft.id ? 'Stock' : 'Stock inicial'}</Label>
              <Input
                id="stock"
                type="number"
                inputMode="numeric"
                value={draft.stock === 0 ? '0' : (draft.stock || '')}
                onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })}
                placeholder="0"
                disabled={Boolean(draft.id && !isAdmin)}
              />
            </div>
            <div>
              <Label htmlFor="minStock">Stock mínimo</Label>
              <Input
                id="minStock"
                type="number"
                inputMode="numeric"
                value={draft.minStock || ''}
                onChange={(e) => setDraft({ ...draft, minStock: Number(e.target.value) || 0 })}
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
                value={draft.unidad || ''}
                onChange={(e) => setDraft({ ...draft, unidad: Number(e.target.value) || 1 })}
                placeholder="1"
              />
            </div>
          </div>

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
        </div>
      </Modal>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetect={(code) => {
          setDraft({ ...draft, barcode: code })
          setScannerOpen(false)
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
