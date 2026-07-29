'use client'

import { useMemo, useState, useEffect } from 'react'
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
  Percent,
  ChevronRight,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Badge, Card, EmptyState, StatCard, Modal, Input, Label, Select } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/pos/page-header'
import { useToast } from '@/components/ui/toast'
import { customerBalance, supplierBalance, useStore } from '@/lib/store'
import { formatDate, formatTime, money, moneyShort } from '@/lib/format'
import { cn } from '@/lib/utils'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function Admin() {
  const { state, logout, resetData, createUser, deleteUser, resetDataPending } = useStore()

  const handleReset = () => {
    if (window.confirm('¿Estás seguro de que querés resetear todos los datos? Se borrarán todos los registros de la base de datos y se restaurarán los datos de prueba iniciales.')) {
      resetData()
    }
  }
  const [adminTab, setAdminTab] = useState('stats') // "stats" / "empleados"
  const [range, setRange] = useState('Semana') // "Hoy", "Semana", "Mes", "6 Meses"
  const [visibleDays, setVisibleDays] = useState(10)
  const [selectedDay, setSelectedDay] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [topProductsModalOpen, setTopProductsModalOpen] = useState(false)
  const [topProdCategory, setTopProdCategory] = useState('Todos')

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleRangeChange = (newRange) => {
    if (newRange === range) return
    setRange(newRange)
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 400)
  }

  const stats = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now).getTime()
    const salesToday = state.sales.filter((s) => new Date(s.date).getTime() >= today)
    const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0)
    const marginToday = salesToday.reduce((sum, s) => sum + (s.total - s.cost), 0)
    
    // Historical stats for "Ticket Promedio" and "Margen Promedio %"
    const revenueTotal = state.sales.reduce((sum, s) => sum + s.total, 0)
    const marginTotal = state.sales.reduce((sum, s) => sum + (s.total - s.cost), 0)
    const salesCount = state.sales.length
    
    const ticketPromedio = salesCount > 0 ? revenueTotal / salesCount : 0
    const margenPromedio = revenueTotal > 0 ? (marginTotal / revenueTotal) * 100 : 0

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
      ticketPromedio,
      margenPromedio,
      receivable,
      payable,
      stockValue,
      lowStock,
    }
  }, [state])

  // Dynamic chart data depending on range
  const chartData = useMemo(() => {
    const now = new Date()
    
    if (range === 'Hoy') {
      const todayStart = startOfDay(now).getTime()
      const todaySales = state.sales.filter((s) => new Date(s.date).getTime() >= todayStart)
      const data = []
      for (let h = 0; h < 24; h += 2) {
        const label = `${String(h).padStart(2, '0')}:00`
        const blockSales = todaySales.filter((s) => {
          const date = new Date(s.date)
          const hour = date.getHours()
          return hour >= h && hour < h + 2
        })
        data.push({
          label,
          ventas: blockSales.reduce((sum, s) => sum + s.total, 0),
          ganancia: blockSales.reduce((sum, s) => sum + (s.total - s.cost), 0),
        })
      }
      return data
    }
    
    if (range === 'Semana') {
      const data = []
      for (let i = 6; i >= 0; i--) {
        const d = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
        const next = d.getTime() + 86_400_000
        const daySales = state.sales.filter((s) => {
          const t = new Date(s.date).getTime()
          return t >= d.getTime() && t < next
        })
        data.push({
          label: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
          ventas: daySales.reduce((sum, s) => sum + s.total, 0),
          ganancia: daySales.reduce((sum, s) => sum + (s.total - s.cost), 0),
        })
      }
      return data
    }
    
    if (range === 'Mes') {
      const data = []
      for (let i = 29; i >= 0; i--) {
        const d = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
        const next = d.getTime() + 86_400_000
        const daySales = state.sales.filter((s) => {
          const t = new Date(s.date).getTime()
          return t >= d.getTime() && t < next
        })
        data.push({
          label: d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', ''),
          ventas: daySales.reduce((sum, s) => sum + s.total, 0),
          ganancia: daySales.reduce((sum, s) => sum + (s.total - s.cost), 0),
        })
      }
      return data
    }
    
    if (range === '6 Meses') {
      const data = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
        const monthSales = state.sales.filter((s) => {
          const t = new Date(s.date).getTime()
          return t >= start && t < end
        })
        data.push({
          label: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
          ventas: monthSales.reduce((sum, s) => sum + s.total, 0),
          ganancia: monthSales.reduce((sum, s) => sum + (s.total - s.cost), 0),
        })
      }
      return data
    }
    
    return []
  }, [state.sales, range])

  const chartTotals = useMemo(() => {
    const totalVentas = chartData.reduce((sum, d) => sum + d.ventas, 0)
    const totalGanancia = chartData.reduce((sum, d) => sum + d.ganancia, 0)
    return { totalVentas, totalGanancia }
  }, [chartData])

  // payment method breakdown
  const byMethod = useMemo(() => {
    const map = { efectivo: 0, qr: 0, fiado: 0 }
    for (const s of state.sales) map[s.method] += s.total
    const labels = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: labels[k], value: v }))
  }, [state.sales])

  // top products
  const topProducts = useMemo(() => {
    const map = new Map()
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

  // Todos los productos vendidos con su categoría para filtros del modal
  const allSoldProducts = useMemo(() => {
    const map = new Map()
    for (const s of state.sales) {
      for (const item of s.items) {
        const key = item.productId ?? item.name
        if (!map.has(key)) {
          const prod = state.products.find((p) => p.id === item.productId || p.name === item.name)
          map.set(key, {
            id: key,
            name: item.name,
            qty: 0,
            total: 0,
            category: prod?.category || 'Varios'
          })
        }
        const entry = map.get(key)
        entry.qty += item.qty
        entry.total += item.price * item.qty
      }
    }
    return [...map.values()]
  }, [state.sales, state.products])

  const topCategories = useMemo(() => {
    const cats = new Set(allSoldProducts.map((p) => p.category))
    return ['Todos', ...cats]
  }, [allSoldProducts])

  const filteredTopProducts = useMemo(() => {
    let list = allSoldProducts
    if (topProdCategory !== 'Todos') {
      list = list.filter((p) => p.category === topProdCategory)
    }
    return list.sort((a, b) => b.qty - a.qty).slice(0, 10)
  }, [allSoldProducts, topProdCategory])

  // historical sales grouped by day
  const salesByDayList = useMemo(() => {
    const groups = {}
    for (const s of state.sales) {
      const dateStr = startOfDay(new Date(s.date)).toISOString()
      if (!groups[dateStr]) {
        groups[dateStr] = {
          id: dateStr,
          date: new Date(dateStr),
          sales: [],
          total: 0,
        }
      }
      groups[dateStr].sales.push(s)
      groups[dateStr].total += s.total
    }
    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [state.sales])

  // Métricas de ventas agrupadas por turno de caja (últimos 8 turnos)
  const shiftSalesData = useMemo(() => {
    const allShifts = state.shiftHistory || []
    
    const data = allShifts.map((shift) => {
      const dateObj = new Date(shift.openedAt)
      const day = String(dateObj.getDate()).padStart(2, '0')
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const dateLabel = `${day}/${month}`
      
      const cashierName = shift.openedBy || 'Cajero'
      
      const shiftSales = (state.sales || [])
        .filter((sale) => sale.shiftId === shift.id)
        .reduce((sum, sale) => sum + sale.total, 0)
        
      return {
        label: `${cashierName.slice(0, 8)} (${dateLabel})`,
        cashier: cashierName,
        dateLabel,
        ventas: shiftSales,
        difference: shift.difference || 0,
        sales: shiftSales,
        ganancia: 0,
      }
    })
    
    return data.slice(-8)
  }, [state.shiftHistory, state.sales])

  function formatDayLabel(date) {
    const today = startOfDay(new Date())
    const yesterday = startOfDay(new Date(Date.now() - 86400000))
    const d = startOfDay(date)
    
    if (d.getTime() === today.getTime()) return 'Hoy'
    if (d.getTime() === yesterday.getTime()) return 'Ayer'
    
    const str = date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const recentSales = state.sales.slice(0, 6)
  const hasData = state.sales.length > 0

  return (
    <div className="mx-auto max-w-6xl min-h-[80vh] flex flex-col justify-center p-1.5 py-6 space-y-5 lg:p-6 animate-in fade-in duration-500">
      <PageHeader
        title="Panel de administración"
        description="Resumen del negocio en tiempo real"
        action={
          <div className="flex gap-2">
            <Button variant="destructive" onClick={logout}>
              <Lock className="size-4" />
              Cerrar sesión
            </Button>
          </div>
        }
      />

      <div className="flex rounded-lg border border-border p-0.5 bg-muted/50 max-w-[240px]">
        <button
          onClick={() => setAdminTab('stats')}
          className={`flex-1 text-center rounded-md py-1 text-xs font-medium transition-all duration-200 ease-out ${
            adminTab === 'stats'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Estadísticas
        </button>
        <button
          onClick={() => setAdminTab('empleados')}
          className={`flex-1 text-center rounded-md py-1 text-xs font-medium transition-all duration-200 ease-out ${
            adminTab === 'empleados'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Empleados
        </button>
      </div>

      {adminTab === 'empleados' ? (
        <UsersTab state={state} createUser={createUser} deleteUser={deleteUser} />
      ) : (
        <>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Ventas de hoy"
          value={isLoading ? <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse my-1.5" /> : money(stats.revenueToday)}
          sub={isLoading ? <div className="h-3.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /> : `${stats.salesTodayCount} oper.`}
          tone="success"
          icon={<DollarSign className="size-4" />}
          className="p-3 transform-gpu"
        />
        <StatCard
          label="Ganancia de hoy"
          value={isLoading ? <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse my-1.5" /> : money(stats.marginToday)}
          sub={isLoading ? <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /> : "Margen bruto"}
          tone="accent"
          icon={<TrendingUp className="size-4" />}
          className="p-3 transform-gpu"
        />
        <StatCard
          label="Ticket Promedio"
          value={isLoading ? <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse my-1.5" /> : money(stats.ticketPromedio)}
          sub={isLoading ? <div className="h-3.5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /> : "Histórico"}
          tone="default"
          icon={<ReceiptText className="size-4" />}
          className="p-3 transform-gpu"
        />
        <StatCard
          label="Margen Promedio"
          value={isLoading ? <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse my-1.5" /> : `${stats.margenPromedio.toFixed(1)}%`}
          sub={isLoading ? <div className="h-3.5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /> : "Histórico"}
          tone="accent"
          icon={<Percent className="size-4" />}
          className="p-3 transform-gpu"
        />
        <StatCard
          label="Por cobrar (fiado)"
          value={isLoading ? <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse my-1.5" /> : money(stats.receivable)}
          sub={isLoading ? <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /> : `${state.customers.length} clientes`}
          tone="warning"
          icon={<Users className="size-4" />}
          className="p-3 transform-gpu"
        />
        <StatCard
          label="A pagar (prov.)"
          value={isLoading ? <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse my-1.5" /> : money(stats.payable)}
          sub={isLoading ? <div className="h-3.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /> : `${state.suppliers.length} proveedores`}
          tone="danger"
          icon={<ReceiptText className="size-4" />}
          className="p-3 transform-gpu"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2 overflow-hidden w-full min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading font-semibold">Ventas del período</h3>
              <p className="text-xs text-muted-foreground">
                {range === 'Hoy' && 'Últimas 24 horas'}
                {range === 'Semana' && 'Últimos 7 días'}
                {range === 'Mes' && 'Últimos 30 días'}
                {range === '6 Meses' && 'Últimos 6 meses'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border p-0.5 bg-muted/50">
                {['Hoy', 'Semana', 'Mes', '6 Meses'].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRangeChange(r)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ease-out ${
                      range === r
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Badge tone="success">
                Total {isLoading ? (
                  <span className="inline-block w-12 h-3 bg-white/40 rounded animate-pulse align-middle ml-1" />
                ) : (
                  money(chartTotals.totalVentas)
                )}
              </Badge>
            </div>
          </div>
          {isLoading ? (
            <div className="h-[240px] flex items-end justify-between gap-2 pt-8 pb-2 px-4">
              <div className="h-[30%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[70%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[45%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[80%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[60%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[90%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[65%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[75%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[50%] bg-muted/60 rounded animate-pulse w-full" />
              <div className="h-[70%] bg-muted/60 rounded animate-pulse w-full" />
            </div>
          ) : hasData ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGanancia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
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

        <Card className="p-4 sm:p-5 overflow-hidden w-full min-w-0">
          <h3 className="mb-1 font-heading font-semibold">Medios de pago</h3>
          <p className="mb-2 text-xs text-muted-foreground">Distribución histórica</p>
          {isLoading ? (
            <div className="py-2 space-y-6">
              <div className="size-36 rounded-full bg-muted/60 animate-pulse mx-auto flex items-center justify-center">
                <div className="size-24 rounded-full bg-card" />
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-4 bg-muted/40 rounded animate-pulse w-full" />
                <div className="h-4 bg-muted/40 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted/40 rounded animate-pulse w-4/5" />
              </div>
            </div>
          ) : byMethod.length > 0 ? (
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

      {/* Ventas por Turno de Caja */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Card className="p-4 sm:p-5 lg:col-span-2 overflow-hidden w-full min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading font-semibold text-base">Ventas por Turno de Caja</h3>
              <p className="text-xs text-muted-foreground">
                Facturación total en cada uno de los últimos turnos de caja cerrados.
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-[240px] flex items-end justify-between gap-2 pt-8 pb-2 px-4 animate-pulse">
              <div className="h-[30%] bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-[60%] bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-[45%] bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-[80%] bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-[50%] bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
            </div>
          ) : shiftSalesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={shiftSalesData} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => moneyShort(Number(v))}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="ventas" name="Ventas" radius={[6, 6, 0, 0]} fill="var(--chart-1)" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Sin turnos registrados" description="Las estadísticas aparecerán cuando los empleados operen la caja." />
          )}
        </Card>

        {/* Resumen de Diferencias de Caja */}
        <Card className="p-4 sm:p-5 overflow-hidden w-full min-w-0">
          <h3 className="mb-1 font-heading font-semibold text-base">Últimos Cierres</h3>
          <p className="mb-3 text-xs text-muted-foreground">Estado y descuadre de los últimos turnos</p>
          {isLoading ? (
            <div className="py-2 space-y-4">
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
            </div>
          ) : shiftSalesData.length > 0 ? (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {[...shiftSalesData].reverse().slice(0, 5).map((s, idx) => {
                const diffColor = s.difference < 0 ? 'text-destructive font-bold' : s.difference > 0 ? 'text-success font-bold' : 'text-muted-foreground'
                return (
                  <div key={idx} className="flex items-center justify-between text-xs pb-2 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-foreground truncate">{s.cashier}</p>
                      <p className="text-muted-foreground text-[10px]">{s.dateLabel}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-foreground">{money(s.ventas)}</p>
                      <p className={`text-[10px] ${diffColor}`}>
                        {s.difference === 0 ? 'Perfecto' : (s.difference > 0 ? '+' : '') + money(s.difference)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="Sin datos" />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2 overflow-hidden w-full min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading font-semibold text-base">Productos más vendidos</h3>
            {hasData && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold px-2.5"
                onClick={() => setTopProductsModalOpen(true)}
              >
                Ver más
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="h-[220px] flex flex-col justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-5 bg-muted/60 rounded animate-pulse flex-1 max-w-[85%]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-5 bg-muted/60 rounded animate-pulse flex-1 max-w-[70%]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-5 bg-muted/60 rounded animate-pulse flex-1 max-w-[55%]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-5 bg-muted/60 rounded animate-pulse flex-1 max-w-[40%]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-5 bg-muted/60 rounded animate-pulse flex-1 max-w-[25%]" />
              </div>
            </div>
          ) : topProducts.length > 0 ? (
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
          <Card className="p-4 sm:p-5 overflow-hidden w-full min-w-0">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <h3 className="font-heading font-semibold">Inventario</h3>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Valor de stock (a costo)</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{money(stats.stockValue)}</p>
          </Card>

          <Card className="p-4 sm:p-5 overflow-hidden w-full min-w-0">
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

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2 overflow-hidden w-full min-w-0">
          <h3 className="mb-3 font-heading font-semibold">Historial de Ventas por Día</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : salesByDayList.length === 0 ? (
            <EmptyState title="Sin ventas registradas" />
          ) : (
            <div className="space-y-2">
              {salesByDayList.slice(0, visibleDays).map((day) => (
                <div
                  key={day.id}
                  onClick={() => setSelectedDay(day)}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-border bg-card hover:bg-muted/80 hover:shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-medium">{formatDayLabel(day.date)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {day.sales.length} {day.sales.length === 1 ? 'operación' : 'operaciones'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs sm:text-sm font-bold tabular-nums">{money(day.total)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              
              {visibleDays < salesByDayList.length && (
                <div className="pt-2 text-center">
                  <Button variant="outline" size="sm" onClick={() => setVisibleDays((prev) => prev + 10)}>
                    Cargar más días
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-1 overflow-hidden w-full min-w-0">
          <h3 className="mb-3 font-heading font-semibold">Últimas ventas</h3>
          {recentSales.length === 0 ? (
            <EmptyState title="Sin ventas registradas" />
          ) : (
            <div className="divide-y divide-border">
              {recentSales.map((s) => {
                const label = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }[s.method]
                const tone = s.method === 'efectivo' ? 'success' : s.method === 'qr' ? 'default' : 'warning'
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2 sm:py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs sm:text-sm font-medium">
                        {s.items.length} art. · {s.items.map((i) => i.name).slice(0, 1).join(', ')}
                        {s.items.length > 1 ? '…' : ''}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(s.date)}</p>
                    </div>
                    <Badge tone={tone}>{label}</Badge>
                    <p className="min-w-[64px] sm:min-w-[80px] text-right font-heading text-xs sm:text-sm font-bold tabular-nums">{money(s.total)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modal de Productos Más Vendidos (Top 10) */}
      <Modal
        open={topProductsModalOpen}
        onClose={() => {
          setTopProductsModalOpen(false)
          setTopProdCategory('Todos')
        }}
        title="Productos más vendidos"
        variant="large"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Ranking de los 10 productos con mayor cantidad de unidades vendidas en el período seleccionado.
          </p>

          {/* Filtro de Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border">
            {topCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setTopProdCategory(cat)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all shrink-0 active:scale-95",
                  topProdCategory === cat
                    ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                )}
              >
                {cat === 'Todos' ? 'Todos los rubros' : cat}
              </button>
            ))}
          </div>

          {/* Listado con barras de progreso */}
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 pt-1">
            {filteredTopProducts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">
                No hay ventas registradas en esta categoría.
              </p>
            ) : (
              filteredTopProducts.map((p, idx) => {
                const maxQty = filteredTopProducts[0]?.qty || 1
                const percent = Math.round((p.qty / maxQty) * 100)
                return (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-foreground truncate pr-2">
                        {idx + 1}. {p.name}
                        <span className="text-[10px] text-muted-foreground uppercase font-bold ml-2 bg-muted px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                      </span>
                      <span className="font-semibold text-foreground shrink-0">
                        {p.qty} u. <span className="text-xs text-muted-foreground font-normal">({money(p.total)})</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Detalle de Ventas - ${formatDayLabel(selectedDay.date)}` : ''}
      >
        {selectedDay && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">Total del día:</span>
              <span className="font-heading text-lg font-bold text-success">{money(selectedDay.total)}</span>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {selectedDay.sales.map((sale) => {
                const label = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }[sale.method]
                const tone = sale.method === 'efectivo' ? 'success' : sale.method === 'qr' ? 'default' : 'warning'
                
                return (
                  <div key={sale.id} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded text-foreground font-mono">
                          {formatTime(sale.date)}
                        </span>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <span className="font-heading text-sm font-bold tabular-nums">{money(sale.total)}</span>
                    </div>
                    
                    <div className="pl-2 border-l-2 border-border space-y-1">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-foreground font-medium">
                            {item.qty}x {item.name}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {money(item.price * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  )
}

function UsersTab({ state, createUser, deleteUser }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('cajero')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Obtener ventas asociadas al empleado seleccionado
  const selectedEmpSales = useMemo(() => {
    if (!selectedEmp) return []
    const allShifts = state.shiftHistory || []
    const empShifts = new Set(
      allShifts.filter((s) => s.openedBy === selectedEmp).map((s) => s.id)
    )
    return (state.sales || [])
      .filter((s) => empShifts.has(s.shiftId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedEmp, state.sales, state.shiftHistory])

  const selectedEmpTotal = useMemo(() => {
    return selectedEmpSales.reduce((sum, s) => sum + s.total, 0)
  }, [selectedEmpSales])

  const activeUsers = useMemo(() => {
    return (state.users || []).filter((u) => u.role !== 'administrador')
  }, [state.users])

  // Calculate metrics for each user
  const userMetrics = useMemo(() => {
    const metrics = {}
    
    // Initialize
    for (const u of activeUsers) {
      metrics[u.username] = {
        totalSales: 0,
        salesCount: 0,
        totalDiff: 0,
      }
    }
    
    // Sum sales
    for (const sale of state.sales || []) {
      const u = sale.soldBy || 'admin'
      if (metrics[u]) {
        metrics[u].totalSales += sale.total
        metrics[u].salesCount += 1
      }
    }
    
    // Sum shift differences.
    for (const shift of state.shiftHistory || []) {
      const closedByUser = (state.users || []).find((u) => u.name === shift.closedBy)
      if (closedByUser && metrics[closedByUser.username]) {
        metrics[closedByUser.username].totalDiff += (shift.difference || 0)
      }
    }
    
    return metrics
  }, [activeUsers, state.sales, state.shiftHistory, state.users])

  // Calcular métricas agrupadas por el nombre tipeado en los turnos de caja
  const employeeMetrics = useMemo(() => {
    const metrics = {}
    
    const excludeNames = new Set(['admin', 'desarrollo', 'TodoPasa', 'Todo Pasa', 'Desarrollo', 'admin@kiosko.com', 'cajero@kiosko.com'])
    const allShifts = state.shiftHistory || []
    
    for (const shift of allShifts) {
      if (shift.openedBy && !excludeNames.has(shift.openedBy)) {
        metrics[shift.openedBy] = { name: shift.openedBy, totalSales: 0, salesCount: 0, shiftsCount: 0, totalDiff: 0 }
      }
      if (shift.closedBy && !excludeNames.has(shift.closedBy)) {
        metrics[shift.closedBy] = { name: shift.closedBy, totalSales: 0, salesCount: 0, shiftsCount: 0, totalDiff: 0 }
      }
    }
    
    for (const shift of allShifts) {
      const opName = shift.openedBy
      const clName = shift.closedBy
      
      if (opName && metrics[opName]) {
        metrics[opName].shiftsCount += 1
      }
      if (clName && metrics[clName]) {
        metrics[clName].totalDiff += (shift.difference || 0)
      }
    }
    
    const shiftsMap = {}
    for (const shift of allShifts) {
      shiftsMap[shift.id] = shift.openedBy
    }
    
    for (const sale of state.sales || []) {
      const shiftOwner = shiftsMap[sale.shiftId]
      if (shiftOwner && metrics[shiftOwner]) {
        metrics[shiftOwner].totalSales += sale.total
        metrics[shiftOwner].salesCount += 1
      }
    }
    
    return Object.values(metrics).sort((a, b) => b.totalSales - a.totalSales)
  }, [state.shiftHistory, state.sales])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) return
    setIsSubmitting(true)
    createUser(username.trim(), password.trim(), name.trim(), role, {
      onSuccess: () => {
        toast('Usuario creado con éxito', 'success')
        setName('')
        setUsername('')
        setPassword('')
        setRole('cajero')
        setIsSubmitting(false)
        setIsCreateModalOpen(false)
      },
      onError: (err) => {
        console.error('Error al crear usuario:', err)
        toast(`Error al crear usuario: ${err.message || 'Intenta con otro usuario'}`, 'error')
        setIsSubmitting(false)
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-350">
      {/* Tarjeta 1: Desempeño por Nombre de Turno (Tipeado por empleados) */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-lg">Rendimiento por Turno de Empleado</h3>
          <p className="text-xs text-muted-foreground">
            Métricas consolidadas por el nombre ingresado al abrir y cerrar la caja (cajeros con cuenta compartida).
          </p>
        </div>

        {employeeMetrics.length === 0 ? (
          <EmptyState 
            title="Sin turnos registrados" 
            description="Las estadísticas aparecerán cuando los empleados abran y cierren turnos en la caja." 
          />
        ) : (
          <div className="space-y-4">
            {/* Mobile layout (cards) - visible on < md */}
            <div className="grid gap-3 md:hidden">
              {employeeMetrics.map((emp) => {
                const diffColor = emp.totalDiff < 0 ? 'text-destructive font-bold' : emp.totalDiff > 0 ? 'text-success font-bold' : 'text-muted-foreground'
                return (
                  <div 
                    key={emp.name} 
                    className="rounded-xl border border-border p-4 space-y-2 bg-muted/10 hover:bg-muted/20 active:scale-[0.99] transition-all cursor-pointer select-none"
                    onClick={() => setSelectedEmp(emp.name)}
                  >
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <h4 className="font-semibold text-foreground text-base">{emp.name}</h4>
                      <Badge tone="muted" className="text-[10px] px-1.5 py-0.5">
                        {emp.shiftsCount} {emp.shiftsCount === 1 ? 'Turno' : 'Turnos'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                      <div>
                        <p className="text-muted-foreground font-medium">Ventas</p>
                        <p className="font-semibold text-foreground mt-0.5">{money(emp.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Operac.</p>
                        <p className="font-semibold text-foreground mt-0.5">{emp.salesCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Diff. Caja</p>
                        <p className={`font-semibold mt-0.5 ${diffColor}`}>
                          {emp.totalDiff === 0 ? '$0' : (emp.totalDiff > 0 ? '+' : '') + money(emp.totalDiff)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop layout (table) - visible on >= md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold bg-muted/20">
                    <th className="py-3 px-4 whitespace-nowrap">Empleado (Caja)</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Turnos Trab.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Total Ventas</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Operaciones</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Diferencia Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employeeMetrics.map((emp) => {
                    const diffColor = emp.totalDiff < 0 ? 'text-destructive font-bold' : emp.totalDiff > 0 ? 'text-success font-bold' : 'text-muted-foreground'
                    return (
                      <tr 
                        key={emp.name} 
                        className="hover:bg-muted/20 active:bg-muted/30 transition-colors cursor-pointer select-none"
                        onClick={() => setSelectedEmp(emp.name)}
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">{emp.name}</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">{emp.shiftsCount}</td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">{money(emp.totalSales)}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground">{emp.salesCount}</td>
                        <td className={`py-3 px-4 text-right ${diffColor}`}>
                          {emp.totalDiff === 0 ? '$0' : (emp.totalDiff > 0 ? '+' : '') + money(emp.totalDiff)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Tarjeta 2: Cuentas Registradas */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-lg">Usuarios Registrados</h3>
            <p className="text-xs text-muted-foreground">
              Lista de cuentas de usuarios registradas en el sistema.
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            size="sm" 
            className="gap-1.5 font-bold shrink-0 self-start sm:self-auto h-9"
          >
            <UserPlus className="size-4" />
            Nuevo Usuario
          </Button>
        </div>
        {activeUsers.length === 0 ? (
          <EmptyState title="Sin usuarios" description="No hay usuarios registrados todavía." />
        ) : (
          <div className="space-y-4">
            {/* Mobile layout (cards) - visible on < md */}
            <div className="grid gap-3 md:hidden">
              {activeUsers.map((c) => {
                return (
                  <div key={c.id} className="rounded-xl border border-border p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground text-base">{c.name}</h4>
                        <p className="text-xs text-muted-foreground">@{c.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={c.role === 'repositor' ? 'accent' : 'muted'} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                          {c.role === 'repositor' ? 'Repositor' : 'Empleado'}
                        </Badge>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que querés eliminar el usuario "${c.name}"?`)) {
                              deleteUser(c.id, {
                                onSuccess: () => toast('Usuario eliminado', 'info'),
                                onError: (err) => toast(`Error: ${err.message || 'No se pudo eliminar'}`, 'error')
                              })
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all inline-flex items-center justify-center"
                          title="Eliminar usuario"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop layout (table) - visible on >= md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold bg-muted/20">
                    <th className="py-3 px-4 whitespace-nowrap">Nombre</th>
                    <th className="py-3 px-4 whitespace-nowrap">Usuario</th>
                    <th className="py-3 px-4 whitespace-nowrap">Rol</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeUsers.map((c) => {
                    return (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{c.username}</td>
                        <td className="py-3 px-4">
                          <Badge tone={c.role === 'repositor' ? 'accent' : 'muted'} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                            {c.role === 'repositor' ? 'Repositor' : 'Empleado'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de que querés eliminar el usuario "${c.name}"?`)) {
                                deleteUser(c.id, {
                                  onSuccess: () => toast('Usuario eliminado', 'info'),
                                  onError: (err) => toast(`Error: ${err.message || 'No se pudo eliminar'}`, 'error')
                                })
                              }
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all inline-flex items-center justify-center"
                            title="Eliminar usuario"
                            aria-label="Eliminar usuario"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalle de Ventas por Empleado */}
      <Modal
        open={!!selectedEmp}
        onClose={() => setSelectedEmp(null)}
        title={selectedEmp ? `Detalle de Ventas - ${selectedEmp}` : ''}
        variant="large"
      >
        {selectedEmp && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">Total facturado:</span>
              <span className="font-heading text-lg font-bold text-success">{money(selectedEmpTotal)}</span>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedEmpSales.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-10">
                  No hay ventas registradas para este empleado.
                </p>
              ) : (
                selectedEmpSales.map((sale) => {
                  const label = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }[sale.method]
                  const tone = sale.method === 'efectivo' ? 'success' : sale.method === 'qr' ? 'default' : 'warning'
                  
                  return (
                    <div key={sale.id} className="rounded-xl border border-border p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{formatDate(sale.date)} - {formatTime(sale.date)}</span>
                        <Badge tone={tone} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                          {label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="font-medium text-foreground">
                          {sale.itemsCount} {sale.itemsCount === 1 ? 'producto' : 'productos'}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {money(sale.total)}
                        </span>
                      </div>
                      <div className="pl-2 border-l border-border space-y-1">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{item.name} (x{item.qty})</span>
                            <span className="text-muted-foreground tabular-nums">
                              {money(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para Crear Nuevo Usuario */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nuevo Usuario"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee-name">Nombre Completo</Label>
            <Input
              id="employee-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div>
            <Label htmlFor="employee-username">Usuario</Label>
            <Input
              id="employee-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. juan.empleado"
            />
          </div>
          <div>
            <Label htmlFor="employee-password">Contraseña</Label>
            <Input
              id="employee-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña de acceso"
            />
          </div>
          <div>
            <Label htmlFor="employee-role">Rol</Label>
            <Select
              id="employee-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="cajero">Empleado</option>
              <option value="repositor">Repositor</option>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full h-11 font-bold">
            {isSubmitting ? 'Registrando...' : 'Registrar Usuario'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
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
