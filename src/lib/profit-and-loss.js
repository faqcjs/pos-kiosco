// Monthly profit and loss (estado de resultados) for the Reports "Resultados" tab.
// Gross profit reuses the per-sale helpers of sale-cost.js so it always matches the KPI.
// Purchases are never expenses here: they reach the result only as cost of goods sold.

import { getSaleCost, getSaleProfit, getUncostedRevenue } from './sale-cost'
import { summarizeExpensesByCategory, toPeriod } from './expenses'
import { endOfLocalDay, parseSaleDate, startOfLocalDay } from './reports-data'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const UNCLASSIFIED_EGRESO_TYPE = 'egreso'
const MONTHS_PER_YEAR = 12

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const parseDate = (raw) => {
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Calendar months touched by [start, end], as Date objects at the first day of each month. */
const listMonths = (start, end) => {
  const count = (end.getFullYear() - start.getFullYear()) * MONTHS_PER_YEAR + end.getMonth() - start.getMonth() + 1
  return Array.from({ length: Math.max(count, 0) }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1))
}

const sumBy = (items, getValue) => items.reduce((sum, item) => sum + getValue(item), 0)

const buildMonth = ({ monthStart, rangeStart, rangeEnd, now, sales, productsMap, expenses, egresos }) => {
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
  const isInMonth = (date) => date >= monthStart && date < nextMonthStart
  const period = toPeriod(monthStart)

  const monthSales = sales.filter((s) => isInMonth(s.date)).map((s) => s.sale)
  const monthExpenses = expenses.filter((e) => toPeriod(String(e?.period ?? '')) === period)
  const expensesByCategory = summarizeExpensesByCategory(monthExpenses)
  const grossProfit = sumBy(monthSales, (s) => getSaleProfit(s, productsMap))
  const totalExpenses = sumBy(expensesByCategory, (row) => row.total)

  return {
    period,
    label: `${MONTH_NAMES[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
    isPartial: rangeStart > monthStart || rangeEnd.getTime() < nextMonthStart.getTime() - 1 || now < nextMonthStart,
    netSales: sumBy(monthSales, (s) => toNumber(s?.total)),
    uncostedRevenue: sumBy(monthSales, (s) => getUncostedRevenue(s, productsMap)),
    costOfGoodsSold: sumBy(monthSales, (s) => getSaleCost(s, productsMap)),
    grossProfit,
    expensesByCategory,
    totalExpenses,
    netResult: grossProfit - totalExpenses,
    unclassifiedEgresos: sumBy(
      egresos.filter((m) => isInMonth(m.date)),
      (m) => Math.abs(m.amount)
    ),
  }
}

/**
 * One profit and loss statement per calendar month touched by the date range, in order.
 * @param {{ sales?: object[], productsMap: Map, expenses?: object[], shifts?: object[],
 *   dateFrom: string, dateTo: string, now?: Date }} params dateFrom/dateTo as local 'YYYY-MM-DD'
 */
export function buildMonthlyResults({ sales = [], productsMap, expenses = [], shifts = [], dateFrom, dateTo, now = new Date() }) {
  const rangeStart = startOfLocalDay(dateFrom)
  const rangeEnd = endOfLocalDay(dateTo)
  if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return []

  const isInRange = (date) => date !== null && date >= rangeStart && date <= rangeEnd

  const datedSales = (sales ?? [])
    .map((sale) => ({ sale, date: parseSaleDate(sale) }))
    .filter((s) => isInRange(s.date))

  const egresos = (shifts ?? [])
    .flatMap((shift) => shift?.movements ?? [])
    .filter((m) => m?.type === UNCLASSIFIED_EGRESO_TYPE)
    .map((m) => ({ date: parseDate(m.date), amount: toNumber(m.amount) }))
    .filter((m) => isInRange(m.date))

  return listMonths(rangeStart, rangeEnd).map((monthStart) =>
    buildMonth({ monthStart, rangeStart, rangeEnd, now, sales: datedSales, productsMap, expenses: expenses ?? [], egresos })
  )
}
