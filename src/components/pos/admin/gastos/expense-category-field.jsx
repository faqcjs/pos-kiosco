import { EXPENSE_CATEGORIES } from '@/lib/expenses'
import { cn } from '@/lib/utils'
import { getCategoryVisual } from './expense-visuals'

/** Category picker: one button-like radio per category, with its icon and color. */
export function ExpenseCategoryField({ value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-foreground">Categoría</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {EXPENSE_CATEGORIES.map((category) => {
          const visual = getCategoryVisual(category.id)
          const Icon = visual.icon
          const isSelected = value === category.id
          return (
            <label
              key={category.id}
              className={cn(
                'flex flex-col items-center gap-1.5 px-1 py-2.5 text-xs font-medium rounded-xl border border-border cursor-pointer transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                isSelected ? 'text-foreground bg-muted border-foreground/30' : 'text-muted-foreground hover:bg-muted/60',
              )}
            >
              <input
                type="radio"
                name="expense-category"
                className="sr-only"
                value={category.id}
                checked={isSelected}
                onChange={onChange}
              />
              <span aria-hidden="true" className={cn('flex items-center justify-center size-8 rounded-lg', visual.tile)}>
                <Icon className="size-4" />
              </span>
              {category.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
