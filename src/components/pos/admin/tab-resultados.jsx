import { useMemo } from 'react'
import { Scale } from 'lucide-react'
import { buildMonthlyResults } from '@/lib/profit-and-loss'
import { MonthlyStatement } from './resultados/monthly-statement'

const hasActivity = (month) => month.netSales > 0 || month.totalExpenses > 0

/**
 * Monthly net result: gross profit (same as the KPI) minus operating expenses.
 * Purchases only reach it as cost of goods sold.
 */
export function TabResultados({ sales, productsMap, expenses, shifts, dateFrom, dateTo }) {
  const months = useMemo(
    () => buildMonthlyResults({ sales, productsMap, expenses, shifts, dateFrom, dateTo }),
    [sales, productsMap, expenses, shifts, dateFrom, dateTo]
  )
  const isEmpty = !months.some(hasActivity)

  return (
    <section className="space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-primary" />
          <h3 className="font-heading text-base font-bold text-foreground">Resultados</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ganancia bruta menos gastos operativos, mes por mes. Las compras entran solo como costo de lo vendido.
        </p>
      </header>

      {isEmpty ? (
        <p className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-border/60">
          No hay ventas ni gastos en el período seleccionado.
        </p>
      ) : (
        months.map((month) => <MonthlyStatement key={month.period} month={month} />)
      )}
    </section>
  )
}
