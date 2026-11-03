import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/kit'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

/** One editable line of the purchase draft. */
export function PurchaseItemRow({ item, showCostErrors, onQtyChange, onUnitCostChange, onRemove }) {
  const hasCostError = showCostErrors && item.productId && !(Number(item.unitCost) > 0)
  const unitCostId = `unit-cost-${item.id}`

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border shadow-xs">
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{item.totalUnits} un. totales</p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
        <div className="w-20">
          <Label className="block mb-0.5 text-[10px] text-muted-foreground">Cantidad</Label>
          <Input
            type="number"
            min="1"
            value={item.qty}
            onChange={(e) => onQtyChange(item.id, e.target.value)}
            className="h-9 text-xs font-bold text-center"
          />
        </div>

        <div className="w-24 sm:w-28">
          <Label htmlFor={unitCostId} className="block mb-0.5 text-[10px] text-muted-foreground">
            Costo Un. *
          </Label>
          <Input
            id={unitCostId}
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Precio factura"
            value={item.unitCost ?? ''}
            onChange={(e) => onUnitCostChange(item.id, e.target.value)}
            aria-invalid={hasCostError}
            className={cn(
              'h-9 text-xs font-bold',
              hasCostError && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          {item.previousCost > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
              Antes: {money(item.previousCost)}
            </p>
          )}
        </div>

        <div className="w-20 sm:w-24 text-right">
          <Label className="block mb-0.5 text-[10px] text-muted-foreground">Subtotal</Label>
          <p className="text-xs sm:text-sm font-bold leading-9 text-foreground tabular-nums">{money(item.cost)}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="shrink-0 self-end sm:self-center size-9 text-destructive hover:bg-destructive/10"
          title="Eliminar producto"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
