'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash2, Camera, PackagePlus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input, Label, Modal, Select } from '@/components/ui/kit'
import { money, uid } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { matchProduct, searchProducts } from '@/lib/utils'
import { ScannerModal } from '@/components/pos/venta/scanner-modal'

export function NewPurchaseModal({
  open,
  onClose,
  onReceive,
  onDeleteEntry,
  suppliers = [],
  products = [],
  canReceive = true,
  initialSupplierId = null,
  editingPurchase = null,
}) {
  const toast = useToast()

  const [supplierId, setSupplierId] = useState(initialSupplierId || '')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [items, setItems] = useState([])
  const [prodQuery, setProdQuery] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Reset or populate modal state when opened
  useEffect(() => {
    if (open) {
      if (editingPurchase) {
        setSupplierId(
          editingPurchase.supplierId === 'compra_directa' || editingPurchase.supplierName === 'Compra Directa'
            ? ''
            : editingPurchase.supplierId || '',
        )
        setPurchaseDate(
          editingPurchase.date
            ? new Date(editingPurchase.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        )
        setItems(editingPurchase.items || [])
      } else {
        setSupplierId(initialSupplierId || '')
        setPurchaseDate(new Date().toISOString().split('T')[0])
        setItems([])
      }
      setProdQuery('')
    }
  }, [open, initialSupplierId, editingPurchase])

  const productSuggestions = useMemo(() => {
    return searchProducts(products, prodQuery).slice(0, 10)
  }, [products, prodQuery])

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (productSuggestions.length > 0) {
        handleSelectSuggestion(productSuggestions[0])
      }
    } else if (e.key === 'Escape') {
      setProdQuery('')
    }
  }

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.cost) || 0), 0)
  }, [items])

  function handleSelectSuggestion(p) {
    const existing = items.find((it) => it.productId === p.id)
    if (existing) {
      setItems(
        items.map((it) => {
          if (it.productId === p.id) {
            const nextQty = it.qty + 1
            const nextUnits = nextQty * it.unitSize
            const unitCost = it.unitCost || p.cost || 0
            const nextCost = nextUnits * unitCost
            return { ...it, qty: nextQty, totalUnits: nextUnits, cost: nextCost }
          }
          return it
        }),
      )
      toast(`+1 a ${p.name}`, 'success')
    } else {
      const u = p.unidad || 1
      const unitCost = p.cost || 0
      const initialCost = u * unitCost
      setItems([
        ...items,
        {
          id: uid(),
          productId: p.id,
          name: p.name,
          qty: 1,
          totalUnits: u,
          unitCost: unitCost,
          cost: initialCost,
          isCustom: false,
          unitSize: u,
        },
      ])
      toast(`Agregado: ${p.name}`, 'success')
    }
    setProdQuery('')
  }

  function handleScan(code) {
    setScannerOpen(false)
    const prod = products.find((p) => p.barcode === code)
    if (prod) {
      handleSelectSuggestion(prod)
    } else {
      toast('Producto no encontrado en el catálogo', 'error')
    }
  }

  function handleRemoveItem(id) {
    setItems(items.filter((it) => it.id !== id))
  }

  function handleUpdateItemQty(id, nextQty) {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const q = Math.max(1, Number(nextQty) || 1)
          const nextUnits = q * it.unitSize
          const unitCost = it.unitCost || 0
          const nextCost = nextUnits * unitCost
          return { ...it, qty: q, totalUnits: nextUnits, cost: nextCost }
        }
        return it
      }),
    )
  }

  function handleUpdateItemUnitCost(id, nextUnitCost) {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const uCost = Math.max(0, Number(nextUnitCost) || 0)
          const nextCost = it.totalUnits * uCost
          return { ...it, unitCost: uCost, cost: nextCost }
        }
        return it
      }),
    )
  }

  async function handleSubmit() {
    if (!canReceive) {
      toast('No tenés permisos para realizar esta acción.', 'destructive')
      return
    }

    if (items.length === 0) {
      toast('Agregá al menos un producto a la compra.', 'error')
      return
    }

    // Determine target supplier (fallback to 'compra_directa' if none selected)
    let effectiveSupplierId = supplierId || 'compra_directa'

    const detailString = items
      .map((it) => `${it.name} (x${it.totalUnits} un. a ${money(it.unitCost)})`)
      .join(', ')

    const detailObj = {
      text: detailString,
      invoiceDate: purchaseDate || null,
    }
    const finalDetailString = JSON.stringify(detailObj)

    const cleanItems = items.map((it) => ({
      productId: it.productId || null,
      name: it.name,
      qty: it.qty,
      totalUnits: it.totalUnits,
      cost: it.cost,
      unitCost: it.unitCost,
      isCustom: it.isCustom,
      unitSize: it.unitSize,
    }))

    if (editingPurchase && onDeleteEntry) {
      await onDeleteEntry(editingPurchase.supplierId, editingPurchase.id)
    }

    onReceive(effectiveSupplierId, totalAmount, finalDetailString, false, cleanItems)
    onClose()

    toast(
      editingPurchase
        ? 'Compra actualizada exitosamente'
        : 'Compra registrada, stock y costos de productos actualizados',
      'success',
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editingPurchase ? 'Editar Compra' : 'Nueva Compra'}
        subtitle="Reponer stock e ingresar mercadería al kiosco"
        size="lg"
      >
        <div className="space-y-4">
          {/* Top row: Proveedor opcional y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">Proveedor (Opcional)</Label>
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 h-11 text-xs sm:text-sm"
              >
                <option value="">🛒 Sin proveedor (Compra directa)</option>
                {suppliers
                  .filter((s) => s.id !== 'compra_directa' && s.name !== 'Compra Directa')
                  .map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      🚚 {sup.name} {sup.contact_name ? `(${sup.contact_name})` : ''}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Fecha</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="pl-9 h-11 text-xs sm:text-sm font-medium bg-card"
                />
              </div>
            </div>
          </div>

          {/* Search or Scan Barcode */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={prodQuery}
                onChange={(e) => setProdQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar por nombre o código de barras (Enter para agregar)..."
                className="pl-9 h-11 text-xs sm:text-sm bg-card shadow-2xs"
              />

              {/* Suggestions */}
              {productSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-border bg-card p-1.5 shadow-2xl max-h-72 overflow-y-auto divide-y divide-border/30">
                  {productSuggestions.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(p)}
                      className={cn(
                        "flex w-full items-center justify-between p-2.5 text-left text-xs rounded-lg transition-colors min-h-[44px]",
                        idx === 0 ? "bg-primary/5 hover:bg-primary/10 font-bold" : "hover:bg-muted active:bg-muted/80"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Stock actual: <span className="font-bold">{p.stock}</span> | Costo catálogo: <span className="font-bold">{money(p.cost)}</span>
                        </p>
                      </div>
                      <Badge variant={idx === 0 ? "default" : "outline"} className="text-[10px] shrink-0 font-bold">
                        {idx === 0 ? "↵ Seleccionar" : "+ Agregar"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setScannerOpen(true)}
              className="h-11 px-3 shrink-0"
              title="Escanear producto"
            >
              <Camera className="size-5" />
            </Button>
          </div>

          {/* Items Table */}
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 sm:p-8 text-center bg-muted/10">
              <PackagePlus className="mx-auto size-8 text-muted-foreground opacity-50" />
              <p className="mt-2 text-sm font-semibold">No hay productos en la compra</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Buscá o escaneá un producto arriba para agregar.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{it.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {it.totalUnits} un. totales
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    {/* Cantidad */}
                    <div className="w-20">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => handleUpdateItemQty(it.id, e.target.value)}
                        className="h-9 text-xs font-bold text-center"
                      />
                    </div>

                    {/* Costo Unitario */}
                    <div className="w-24 sm:w-28">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Costo Un.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitCost}
                        onChange={(e) => handleUpdateItemUnitCost(it.id, e.target.value)}
                        className="h-9 text-xs font-bold"
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="w-20 sm:w-24 text-right">
                      <Label className="text-[10px] text-muted-foreground block mb-0.5">Subtotal</Label>
                      <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums leading-9">
                        {money(it.cost)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(it.id)}
                      className="size-9 text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-center"
                      title="Eliminar producto"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Total & Confirm Button */}
          <div className="rounded-xl border border-border p-4 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monto Total de la Compra</p>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {money(totalAmount)}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-11">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full sm:w-auto h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Guardar Compra ({money(totalAmount)})
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </>
  )
}
