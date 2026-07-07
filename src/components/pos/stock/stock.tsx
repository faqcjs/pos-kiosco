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
import { CATEGORIES, CATEGORY_ICON, type Category, type Product } from '@/lib/types'
import { cn } from '@/lib/utils'

type Draft = Omit<Product, 'id'> & { id?: string }

const EMPTY: Draft = {
  barcode: '',
  name: '',
  category: 'Varios',
  cost: 0,
  price: 0,
  stock: 0,
  minStock: 0,
}

export function Stock() {
  const { state, addProduct, updateProduct, deleteProduct, adjustStock } = useStore()
  const isAdmin = state.isAdminAuthenticated
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)

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
    setDraft(EMPTY)
    setFormOpen(true)
  }
  function openEdit(p: Product) {
    setDraft(p)
    setFormOpen(true)
  }

  function save() {
    if (!draft.name.trim()) {
      toast('Ingresá el nombre del producto', 'error')
      return
    }
    if (draft.id) {
      updateProduct(draft as Product)
      toast('Producto actualizado')
    } else {
      addProduct(draft)
      toast('Producto agregado')
    }
    setFormOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-6">
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
            return (
              <div
                key={p.id}
                className="grid grid-cols-2 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_110px_110px_140px_80px]"
              >
                <div className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
                  <span className="text-xl">{CATEGORY_ICON[p.category]}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
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
                    disabled={!isAdmin}
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
                    disabled={!isAdmin}
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
                      deleteProduct(p.id)
                      toast('Producto eliminado', 'info')
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
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
    </div>
  )
}

function ProductFormModal({
  open,
  onClose,
  draft,
  setDraft,
  onSave,
}: {
  open: boolean
  onClose: () => void
  draft: Draft
  setDraft: (d: Draft) => void
  onSave: () => void
}) {
  const { state } = useStore()
  const isAdmin = state.isAdminAuthenticated
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
              onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="stock">Stock inicial</Label>
              <Input
                id="stock"
                type="number"
                inputMode="numeric"
                value={draft.stock || ''}
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
