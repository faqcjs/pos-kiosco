'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { CreditCard, Package, Calendar } from 'lucide-react'
import { money } from '@/lib/format'

const DONUT_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)']

export function TabResumen({ sales, products, dailyData, paymentMethodsData, isSingleDay }) {
  // 1. Pago más usado
  const topPaymentMethod = useMemo(() => {
    if (!sales || sales.length === 0) return { name: 'Sin ventas', percentage: 0 }
    const counts = {}
    sales.forEach((s) => {
      const method = s.method || 'efectivo'
      counts[method] = (counts[method] || 0) + 1
    })
    let top = 'efectivo'
    let max = 0
    Object.entries(counts).forEach(([m, qty]) => {
      if (qty > max) {
        max = qty
        top = m
      }
    })
    const methodLabels = {
      efectivo: 'Efectivo',
      qr: 'Mercado Pago / QR',
      transferencia: 'Transferencia',
      fiado: 'Fiado',
      debito: 'Débito',
      credito: 'Crédito',
    }
    const pct = Math.round((max / sales.length) * 100)
    return {
      name: methodLabels[top] || top,
      percentage: pct,
    }
  }, [sales])

  // 2. Producto más popular
  const topProduct = useMemo(() => {
    if (!sales || sales.length === 0) return { name: 'Sin ventas', qty: 0 }
    const map = new Map()
    sales.forEach((s) => {
      s.items?.forEach((item) => {
        const key = item.name
        map.set(key, (map.get(key) || 0) + item.qty)
      })
    })
    let topName = 'Sin datos'
    let maxQty = 0
    map.forEach((qty, name) => {
      if (qty > maxQty) {
        maxQty = qty
        topName = name
      }
    })
    return { name: topName, qty: maxQty }
  }, [sales])

  // 3. Próximo vencimiento
  const upcomingExpiration = useMemo(() => {
    if (!products || products.length === 0) return null
    const withExp = products.filter((p) => p.expirationDate)
    if (withExp.length === 0) return null
    const sorted = [...withExp].sort(
      (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(),
    )
    return sorted[0]
  }, [products])

  return (
    <div className="space-y-6">
      {/* 3 mini cards de highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Pago más usado */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <CreditCard className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground block">Pago más usado</span>
            <h4 className="text-base font-bold text-foreground truncate font-heading">
              {topPaymentMethod.name}
            </h4>
            <span className="text-xs text-muted-foreground">
              {topPaymentMethod.percentage}% de las ventas
            </span>
          </div>
        </div>

        {/* Card 2: Producto más popular */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground block">
              Producto más popular
            </span>
            <h4 className="text-base font-bold text-foreground truncate font-heading">
              {topProduct.name}
            </h4>
            <span className="text-xs text-muted-foreground">
              {topProduct.qty} unidades vendidas
            </span>
          </div>
        </div>

        {/* Card 3: Próximo vencimiento */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <Calendar className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground block">
              Próximo vencimiento
            </span>
            <h4 className="text-base font-bold text-foreground truncate font-heading">
              {upcomingExpiration ? upcomingExpiration.name : 'Sin alertas'}
            </h4>
            <span className="text-xs text-muted-foreground">
              {upcomingExpiration
                ? new Date(upcomingExpiration.expirationDate).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'No hay lotes por vencer'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Principales (2 columnas en desktop, 1 en mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Ingresos vs Ganancia por día (2/3 de ancho) */}
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                {isSingleDay ? 'Ingresos y ganancia por hora' : 'Ingresos y ganancia por día'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSingleDay
                  ? 'Evolución por tramos horarios durante el día seleccionado.'
                  : 'Cuánto entró (ingresos) y cuánto te quedó (ganancia) cada día.'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-chart-1" />
                <span className="text-muted-foreground">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-chart-2" />
                <span className="text-muted-foreground">Ganancia</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {dailyData && dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    formatter={(val) => money(val)}
                    contentStyle={{
                      backgroundColor: 'var(--color-card, #ffffff)',
                      borderColor: 'var(--color-border, #e5e7eb)',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    name="Ingresos"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ganancia"
                    name="Ganancia"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGanancia)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                No hay datos de ventas en este período.
              </div>
            )}
          </div>
        </div>

          {/* Gráfico Donut de medios de pago (1/3 de ancho) */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground font-heading">¿Cómo te pagan?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reparto de ingresos según el medio de pago.
            </p>
          </div>

          <div className="relative h-56 w-full my-3 flex items-center justify-center">
            {paymentMethodsData && paymentMethodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={4}
                    cornerRadius={5}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
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
                Sin datos de medios de pago.
              </div>
            )}

            {/* Texto central del Donut (Total del Período) */}
            {paymentMethodsData && paymentMethodsData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Total
                </span>
                <span className="text-base sm:text-lg font-extrabold text-foreground font-heading tabular-nums leading-tight">
                  {money(paymentMethodsData.reduce((sum, item) => sum + (item.value || 0), 0))}
                </span>
              </div>
            )}
          </div>

          {/* Leyenda a la derecha/debajo */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            {paymentMethodsData?.map((pm, idx) => (
              <div key={pm.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                  />
                  <span className="text-foreground font-medium">{pm.name}</span>
                </div>
                <span className="text-muted-foreground font-semibold">
                  {pm.count ? `${pm.count} vta.` : money(pm.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
