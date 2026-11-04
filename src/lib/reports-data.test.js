import { describe, it, expect } from 'vitest'
import {
  buildChartData,
  buildKpis,
  buildPaymentMethodsData,
  filterSalesByDate,
  filterSalesByMethod,
  filterShiftsByDate,
  toLocalDateStr,
} from './reports-data'
import { buildProductsMap } from './sale-cost'

const MAP = buildProductsMap([{ id: 'a', name: 'Alfajor', cost: 100, price: 200 }])
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString()

const SALES = [
  { id: '1', date: at(2026, 11, 3, 9), total: 400, method: 'efectivo', items: [{ productId: 'a', price: 200, qty: 2, cost: 100 }] },
  { id: '2', date: at(2026, 11, 3, 15), total: 200, method: 'qr', items: [{ productId: 'a', price: 200, qty: 1, cost: 100 }] },
  { id: '3', date: at(2026, 11, 5, 10), total: 300, items: [{ name: 'Monto rápido', price: 300, qty: 1 }] },
]

describe('toLocalDateStr', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toLocalDateStr(new Date(2026, 0, 7))).toBe('2026-01-07')
  })

  it('returns an empty string for invalid dates', () => {
    expect(toLocalDateStr('nope')).toBe('')
  })
})

describe('sale and shift filters', () => {
  it('keeps sales inside the range, inclusive of the last day', () => {
    expect(filterSalesByDate(SALES, '2026-11-03', '2026-11-03').map((s) => s.id)).toEqual(['1', '2'])
  })

  it('accepts old "YYYY-MM-DD HH:mm:ss" dates and created_at', () => {
    const old = [{ id: 'x', created_at: '2026-11-03 10:00:00' }]
    expect(filterSalesByDate(old, '2026-11-03', '2026-11-03')).toHaveLength(1)
  })

  it('filters by payment method, defaulting missing methods to efectivo', () => {
    expect(filterSalesByMethod(SALES, 'efectivo').map((s) => s.id)).toEqual(['1', '3'])
    expect(filterSalesByMethod(SALES, 'todos')).toBe(SALES)
  })

  it('filters shifts by opening date', () => {
    const shifts = [{ id: 's1', openedAt: at(2026, 11, 3) }, { id: 's2', openedAt: at(2026, 10, 1) }]
    expect(filterShiftsByDate(shifts, '2026-11-01', '2026-11-30').map((s) => s.id)).toEqual(['s1'])
  })
})

describe('buildKpis', () => {
  it('sums revenue, profit without uncosted sales, and the average ticket', () => {
    expect(buildKpis(SALES, MAP)).toEqual({
      revenue: 900,
      profit: 300,
      uncostedRevenue: 300,
      totalSales: 3,
      averageTicket: 300,
    })
  })

  it('returns zeros without sales', () => {
    expect(buildKpis([], MAP)).toEqual({ revenue: 0, profit: 0, uncostedRevenue: 0, totalSales: 0, averageTicket: 0 })
  })
})

describe('buildChartData', () => {
  it('groups a single day in twelve 2-hour blocks', () => {
    const data = buildChartData(SALES.slice(0, 2), MAP, '2026-11-03', '2026-11-03')
    expect(data).toHaveLength(12)
    expect(data[4]).toEqual({ label: '08:00', ventas: 400, ganancia: 200 })
    expect(data[7]).toEqual({ label: '14:00', ventas: 200, ganancia: 100 })
  })

  it('has one point per day of the range, including days without sales', () => {
    const data = buildChartData(SALES, MAP, '2026-11-03', '2026-11-05')
    expect(data.map((d) => d.ventas)).toEqual([600, 0, 300])
    expect(data.map((d) => d.ganancia)).toEqual([300, 0, 0])
  })

  it('only lists days with sales when the range is longer than 90 days', () => {
    expect(buildChartData(SALES, MAP, '2026-01-01', '2026-12-31')).toHaveLength(2)
  })

  it('places sales that only have created_at, like the KPIs do', () => {
    const old = [{ id: 'o', created_at: '2026-11-04 10:00:00', total: 50, items: [] }]
    const data = buildChartData(old, MAP, '2026-11-03', '2026-11-05')
    expect(data.map((d) => d.ventas)).toEqual([0, 50, 0])
  })

  it('returns nothing without sales nor range', () => {
    expect(buildChartData([], MAP, '', '')).toEqual([])
  })
})

describe('buildPaymentMethodsData', () => {
  it('totals per method with its label', () => {
    expect(buildPaymentMethodsData(SALES)).toEqual([
      { name: 'Efectivo', value: 700, count: 2 },
      { name: 'Mercado Pago / QR', value: 200, count: 1 },
    ])
  })
})
