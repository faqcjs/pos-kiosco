import { describe, it, expect } from 'vitest'
import { buildMonthlyResults, selectCompleteMonths } from './profit-and-loss'
import { buildProductsMap, getSaleProfit } from './sale-cost'

const PRODUCTS = [
  { id: 'p1', name: 'Gaseosa', cost: 60 },
  { id: 'p2', name: 'Alfajor', cost: 0 },
]
const PRODUCTS_MAP = buildProductsMap(PRODUCTS)
const NOW = new Date(2026, 11, 15, 12, 0)

const sale = (date, items, total) => ({ id: `s-${date}-${total}`, date, items, total })
const costedSale = (date) => sale(date, [{ productId: 'p1', qty: 1, price: 100, cost: 60 }], 100)
const expense = (overrides) => ({
  id: 'e1',
  category: 'alquiler',
  amount: 1000,
  period: '2026-10-01',
  paidAt: '2026-10-05T10:00:00',
  origin: 'transferencia',
  ...overrides,
})

const build = (overrides) =>
  buildMonthlyResults({
    sales: [],
    productsMap: PRODUCTS_MAP,
    expenses: [],
    shifts: [],
    dateFrom: '2026-10-01',
    dateTo: '2026-11-30',
    now: NOW,
    ...overrides,
  })

describe('buildMonthlyResults', () => {
  it('returns one entry per calendar month of the range, grouping sales by local date', () => {
    const results = build({
      sales: [costedSale('2026-10-31T23:30:00'), costedSale('2026-11-01T00:10:00'), costedSale('2026-11-20T10:00:00')],
    })

    expect(results.map((r) => r.period)).toEqual(['2026-10-01', '2026-11-01'])
    expect(results.map((r) => r.label)).toEqual(['octubre 2026', 'noviembre 2026'])
    expect(results[0]).toMatchObject({ netSales: 100, costOfGoodsSold: 60, grossProfit: 40 })
    expect(results[1]).toMatchObject({ netSales: 200, costOfGoodsSold: 120, grossProfit: 80 })
  })

  it('ignores sales outside the range', () => {
    const [october] = build({
      dateFrom: '2026-10-10',
      dateTo: '2026-10-20',
      sales: [costedSale('2026-10-05T10:00:00'), costedSale('2026-10-15T10:00:00')],
    })

    expect(october.netSales).toBe(100)
  })

  it('flags months the range does not fully cover or that are not over yet', () => {
    const results = build({ dateFrom: '2026-10-10', dateTo: '2026-12-31' })

    expect(results.map((r) => [r.period, r.isPartial])).toEqual([
      ['2026-10-01', true],
      ['2026-11-01', false],
      ['2026-12-01', true],
    ])
  })

  it('assigns expenses to the month of their period, not of their payment date', () => {
    const results = build({
      expenses: [
        expense({ id: 'e1', category: 'sueldos', amount: 500, period: '2026-10-01', paidAt: '2026-11-05T10:00:00' }),
        expense({ id: 'e2', category: 'alquiler', amount: 300, period: '2026-11-01', paidAt: '2026-11-02T10:00:00' }),
        expense({ id: 'e3', category: 'sueldos', amount: 200, period: '2026-10-01', paidAt: '2026-10-30T10:00:00' }),
        expense({ id: 'e4', amount: 999, period: '2026-09-01' }),
      ],
    })

    expect(results[0].expensesByCategory).toEqual([{ category: 'sueldos', label: 'Sueldos', total: 700 }])
    expect(results[0].totalExpenses).toBe(700)
    expect(results[1].expensesByCategory).toEqual([{ category: 'alquiler', label: 'Alquiler', total: 300 }])
    expect(results[1].totalExpenses).toBe(300)
  })

  it('computes the net result as gross profit minus operating expenses', () => {
    const [october] = build({
      sales: [costedSale('2026-10-15T10:00:00')],
      expenses: [expense({ amount: 30 })],
    })

    expect(october.netResult).toBe(10)
  })

  it('never counts purchases or supplier payments as expenses', () => {
    const [october] = build({
      sales: [costedSale('2026-10-15T10:00:00')],
      purchases: [{ id: 'c1', date: '2026-10-10T10:00:00', total: 5000 }],
      shifts: [
        {
          id: 'sh1',
          movements: [
            { id: 'm1', date: '2026-10-12T10:00:00', type: 'pago_proveedor', amount: -4000, reason: 'Proveedor' },
            { id: 'm2', date: '2026-10-12T11:00:00', type: 'retiro', amount: -2000, reason: 'Retiro' },
          ],
        },
      ],
    })

    expect(october.totalExpenses).toBe(0)
    expect(october.unclassifiedEgresos).toBe(0)
    expect(october.netResult).toBe(40)
  })

  it('shows historical egresos apart and does not count gasto movements again', () => {
    const [october, november] = build({
      dateFrom: '2026-10-10',
      expenses: [expense({ amount: 700, origin: 'turno' })],
      shifts: [
        {
          id: 'sh1',
          movements: [
            { id: 'm1', date: '2026-10-12T10:00:00', type: 'egreso', amount: -150, reason: 'Luz' },
            { id: 'm2', date: '2026-10-05T10:00:00', type: 'egreso', amount: -999, reason: 'Fuera de rango' },
            { id: 'm3', date: '2026-10-13T10:00:00', type: 'gasto', amount: -700, reason: 'Gasto (alquiler)' },
            { id: 'm4', date: '2026-10-14T10:00:00', type: 'ingreso', amount: 50, reason: 'Cambio' },
          ],
        },
        { id: 'sh2', movements: [{ id: 'm5', date: '2026-11-02T10:00:00', type: 'egreso', amount: -80, reason: 'Sueldo' }] },
      ],
    })

    expect(october.unclassifiedEgresos).toBe(150)
    expect(october.totalExpenses).toBe(700)
    expect(october.netResult).toBe(-700)
    expect(november.unclassifiedEgresos).toBe(80)
    expect(november.netResult).toBe(0)
  })

  it('keeps uncosted revenue apart and matches the gross profit KPI for the same sales', () => {
    const sales = [
      costedSale('2026-10-15T10:00:00'),
      sale('2026-10-16T10:00:00', [{ productId: 'p2', qty: 2, price: 50, cost: 0 }], 100),
      sale('2026-10-17T10:00:00', [{ name: 'Monto rápido', qty: 1, price: 40 }], 40),
    ]
    const [october] = build({ sales })

    const kpiProfit = sales.reduce((sum, s) => sum + getSaleProfit(s, PRODUCTS_MAP), 0)
    expect(october.grossProfit).toBe(kpiProfit)
    expect(october.netSales).toBe(240)
    expect(october.uncostedRevenue).toBe(140)
    expect(october.grossProfit).toBe(40)
  })
})

