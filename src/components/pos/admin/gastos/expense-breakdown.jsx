import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getCategoryVisual } from './expense-visuals'
import { formatMonthLabel } from './gastos-insights'

const percent = (share) => `${Math.round(share * 100)}%`

function Comparison({ comparison, previousMonth }) {
  const previous = formatMonthLabel(previousMonth).split(' ')[0]
  if (comparison.ratio === null) {
    return <p className="text-sm text-muted-foreground">Sin gastos cargados en {previous} para comparar.</p>
  }
  const isUp = comparison.difference > 0
  return (
    <p className="text-sm text-muted-foreground">
      <span className={cn('font-semibold tabular-nums', isUp ? 'text-destructive' : 'text-success')}>
        {isUp ? '+' : '−'}
        {money(Math.abs(comparison.difference))} ({percent(Math.abs(comparison.ratio))})
      </span>{' '}
      {isUp ? 'más' : 'menos'} que en {previous}
    </p>
  )
}

/**
 * Month total and how it splits by category: one stacked bar plus a legend.
 * Each legend entry toggles the category filter of the list below.
 */
export function ExpenseBreakdown({ total, breakdown, comparison, previousMonth, activeCategory, onToggleCategory }) {
  return (
    <section aria-label="Resumen del mes" className="flex flex-col gap-4 p-4 sm:p-5 bg-card rounded-2xl border border-border">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Gastos del mes</p>
        <p className="font-heading text-3xl font-extrabold tabular-nums sm:text-4xl">{money(total)}</p>
        <Comparison comparison={comparison} previousMonth={previousMonth} />
      </header>

      {breakdown.length > 0 && (
        <>
          <div role="img" aria-label="Reparto de los gastos por categoría" className="flex gap-0.5 h-3 w-full overflow-hidden rounded-full">
            {breakdown.map((row) => (
              <span
                key={row.category}
                style={{ width: `${row.share * 100}%` }}
                className={cn(
                  'h-full transition-opacity motion-reduce:transition-none',
                  getCategoryVisual(row.category).swatch,
                  activeCategory && activeCategory !== row.category && 'opacity-25',
                )}
              />
            ))}
          </div>

          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {breakdown.map((row) => {
              const isActive = activeCategory === row.category
              return (
                <li key={row.category}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleCategory(row.category)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 w-full text-left text-sm rounded-lg transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none',
                      isActive && 'bg-muted',
                    )}
                  >
                    <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', getCategoryVisual(row.category).swatch)} />
                    <span className="flex-1 min-w-0 truncate">{row.label}</span>
                    <span className="font-semibold tabular-nums">{money(row.total)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{percent(row.share)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
