'use client'

import { useState, useMemo } from 'react'
import { Search, ShoppingCart, Calendar, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, Input, Modal } from '@/components/ui/kit'
import { formatDateTime, money } from '@/lib/format'
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
              supplierName: sup.name === 'Compra Directa' ? 'Sin proveedor' : sup.name,
              isDirect: sup.name === 'Compra Directa' || sup.id === 'compra_directa',
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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
                <Button onClick={onOpenNewPurchase} className="mt-2 font-bold h-11">
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
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-primary/40 hover:shadow-sm active:scale-[0.99] transition-all bg-card"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={purchase.isDirect ? 'outline' : 'secondary'}
                    className="text-[11px] font-semibold"
                  >
                    {purchase.isDirect ? '🛒 Compra Directa' : `🚚 ${purchase.supplierName}`}
                  </Badge>
                </div>

                <p className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1">
                  {purchase.parsedDetail?.text || purchase.detail}
                </p>

                <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDateTime(purchase.date)}
                </p>
              </div>

              <div className="text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
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
            <div className="rounded-xl border border-border p-3 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Proveedor:</p>
                <p className="font-bold text-sm">{selectedPurchase.supplierName}</p>
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
                    <Pencil className="size-3.5 mr-1" /> Editar
                  </Button>
                )}
                {onDeletePurchase && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial h-10 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => {
                      if (window.confirm('¿Eliminar este registro de compra?')) {
                        const supId = selectedPurchase.supplierId
                        const entryId = selectedPurchase.id
                        setSelectedPurchase(null)
                        onDeletePurchase(supId, entryId)
                      }
                    }}
                  >
                    <Trash2 className="size-3.5 mr-1" /> Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Items table inside detail */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Productos Ingresados
              </p>
              {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {selectedPurchase.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2.5 rounded-lg border border-border/60 text-xs bg-card"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground truncate">{it.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {it.totalUnits} un. x {money(it.unitCost || (it.cost / (it.totalUnits || 1)))}
                        </p>
                      </div>
                      <p className="font-bold tabular-nums shrink-0">{money(it.cost)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {selectedPurchase.parsedDetail?.text || 'Sin detalle de productos'}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-border pt-3">
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
