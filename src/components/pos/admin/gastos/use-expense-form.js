import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { buildExpenseFormValues, toExpenseInput } from './gastos-view-model'

/** Draft state and submit flow for creating or editing one expense. */
export function useExpenseForm({ expense, month, onSave, onDone }) {
  const toast = useToast()
  const [values, setValues] = useState(() => buildExpenseFormValues(expense, { month }))
  const [isSaving, setIsSaving] = useState(false)

  const setField = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onSave(toExpenseInput(values, expense))
      toast(expense ? 'Gasto actualizado' : 'Gasto registrado')
      onDone()
    } catch (err) {
      toast(err?.message ?? 'No se pudo guardar el gasto', 'error')
      setIsSaving(false)
    }
  }

  return { values, setField, submit, isSaving }
}
