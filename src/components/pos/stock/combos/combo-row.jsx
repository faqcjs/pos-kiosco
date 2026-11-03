import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/kit'
import { money } from '@/lib/format'

/** One saved combo: its recipe, price, margin and stock, with edit and an inline delete confirmation. */
export function ComboRow({ combo, lines, metrics, onEdit, onDelete }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const recipe = lines.map((line) => `${line.quantity}× ${line.name}`).join(' + ')
  const hasMissingCost = metrics.missingCost.length > 0

  return (
    <li>
      <article className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 sm:justify-start">
            <h4 className="truncate font-heading text-base font-bold">{combo.name}</h4>
            <span className="shrink-0 font-heading text-base font-bold tabular-nums text-primary sm:hidden">
              {money(combo.price)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{recipe || 'Sin productos asociados'}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={metrics.buildable > 0 ? 'success' : 'danger'}>
              {metrics.buildable > 0 ? `${metrics.buildable} armables` : 'Sin stock para armar'}
            </Badge>
            {hasMissingCost ? (
              <Badge tone="warning">
                <AlertTriangle aria-hidden="true" className="size-3" />
                Falta costo de {metrics.missingCost.join(', ')}
              </Badge>
            ) : (
              metrics.marginRatio !== null && (
                <Badge tone={metrics.margin >= 0 ? 'muted' : 'danger'}>
                  {metrics.margin >= 0 ? 'Ganás' : 'Perdés'} {money(Math.abs(metrics.margin))}
                </Badge>
              )
            )}
          </div>
        </div>

        <span className="hidden shrink-0 font-heading text-lg font-bold tabular-nums text-primary sm:block">
          {money(combo.price)}
        </span>

        {isConfirming ? (
          <div role="alert" className="flex flex-col gap-2 sm:items-end">
            <p className="text-sm">¿Eliminar este combo? Los productos sueltos no se tocan.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsConfirming(false)} autoFocus>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => onDelete(combo)}>
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" onClick={() => onEdit(combo)} className="flex-1 sm:flex-none">
              <Pencil aria-hidden="true" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setIsConfirming(true)}
              aria-label={`Eliminar ${combo.name}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        )}
      </article>
    </li>
  )
}
