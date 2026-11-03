import { AlertTriangle } from 'lucide-react'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

const percent = (ratio) => `${Math.round(ratio * 100)}%`

/**
 * Live summary of a combo draft, written as an equation:
 * the components add up to the sale price, split into cost and profit.
 */
export function ComboRecipe({ lines, price, metrics }) {
  const priceNum = Number(price) || 0
  const hasPrice = priceNum > 0
  const isLoss = hasPrice && metrics.margin < 0
  const costShare = hasPrice ? Math.min(1, metrics.cost / priceNum) : 0

  return (
    <aside aria-label="Resumen del combo" className="flex flex-col gap-4 lg:sticky lg:top-0 p-4 rounded-2xl bg-muted/50 border border-border">
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground text-pretty">
          Sumá productos y acá vas a ver cuánto te cuesta armar el combo y cuánto ganás.
        </p>
      ) : (
        <ol className="flex flex-col gap-1 text-sm">
          {lines.map((line, index) => (
            <li key={line.productId} className="flex gap-2">
              <span aria-hidden="true" className="w-3 text-muted-foreground">{index > 0 ? '+' : ''}</span>
              <span className="tabular-nums font-semibold">{line.quantity}×</span>
              <span className="min-w-0 truncate">{line.name}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-baseline justify-between gap-2 pt-3 border-t border-border">
        <span className="text-sm text-muted-foreground">Precio</span>
        <span className="font-heading text-3xl font-extrabold tabular-nums">{money(priceNum)}</span>
      </div>

      {hasPrice && lines.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            role="img"
            aria-label={`Costo ${money(metrics.cost)}, ganancia ${money(metrics.margin)}`}
            className="flex h-3 w-full overflow-hidden rounded-full bg-success"
          >
            <div
              style={{ width: `${costShare * 100}%` }}
              className={cn(
                'h-full transition-[width] duration-300 motion-reduce:transition-none',
                isLoss ? 'bg-destructive' : 'bg-foreground/25',
              )}
            />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Costo</dt>
              <dd className="font-semibold tabular-nums">{money(metrics.cost)}</dd>
            </div>
            <div className="text-right">
              <dt className="text-xs text-muted-foreground">{isLoss ? 'Pérdida' : 'Ganancia'}</dt>
              <dd className={cn('font-semibold tabular-nums', isLoss ? 'text-destructive' : 'text-success')}>
                {money(Math.abs(metrics.margin))}
                {metrics.marginRatio !== null && !isLoss && ` (${percent(metrics.marginRatio)})`}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {lines.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {metrics.buildable > 0
            ? `Con el stock actual alcanza para ${metrics.buildable} ${metrics.buildable === 1 ? 'combo' : 'combos'}.`
            : 'Con el stock actual no alcanza para armar ninguno.'}
        </p>
      )}

      {metrics.missingCost.length > 0 && (
        <p role="alert" className="flex gap-2 p-3 text-xs rounded-xl bg-warning/15 text-warning-foreground dark:text-warning">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Falta el costo de <strong>{metrics.missingCost.join(', ')}</strong>. Hasta que lo cargues, las ventas de
            este combo no suman a la ganancia estimada.
          </span>
        </p>
      )}
    </aside>
  )
}
