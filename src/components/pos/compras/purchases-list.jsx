'use client'

import { useState, useMemo } from 'react'
import { Search, ShoppingCart, Calendar, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, Input, Modal } from '@/components/ui/kit'
import { formatDateTime, money } from '@/lib/format'
import { DIRECT_PURCHASE_SUPPLIER_NAME } from '@/lib/constants'
import { isDirectPurchaseSupplier } from './purchase-draft'
import { parseInvoiceDetail } from '../proveedores/proveedores'

export function PurchasesList({
  suppliers = [],
  onOpenNewPurchase,
  onEditPurchase,
  onDeletePurchase,
}) {
  const [query, setQuery] = useState('')
  const [selectedPurchase, setSelectedPurchase] = useState(null)

  // Consolidate all purchase entries (facturas) across suppliers
  const allPurchases = useMemo(() => {
    const list = []
    for (const sup of suppliers) {
      if (sup.entries && Array.isArray(sup.entries)) {
        for (const entry of sup.entries) {
          if (entry.type === 'factura') {
            const parsed = parseInvoiceDetail(entry.detail)
            list.push({
              ...entry,
              supplierId: sup.id,
              supplierName: sup.name === DIRECT_PURCHASE_SUPPLIER_NAME ? 'Sin proveedor' : sup.name,
              isDirect: isDirectPurchaseSupplier(sup),
              parsedDetail: parsed,
            })
          }
        }
      }
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [suppliers])

  const filteredPurchases = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allPurchases

    return allPurchases.filter((p) => {
      const supMatch = p.supplierName.toLowerCase().includes(q)
      const detailTextMatch = p.parsedDetail?.text?.toLowerCase().includes(q)
      const invMatch = p.parsedDetail?.invoiceNumber?.toLowerCase().includes(q)
      const itemsMatch = p.items?.some((it) => it.name?.toLowerCase().includes(q))
      return supMatch || detailTextMatch || invMatch || itemsMatch
    })
  }, [allPurchases, query])

  return (
    <div className="space-y-4">
      {/* Search & Action bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar compras por proveedor o producto..."
            className="pl-9 h-11 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* List of Purchases */}
      {filteredPurchases.length === 0 ? (
        <Card className="p-6 sm:p-8 text-center bg-card">
          <EmptyState
            icon={<ShoppingCart className="size-10 text-muted-foreground/60" />}
            title={query ? 'No se encontraron compras' : 'No hay compras registradas'}
            description={
              query
                ? 'Probá buscando con otro término.'
                : 'Hacé click en "Nueva Compra" para registrar tu primer ingreso de mercadería.'
            }
            action={
              !query && (
                <Button onClick={onOpenNewPurchase} className="mt-2 h-11 font-bold">
                  Registrar Primera Compra
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredPurchases.map((purchase) => (
            <Card
              key={purchase.id}
              onClick={() => setSelectedPurchase(purchase)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-card cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99]"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={purchase.isDirect ? 'outline' : 'secondary'}
                    className="text-[11px] font-semibold"
                  >
                    {purchase.isDirect ? `🛒 ${DIRECT_PURCHASE_SUPPLIER_NAME}` : `🚚 ${purchase.supplierName}`}
                  </Badge>
                </div>

                <p className="line-clamp-1 text-xs sm:text-sm font-semibold text-foreground">
                  {purchase.parsedDetail?.text || purchase.detail}
                </p>

                <p className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatDateTime(purchase.date)}
                </p>
              </div>

              <div className="flex sm:flex-col shrink-0 items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 text-right border-t sm:border-t-0">
                <p className="text-[11px] text-muted-foreground sm:hidden">Total:</p>
                <div>
                  <p className="hidden sm:block text-xs text-muted-foreground">Monto Total</p>
                  <p className="text-base sm:text-lg font-black text-foreground tabular-nums">
                    {money(purchase.amount)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPurchase && (
        <Modal
          open={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          title="Detalle de la Compra"
          subtitle={formatDateTime(selectedPurchase.date)}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border border-border">
              <div>
                <p className="text-xs text-muted-foreground">Proveedor:</p>
                <p className="text-sm font-bold">{selectedPurchase.supplierName}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
                {onEditPurchase && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial h-10 text-xs font-bold"
                    onClick={() => {
                      const p = selectedPurchase
                      setSelectedPurchase(null)
                      onEditPurchase(p)
                    }}
                  >
                    <Pencil className="mr-1 size-3.5" /> Editar
                  </Button>
                )}
                {onDeletePurchase && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial h-10 text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => {
                      if (window.confirm('¿Eliminar este registro de compra?')) {
                        const supId = selectedPurchase.supplierId
                        const entryId = selectedPurchase.id
                        setSelectedPurchase(null)
                        onDeletePurchase(supId, entryId)
                      }
                    }}
                  >
                    <Trash2 className="mr-1 size-3.5" /> Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Items table inside detail */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Productos Ingresados
              </p>
              {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                <div className="overflow-y-auto space-y-1.5 pr-1 max-h-60">
                  {selectedPurchase.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 text-xs bg-card rounded-lg border border-border/60"
                    >
                      <div className="pr-2 min-w-0">
                        <p className="truncate font-semibold text-foreground">{it.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {it.totalUnits} un. x {money(it.unitCost || (it.cost / (it.totalUnits || 1)))}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold tabular-nums">{money(it.cost)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  {selectedPurchase.parsedDetail?.text || 'Sin detalle de productos'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-bold">Total Compra</span>
              <span className="text-lg sm:text-xl font-black text-foreground tabular-nums">
                {money(selectedPurchase.amount)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
