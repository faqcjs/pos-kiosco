import { useState } from 'react'
import { Plus, Receipt, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useStore } from '@/lib/store'
import { getExpenseCategoryLabel } from '@/lib/expenses'
import { ExpenseBreakdown } from './expense-breakdown'
import { ExpenseDayList } from './expense-day-list'
import { ExpenseFormModal } from './expense-form-modal'
import { MonthNavigator } from './month-navigator'
import { useGastosMonth } from './use-gastos-month'

function EmptyMonth({ onCreate }) {
  return (
    <section className="flex flex-col items-center gap-3 px-6 py-12 text-center rounded-2xl border border-dashed border-border">
      <Receipt aria-hidden="true" className="size-9 text-muted-foreground/60" />
      <div>
        <h3 className="font-heading text-base font-bold">Todavía no hay gastos en este mes</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
          Cargá sueldos, alquiler, servicios e impuestos para ver cuánto te queda en Reportes → Resultados.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus /> Cargar gasto
      </Button>
    </section>
  )
}

// Admin-only section: operating expenses of a month, by category and by payment day
export function GastosSection() {
  const { state, registerExpense, updateExpense, deleteExpense } = useStore()
  const toast = useToast()
  const view = useGastosMonth(state.expenses)
  // null = closed, { expense: null } = new, { expense } = editing
  const [form, setForm] = useState(null)
  const openNew = () => setForm({ expense: null })

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
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator month={view.month} currentMonth={view.currentMonth} onChange={view.setMonth} />
        <Button type="button" className="h-11 w-full sm:w-auto" onClick={openNew}>
          <Plus /> Cargar gasto
        </Button>
      </header>

      {view.monthExpenses.length === 0 ? (
        <EmptyMonth onCreate={openNew} />
      ) : (
        <>
          <ExpenseBreakdown
            total={view.total}
            breakdown={view.breakdown}
            comparison={view.comparison}
            previousMonth={view.previousMonth}
            activeCategory={view.activeCategory}
            onToggleCategory={view.toggleCategory}
          />
          {view.activeCategory && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Mostrando solo {getExpenseCategoryLabel(view.activeCategory).toLowerCase()}
              <Button type="button" variant="ghost" size="sm" onClick={view.clearCategory}>
                <X /> Ver todos
              </Button>
            </p>
          )}
          <ExpenseDayList expenses={view.visibleExpenses} onEdit={(expense) => setForm({ expense })} onDelete={handleDelete} />
        </>
      )}

      {form && (
        <ExpenseFormModal
          expense={form.expense}
          month={view.month}
          hasOpenShift={Boolean(state.currentShift)}
          onSave={form.expense ? updateExpense : registerExpense}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  )
}
