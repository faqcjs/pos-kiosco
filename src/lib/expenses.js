// Operating expenses (gastos operativos): catalogs and pure helpers.
// Must stay in sync with the CHECK constraints and register_expense_rpc in supabase_patch_gastos.sql.

export const EXPENSE_CATEGORIES = [
  { id: 'sueldos', label: 'Sueldos' },
  { id: 'alquiler', label: 'Alquiler' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'impuestos', label: 'Impuestos' },
  { id: 'otros', label: 'Otros' },
]

export const EXPENSE_ORIGINS = [
  { id: 'turno', label: 'Caja del turno', hint: 'Sale del cajón ahora: resta en el arqueo del turno.' },
  { id: 'efectivo_acumulado', label: 'Efectivo acumulado', hint: 'Plata de cajas ya cerradas: no toca el arqueo.' },
  { id: 'transferencia', label: 'Transferencia / cuenta', hint: 'Pago por fuera del efectivo: no toca el arqueo.' },
]

export const SHIFT_ORIGIN = 'turno'
export const EXPENSE_MOVEMENT_TYPE = 'gasto'

const CATEGORY_IDS = new Set(EXPENSE_CATEGORIES.map((c) => c.id))
const CATEGORY_LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c.label]))

const pad2 = (n) => String(n).padStart(2, '0')

export function getExpenseCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? category
}

/**
 * First day of the month as 'YYYY-MM-01'.
 * @param {Date | string} value a Date (local time) or a 'YYYY-MM' string
 */
export function toPeriod(value) {
  if (typeof value === 'string') return `${value.slice(0, 7)}-01`
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-01`
}

/** @returns {string | null} the first validation error, or null when the expense can be saved */
export function validateExpense({ category, amount, period, origin, shiftId }) {
  if (!CATEGORY_IDS.has(category)) return 'Elegí una categoría'
  if (!(Number(amount) > 0)) return 'Ingresá un monto mayor a cero'
  if (!period) return 'Elegí el mes al que corresponde'
  if (origin === SHIFT_ORIGIN && !shiftId) return 'Abrí la caja para pagar un gasto con plata del turno'
  return null
}

export function buildExpenseRpcArgs(expense) {
  const isShift = expense.origin === SHIFT_ORIGIN
  return {
    p_expense_id: expense.id,
    p_category: expense.category,
    p_amount: Number(expense.amount),
    p_description: expense.description?.trim() ?? '',
    p_period: expense.period,
    p_paid_at: expense.paidAt ?? null,
    p_origin: expense.origin,
    p_shift_id: isShift ? expense.shiftId : null,
    p_movement_id: isShift ? expense.movementId : null,
  }
}

/** The shift movement register_expense_rpc appends for an expense paid from the drawer. */
export function buildExpenseMovement(expense) {
  const description = expense.description?.trim()
  return {
    id: expense.movementId,
    date: expense.paidAt,
    type: EXPENSE_MOVEMENT_TYPE,
    amount: -Math.abs(Number(expense.amount) || 0),
    reason: `Gasto (${expense.category})${description ? ` - ${description}` : ''}`,
    expenseId: expense.id,
  }
}

/** Totals per category, in catalog order, skipping categories without expenses. */
export function summarizeExpensesByCategory(expenses = []) {
  return EXPENSE_CATEGORIES.map(({ id, label }) => ({
    category: id,
    label,
    total: expenses.filter((e) => e.category === id).reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
  })).filter((row) => row.total > 0)
}
