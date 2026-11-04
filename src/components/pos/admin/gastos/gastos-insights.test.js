import { describe, it, expect } from 'vitest'
import {
  buildCategoryBreakdown,
  compareWithPreviousMonth,
  formatMonthLabel,
  groupExpensesByDay,
  shiftMonth,
} from './gastos-insights'

describe('shiftMonth', () => {
  it('moves to the previous and next month across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-11', 0)).toBe('2026-11')
  })
})

describe('formatMonthLabel', () => {
  it('names the month in Spanish with its year', () => {
    expect(formatMonthLabel('2026-11')).toBe('noviembre 2026')
  })
})

describe('buildCategoryBreakdown', () => {
  it('returns each category with its share of the total, in catalog order', () => {
    const expenses = [
      { category: 'servicios', amount: 25 },
      { category: 'sueldos', amount: 75 },
    ]
    expect(buildCategoryBreakdown(expenses)).toEqual([
      { category: 'sueldos', label: 'Sueldos', total: 75, share: 0.75 },
      { category: 'servicios', label: 'Servicios', total: 25, share: 0.25 },
    ])
  })

  it('is empty without expenses', () => {
    expect(buildCategoryBreakdown([])).toEqual([])
  })
})

describe('compareWithPreviousMonth', () => {
  it('returns the difference and the ratio against the previous month', () => {
    expect(compareWithPreviousMonth(120, 100)).toEqual({ difference: 20, ratio: 0.2 })
    expect(compareWithPreviousMonth(50, 100)).toEqual({ difference: -50, ratio: -0.5 })
  })

  it('has no ratio when the previous month had no expenses', () => {
    expect(compareWithPreviousMonth(80, 0)).toEqual({ difference: 80, ratio: null })
  })
})

describe('groupExpensesByDay', () => {
  const at = (d, h) => new Date(2026, 10, d, h).toISOString()

  it('groups by local payment day, newest day first, with each day total', () => {
    const expenses = [
      { id: 'a', amount: 10, paidAt: at(3, 9) },
      { id: 'b', amount: 30, paidAt: at(5, 18) },
      { id: 'c', amount: 5, paidAt: at(3, 20) },
    ]
    const groups = groupExpensesByDay(expenses)
    expect(groups.map((g) => g.day)).toEqual(['2026-11-05', '2026-11-03'])
    expect(groups.map((g) => g.total)).toEqual([30, 15])
    expect(groups[1].items.map((e) => e.id)).toEqual(['c', 'a'])
  })

  it('does not mutate the input', () => {
    const expenses = [{ id: 'a', amount: 1, paidAt: at(3, 9) }, { id: 'b', amount: 1, paidAt: at(4, 9) }]
    const copy = [...expenses]
    groupExpensesByDay(expenses)
    expect(expenses).toEqual(copy)
  })
})
