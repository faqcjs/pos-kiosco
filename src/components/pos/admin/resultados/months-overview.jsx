import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatShare, shareOfSales } from './result-flow'

/** Side-by-side net result of every month in the range, oldest first. */
export function MonthsOverview({ months }) {
  return (
    <section aria-label="Comparación de meses" className="p-4 sm:p-5 bg-card rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="pb-2 font-medium text-left">Mes</th>
            <th scope="col" className="pb-2 font-medium text-right">Ventas</th>
            <th scope="col" className="hidden pb-2 font-medium text-right sm:table-cell">Gastos</th>
            <th scope="col" className="pb-2 font-medium text-right">Resultado</th>
            <th scope="col" className="pb-2 pl-3 w-14 font-medium text-right">Margen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {months.map((month) => {
            const isLoss = month.netResult < 0
            return (
              <tr key={month.period}>
                <th scope="row" className="py-2 font-medium text-left capitalize">
                  {month.label}
                  {month.isPartial && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(incompleto)</span>}
                </th>
                <td className="py-2 text-right tabular-nums">{money(month.netSales)}</td>
                <td className="hidden py-2 text-right text-muted-foreground tabular-nums sm:table-cell">{money(month.totalExpenses)}</td>
                <td className={cn('py-2 font-semibold text-right tabular-nums', isLoss ? 'text-destructive' : 'text-primary')}>
                  {money(month.netResult)}
                </td>
                <td className="py-2 pl-3 text-right text-muted-foreground tabular-nums">
                  {formatShare(shareOfSales(month.netResult, month.netSales))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
