import { AlertTriangle, CalendarClock } from 'lucide-react'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buildResultFlow, formatShare, shareOfSales } from './result-flow'
import { ResultFlowBar } from './result-flow-bar'

const ROW_VARIANTS = {
  line: 'text-foreground',
  subtract: 'text-muted-foreground',
  detail: 'pl-4 text-xs text-muted-foreground',
  subtotal: 'pt-2 font-semibold text-foreground border-t border-border',
}

// Wording of a finished month vs. the month in progress (partial result)
const LABELS = {
  complete: {
    result: 'Resultado neto',
    expenses: 'Gastos operativos',
    kept: 'Te quedó el',
    lost: 'Perdiste el equivalente al',
  },
  inProgress: {
    result: 'Resultado parcial',
    expenses: 'Gastos cargados hasta ahora',
    kept: 'Hasta hoy te quedó el',
    lost: 'Hasta hoy perdiste el equivalente al',
  },
}

/** label | amount | % of net sales */
function StatementRow({ label, value, netSales, variant = 'line', sign = '' }) {
  return (
    <div className={cn('grid grid-cols-[1fr_auto_3rem] items-baseline gap-3 text-sm', ROW_VARIANTS[variant])}>
      <dt className="min-w-0 truncate">{label}</dt>
      <dd className="tabular-nums text-right">
        {sign}
        {money(value)}
      </dd>
      <dd className="text-xs text-right text-muted-foreground tabular-nums">{formatShare(shareOfSales(value, netSales))}</dd>
    </div>
  )
}

function ApartNotes({ month }) {
  const notes = [
    month.uncostedRevenue > 0 && {
      title: 'Ventas sin costo',
      amount: month.uncostedRevenue,
      explanation: 'Sin costo cargado: no suman a la ganancia bruta hasta que cargues el costo.',
    },
    month.unclassifiedEgresos > 0 && {
      title: 'Egresos sin clasificar',
      amount: month.unclassifiedEgresos,
      explanation: 'Egresos de caja anteriores sin motivo: no se restan porque no se sabe si fueron gastos.',
    },
  ].filter(Boolean)
  if (notes.length === 0) return null

  return (
    <aside aria-label="Montos fuera del resultado" className="flex flex-col gap-2 pt-4 border-t border-border">
      {notes.map((note) => (
        <p key={note.title} className="flex gap-2 text-xs text-muted-foreground">
          <AlertTriangle aria-hidden="true" className="shrink-0 mt-0.5 size-3.5 text-warning" />
          <span>
            <strong className="font-semibold text-foreground">
              {note.title}: {money(note.amount)}.
            </strong>{' '}
            {note.explanation}
          </span>
        </p>
      ))}
    </aside>
  )
}

function ProgressBadge({ progress }) {
  return (
    <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-warning-foreground bg-warning/25 rounded-md dark:text-warning">
      <CalendarClock aria-hidden="true" className="shrink-0 size-3.5" />
      En curso · día {progress.day} de {progress.daysInMonth}
    </span>
  )
}

/**
 * Profit and loss of one month: the net result first, where the sales went, then the full statement.
 * The month in progress (`month.progress`) is shown as a partial result.
 */
export function MonthlyStatement({ month }) {
  const labels = month.progress ? LABELS.inProgress : LABELS.complete
  const isLoss = month.netResult < 0
  const margin = shareOfSales(month.netResult, month.netSales)
  const flow = buildResultFlow(month)

  return (
    <article className="flex flex-col gap-5 p-4 sm:p-6 bg-card rounded-2xl border border-border">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h4 className="font-heading text-base font-bold capitalize">{month.label}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{labels.result}</p>
          <p className={cn('font-heading text-3xl font-extrabold tabular-nums sm:text-4xl', isLoss ? 'text-destructive' : 'text-primary')}>
            {money(month.netResult)}
          </p>
          {margin !== null && (
            <p className="text-sm text-muted-foreground">
              {isLoss ? labels.lost : labels.kept}{' '}
              <span className="font-semibold text-foreground tabular-nums">{formatShare(Math.abs(margin))}</span> de lo que vendiste
            </p>
          )}
        </div>
        {month.progress && <ProgressBadge progress={month.progress} />}
      </header>

      {month.progress && (
        <p className="text-xs text-muted-foreground text-pretty">
          Faltan gastos por cargar: el resultado cambia hasta que termine el mes.
        </p>
      )}

      <ResultFlowBar flow={flow} />

      <dl className="flex flex-col gap-2">
        <StatementRow label="Ventas netas" value={month.netSales} netSales={month.netSales} />
        <StatementRow label="Costo de mercadería vendida" value={month.costOfGoodsSold} netSales={month.netSales} variant="subtract" sign="− " />
        {month.uncostedRevenue > 0 && (
          <StatementRow label="Ventas sin costo (aparte)" value={month.uncostedRevenue} netSales={month.netSales} variant="subtract" sign="− " />
        )}
        <StatementRow label="Ganancia bruta" value={month.grossProfit} netSales={month.netSales} variant="subtotal" />
        <StatementRow label={labels.expenses} value={month.totalExpenses} netSales={month.netSales} variant="subtract" sign="− " />
        {month.expensesByCategory.map((row) => (
          <StatementRow key={row.category} label={row.label} value={row.total} netSales={month.netSales} variant="detail" />
        ))}
        <StatementRow label={labels.result} value={month.netResult} netSales={month.netSales} variant="subtotal" />
      </dl>

      <ApartNotes month={month} />
    </article>
  )
}
