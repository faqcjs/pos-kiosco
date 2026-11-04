// Pure view logic for the admin "Gastos" section.
import { EXPENSE_CATEGORIES, EXPENSE_ORIGINS, SHIFT_ORIGIN, toPeriod } from '@/lib/expenses'

export const DEFAULT_EXPENSE_ORIGIN = 'efectivo_acumulado'
// Noon keeps the chosen day stable when the ISO string is converted across time zones
const PAYMENT_HOUR = 12

const pad2 = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM' from a local Date or from a 'YYYY-MM-DD' period string. */
export function toMonthValue(value) {
  if (typeof value === 'string') return value.slice(0, 7)
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}`
}

function toDayValue(date) {
  return `${toMonthValue(date)}-${pad2(date.getDate())}`
}

function dayToIso(day) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date, PAYMENT_HOUR).toISOString()
}

/** Expenses whose period is the given month, newest payment first. */
export function selectMonthExpenses(expenses = [], month) {
  const period = toPeriod(month)
  return expenses
    .filter((expense) => expense.period?.slice(0, 10) === period)
    .sort((a, b) => String(b.paidAt ?? '').localeCompare(String(a.paidAt ?? '')))
}

export function getExpensesTotal(expenses = []) {
  return expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
}

/** Expenses paid with the shift cash are read-only (they live inside a cash count). */
export function isExpenseEditable(expense) {
  return expense?.origin !== SHIFT_ORIGIN
}

export function getOriginOptions(hasOpenShift) {
  return EXPENSE_ORIGINS.map((origin) => ({
    ...origin,
    disabled: origin.id === SHIFT_ORIGIN && !hasOpenShift,
  }))
}

export function buildExpenseFormValues(expense, { month, now = new Date() }) {
  if (!expense) {
    return {
      category: EXPENSE_CATEGORIES[0].id,
      amount: '',
      description: '',
      month,
      paidOn: toDayValue(now),
      origin: DEFAULT_EXPENSE_ORIGIN,
    }
  }
  const paidAt = expense.paidAt ? new Date(expense.paidAt) : now
  return {
    category: expense.category,
    amount: String(expense.amount ?? ''),
    description: expense.description ?? '',
    month: toMonthValue(expense.period),
    paidOn: toDayValue(paidAt),
    origin: expense.origin,
  }
}

/** Form values → input for registerExpense (new) or updateExpense (with original). */
export function toExpenseInput(values, original = null) {
  const isShift = values.origin === SHIFT_ORIGIN
  const keepPaidAt = Boolean(original?.paidAt) && toDayValue(new Date(original.paidAt)) === values.paidOn
  const editedPaidAt = keepPaidAt ? original.paidAt : dayToIso(values.paidOn)
  const input = {
    category: values.category,
    amount: Number(values.amount),
    description: values.description?.trim() ?? '',
    period: toPeriod(values.month),
    paidAt: isShift ? undefined : editedPaidAt,
    origin: values.origin,
  }
  return original ? { ...original, ...input } : input
}
