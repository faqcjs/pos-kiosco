import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { EmptyState, Input, Label } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useStore } from '@/lib/store'
import { summarizeExpensesByCategory } from '@/lib/expenses'
import { getExpensesTotal, selectMonthExpenses, toMonthValue } from './gastos-view-model'
import { ExpenseFormModal } from './expense-form-modal'
import { ExpenseRow } from './expense-row'
import { ExpenseSummary } from './expense-summary'

// Admin-only section: list, create, edit and delete operating expenses by month
export function GastosSection() {
  const { state, registerExpense, updateExpense, deleteExpense } = useStore()
  const toast = useToast()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  // null = closed, { expense: null } = new, { expense } = editing
  const [form, setForm] = useState(null)

  const monthExpenses = useMemo(() => selectMonthExpenses(state.expenses, month), [state.expenses, month])
  const categories = useMemo(() => summarizeExpensesByCategory(monthExpenses), [monthExpenses])
  const total = useMemo(() => getExpensesTotal(monthExpenses), [monthExpenses])

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id)
      toast('Gasto eliminado')
      return true
    } catch (err) {
      toast(err?.message ?? 'No se pudo eliminar el gasto', 'error')
      return false
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-[200px]">
          <Label htmlFor="expenses-month">Mes</Label>
          <Input
            id="expenses-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value || toMonthValue(new Date()))}
          />
        </div>
        <Button type="button" className="h-11 w-full sm:w-auto" onClick={() => setForm({ expense: null })}>
          <Plus /> Cargar gasto
        </Button>
      </header>

      <ExpenseSummary categories={categories} total={total} />

      {monthExpenses.length === 0 ? (
        <EmptyState
          title="Sin gastos en este mes"
          description="Cargá sueldos, alquiler o servicios para ver el resultado del mes."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {monthExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={(selected) => setForm({ expense: selected })}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {form && (
        <ExpenseFormModal
          expense={form.expense}
          month={month}
          hasOpenShift={Boolean(state.currentShift)}
          onSave={form.expense ? updateExpense : registerExpense}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  )
}
