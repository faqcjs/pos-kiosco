import { useState } from 'react'
import { Lock, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { EXPENSE_ORIGINS, getExpenseCategoryLabel } from '@/lib/expenses'
import { formatDate, money } from '@/lib/format'
import { isExpenseEditable } from './gastos-view-model'

const ORIGIN_LABELS = Object.fromEntries(EXPENSE_ORIGINS.map((origin) => [origin.id, origin.label]))

export function ExpenseRow({ expense, onEdit, onDelete }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const editable = isExpenseEditable(expense)

  const confirmDelete = async () => {
    setIsDeleting(true)
    const deleted = await onDelete(expense.id)
    if (!deleted) setIsDeleting(false)
  }

  return (
    <li className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card">
      <article className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">{getExpenseCategoryLabel(expense.category)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(expense.paidAt)} · {ORIGIN_LABELS[expense.origin] ?? expense.origin}
            </span>
          </div>
          {expense.description && <p className="text-sm truncate">{expense.description}</p>}
          {!editable && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" /> Pagado con la caja del turno: no se puede editar
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 font-heading text-base font-bold">{money(expense.amount)}</span>
          {editable && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar gasto" onClick={() => onEdit(expense)}>
                <Pencil />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar gasto" onClick={() => setIsConfirming(true)}>
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </article>
      {isConfirming && (
        <footer className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
          <span className="mr-auto text-xs text-muted-foreground">¿Eliminar este gasto?</span>
          <Button type="button" variant="outline" size="sm" disabled={isDeleting} onClick={() => setIsConfirming(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={confirmDelete}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </footer>
      )}
    </li>
  )
}
