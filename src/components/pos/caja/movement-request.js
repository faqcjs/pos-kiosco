// Pure rules for the "Registrar movimiento" form: what to validate and which store action to run.
import { EXPENSE_CATEGORIES, SHIFT_ORIGIN } from '@/lib/expenses'

export const MOVEMENT_TYPES = [
  { id: 'ingreso', label: 'Ingreso (+)' },
  { id: 'egreso', label: 'Egreso (-)' },
]

// Reasons a cash egreso can have
export const EGRESO_KIND = Object.freeze({ GASTO: 'gasto', PROVEEDOR: 'proveedor', RETIRO: 'retiro' })

// Store action each request maps to (see use-movement-form.js)
export const ACTION_KIND = Object.freeze({
  MOVEMENT: 'movement',
  EXPENSE: 'expense',
  SUPPLIER_PAYMENT: 'supplierPayment',
})

export const EGRESO_KINDS = [
  { id: EGRESO_KIND.GASTO, label: 'Gasto', hint: 'Sueldos, servicios, alquiler: resta en el arqueo y en el resultado del mes.' },
  { id: EGRESO_KIND.PROVEEDOR, label: 'Pago a proveedor', hint: 'Se anota en la cuenta del proveedor: resta en el arqueo.' },
  { id: EGRESO_KIND.RETIRO, label: 'Retiro', hint: 'Plata que sale del cajón: resta solo en el arqueo.' },
]

const INCOME_TYPE = 'ingreso'
const RETIRO_TYPE = EGRESO_KIND.RETIRO
const FROM_CASH = true
const CATEGORY_IDS = new Set(EXPENSE_CATEGORIES.map((c) => c.id))

/** @returns {string | null} the first validation error, or null when the movement can be registered */
export function validateMovementRequest({ type, amount, egresoKind, category, supplierId, reason }) {
  if (!(Number(amount) > 0)) return 'Ingresá un monto mayor a cero'
  if (type === INCOME_TYPE) return reason?.trim() ? null : 'Completá el motivo'
  if (egresoKind === EGRESO_KIND.GASTO) return CATEGORY_IDS.has(category) ? null : 'Elegí una categoría'
  if (egresoKind === EGRESO_KIND.PROVEEDOR) return supplierId ? null : 'Elegí un proveedor'
  if (egresoKind === EGRESO_KIND.RETIRO) return reason?.trim() ? null : 'Completá el motivo'
  return 'Elegí el motivo del egreso'
}

/**
 * Maps a valid form to the store action that records it.
 * @param {string} period current month as 'YYYY-MM-01'
 * @returns {{ kind: 'movement' | 'expense' | 'supplierPayment', args: unknown[] }}
 */
export function toMovementAction({ type, amount, egresoKind, category, supplierId, reason, description }, period) {
  const value = Number(amount)
  if (type === INCOME_TYPE) return { kind: ACTION_KIND.MOVEMENT, args: [INCOME_TYPE, value, reason.trim()] }
  if (egresoKind === EGRESO_KIND.GASTO) {
    const expense = { category, amount: value, description: description?.trim() ?? '', period, origin: SHIFT_ORIGIN }
    return { kind: ACTION_KIND.EXPENSE, args: [expense] }
  }
  if (egresoKind === EGRESO_KIND.PROVEEDOR) return { kind: ACTION_KIND.SUPPLIER_PAYMENT, args: [supplierId, value, FROM_CASH] }
  return { kind: ACTION_KIND.MOVEMENT, args: [RETIRO_TYPE, value, reason.trim()] }
}

export function successMessage({ type, egresoKind }) {
  if (type === INCOME_TYPE) return 'Ingreso registrado'
  if (egresoKind === EGRESO_KIND.GASTO) return 'Gasto registrado'
  if (egresoKind === EGRESO_KIND.PROVEEDOR) return 'Pago a proveedor registrado'
  return 'Retiro registrado'
}
