import { describe, expect, it } from 'vitest'
import { toMovementAction, validateMovementRequest } from './movement-request'

const PERIOD = '2026-11-01'

describe('validateMovementRequest', () => {
  it('rejects a missing or non-positive amount', () => {
    expect(validateMovementRequest({ type: 'ingreso', amount: '', reason: 'x' })).toBe('Ingresá un monto mayor a cero')
    expect(validateMovementRequest({ type: 'ingreso', amount: '-5', reason: 'x' })).toBe('Ingresá un monto mayor a cero')
  })

  it('requires a reason text for an ingreso', () => {
    expect(validateMovementRequest({ type: 'ingreso', amount: '100', reason: '  ' })).toBe('Completá el motivo')
    expect(validateMovementRequest({ type: 'ingreso', amount: '100', reason: 'cambio' })).toBeNull()
  })

  it('requires an egreso reason choice', () => {
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: '' })).toBe('Elegí el motivo del egreso')
  })

  it('requires a category for a gasto', () => {
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: 'gasto', category: '' })).toBe(
      'Elegí una categoría',
    )
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: 'gasto', category: 'sueldos' })).toBeNull()
  })

  it('requires a supplier for a pago a proveedor', () => {
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: 'proveedor', supplierId: '' })).toBe(
      'Elegí un proveedor',
    )
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: 'proveedor', supplierId: 's1' })).toBeNull()
  })

  it('requires a reason text for a retiro', () => {
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: 'retiro', reason: '' })).toBe(
      'Completá el motivo',
    )
    expect(validateMovementRequest({ type: 'egreso', amount: '100', egresoKind: 'retiro', reason: 'dueño' })).toBeNull()
  })
})

describe('toMovementAction', () => {
  it('keeps an ingreso as a plain movement', () => {
    expect(toMovementAction({ type: 'ingreso', amount: '150', reason: ' cambio ' }, PERIOD)).toEqual({
      kind: 'movement',
      args: ['ingreso', 150, 'cambio'],
    })
  })

  it('turns a gasto into a shift expense of the current period', () => {
    expect(
      toMovementAction(
        { type: 'egreso', amount: '2000', egresoKind: 'gasto', category: 'servicios', description: ' luz ' },
        PERIOD,
      ),
    ).toEqual({
      kind: 'expense',
      args: [{ category: 'servicios', amount: 2000, description: 'luz', period: PERIOD, origin: 'turno' }],
    })
  })

  it('turns a pago a proveedor into a cash supplier payment', () => {
    expect(
      toMovementAction({ type: 'egreso', amount: '500', egresoKind: 'proveedor', supplierId: 's1' }, PERIOD),
    ).toEqual({ kind: 'supplierPayment', args: ['s1', 500, true] })
  })

  it('turns a retiro into a retiro movement', () => {
    expect(toMovementAction({ type: 'egreso', amount: '300', egresoKind: 'retiro', reason: ' dueño ' }, PERIOD)).toEqual({
      kind: 'movement',
      args: ['retiro', 300, 'dueño'],
    })
  })
})
