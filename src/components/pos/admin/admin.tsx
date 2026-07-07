'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  DollarSign,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
  Lock,
} from 'lucide-react'
import { Badge, Card, EmptyState, StatCard } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/pos/page-header'
import { customerBalance, supplierBalance, useStore } from '@/lib/store'
import { formatDate, money, moneyShort } from '@/lib/format'
import type { Sale } from '@/lib/types'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function Admin() {
  const { state, logoutAdmin } = useStore()

  const stats = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now).getTime()
    const salesToday = state.sales.filter((s) => new Date(s.date).getTime() >= today)
    const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0)
    const marginToday = salesToday.reduce((sum, s) => sum + (s.total - s.cost), 0)
    const revenueTotal = state.sales.reduce((sum, s) => sum + s.total, 0)
    const marginTotal = state.sales.reduce((sum, s) => sum + (s.total - s.cost), 0)

    const receivable = state.customers.reduce((sum, c) => sum + Math.max(0, customerBalance(c)), 0)
    const payable = state.suppliers.reduce((sum, s) => sum + Math.max(0, supplierBalance(s)), 0)

    const stockValue = state.products.reduce((sum, p) => sum + p.cost * p.stock, 0)
    const lowStock = state.products.filter((p) => p.stock <= p.minStock)

    return {
      salesTodayCount: salesToday.length,
      revenueToday,
      marginToday,
      revenueTotal,
      marginTotal,
      receivable,
      payable,
      stockValue,
      lowStock,
    }
  }, [state])

  // last 7 days revenue
  const salesByDay = useMemo(() => {
    const days: { label: string; ventas: number; ganancia: number }[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
      const next = d.getTime() + 86_400_000
      const daySales = state.sales.filter((s) => {
        const t = new Date(s.date).getTime()
        return t >= d.getTime() && t < next
      })
      days.push({
        label: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
        ventas: daySales.reduce((sum, s) => sum + s.total, 0),
        ganancia: daySales.reduce((sum, s) => sum + (s.total - s.cost), 0),
      })
    }
    return days
  }, [state.sales])

  // payment method breakdown
  const byMethod = useMemo(() => {
    const map: Record<string, number> = { efectivo: 0, qr: 0, fiado: 0 }
    for (const s of state.sales) map[s.method] += s.total
    const labels: Record<string, string> = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: labels[k], value: v }))
  }, [state.sales])

  // top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>()
    for (const s of state.sales) {
      for (const item of s.items) {
        const key = item.productId ?? item.name
        const prev = map.get(key) ?? { name: item.name, qty: 0, total: 0 }
        prev.qty += item.qty
        prev.total += item.price * item.qty
        map.set(key, prev)
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [state.sales])

  const recentSales: Sale[] = state.sales.slice(0, 6)
  const hasData = state.sales.length > 0

  return (
    <div className="mx-auto max-w-6xl min-h-[80vh] flex flex-col justify-center p-1.5 py-6 space-y-5 lg:p-6">
      <PageHeader
        title="Panel de administración"
        description="Resumen del negocio en tiempo real"
        action={
          <Button variant="destructive" onClick={logoutAdmin}>
            <Lock className="size-4" />
            Cerrar sesión
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={money(stats.revenueToday)}
          sub={`${stats.salesTodayCount} operaciones`}
          tone="success"
          icon={<DollarSign className="size-4" />}
          className="p-3"
        />
        <StatCard
          label="Ganancia de hoy"
          value={money(stats.marginToday)}
          sub="Margen bruto"
          tone="accent"
          icon={<TrendingUp className="size-4" />}
          className="p-3"
        />
        <StatCard
          label="Por cobrar (fiado)"
          value={money(stats.receivable)}
          sub={`${state.customers.length} clientes`}
          tone="warning"
          icon={<Users className="size-4" />}
          className="p-3"
        />
        <StatCard
          label="A pagar (prov.)"
          value={money(stats.payable)}
          sub={`${state.suppliers.length} proveedores`}
          tone="danger"
          icon={<ReceiptText className="size-4" />}
          className="p-3"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold">Ventas de la semana</h3>
              <p className="text-xs text-muted-foreground">Últimos 7 días</p>
            </div>
            <Badge tone="success">Total {money(stats.revenueTotal)}</Badge>
          </div>
          {hasData ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={salesByDay} margin={{ left: -18, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGanancia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => moneyShort(Number(v))}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="ventas" name="Ventas" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gVentas)" />
                <Area type="monotone" dataKey="ganancia" name="Ganancia" stroke="var(--chart-3)" strokeWidth={2} fill="url(#gGanancia)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Sin ventas todavía" description="Registrá ventas en el módulo de Venta para ver estadísticas." />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 font-heading font-semibold">Medios de pago</h3>
          <p className="mb-2 text-xs text-muted-foreground">Distribución histórica</p>
          {byMethod.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                    {byMethod.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {byMethod.map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {m.name}
                    </span>
                    <span className="font-medium tabular-nums">{money(m.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="Sin datos" />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-heading font-semibold">Productos más vendidos</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip content={<ChartTooltip unit=" u." />} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="qty" name="Unidades" radius={[0, 6, 6, 0]} fill="var(--chart-2)" barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Sin ventas" />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <h3 className="font-heading font-semibold">Inventario</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Valor de stock (a costo)</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{money(stats.stockValue)}</p>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning-foreground" />
              <h3 className="font-heading font-semibold">Stock bajo</h3>
            </div>
            {stats.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo en orden.</p>
            ) : (
              <ul className="space-y-2">
                {stats.lowStock.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{p.name}</span>
                    <Badge tone={p.stock === 0 ? 'danger' : 'warning'}>{p.stock} u.</Badge>
                  </li>
                ))}
                {stats.lowStock.length > 5 && (
                  <li className="text-xs text-muted-foreground">+{stats.lowStock.length - 5} más</li>
                )}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-heading font-semibold">Últimas ventas</h3>
        {recentSales.length === 0 ? (
          <EmptyState title="Sin ventas registradas" />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="divide-y divide-border min-w-[480px]">
              {recentSales.map((s) => {
                const label = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }[s.method]
                const tone = s.method === 'efectivo' ? 'success' : s.method === 'qr' ? 'default' : 'warning'
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.items.length} art. · {s.items.map((i) => i.name).slice(0, 2).join(', ')}
                        {s.items.length > 2 ? '…' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.date)}</p>
                    </div>
                    <Badge tone={tone as 'success' | 'default' | 'warning'}>{label}</Badge>
                    <p className="w-24 text-right font-heading text-sm font-bold tabular-nums">{money(s.total)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean
  payload?: { name: string; value: number; color?: string }[]
  label?: string
  unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      {label && <p className="mb-1 text-xs font-semibold capitalize">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{unit ? `${p.value}${unit}` : money(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
