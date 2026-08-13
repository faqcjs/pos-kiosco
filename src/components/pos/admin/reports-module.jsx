'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, ShoppingBag, TrendingUp, CreditCard, Inbox } from 'lucide-react'
import { ReportsHeader } from './reports-header'
import { ReportsKpis } from './reports-kpis'
import { TabResumen } from './tab-resumen'
import { TabVentas } from './tab-ventas'
import { TabProductos } from './tab-productos'
import { TabMetodosPago } from './tab-metodos-pago'
import { TabHistorialCaja } from './tab-historial-caja'

function toLocalDateStr(d = new Date()) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ReportsModule({
  sales = [],
  products = [],
  shifts = [],
  onRefresh,
  dateFrom: externalDateFrom,
  dateTo: externalDateTo,
  onDateFromChange,
  onDateToChange,
  onApplyPreset: externalApplyPreset,
  paymentMethod = 'todos',
  onPaymentMethodChange,
}) {
  const [reportTab, setReportTab] = useState('resumen')

  // Map for fast product cost lookup
  const productsMap = useMemo(() => {
    const map = new Map()
    if (products) {
      products.forEach((p) => {
        if (p.id) map.set(p.id, p)
        if (p.name) map.set(p.name, p)
      })
    }
    return map
  }, [products])

  // Helper for sale cost
  const getSaleCost = (s) => {
    if (typeof s.cost === 'number' && s.cost > 0) return s.cost
    if (!s.items || s.items.length === 0) return 0
    return s.items.reduce((sum, item) => {
      const unitCost = item.cost ?? (item.productId ? productsMap.get(item.productId)?.cost : 0) ?? (productsMap.get(item.name)?.cost) ?? 0
      return sum + unitCost * (item.qty || 1)
    }, 0)
  }

  // Fechas por defecto si no se reciben props externas
  const todayStr = useMemo(() => toLocalDateStr(new Date()), [])
  const firstOfMonthStr = useMemo(() => {
    const d = new Date()
    return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [])

  const [internalDateFrom, setInternalDateFrom] = useState(firstOfMonthStr)
  const [internalDateTo, setInternalDateTo] = useState(todayStr)

  const dateFrom = externalDateFrom !== undefined ? externalDateFrom : internalDateFrom
  const dateTo = externalDateTo !== undefined ? externalDateTo : internalDateTo
  const setDateFrom = onDateFromChange || setInternalDateFrom
  const setDateTo = onDateToChange || setInternalDateTo

  // Aplicar presets rápidos
  const handleApplyPreset = (preset) => {
    if (externalApplyPreset) {
      externalApplyPreset(preset)
      return
    }
    const now = new Date()
    if (preset === 'hoy') {
      const str = toLocalDateStr(now)
      setDateFrom(str)
      setDateTo(str)
    } else if (preset === 'mes') {
      const start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
      const end = toLocalDateStr(now)
      setDateFrom(start)
      setDateTo(end)
    } else if (preset === 'anio') {
      const start = toLocalDateStr(new Date(now.getFullYear(), 0, 1))
      const end = toLocalDateStr(now)
      setDateFrom(start)
      setDateTo(end)
    }
  }

  const isExternalHeader = externalDateFrom !== undefined

  // Filtrado de Ventas por Rango de Fecha y Método de Pago
  const filteredSales = useMemo(() => {
    if (!sales || sales.length === 0) return []
    const startMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0
    const endMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity

    return sales.filter((s) => {
      const rawDate = s.date || s.created_at || s.createdAt
      if (!rawDate) return false
      const normalizedDate = typeof rawDate === 'string' && rawDate.includes(' ') && !rawDate.includes('T')
        ? rawDate.replace(' ', 'T')
        : rawDate
      const t = new Date(normalizedDate).getTime()
      const matchesDate = !isNaN(t) && t >= startMs && t <= endMs
      if (!matchesDate) return false
      if (paymentMethod && paymentMethod !== 'todos') {
        const method = s.method || 'efectivo'
        return method === paymentMethod
      }
      return true
    })
  }, [sales, dateFrom, dateTo, paymentMethod])

  // Filtrado de Sesiones de Caja por Rango de Fecha
  const filteredShifts = useMemo(() => {
    if (!shifts || shifts.length === 0) return []
    const startMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0
    const endMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity

    return shifts.filter((s) => {
      const t = new Date(s.openedAt || s.createdAt).getTime()
      return !isNaN(t) && t >= startMs && t <= endMs
    })
  }, [shifts, dateFrom, dateTo])

  // KPIs Totales del período filtrado
  const kpis = useMemo(() => {
    let revenue = 0
    let cost = 0

    filteredSales.forEach((s) => {
      revenue += s.total || 0
      cost += getSaleCost(s)
    })

    const profit = revenue - cost
    const totalSales = filteredSales.length
    const averageTicket = totalSales > 0 ? revenue / totalSales : 0

    return { revenue, profit, totalSales, averageTicket }
  }, [filteredSales, productsMap])

  // Datos para gráfico de área (por horas si es 1 solo día, por días si es un rango)
  const dailyData = useMemo(() => {
    const isSingleDay = dateFrom && dateTo && dateFrom === dateTo

    if (isSingleDay) {
      const map = new Map()
      // Generar 12 bloques de 2 horas (00:00, 02:00, 04:00, ..., 22:00)
      for (let h = 0; h < 24; h += 2) {
        const label = `${String(h).padStart(2, '0')}:00`
        map.set(label, { label, ventas: 0, ganancia: 0 })
      }

      filteredSales.forEach((s) => {
        const dateObj = new Date(s.date)
        if (isNaN(dateObj.getTime())) return
        const hour = dateObj.getHours()
        const blockHour = Math.floor(hour / 2) * 2
        const label = `${String(blockHour).padStart(2, '0')}:00`
        const prev = map.get(label) || { label, ventas: 0, ganancia: 0 }
        const saleCost = getSaleCost(s)
        prev.ventas += s.total || 0
        prev.ganancia += (s.total || 0) - saleCost
        map.set(label, prev)
      })

      return Array.from(map.values())
    }

    if (filteredSales.length === 0 && (!dateFrom || !dateTo)) return []
    const map = new Map()

    if (dateFrom && dateTo) {
      const start = new Date(`${dateFrom}T00:00:00`)
      const end = new Date(`${dateTo}T00:00:00`)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24))

      if (diffDays >= 0 && diffDays <= 90 && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const curr = new Date(start)
        while (curr <= end) {
          const key = toLocalDateStr(curr)
          const label = curr.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '')
          map.set(key, { label, ventas: 0, ganancia: 0 })
          curr.setDate(curr.getDate() + 1)
        }
      }
    }

    filteredSales.forEach((s) => {
      const dateObj = new Date(s.date)
      if (isNaN(dateObj.getTime())) return
      const key = toLocalDateStr(dateObj)
      const label = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '')
      const prev = map.get(key) || { label, ventas: 0, ganancia: 0 }
      const saleCost = getSaleCost(s)
      prev.ventas += s.total || 0
      prev.ganancia += (s.total || 0) - saleCost
      map.set(key, prev)
    })

    return Array.from(map.values())
  }, [filteredSales, dateFrom, dateTo, productsMap])

  // Datos para gráfico donut de medios de pago
  const paymentMethodsData = useMemo(() => {
    if (filteredSales.length === 0) return []
    const map = {}
    const labels = {
      efectivo: 'Efectivo',
      qr: 'Mercado Pago / QR',
      transferencia: 'Transferencia',
      fiado: 'Fiado',
      debito: 'Débito',
      credito: 'Crédito',
    }

    filteredSales.forEach((s) => {
      const m = s.method || 'efectivo'
      if (!map[m]) map[m] = { name: labels[m] || m, value: 0, count: 0 }
      map[m].value += s.total || 0
      map[m].count += 1
    })

    return Object.values(map)
  }, [filteredSales])

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
    { id: 'ventas', label: 'Ventas', icon: ShoppingBag },
    { id: 'productos', label: 'Productos', icon: TrendingUp },
    { id: 'metodos-pago', label: 'Métodos de pago', icon: CreditCard },
    { id: 'historial-caja', label: 'Historial de Caja', icon: Inbox },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Header con Filtros de Fecha (solo si no es renderizado externamente en el PageHeader) */}
      {!isExternalHeader && (
        <ReportsHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApplyPreset={handleApplyPreset}
          onRefresh={onRefresh}
        />
      )}

      {/* 2. KPIs del período (Fijos superior) */}
      <ReportsKpis
        revenue={kpis.revenue}
        profit={kpis.profit}
        totalSales={kpis.totalSales}
        averageTicket={kpis.averageTicket}
      />

      {/* 3. Sub-navegación por Pestañas (Pill Tabs) */}
      <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/50 p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = reportTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setReportTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 sm:px-3 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4. Contenido dinámico según pestaña activa */}
      <div className="animate-in fade-in-50 duration-300">
        {reportTab === 'resumen' && (
          <TabResumen
            sales={filteredSales}
            products={products}
            dailyData={dailyData}
            paymentMethodsData={paymentMethodsData}
            isSingleDay={dateFrom && dateTo && dateFrom === dateTo}
          />
        )}

        {reportTab === 'ventas' && <TabVentas sales={filteredSales} />}

        {reportTab === 'productos' && (
          <TabProductos sales={filteredSales} products={products} />
        )}

        {reportTab === 'metodos-pago' && <TabMetodosPago sales={filteredSales} />}

        {reportTab === 'historial-caja' && <TabHistorialCaja shifts={filteredShifts} />}
      </div>
    </div>
  )
}