describe('selectCompleteMonths', () => {
  it('keeps only fully covered, finished months and lists the skipped ones that had activity', () => {
    const months = build({
      dateFrom: '2026-09-10',
      dateTo: '2026-12-31',
      sales: [costedSale('2026-09-15T10:00:00'), costedSale('2026-11-15T10:00:00'), costedSale('2026-12-02T10:00:00')],
      expenses: [expense({ period: '2026-10-01' })],
    })

    const { complete, inProgress, skipped } = selectCompleteMonths(months)

    expect(complete.map((m) => m.period)).toEqual(['2026-10-01', '2026-11-01'])
    expect(inProgress.period).toBe('2026-12-01')
    expect(skipped.map((m) => m.period)).toEqual(['2026-09-01'])
  })

  it('drops complete months without sales or expenses, and skipped months without activity', () => {
    const months = build({ dateFrom: '2026-10-01', dateTo: '2026-12-31', sales: [costedSale('2026-11-15T10:00:00')] })

    const { complete, skipped } = selectCompleteMonths(months)

    expect(complete.map((m) => m.period)).toEqual(['2026-11-01'])
    expect(skipped).toEqual([])
  })
})

describe('month in progress', () => {
  it('flags the current month with its day when the range covers it from day 1 to today', () => {
    const results = build({ dateFrom: '2026-11-01', dateTo: '2026-12-15' })

    expect(results.map((r) => [r.period, r.progress])).toEqual([
      ['2026-11-01', null],
      ['2026-12-01', { day: 15, daysInMonth: 31 }],
    ])
  })

  it('does not flag the current month when the range starts after day 1 or ends before today', () => {
    const [startsLate] = build({ dateFrom: '2026-12-05', dateTo: '2026-12-15' })
    const [endsEarly] = build({ dateFrom: '2026-12-01', dateTo: '2026-12-10' })

    expect(startsLate.progress).toBeNull()
    expect(endsEarly.progress).toBeNull()
  })

  it('returns the month in progress apart, even without activity, and keeps it out of the skipped months', () => {
    const months = build({ dateFrom: '2026-10-10', dateTo: '2026-12-15', sales: [costedSale('2026-10-15T10:00:00')] })

    const { complete, inProgress, skipped } = selectCompleteMonths(months)

    expect(complete).toEqual([])
    expect(inProgress).toMatchObject({ period: '2026-12-01', netSales: 0 })
    expect(skipped.map((m) => m.period)).toEqual(['2026-10-01'])
  })

  it('returns no month in progress when the range does not reach the current month', () => {
    expect(selectCompleteMonths(build({ dateFrom: '2026-10-01', dateTo: '2026-11-30' })).inProgress).toBeNull()
  })
})
