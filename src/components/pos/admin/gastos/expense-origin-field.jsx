import { cn } from '@/lib/utils'
import { ORIGIN_ICONS } from './expense-visuals'

const CLOSED_SHIFT_HINT = 'Abrí la caja para pagar con plata del turno.'

/** Where the money came from: decides whether the expense also leaves the shift's cash count. */
export function ExpenseOriginField({ options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-foreground">¿De dónde salió la plata?</legend>
      <div className="flex flex-col gap-2">
        {options.map((origin) => {
          const Icon = ORIGIN_ICONS[origin.id]
          const isSelected = value === origin.id
          return (
            <label
              key={origin.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/60',
                origin.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              )}
            >
              <input
                type="radio"
                name="expense-origin"
                className="sr-only"
                value={origin.id}
                checked={isSelected}
                disabled={origin.disabled}
                onChange={onChange}
              />
              {Icon && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex items-center justify-center size-9 shrink-0 rounded-lg',
                    isSelected ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted',
                  )}
                >
                  <Icon className="size-4" />
                </span>
              )}
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{origin.label}</span>
                <span className="text-xs text-muted-foreground">{origin.disabled ? CLOSED_SHIFT_HINT : origin.hint}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
