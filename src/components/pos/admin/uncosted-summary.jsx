'use client'

import { AlertTriangle } from 'lucide-react'
import { money } from '@/lib/format'

const REASONS = {
  product: { label: 'Producto sin costo', action: 'Cargale el costo al producto.' },
  combo: { label: 'Combo incompleto', action: 'Cargá el costo de sus componentes.' },
  quick: { label: 'Monto rápido', action: 'Si se repite, crealo como producto.' },
}

/**
 * Resumen agrupado de lo vendido sin costo conocido, para que el admin sepa qué corregir.
 * @param {{ rows: Array<{ key: string, name: string, reason: string, qty: number, revenue: number, salesCount: number }> }} props
 */
export function UncostedSummary({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        No hay ventas sin costo en el período seleccionado.
      </p>
    )
  }

  const total = rows.reduce((sum, row) => sum + row.revenue, 0)

  return (
    <section
      aria-label="Resumen de ventas sin costo"
      className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          Qué corregir
        </span>
        <span className="text-muted-foreground">
          {money(total)} fuera de la ganancia estimada
        </span>
      </header>

      <ul className="divide-y divide-border/50">
        {rows.map((row) => {
          const reason = REASONS[row.reason] ?? REASONS.product
          return (
            <li key={row.key} className="flex flex-col gap-1 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {row.name}
                  <span className="ml-1.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                    {reason.label}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{reason.action}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right tabular-nums">
                <p className="font-bold text-foreground">{money(row.revenue)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.qty} u. · {row.salesCount} {row.salesCount === 1 ? 'venta' : 'ventas'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
