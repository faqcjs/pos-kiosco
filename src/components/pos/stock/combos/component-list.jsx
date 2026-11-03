import { Minus, Plus, X } from 'lucide-react'
import { money } from '@/lib/format'

const STEPPER_CLASS =
  'flex size-10 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none'

/** Editable list of the products that make up a combo. */
export function ComponentList({ lines, onChangeQty }) {
  if (lines.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground rounded-xl border border-dashed border-border">
        Todavía no hay productos. Buscalos arriba: por ejemplo, un Fernet y una Coca.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {lines.map((line) => (
        <li key={line.productId} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{line.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {line.unitCost > 0 ? `${money(line.unitCost)} c/u` : 'Sin costo cargado'}
            </p>
          </div>

          <div role="group" aria-label={`Cantidad de ${line.name}`} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeQty(line.productId, line.quantity - 1)}
              aria-label={line.quantity === 1 ? `Quitar ${line.name}` : `Restar uno de ${line.name}`}
              className={STEPPER_CLASS}
            >
              {line.quantity === 1 ? <X className="size-4" /> : <Minus className="size-4" />}
            </button>
            <span aria-live="polite" className="w-8 text-center text-sm font-bold tabular-nums">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onChangeQty(line.productId, line.quantity + 1)}
              aria-label={`Sumar uno de ${line.name}`}
              className={STEPPER_CLASS}
            >
              <Plus className="size-4" />
            </button>
          </div>

          <span className="hidden w-20 text-right text-sm font-semibold tabular-nums sm:block">
            {money(line.unitCost * line.quantity)}
          </span>
        </li>
      ))}
    </ul>
  )
}
