import { describe, it, expect } from 'vitest'
import { buildResultFlow, shareOfSales } from './result-flow'

const month = (overrides = {}) => ({
  netSales: 1000,
  uncostedRevenue: 0,
  costOfGoodsSold: 600,
  grossProfit: 400,
  expensesByCategory: [
    { category: 'sueldos', label: 'Sueldos', total: 200 },
    { category: 'servicios', label: 'Servicios', total: 50 },
  ],
  totalExpenses: 250,
  netResult: 150,
  ...overrides,
})

describe('buildResultFlow', () => {
  it('splits net sales into cost, each expense category and what is left', () => {
    const flow = buildResultFlow(month())
    expect(flow.isLoss).toBe(false)
    expect(flow.base).toBe(1000)
    expect(flow.uncovered).toBeNull()
    expect(flow.segments.map((s) => [s.key, s.amount, s.share])).toEqual([
      ['cost', 600, 0.6],
      ['expense:sueldos', 200, 0.2],
      ['expense:servicios', 50, 0.05],
      ['net', 150, 0.15],
    ])
  })

  it('includes uncosted sales as their own segment', () => {
    const flow = buildResultFlow(month({ uncostedRevenue: 100, costOfGoodsSold: 500, netResult: 150 }))
    expect(flow.segments.map((s) => s.key)).toEqual(['cost', 'uncosted', 'expense:sueldos', 'expense:servicios', 'net'])
    expect(flow.segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1)
  })

  it('on a loss, scales to everything that had to be paid and shows the uncovered part', () => {
    const flow = buildResultFlow(month({ costOfGoodsSold: 900, grossProfit: 100, netResult: -150 }))
    expect(flow.isLoss).toBe(true)
    expect(flow.base).toBe(1150)
    expect(flow.segments.map((s) => s.key)).toEqual(['cost', 'expense:sueldos', 'expense:servicios'])
    expect(flow.uncovered).toEqual({ amount: 150, share: 150 / 1150 })
  })

  it('is empty when there is nothing to show', () => {
    const flow = buildResultFlow(month({ netSales: 0, costOfGoodsSold: 0, expensesByCategory: [], totalExpenses: 0, netResult: 0 }))
    expect(flow.segments).toEqual([])
  })
})

describe('shareOfSales', () => {
  it('returns the amount as a fraction of net sales', () => {
    expect(shareOfSales(250, 1000)).toBe(0.25)
  })

  it('is null without sales', () => {
    expect(shareOfSales(250, 0)).toBeNull()
  })
})
