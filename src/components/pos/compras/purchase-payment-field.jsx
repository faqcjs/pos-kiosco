import { cn } from '@/lib/utils'
import { PURCHASE_PAYMENT, PURCHASE_PAYMENT_OPTIONS } from './purchase-draft'

const CLOSED_REGISTER_HINT = 'Abrí la caja para usar esta opción.'
const NO_PAY_PERMISSION_HINT = 'Solo un administrador o cajero puede registrar este pago.'

const getDisabledHint = (optionId, { cashOpen, canPay }) => {
  if (optionId === PURCHASE_PAYMENT.CASH && !cashOpen) return CLOSED_REGISTER_HINT
  if (optionId === PURCHASE_PAYMENT.OTHER && !canPay) return NO_PAY_PERMISSION_HINT
  return null
}

/** "How was it paid?" choice of a new purchase. */
export function PurchasePaymentField({ value, onChange, cashOpen, canPay }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold">¿Cómo se pagó?</legend>
      <div className="grid grid-cols-1 gap-2 mt-1 sm:grid-cols-3">
        {PURCHASE_PAYMENT_OPTIONS.map((option) => {
          const disabledHint = getDisabledHint(option.id, { cashOpen, canPay })
          const isDisabled = disabledHint !== null
          const isSelected = value === option.id
          return (
            <label
              key={option.id}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors',
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                isDisabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              )}
            >
              <input
                type="radio"
                name="purchase-payment"
                value={option.id}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onChange(option.id)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">{disabledHint ?? option.hint}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
