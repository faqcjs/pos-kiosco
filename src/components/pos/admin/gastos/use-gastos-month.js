import { useMemo, useState } from 'react'
import { getExpensesTotal, selectMonthExpenses, toMonthValue } from './gastos-view-model'
import { buildCategoryBreakdown, compareWithPreviousMonth, shiftMonth } from './gastos-insights'

/** Selected month, optional category filter and everything the Gastos screen shows for them. */
export function useGastosMonth(expenses = []) {
  const currentMonth = toMonthValue(new Date())
  const [month, setMonthState] = useState(currentMonth)
  const [activeCategory, setActiveCategory] = useState(null)

  const previousMonth = shiftMonth(month, -1)
  const monthExpenses = useMemo(() => selectMonthExpenses(expenses, month), [expenses, month])
  const previousTotal = useMemo(
    () => getExpensesTotal(selectMonthExpenses(expenses, previousMonth)),
    [expenses, previousMonth],
  )
  const total = getExpensesTotal(monthExpenses)
  const breakdown = useMemo(() => buildCategoryBreakdown(monthExpenses), [monthExpenses])
  const visibleExpenses = useMemo(
    () => (activeCategory ? monthExpenses.filter((e) => e.category === activeCategory) : monthExpenses),
    [monthExpenses, activeCategory],
  )

  // Changing month clears the filter: the category may not exist in the new month
  const setMonth = (next) => {
    setMonthState(next)
    setActiveCategory(null)
  }
  const toggleCategory = (category) => setActiveCategory((current) => (current === category ? null : category))

  return {
    month,
    currentMonth,
    previousMonth,
    setMonth,
    activeCategory,
    toggleCategory,
    clearCategory: () => setActiveCategory(null),
    monthExpenses,
    visibleExpenses,
    total,
    breakdown,
    comparison: compareWithPreviousMonth(total, previousTotal),
  }
}
