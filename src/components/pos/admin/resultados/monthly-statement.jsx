import { AlertTriangle } from 'lucide-react'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

const ROW_VARIANTS = {
  line: 'text-foreground',
  subtract: 'text-muted-foreground',
  detail: 'pl-4 text-[11px] text-muted-foreground',
  subtotal: 'pt-2 font-bold text-foreground border-t border-border/60',
}

function StatementRow({ label, value, variant = 'line', sign = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 text-xs', ROW_VARIANTS[variant])}>
      <dt className="min-w-0 truncate">{label}</dt>
      <dd className="shrink-0 tabular-nums">
        {sign}
        {money(value)}
      </dd>
    </div>
  )
}

function ApartNote({ title, amount, explanation }) {
  return (
    <li className="flex flex-col gap-0.5 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{explanation}</p>
      </div>
      <p className="shrink-0 font-bold tabular-nums text-foreground">{money(amount)}</p>
    </li>
  )
}

/**
 * Profit and loss statement of one month (see buildMonthlyResults in '@/lib/profit-and-loss').
 */
export function MonthlyStatement({ month }) {
  const hasApartItems = month.uncostedRevenue > 0 || month.unclassifiedEgresos > 0
  const isLoss = month.netResult < 0

  return (
    <article className="space-y-3 p-4 sm:p-6 bg-card rounded-2xl border border-border/70 shadow-2xs">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-heading text-sm font-bold capitalize text-foreground">{month.label}</h4>
        {month.isPartial && (
          <span className="px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 rounded-md">
            Mes incompleto
          </span>
        )}
      </header>

      <dl className="space-y-2">
        <StatementRow label="Ventas netas" value={month.netSales} />
        {month.uncostedRevenue > 0 && (
          <StatementRow label="Ventas sin costo (aparte)" value={month.uncostedRevenue} variant="subtract" sign="− " />
        )}
        <StatementRow label="Costo de mercadería vendida" value={month.costOfGoodsSold} variant="subtract" sign="− " />
        <StatementRow label="Ganancia bruta" value={month.grossProfit} variant="subtotal" />
        <StatementRow label="Gastos operativos" value={month.totalExpenses} variant="subtract" sign="− " />
        {month.expensesByCategory.map((row) => (
          <StatementRow key={row.category} label={row.label} value={row.total} variant="detail" />
        ))}
        <div
          className={cn(
            'flex items-center justify-between gap-3 px-3 py-2 text-sm font-bold rounded-xl',
            isLoss ? 'text-destructive bg-destructive/10' : 'text-primary bg-primary/10'
          )}
        >
          <dt>Resultado neto del mes</dt>
          <dd className="tabular-nums">{money(month.netResult)}</dd>
        </div>
      </dl>

      {hasApartItems && (
        <section aria-label="Montos fuera del resultado" className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/40">
          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            Fuera del resultado
          </p>
          <ul className="divide-y divide-border/50">
            {month.uncostedRevenue > 0 && (
              <ApartNote
                title="Ventas sin costo"
                amount={month.uncostedRevenue}
                explanation="No tienen costo cargado: no suman a la ganancia bruta hasta que cargues el costo."
              />
            )}
            {month.unclassifiedEgresos > 0 && (
              <ApartNote
                title="Egresos sin clasificar"
                amount={month.unclassifiedEgresos}
                explanation="Egresos de caja anteriores sin motivo: no se sabe si son gastos, así que no se restan."
              />
            )}
          </ul>
        </section>
      )}
    </article>
  )
}
