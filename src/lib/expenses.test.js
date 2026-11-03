import { describe, it, expect } from 'vitest'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_ORIGINS,
  buildExpenseMovement,
  buildExpenseRpcArgs,
  getExpenseCategoryLabel,
  summarizeExpensesByCategory,
  toPeriod,
  validateExpense,
} from './expenses'

describe('expense catalogs', () => {
  it('lists the confirmed categories in order', () => {
    expect(EXPENSE_CATEGORIES.map((c) => c.id)).toEqual(['sueldos', 'alquiler', 'servicios', 'impuestos', 'otros'])
  })

  it('lists the three payment origins', () => {
    expect(EXPENSE_ORIGINS.map((o) => o.id)).toEqual(['turno', 'efectivo_acumulado', 'transferencia'])
  })

  it('falls back to the raw id for unknown categories', () => {
    expect(getExpenseCategoryLabel('alquiler')).toBe('Alquiler')
    expect(getExpenseCategoryLabel('xyz')).toBe('xyz')
  })
})

describe('toPeriod', () => {
  it('returns the first day of the month of a date', () => {
    expect(toPeriod(new Date(2026, 10, 3, 15, 30))).toBe('2026-11-01')
  })

  it('accepts a YYYY-MM month string', () => {
    expect(toPeriod('2026-02')).toBe('2026-02-01')
  })
})

describe('validateExpense', () => {
  const valid = { category: 'servicios', amount: 15000, period: '2026-10-01', origin: 'transferencia' }

  it('accepts a complete expense', () => {
    expect(validateExpense(valid)).toBeNull()
  })

  it('rejects an unknown category', () => {
    expect(validateExpense({ ...valid, category: 'viajes' })).toBe('Elegí una categoría')
  })

  it('rejects a zero or missing amount', () => {
    expect(validateExpense({ ...valid, amount: 0 })).toBe('Ingresá un monto mayor a cero')
    expect(validateExpense({ ...valid, amount: '' })).toBe('Ingresá un monto mayor a cero')
  })

  it('rejects a missing period', () => {
    expect(validateExpense({ ...valid, period: '' })).toBe('Elegí el mes al que corresponde')
  })

  it('requires an open shift when paid from the drawer', () => {
    expect(validateExpense({ ...valid, origin: 'turno' })).toBe('Abrí la caja para pagar un gasto con plata del turno')
    expect(validateExpense({ ...valid, origin: 'turno', shiftId: 's1' })).toBeNull()
  })
})

describe('buildExpenseRpcArgs', () => {
  it('maps an expense to the register_expense_rpc parameters', () => {
    const expense = {
      id: 'e1',
      category: 'sueldos',
      amount: '50000',
      description: ' Sueldo Juan ',
      period: '2026-10-01',
      paidAt: '2026-11-05T12:00:00.000Z',
      origin: 'turno',
      shiftId: 's1',
      movementId: 'm1',
    }
    expect(buildExpenseRpcArgs(expense)).toEqual({
      p_expense_id: 'e1',
      p_category: 'sueldos',
      p_amount: 50000,
      p_description: 'Sueldo Juan',
      p_period: '2026-10-01',
      p_paid_at: '2026-11-05T12:00:00.000Z',
      p_origin: 'turno',
      p_shift_id: 's1',
      p_movement_id: 'm1',
    })
  })

  it('sends no shift for expenses paid outside the drawer', () => {
    const args = buildExpenseRpcArgs({ id: 'e2', category: 'alquiler', amount: 1, period: '2026-10-01', origin: 'transferencia', shiftId: 's1' })
    expect(args.p_shift_id).toBeNull()
    expect(args.p_movement_id).toBeNull()
  })
})

describe('buildExpenseMovement', () => {
  it('builds the same negative gasto movement the RPC appends', () => {
    const expense = { id: 'e1', category: 'servicios', amount: 8000, description: 'Luz', paidAt: '2026-11-05T12:00:00.000Z', movementId: 'm1' }
    expect(buildExpenseMovement(expense)).toEqual({
      id: 'm1',
      date: '2026-11-05T12:00:00.000Z',
      type: 'gasto',
      amount: -8000,
      reason: 'Gasto (servicios) - Luz',
      expenseId: 'e1',
    })
  })

  it('omits the description suffix when there is none', () => {
    const movement = buildExpenseMovement({ id: 'e1', category: 'otros', amount: 10, paidAt: 'd', movementId: 'm1' })
    expect(movement.reason).toBe('Gasto (otros)')
  })
})

describe('summarizeExpensesByCategory', () => {
  it('totals by category in catalog order and skips empty ones', () => {
    const expenses = [
      { category: 'servicios', amount: 100 },
      { category: 'sueldos', amount: 500 },
      { category: 'servicios', amount: 50 },
    ]
    expect(summarizeExpensesByCategory(expenses)).toEqual([
      { category: 'sueldos', label: 'Sueldos', total: 500 },
      { category: 'servicios', label: 'Servicios', total: 150 },
    ])
  })
})
