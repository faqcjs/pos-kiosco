import { useMemo, useState } from 'react'
import { DIRECT_PURCHASE_SUPPLIER_ID } from '@/lib/constants'
import { toPeriod } from '@/lib/expenses'
import { ACTION_KIND, successMessage, toMovementAction, validateMovementRequest } from './movement-request'

const EMPTY_FORM = {
  type: 'ingreso',
  amount: '',
  egresoKind: '',
  category: '',
  supplierId: '',
  reason: '',
  description: '',
}

const ERROR_FALLBACK = 'No se pudo registrar el movimiento'

/**
 * State and submit flow of the "Registrar movimiento" form.
 * @param {{ addMovement: Function, registerExpense: Function, registerSupplierPayment: Function }} actions
 */
export function useMovementForm({ actions, suppliers, toast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const supplierOptions = useMemo(
    () => (suppliers ?? []).filter((s) => s.id !== DIRECT_PURCHASE_SUPPLIER_ID),
    [suppliers],
  )

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function runAction({ kind, args }) {
    if (kind === ACTION_KIND.EXPENSE) return actions.registerExpense(...args)
    if (kind === ACTION_KIND.SUPPLIER_PAYMENT) {
      const payment = await actions.registerSupplierPayment(...args)
      if (!payment) throw new Error(ERROR_FALLBACK)
      return payment
    }
    return actions.addMovement(...args)
  }

  async function submit(event) {
    event?.preventDefault()
    if (saving) return
    const error = validateMovementRequest(form)
    if (error) {
      toast(error, 'error')
      return
    }
    setSaving(true)
    try {
      await runAction(toMovementAction(form, toPeriod(new Date())))
      toast(successMessage(form))
      setForm({ ...EMPTY_FORM, type: form.type, egresoKind: form.egresoKind })
    } catch (err) {
      toast(err?.message ?? ERROR_FALLBACK, 'error')
    } finally {
      setSaving(false)
    }
  }

  return { form, setField, submit, saving, supplierOptions }
}
