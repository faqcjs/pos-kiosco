'use client'

import { DollarSign, TrendingUp, BarChart3, Receipt, HelpCircle } from 'lucide-react'
import { money } from '@/lib/format'

export function ReportsKpis({ revenue, profit, totalSales, averageTicket }) {
  const kpis = [
    {
      title: 'Ingresos del período',
      value: money(revenue),
      icon: DollarSign,
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      title: 'Ganancia estimada',
      value: money(profit),
      icon: TrendingUp,
      iconBg: 'bg-primary/10 text-primary',
      help: 'Estimación basada en el costo total de los productos vendidos.',
    },
    {
      title: 'Total de Ventas',
      value: totalSales,
      icon: BarChart3,
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      title: 'Ticket Promedio',
      value: money(averageTicket),
      icon: Receipt,
      iconBg: 'bg-primary/10 text-primary',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-2xs transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`flex size-10 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                <Icon className="size-5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span>{kpi.title}</span>
                {kpi.help && (
                  <span title={kpi.help} className="cursor-help text-muted-foreground/70 hover:text-foreground">
                    <HelpCircle className="size-3.5" />
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
                {kpi.value}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
