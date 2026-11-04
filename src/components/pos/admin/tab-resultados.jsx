import { useMemo } from 'react'
import { Info, Scale } from 'lucide-react'
import { buildMonthlyResults, selectCompleteMonths } from '@/lib/profit-and-loss'
import { MonthlyStatement } from './resultados/monthly-statement'
import { MonthsOverview } from './resultados/months-overview'

const listLabels = (months) => months.map((m) => m.label).join(', ')

/**
 * Monthly net result: gross profit (same as the KPI) minus operating expenses.
 * Purchases only reach it as cost of goods sold. Complete, finished months get a result;
 * the current month shows a partial one.
 */
export function TabResultados({ sales, productsMap, expenses, shifts, dateFrom, dateTo }) {
  const { complete, inProgress, skipped } = useMemo(
    () => selectCompleteMonths(buildMonthlyResults({ sales, productsMap, expenses, shifts, dateFrom, dateTo })),
    [sales, productsMap, expenses, shifts, dateFrom, dateTo],
  )
  const newestFirst = useMemo(() => [...complete].reverse(), [complete])
  const hasSkipped = skipped.length > 0
  const hasResults = complete.length > 0 || inProgress !== null

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h3 className="font-heading text-base font-bold">Resultados</h3>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          Lo que te queda de las ventas después de pagar la mercadería y los gastos del negocio, mes por mes.
        </p>
      </header>

      {hasResults && hasSkipped && (
        <p className="flex items-start gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-xl">
          <Info aria-hidden="true" className="shrink-0 mt-0.5 size-4" />
          <span>
            No se muestra <span className="font-medium text-foreground capitalize">{listLabels(skipped)}</span>: el mes
            todavía no terminó o las fechas elegidas no lo cubren entero.
          </span>
        </p>
      )}

      {inProgress && <MonthlyStatement month={inProgress} />}

      {!hasResults ? (
        <section className="flex flex-col items-center gap-2 px-6 py-12 text-center rounded-2xl border border-dashed border-border">
          <Scale aria-hidden="true" className="size-9 text-muted-foreground/60" />
          <p className="font-heading text-base font-bold">
            {hasSkipped ? 'No hay meses completos en estas fechas' : 'No hay ventas ni gastos en estas fechas'}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            {hasSkipped
              ? 'El resultado se calcula con meses enteros y ya terminados. Elegí fechas del primer al último día de uno o más meses pasados.'
              : 'Elegí otro período arriba, o cargá los gastos del mes en Admin → Gastos.'}
          </p>
        </section>
      ) : (
        <>
          {complete.length > 1 && <MonthsOverview months={complete} />}
          {newestFirst.map((month) => (
            <MonthlyStatement key={month.period} month={month} />
          ))}
        </>
      )}
    </section>
  )
}
