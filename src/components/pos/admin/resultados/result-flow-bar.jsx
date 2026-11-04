import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getCategoryVisual } from '../gastos/expense-visuals'
import { EXPENSE_PREFIX, SEGMENT, formatShare } from './result-flow'

const FIXED_SWATCHES = {
  [SEGMENT.COST]: 'bg-foreground/25',
  [SEGMENT.UNCOSTED]: 'bg-warning',
  [SEGMENT.NET]: 'bg-primary',
}
// Stripes mark the part of the costs that sales did not cover
const UNCOVERED_PATTERN = {
  backgroundImage:
    'repeating-linear-gradient(135deg, var(--destructive) 0 4px, color-mix(in oklch, var(--destructive) 35%, transparent) 4px 8px)',
}

const swatchFor = (key) =>
  key.startsWith(EXPENSE_PREFIX) ? getCategoryVisual(key.slice(EXPENSE_PREFIX.length)).swatch : FIXED_SWATCHES[key]

/** One bar showing where each peso sold went, with its legend. */
export function ResultFlowBar({ flow }) {
  if (flow.segments.length === 0) return null
  const { uncovered } = flow

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm text-muted-foreground">
        {flow.isLoss ? 'Lo que hubo que cubrir en el mes' : 'A dónde fue cada peso vendido'}
      </figcaption>

      <div role="img" aria-label="Reparto de las ventas del mes" className="relative flex gap-0.5 overflow-hidden h-4 w-full rounded-full">
        {flow.segments.map((segment) => (
          <span key={segment.key} style={{ width: `${segment.share * 100}%` }} className={cn('h-full', swatchFor(segment.key))} />
        ))}
        {uncovered && (
          <span
            aria-hidden="true"
            style={{ ...UNCOVERED_PATTERN, width: `${uncovered.share * 100}%` }}
            className="absolute inset-y-0 right-0"
          />
        )}
      </div>

      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {flow.segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={cn('shrink-0 size-2.5 rounded-full', swatchFor(segment.key))} />
            <span className={cn('flex-1 min-w-0 truncate', segment.key === SEGMENT.NET && 'font-semibold')}>{segment.label}</span>
            <span className="tabular-nums">{money(segment.amount)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{formatShare(segment.share)}</span>
          </li>
        ))}
        {uncovered && (
          <li className="flex items-center gap-2 text-sm text-destructive">
            <span aria-hidden="true" style={UNCOVERED_PATTERN} className="shrink-0 size-2.5 rounded-full" />
            <span className="flex-1 min-w-0 truncate font-semibold">No lo cubrieron las ventas</span>
            <span className="tabular-nums">{money(uncovered.amount)}</span>
            <span className="w-10 text-right text-xs tabular-nums">{formatShare(uncovered.share)}</span>
          </li>
        )}
      </ul>
    </figure>
  )
}
