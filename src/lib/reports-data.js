// Pure data builders for the admin Reportes screen.
import { getSaleProfit, getUncostedRevenue } from './sale-cost'

export const DEFAULT_PAYMENT_METHOD = 'efectivo'
export const ALL_PAYMENT_METHODS = 'todos'

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  qr: 'Mercado Pago / QR',
  transferencia: 'Transferencia',
  fiado: 'Fiado',
  debito: 'Débito',
  credito: 'Crédito',
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
// Daily chart shows one point per day up to this range; longer ranges only get days with sales
const MAX_DAILY_CHART_DAYS = 90
// Single-day chart groups sales in blocks of this many hours
const HOURS_PER_BLOCK = 2
const HOURS_PER_DAY = 24
const CHART_DATE_FORMAT = { day: '2-digit', month: 'short' }
const CHART_LOCALE = 'es-AR'
const START_OF_DAY = 'T00:00:00'
const END_OF_DAY = 'T23:59:59.999'

const pad2 = (n) => String(n).padStart(2, '0')

export function toLocalDateStr(d = new Date()) {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Local start of a 'YYYY-MM-DD' day, or null when empty or invalid. */
export function startOfLocalDay(day) {
  if (!day) return null
  const date = new Date(`${day}${START_OF_DAY}`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Local end (last millisecond) of a 'YYYY-MM-DD' day, or null when empty or invalid. */
export function endOfLocalDay(day) {
  if (!day) return null
  const date = new Date(`${day}${END_OF_DAY}`)
  return Number.isNaN(date.getTime()) ? null : date
}

const rangeStartMs = (dateFrom) => (dateFrom ? new Date(`${dateFrom}${START_OF_DAY}`).getTime() : 0)
const rangeEndMs = (dateTo) => (dateTo ? new Date(`${dateTo}${END_OF_DAY}`).getTime() : Infinity)

/**
 * Date of a sale, or null when it has none or it is invalid.
 * Some old sales store 'YYYY-MM-DD HH:mm:ss' instead of ISO.
 * Shared by the KPIs and the monthly result so both count the same sales.
 */
export function parseSaleDate(sale) {
  const rawDate = sale?.date || sale?.created_at || sale?.createdAt
  if (!rawDate) return null
  const normalized =
    typeof rawDate === 'string' && rawDate.includes(' ') && !rawDate.includes('T') ? rawDate.replace(' ', 'T') : rawDate
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const saleTime = (sale) => parseSaleDate(sale)?.getTime() ?? NaN

export function filterSalesByDate(sales = [], dateFrom, dateTo) {
  const startMs = rangeStartMs(dateFrom)
  const endMs = rangeEndMs(dateTo)
  return sales.filter((sale) => {
    const t = saleTime(sale)
    return !Number.isNaN(t) && t >= startMs && t <= endMs
  })
}

export function filterSalesByMethod(sales = [], paymentMethod) {
  if (!paymentMethod || paymentMethod === ALL_PAYMENT_METHODS) return sales
  return sales.filter((sale) => (sale.method || DEFAULT_PAYMENT_METHOD) === paymentMethod)
}

export function filterShiftsByDate(shifts = [], dateFrom, dateTo) {
  const startMs = rangeStartMs(dateFrom)
  const endMs = rangeEndMs(dateTo)
  return shifts.filter((shift) => {
    const t = new Date(shift.openedAt || shift.createdAt).getTime()
    return !Number.isNaN(t) && t >= startMs && t <= endMs
  })
}

export function buildKpis(sales, productsMap) {
  const totals = sales.reduce(
    (acc, sale) => ({
      revenue: acc.revenue + (sale.total || 0),
      profit: acc.profit + getSaleProfit(sale, productsMap),
      uncostedRevenue: acc.uncostedRevenue + getUncostedRevenue(sale, productsMap),
    }),
    { revenue: 0, profit: 0, uncostedRevenue: 0 },
  )
  const totalSales = sales.length
  return { ...totals, totalSales, averageTicket: totalSales > 0 ? totals.revenue / totalSales : 0 }
}

const addToPoint = (map, key, label, sale, productsMap) => {
  const prev = map.get(key) ?? { label, ventas: 0, ganancia: 0 }
  return new Map(map).set(key, {
    ...prev,
    ventas: prev.ventas + (sale.total || 0),
    ganancia: prev.ganancia + getSaleProfit(sale, productsMap),
  })
}

function buildHourlyData(sales, productsMap) {
  const blocks = Array.from({ length: HOURS_PER_DAY / HOURS_PER_BLOCK }, (_, i) => `${pad2(i * HOURS_PER_BLOCK)}:00`)
  const initial = new Map(blocks.map((label) => [label, { label, ventas: 0, ganancia: 0 }]))
  const filled = sales.reduce((map, sale) => {
    const dateObj = parseSaleDate(sale)
    if (!dateObj) return map
    const label = `${pad2(Math.floor(dateObj.getHours() / HOURS_PER_BLOCK) * HOURS_PER_BLOCK)}:00`
    return addToPoint(map, label, label, sale, productsMap)
  }, initial)
  return Array.from(filled.values())
}

const chartLabel = (date) => date.toLocaleDateString(CHART_LOCALE, CHART_DATE_FORMAT).replace('.', '')

function emptyDays(dateFrom, dateTo) {
  const start = new Date(`${dateFrom}T00:00:00`)
  const end = new Date(`${dateTo}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return new Map()
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY)
  if (diffDays < 0 || diffDays > MAX_DAILY_CHART_DAYS) return new Map()

  const days = Array.from({ length: diffDays + 1 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  return new Map(
    days.filter((day) => day <= end).map((day) => [toLocalDateStr(day), { label: chartLabel(day), ventas: 0, ganancia: 0 }]),
  )
}

/** Sales and profit per 2-hour block for a single day, or per day for a range. */
export function buildChartData(sales, productsMap, dateFrom, dateTo) {
  if (dateFrom && dateTo && dateFrom === dateTo) return buildHourlyData(sales, productsMap)
  if (sales.length === 0 && (!dateFrom || !dateTo)) return []

  const initial = dateFrom && dateTo ? emptyDays(dateFrom, dateTo) : new Map()
  const filled = sales.reduce((map, sale) => {
    const dateObj = parseSaleDate(sale)
    if (!dateObj) return map
    return addToPoint(map, toLocalDateStr(dateObj), chartLabel(dateObj), sale, productsMap)
  }, initial)
  return Array.from(filled.values())
}

export function buildPaymentMethodsData(sales) {
  const byMethod = sales.reduce((acc, sale) => {
    const method = sale.method || DEFAULT_PAYMENT_METHOD
    const prev = acc[method] ?? { name: PAYMENT_METHOD_LABELS[method] ?? method, value: 0, count: 0 }
    return { ...acc, [method]: { ...prev, value: prev.value + (sale.total || 0), count: prev.count + 1 } }
  }, {})
  return Object.values(byMethod)
}
