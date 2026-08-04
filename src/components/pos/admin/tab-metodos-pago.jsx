'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { money } from '@/lib/format'

const DONUT_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)']

export function TabMetodosPago({ sales }) {
  // Datos calculados por medio de pago
  const methodStats = useMemo(() => {
    if (!sales) return []
    const map = {}

    sales.forEach((s) => {
      const method = s.method || 'efectivo'
      if (!map[method]) {
        map[method] = {
          key: method,
          name:
            method === 'efectivo'
              ? 'Efectivo'
              : method === 'qr'
              ? 'Mercado Pago / QR'
              : method === 'transferencia'
              ? 'Transferencia'
              : method === 'fiado'
              ? 'Fiado'
              : method === 'debito'
              ? 'Débito'
              : 'Crédito',
          count: 0,
          revenue: 0,
          cost: 0,
        }
      }
      map[method].count += 1
      map[method].revenue += s.total || 0
      map[method].cost += s.cost || 0
    })

    return Object.values(map).map((m) => ({
      ...m,
      profit: m.revenue - m.cost,
      avgTicket: m.count > 0 ? m.revenue / m.count : 0,
    }))
  }, [sales])

  const totalSalesCount = useMemo(() => {
    return methodStats.reduce((sum, m) => sum + m.count, 0)
  }, [methodStats])

  const totalRevenue = useMemo(() => {
    return methodStats.reduce((sum, m) => sum + m.revenue, 0)
  }, [methodStats])

  // Datos para Donut de Operaciones
  const chartOperationsData = useMemo(() => {
    return methodStats.map((m) => ({
      name: m.name,
      value: m.count,
      pct: totalSalesCount > 0 ? Math.round((m.count / totalSalesCount) * 100) : 0,
    }))
  }, [methodStats, totalSalesCount])

  // Datos para Donut de Dinero
  const chartMoneyData = useMemo(() => {
    return methodStats.map((m) => ({
      name: m.name,
      value: m.revenue,
      pct: totalRevenue > 0 ? Math.round((m.revenue / totalRevenue) * 100) : 0,
    }))
  }, [methodStats, totalRevenue])

  return (
    <div className="space-y-6">
      {/* 2 Gráficos Donut Superiores (1 Columna en Mobile, 2 en Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Ventas por medio de pago */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground font-heading">
              Ventas por medio de pago
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuántas operaciones entran por cada medio.
            </p>
          </div>

          <div className="relative h-56 w-full flex items-center justify-center">
            {chartOperationsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartOperationsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={4}
                    cornerRadius={5}
                    dataKey="value"
                  >
                    {chartOperationsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `${val} ventas`}
                    contentStyle={{
                      backgroundColor: 'var(--color-card, #ffffff)',
                      borderColor: 'var(--color-border, #e5e7eb)',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                Sin datos
              </div>
            )}

            {chartOperationsData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground font-heading">
                  {totalSalesCount}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">ventas</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            {chartOperationsData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {item.value} {item.value === 1 ? 'venta' : 'ventas'} ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Dinero por medio de pago */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground font-heading">
              Dinero por medio de pago
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuánta plata entra por cada medio.
            </p>
          </div>

          <div className="relative h-56 w-full flex items-center justify-center">
            {chartMoneyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartMoneyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={4}
                    cornerRadius={5}
                    dataKey="value"
                  >
                    {chartMoneyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => money(val)}
                    contentStyle={{
                      backgroundColor: 'var(--color-card, #ffffff)',
                      borderColor: 'var(--color-border, #e5e7eb)',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                Sin datos
              </div>
            )}

            {chartMoneyData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground font-heading">
                  {money(totalRevenue)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">total</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            {chartMoneyData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {money(item.value)} ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Detalle por Medio de Pago */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground font-heading">
            Detalle por medio de pago
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ingresos, ganancia y ticket promedio.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="p-3">Medio</th>
                <th className="p-3 text-center">Ventas</th>
                <th className="p-3 text-right">Ingresos</th>
                <th className="p-3 text-right">Ganancia</th>
                <th className="p-3 text-right">Ticket Prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {methodStats.length > 0 ? (
                methodStats.map((row) => (
                  <tr key={row.key} className="hover:bg-muted/30">
                    <td className="p-3 font-semibold text-foreground">{row.name}</td>
                    <td className="p-3 text-center text-muted-foreground">{row.count}</td>
                    <td className="p-3 text-right font-bold text-foreground">{money(row.revenue)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {money(row.profit)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{money(row.avgTicket)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">
                    No hay movimientos para los métodos de pago.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
