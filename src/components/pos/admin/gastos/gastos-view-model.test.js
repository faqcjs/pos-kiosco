import { describe, it, expect } from 'vitest'
import {
  toMonthValue,
  selectMonthExpenses,
  getExpensesTotal,
  isExpenseEditable,
  getOriginOptions,
  buildExpenseFormValues,
  toExpenseInput,
} from './gastos-view-model'

const expense = (overrides = {}) => ({
  id: 'e1',
  category: 'alquiler',
  amount: 1000,
  description: 'Local',
  period: '2026-10-01',
  paidAt: '2026-10-05T15:00:00.000Z',
  origin: 'transferencia',
  ...overrides,
})

describe('toMonthValue', () => {
  it('formats a local date as YYYY-MM', () => {
    expect(toMonthValue(new Date(2026, 0, 31))).toBe('2026-01')
  })

  it('takes the month of a period string', () => {
    expect(toMonthValue('2026-10-01')).toBe('2026-10')
  })
})

describe('selectMonthExpenses', () => {
  it('keeps only the selected month by period, newest paidAt first', () => {
    const list = [
      expense({ id: 'old', paidAt: '2026-10-02T10:00:00.000Z' }),
      expense({ id: 'other-month', period: '2026-09-01', paidAt: '2026-10-30T10:00:00.000Z' }),
      expense({ id: 'new', paidAt: '2026-10-20T10:00:00.000Z' }),
    ]
    expect(selectMonthExpenses(list, '2026-10').map((e) => e.id)).toEqual(['new', 'old'])
  })

  it('does not mutate the input array', () => {
    const list = [expense({ id: 'a', paidAt: '2026-10-01T00:00:00Z' }), expense({ id: 'b', paidAt: '2026-10-09T00:00:00Z' })]
    selectMonthExpenses(list, '2026-10')
    expect(list.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('returns an empty list when there are no expenses', () => {
    expect(selectMonthExpenses(undefined, '2026-10')).toEqual([])
  })
})

describe('getExpensesTotal', () => {
  it('adds the amounts', () => {
    expect(getExpensesTotal([expense({ amount: 100 }), expense({ amount: '250.5' })])).toBe(350.5)
  })
})

describe('isExpenseEditable', () => {
  it('blocks expenses paid with the shift cash', () => {
    expect(isExpenseEditable(expense({ origin: 'turno' }))).toBe(false)
    expect(isExpenseEditable(expense({ origin: 'efectivo_acumulado' }))).toBe(true)
  })
})

describe('getOriginOptions', () => {
  it('disables the shift origin when no shift is open', () => {
    const turno = getOriginOptions(false).find((o) => o.id === 'turno')
    expect(turno.disabled).toBe(true)
  })

  it('enables every origin with an open shift', () => {
    expect(getOriginOptions(true).every((o) => !o.disabled)).toBe(true)
  })
})

describe('buildExpenseFormValues', () => {
  const now = new Date(2026, 10, 3, 9, 30)

  it('defaults a new expense to the selected month, today and accumulated cash', () => {
    expect(buildExpenseFormValues(null, { month: '2026-10', now })).toEqual({
      category: 'sueldos',
      amount: '',
      description: '',
      month: '2026-10',
      paidOn: '2026-11-03',
      origin: 'efectivo_acumulado',
    })
  })

  it('loads an existing expense', () => {
    const paidAt = new Date(2026, 9, 5, 12).toISOString()
    expect(buildExpenseFormValues(expense({ paidAt }), { month: '2026-11', now })).toEqual({
      category: 'alquiler',
      amount: '1000',
      description: 'Local',
      month: '2026-10',
      paidOn: '2026-10-05',
      origin: 'transferencia',
    })
  })
})

describe('toExpenseInput', () => {
  const values = {
    category: 'servicios',
    amount: '1500',
    description: '  Luz  ',
    month: '2026-10',
    paidOn: '2026-11-02',
    origin: 'transferencia',
  }

  it('maps the form to the store input', () => {
    expect(toExpenseInput(values)).toEqual({
      category: 'servicios',
      amount: 1500,
      description: 'Luz',
      period: '2026-10-01',
      paidAt: new Date(2026, 10, 2, 12).toISOString(),
      origin: 'transferencia',
    })
  })

  it('keeps the original paidAt when the payment day did not change', () => {
    const original = expense({ paidAt: new Date(2026, 10, 2, 18, 45).toISOString() })
    expect(toExpenseInput(values, original)).toMatchObject({ id: 'e1', paidAt: original.paidAt })
  })

  it('leaves paidAt empty for a shift expense so the store stamps the current time', () => {
    expect(toExpenseInput({ ...values, origin: 'turno' }).paidAt).toBeUndefined()
  })
})
