// Derived data for the Gastos screen: month navigation, category breakdown and day groups.
import { summarizeExpensesByCategory } from '@/lib/expenses'
import { toLocalDateStr } from '@/lib/reports-data'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const MONTHS_PER_YEAR = 12
// Day key for expenses without a valid payment date
export const UNKNOWN_DAY = 'sin-fecha'

const pad2 = (n) => String(n).padStart(2, '0')

const parseMonth = (month) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return { year, monthIndex: monthNumber - 1 }
}

/** 'YYYY-MM' moved by delta months. */
export function shiftMonth(month, delta) {
  const { year, monthIndex } = parseMonth(month)
  const total = year * MONTHS_PER_YEAR + monthIndex + delta
  return `${Math.floor(total / MONTHS_PER_YEAR)}-${pad2((total % MONTHS_PER_YEAR) + 1)}`
}

export function formatMonthLabel(month) {
  const { year, monthIndex } = parseMonth(month)
  return `${MONTH_NAMES[monthIndex]} ${year}`
}

/** Category totals with their share of the month total (0..1), in catalog order. */
export function buildCategoryBreakdown(expenses = []) {
  const rows = summarizeExpensesByCategory(expenses)
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  return rows.map((row) => ({ ...row, share: total > 0 ? row.total / total : 0 }))
}

/** ratio is null when the previous month had no expenses (nothing to compare with). */
export function compareWithPreviousMonth(total, previousTotal) {
  return {
    difference: total - previousTotal,
    ratio: previousTotal > 0 ? (total - previousTotal) / previousTotal : null,
  }
}

const paidDay = (expense) => toLocalDateStr(expense.paidAt) || UNKNOWN_DAY

/** Expenses grouped by local payment day, newest day and newest payment first. */
export function groupExpensesByDay(expenses = []) {
  const sorted = [...expenses].sort((a, b) => String(b.paidAt ?? '').localeCompare(String(a.paidAt ?? '')))
  const days = [...new Set(sorted.map(paidDay))]
  return days.map((day) => {
    const items = sorted.filter((expense) => paidDay(expense) === day)
    return { day, items, total: items.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) }
  })
}
