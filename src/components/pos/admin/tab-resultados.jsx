import { useMemo } from 'react'
import { Scale } from 'lucide-react'
import { buildMonthlyResults } from '@/lib/profit-and-loss'
import { MonthlyStatement } from './resultados/monthly-statement'
import { MonthsOverview } from './resultados/months-overview'

const hasActivity = (month) => month.netSales > 0 || month.totalExpenses > 0

/**
 * Monthly net result: gross profit (same as the KPI) minus operating expenses.
 * Purchases only reach it as cost of goods sold.
 */
export function TabResultados({ sales, productsMap, expenses, shifts, dateFrom, dateTo }) {
  const months = useMemo(
    () => buildMonthlyResults({ sales, productsMap, expenses, shifts, dateFrom, dateTo }).filter(hasActivity),
    [sales, productsMap, expenses, shifts, dateFrom, dateTo],
  )
  const newestFirst = useMemo(() => [...months].reverse(), [months])

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h3 className="font-heading text-base font-bold">Resultados</h3>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          Lo que te queda de las ventas después de pagar la mercadería y los gastos del negocio, mes por mes.
        </p>
      </header>

      {months.length === 0 ? (
        <section className="flex flex-col items-center gap-2 px-6 py-12 text-center rounded-2xl border border-dashed border-border">
          <Scale aria-hidden="true" className="size-9 text-muted-foreground/60" />
          <p className="font-heading text-base font-bold">No hay ventas ni gastos en estas fechas</p>
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            Elegí otro período arriba, o cargá los gastos del mes en Admin → Gastos.
          </p>
        </section>
      ) : (
        <>
          {months.length > 1 && <MonthsOverview months={months} />}
          {newestFirst.map((month) => (
            <MonthlyStatement key={month.period} month={month} />
          ))}
        </>
      )}
    </section>
  )
}
