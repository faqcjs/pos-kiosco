import { Input, Label, Modal } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { SHIFT_ORIGIN } from '@/lib/expenses'
import { getOriginOptions } from './gastos-view-model'
import { ExpenseCategoryField } from './expense-category-field'
import { ExpenseOriginField } from './expense-origin-field'
import { useExpenseForm } from './use-expense-form'

const FORM_ID = 'expense-form'

export function ExpenseFormModal({ expense, month, hasOpenShift, onSave, onClose }) {
  const { values, setField, submit, isSaving } = useExpenseForm({ expense, month, onSave, onDone: onClose })
  const isShift = values.origin === SHIFT_ORIGIN
  // A saved expense cannot be moved into the shift cash: that needs a cash movement
  const originOptions = getOriginOptions(hasOpenShift).filter((origin) => !expense || origin.id !== SHIFT_ORIGIN)

  return (
    <Modal
      open
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Cargar gasto'}
      footer={
        <footer className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSaving}>
            {isSaving ? 'Guardando…' : expense ? 'Guardar cambios' : 'Cargar gasto'}
          </Button>
        </footer>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="expense-amount">Monto</Label>
          <div className="relative">
            <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-xl font-bold text-muted-foreground">
              $
            </span>
            <Input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              required
              autoFocus
              value={values.amount}
              onChange={setField('amount')}
              className="pl-9 h-14 font-heading text-2xl font-bold tabular-nums"
            />
          </div>
        </div>

        <ExpenseCategoryField value={values.category} onChange={setField('category')} />

        <div>
          <Label htmlFor="expense-description">Detalle (opcional)</Label>
          <Input
            id="expense-description"
            placeholder="Ej: sueldo de Juan, luz de octubre"
            autoComplete="off"
            value={values.description}
            onChange={setField('description')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="expense-month">Mes al que corresponde</Label>
            <Input id="expense-month" type="month" required value={values.month} onChange={setField('month')} />
          </div>
          {!isShift && (
            <div>
              <Label htmlFor="expense-paid-on">Fecha de pago</Label>
              <Input id="expense-paid-on" type="date" required value={values.paidOn} onChange={setField('paidOn')} />
            </div>
          )}
        </div>

        <ExpenseOriginField options={originOptions} value={values.origin} onChange={setField('origin')} />
      </form>
    </Modal>
  )
}
