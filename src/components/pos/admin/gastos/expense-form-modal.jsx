import { Input, Label, Modal, Select } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { EXPENSE_CATEGORIES, SHIFT_ORIGIN } from '@/lib/expenses'
import { getOriginOptions } from './gastos-view-model'
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
      title={expense ? 'Editar gasto' : 'Nuevo gasto'}
      subtitle="Sueldos, alquiler, servicios y otros gastos del negocio"
      footer={
        <footer className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </footer>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="expense-category">Categoría</Label>
            <Select id="expense-category" value={values.category} onChange={setField('category')}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="expense-amount">Monto</Label>
            <Input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              required
              value={values.amount}
              onChange={setField('amount')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="expense-description">Descripción</Label>
          <Input
            id="expense-description"
            placeholder="Ej: sueldo de Juan, luz de octubre"
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
