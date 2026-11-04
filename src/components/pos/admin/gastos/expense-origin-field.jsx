import { cn } from '@/lib/utils'

const CLOSED_SHIFT_HINT = 'Abrí la caja para pagar con plata del turno.'

export function ExpenseOriginField({ options, value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-foreground">¿De dónde salió la plata?</legend>
      {options.map((origin) => (
        <label
          key={origin.id}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer transition-colors',
            value === origin.id && 'border-primary bg-primary/5',
            origin.disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <input
            type="radio"
            name="expense-origin"
            className="mt-1"
            value={origin.id}
            checked={value === origin.id}
            disabled={origin.disabled}
            onChange={onChange}
          />
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{origin.label}</span>
            <span className="text-xs text-muted-foreground">{origin.disabled ? CLOSED_SHIFT_HINT : origin.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
