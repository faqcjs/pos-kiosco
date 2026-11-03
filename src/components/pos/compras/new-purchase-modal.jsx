'use client'

import { Camera, PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label, Modal, Select } from '@/components/ui/kit'
import { money } from '@/lib/format'
import { ScannerModal } from '@/components/pos/venta/scanner-modal'
import { usePurchaseDraft } from './use-purchase-draft'
import { isDirectPurchaseSupplier } from './purchase-draft'
import { PurchaseItemRow } from './purchase-item-row'
import { ProductSearch } from './product-suggestions'

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
  const draft = usePurchaseDraft({
    open,
    onClose,
    onReceive,
    onDeleteEntry,
    products,
    canReceive,
    initialSupplierId,
    editingPurchase,
  })

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
          {/* Top row: supplier and scanner */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-end gap-2.5">
            <div className="sm:col-span-9">
              <Label className="text-xs font-semibold">Proveedor (Opcional)</Label>
              <Select
                value={draft.supplierId}
                onChange={(e) => draft.setSupplierId(e.target.value)}
                className="mt-1 h-10 text-xs sm:text-sm"
              >
                <option value="">🛒 Sin proveedor (Compra directa)</option>
                {suppliers
                  .filter((s) => !isDirectPurchaseSupplier(s))
                  .map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      🚚 {sup.name} {sup.contact_name ? `(${sup.contact_name})` : ''}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => draft.setScannerOpen(true)}
                className="gap-2 w-full h-10 text-xs font-semibold border-border hover:bg-muted"
                title="Escanear producto con cámara"
              >
                <Camera className="shrink-0 size-4 text-primary" />
                <span>Escanear producto</span>
              </Button>
            </div>
          </div>

          {/* Product search */}
          <ProductSearch
            query={draft.prodQuery}
            onQueryChange={draft.setProdQuery}
            onKeyDown={draft.handleSearchKeyDown}
            suggestions={draft.productSuggestions}
            onSelect={draft.addProduct}
          />

          {/* Purchase lines */}
          {draft.items.length === 0 ? (
            <section className="p-6 sm:p-8 text-center bg-muted/10 rounded-xl border border-dashed border-border">
              <PackagePlus className="mx-auto size-8 text-muted-foreground opacity-50" />
              <p className="mt-2 text-sm font-semibold">No hay productos en la compra</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Buscá o escaneá un producto arriba para agregar.
              </p>
            </section>
          ) : (
            <ul className="overflow-y-auto space-y-2 pr-1 max-h-72">
              {draft.items.map((it) => (
                <PurchaseItemRow
                  key={it.id}
                  item={it}
                  showCostErrors={draft.showCostErrors}
                  onQtyChange={draft.updateQty}
                  onUnitCostChange={draft.updateUnitCost}
                  onRemove={draft.removeItem}
                />
              ))}
            </ul>
          )}

          {/* Total and confirm */}
          <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monto Total de la Compra</p>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {money(draft.totalAmount)}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-11">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={draft.submit}
                className="w-full sm:w-auto h-11 font-bold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Guardar Compra ({money(draft.totalAmount)})
              </Button>
            </div>
          </footer>
        </div>
      </Modal>

      <ScannerModal
        open={draft.scannerOpen}
        onClose={() => draft.setScannerOpen(false)}
        onScan={draft.handleScan}
      />
    </>
  )
}
