import { useState } from 'react'
import { Lock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EXPENSE_ORIGINS, getExpenseCategoryLabel } from '@/lib/expenses'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ORIGIN_ICONS, getCategoryVisual } from './expense-visuals'
import { isExpenseEditable } from './gastos-view-model'

const ORIGIN_LABELS = Object.fromEntries(EXPENSE_ORIGINS.map((origin) => [origin.id, origin.label]))

function DeleteConfirmation({ isDeleting, onCancel, onConfirm }) {
  return (
    <footer role="alert" className="flex flex-wrap items-center justify-end gap-2 px-3 pb-3">
      <span className="mr-auto text-sm">¿Eliminar este gasto?</span>
      <Button type="button" variant="outline" size="sm" disabled={isDeleting} onClick={onCancel} autoFocus>
        Cancelar
      </Button>
      <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={onConfirm}>
        {isDeleting ? 'Eliminando…' : 'Eliminar'}
      </Button>
    </footer>
  )
}

/** One expense: category tile, what it was, how it was paid, amount and actions. */
export function ExpenseRow({ expense, onEdit, onDelete }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const editable = isExpenseEditable(expense)
  const visual = getCategoryVisual(expense.category)
  const CategoryIcon = visual.icon
  const OriginIcon = ORIGIN_ICONS[expense.origin] ?? Lock
  const categoryLabel = getExpenseCategoryLabel(expense.category)

  const confirmDelete = async () => {
    setIsDeleting(true)
    const deleted = await onDelete(expense.id)
    if (!deleted) setIsDeleting(false)
  }

  return (
    <li className={cn('rounded-xl transition-colors', isConfirming && 'bg-destructive/5')}>
      <article className="flex items-center gap-3 p-3">
        <span aria-hidden="true" className={cn('flex items-center justify-center size-10 shrink-0 rounded-xl', visual.tile)}>
          <CategoryIcon className="size-5" />
        </span>

        <div className="flex flex-col flex-1 gap-0.5 min-w-0">
          <p className="truncate text-sm font-semibold">{expense.description || categoryLabel}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {expense.description && <span>{categoryLabel}</span>}
            <span className="inline-flex items-center gap-1">
              <OriginIcon aria-hidden="true" className="size-3.5" />
              {ORIGIN_LABELS[expense.origin] ?? expense.origin}
            </span>
          </p>
        </div>

        <p className="shrink-0 font-heading text-base font-bold tabular-nums">{money(expense.amount)}</p>

        {editable ? (
          <div className="flex shrink-0 gap-0.5">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${categoryLabel}`} onClick={() => onEdit(expense)}>
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Eliminar ${categoryLabel}`}
              className="hover:text-destructive"
              onClick={() => setIsConfirming(true)}
            >
              <Trash2 />
            </Button>
          </div>
        ) : (
          <span title="Pagado con la caja del turno: forma parte de su arqueo y no se puede editar" className="flex items-center justify-center size-8 shrink-0 text-muted-foreground">
            <Lock aria-label="No editable: pagado con la caja del turno" className="size-4" />
          </span>
        )}
      </article>

      {isConfirming && (
        <DeleteConfirmation isDeleting={isDeleting} onCancel={() => setIsConfirming(false)} onConfirm={confirmDelete} />
      )}
    </li>
  )
}
