import { money } from '@/lib/format'
import { ExpenseRow } from './expense-row'
import { UNKNOWN_DAY, groupExpensesByDay } from './gastos-insights'

const DAY_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' }
const DAY_LOCALE = 'es-AR'

const dayLabel = (day) =>
  day === UNKNOWN_DAY ? 'Sin fecha de pago' : new Date(`${day}T12:00:00`).toLocaleDateString(DAY_LOCALE, DAY_FORMAT)

/** Expenses grouped by the day they were paid, newest first, each day with its total. */
export function ExpenseDayList({ expenses, onEdit, onDelete }) {
  const groups = groupExpensesByDay(expenses)

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.day} aria-label={dayLabel(group.day)} className="flex flex-col gap-1">
          <header className="flex items-baseline justify-between gap-3 px-3">
            <h3 className="text-sm font-semibold text-muted-foreground first-letter:uppercase">{dayLabel(group.day)}</h3>
            <span className="text-sm text-muted-foreground tabular-nums">{money(group.total)}</span>
          </header>
          <ul className="flex flex-col overflow-hidden bg-card rounded-2xl border border-border divide-y divide-border">
            {group.items.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
